// Thin client that routes function calls to Vercel serverless functions (/api/espn/*).
// No real Supabase — auth is anonymous, DB ops are no-ops.
// When wiring a real backend, replace this with @supabase/supabase-js.

async function noop() { return { data: null, error: null }; }

export const supabase = {
  auth: {
    async getSession() { return { data: { session: { user: { id: "anon" } } }, error: null }; },
    async signInAnonymously() { return { data: { user: { id: "anon" } }, error: null }; },
    onAuthStateChange(_cb: unknown) {
      return { data: { subscription: { unsubscribe() {} } } };
    },
    async signOut() { return { error: null }; },
  },
  functions: {
    async invoke(name: string, opts?: { body?: Record<string, unknown> }) {
      // ── league-teams: fetch real ESPN teams using stored creds ──────────
      if (name === "league-teams") {
        try {
          const raw = typeof window !== "undefined" ? localStorage.getItem("espnCreds") : null;
          if (raw) {
            const { leagueId, season, swid, s2 } = JSON.parse(raw);
            if (leagueId) {
              const qs = new URLSearchParams({
                leagueId: String(leagueId),
                season:   String(season || new Date().getFullYear()),
                swid:     swid || "",
                s2:       s2   || "",
              });
              const r = await fetch(`/api/espn/teams?${qs.toString()}`);
              if (r.ok) {
                const data = await r.json();
                if (Array.isArray(data?.teams) && data.teams.length > 0) {
                  return { data: { teams: data.teams, leagueName: data.leagueName ?? null }, error: null };
                }
              }
            }
          }
        } catch { /* fall through — no creds or network error */ }
        // Fall back to mock teams so the UI is never empty
        return {
          data: {
            teams: [
              { id: "1",  name: "Show Me Your TDs",     abbrev: "SMYT" },
              { id: "2",  name: "Gridiron Gang",         abbrev: "GG"   },
              { id: "3",  name: "Belichick Yourself",    abbrev: "BLCK" },
              { id: "4",  name: "Purple Drank",          abbrev: "PRPL" },
              { id: "5",  name: "Burrow My Heart",       abbrev: "BURR" },
              { id: "6",  name: "Mahomes Alone",         abbrev: "MAHO" },
              { id: "7",  name: "Kelce's Angels",        abbrev: "KLCE" },
              { id: "8",  name: "Lamar in the Streets",  abbrev: "LMAR" },
              { id: "9",  name: "CeeDee Lamb Chops",     abbrev: "CDLC" },
              { id: "10", name: "Tua Legit to Quit",     abbrev: "TUA"  },
              { id: "11", name: "Saquon and Garfunkel",  abbrev: "SAQU" },
              { id: "12", name: "The Wu Tang Klan",      abbrev: "WUTG" },
            ],
            leagueName: null,
          },
          error: null,
        };
      }

      // ── espn-connect: discover leagues or save league selection ─────────
      if (name === "espn-connect") {
        const body = opts?.body ?? {};
        const { swid, espn_s2, season, league_id, team_id } = body as any;

        // If saving a league selection, persist to localStorage.
        if (league_id) {
          try {
            const existing = JSON.parse(localStorage.getItem("espnCreds") ?? "{}");
            localStorage.setItem("espnCreds", JSON.stringify({
              ...existing,
              leagueId: league_id,
              teamId:   team_id ?? existing.teamId ?? null,
              swid:     swid  ?? existing.swid,
              s2:       espn_s2 ?? existing.s2,
              season:   season ?? existing.season,
            }));
          } catch { /* ignore */ }
          return { data: { ok: true }, error: null };
        }

        // Otherwise discover leagues via the Vercel serverless function.
        try {
          const r = await fetch("/api/espn/connect", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ swid, espn_s2, season }),
          });
          const data = await r.json();

          // On success, persist credentials to localStorage.
          if (Array.isArray(data?.leagues) && !data.error) {
            try {
              const existing = JSON.parse(localStorage.getItem("espnCreds") ?? "{}");
              localStorage.setItem("espnCreds", JSON.stringify({
                ...existing,
                swid:   swid,
                s2:     espn_s2,
                season: season,
              }));
            } catch { /* ignore */ }
          }

          return { data, error: null };
        } catch (err) {
          return { data: { leagues: [], error: "Network error — check your connection." }, error: null };
        }
      }

      // ── everything else: no-op ──────────────────────────────────────────
      return { data: null, error: null };
    },
  },
  rpc: noop,
  from(_table: string) {
    const chain: any = {
      select:      () => chain,
      eq:          () => chain,
      update:      () => chain,
      maybeSingle: async () => ({ data: null, error: null }),
      single:      async () => ({ data: null, error: null }),
      then:        (resolve: any) => resolve({ data: [], error: null }),
    };
    return chain;
  },
};
