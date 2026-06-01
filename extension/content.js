// Runs in PAGE world (manifest "world": "MAIN") so we can hook the same fetch/XHR
// the ESPN draft client uses. Posts events back via window.postMessage; bridge.js
// catches them and forwards to the background worker.
(function () {
  if (window.__auctionCoachInstalled) return;
  window.__auctionCoachInstalled = true;

  const send = (payload) => window.postMessage({ __ac: true, payload }, "*");

  const POS = { 1: "QB", 2: "RB", 3: "WR", 4: "TE", 5: "K", 16: "DST" };
  const playerCache = new Map(); // espn_player_id -> {name, pos, team}

  function rememberPlayer(p) {
    if (!p?.id || !p?.fullName) return;
    playerCache.set(p.id, {
      name: p.fullName,
      pos: POS[p.defaultPositionId] || null,
      team: p.proTeamAbbreviation || null,
    });
  }

  // --- Hook fetch ---
  const _fetch = window.fetch;
  window.fetch = async function (...args) {
    const res = await _fetch.apply(this, args);
    try {
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
      if (url.includes("/apis/v3/games/ffl/") || url.includes("/draftRecap")) {
        const clone = res.clone();
        clone.json().then((data) => parseEspnPayload(data, url)).catch(() => {});
      }
    } catch {}
    return res;
  };

  // --- Hook XHR (legacy ESPN code uses it) ---
  const _open = XMLHttpRequest.prototype.open;
  const _send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, u) { this.__ac_url = u; return _open.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function () {
    this.addEventListener("load", () => {
      try {
        const u = this.__ac_url || "";
        if (!u.includes("/apis/v3/games/ffl/") && !u.includes("/draftRecap")) return;
        const data = JSON.parse(this.responseText);
        parseEspnPayload(data, u);
      } catch {}
    });
    return _send.apply(this, arguments);
  };

  function parseEspnPayload(data, url) {
    // Cache players from any roster/player payloads
    if (Array.isArray(data?.players)) data.players.forEach((pp) => rememberPlayer(pp.player));
    if (Array.isArray(data?.teams)) data.teams.forEach((t) =>
      (t.roster?.entries ?? []).forEach((e) => rememberPlayer(e.playerPoolEntry?.player))
    );

    // Won picks live in draftDetail.picks
    const picks = data?.draftDetail?.picks;
    if (Array.isArray(picks)) {
      for (const pk of picks) {
        if (pk.__ac_seen) continue;
        pk.__ac_seen = true;
        const pl = playerCache.get(pk.playerId) || {};
        send({
          event_type: "won",
          player_name: pl.name,
          player_position: pl.pos,
          player_team: pl.team,
          espn_player_id: pk.playerId,
          price: pk.bidAmount,
          drafter_team_id: pk.teamId,
          occurred_at: new Date().toISOString(),
          raw: { url, pickId: pk.id },
        });
      }
    }
  }

  // --- DOM watcher for live bids (the bid-up panel) ---
  let lastBid = { player: null, price: null };
  const obs = new MutationObserver(() => {
    try {
      // ESPN draft UI uses class names like 'currentBid' / 'nominee'. Conservative scrape.
      const nameEl = document.querySelector("[class*='nominee'] [class*='playerName'], [class*='Nominee'] [class*='playerName']");
      const bidEl = document.querySelector("[class*='currentBid'], [class*='CurrentBid']");
      if (!nameEl || !bidEl) return;
      const player = nameEl.textContent?.trim();
      const m = bidEl.textContent?.match(/\$?(\d+)/);
      const price = m ? Number(m[1]) : null;
      if (!player || price == null) return;
      if (player === lastBid.player && price === lastBid.price) return;
      const isNomination = player !== lastBid.player;
      lastBid = { player, price };
      send({
        event_type: isNomination ? "nomination" : "bid",
        player_name: player,
        price,
        occurred_at: new Date().toISOString(),
      });
    } catch {}
  });
  obs.observe(document.documentElement, { subtree: true, childList: true, characterData: true });

  console.log("[Auction Coach] live sync attached");
})();
