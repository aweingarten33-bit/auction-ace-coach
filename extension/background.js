// Background service worker — relays events from content scripts to the webhook.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "AC_EVENT") return;
  chrome.storage.local.get(["webhookUrl", "token"], async (s) => {
    if (!s.webhookUrl || !s.token) {
      sendResponse({ ok: false, error: "not configured" });
      return;
    }
    try {
      const r = await fetch(s.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Extension-Token": s.token },
        body: JSON.stringify(msg.payload),
      });
      const j = await r.json().catch(() => ({}));
      chrome.storage.local.set({
        lastEvent: {
          type: msg.payload.event_type,
          player: msg.payload.player_name,
          price: msg.payload.price,
          at: Date.now(),
        },
      });
      sendResponse({ ok: r.ok, body: j });
    } catch (e) {
      sendResponse({ ok: false, error: String(e) });
    }
  });
  return true;
});
