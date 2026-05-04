const $ = (id) => document.getElementById(id);
const status = $("status");

function setStatus(msg, kind) {
  status.textContent = msg;
  status.className = "status " + (kind || "muted");
}

chrome.storage.local.get(["webhookUrl", "token", "lastEvent"], (s) => {
  $("url").value = s.webhookUrl || "";
  $("token").value = s.token || "";
  if (s.lastEvent) setStatus(`Last event: ${s.lastEvent.type} ${s.lastEvent.player || ""} @ $${s.lastEvent.price || "—"} (${new Date(s.lastEvent.at).toLocaleTimeString()})`, "ok");
});

$("save").onclick = () => {
  const webhookUrl = $("url").value.trim();
  const token = $("token").value.trim();
  if (!webhookUrl || !token) return setStatus("Both fields required", "err");
  chrome.storage.local.set({ webhookUrl, token }, () => setStatus("Saved. Open ESPN draft room to start.", "ok"));
};

$("test").onclick = async () => {
  const { webhookUrl, token } = await chrome.storage.local.get(["webhookUrl", "token"]);
  if (!webhookUrl || !token) return setStatus("Save settings first", "err");
  try {
    const r = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Extension-Token": token },
      body: JSON.stringify({
        event_type: "won",
        player_name: "Test Player",
        player_position: "RB",
        price: 1,
        drafter_team_name: "Extension Test",
      }),
    });
    const j = await r.json();
    if (r.ok) setStatus("✓ Webhook OK — check Auction Coach", "ok");
    else setStatus("Webhook error: " + (j.error || r.status), "err");
  } catch (e) {
    setStatus("Network error: " + e.message, "err");
  }
};
