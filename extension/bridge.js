// Bridge: receives window.postMessage from page-world content.js and forwards to background.
window.addEventListener("message", (e) => {
  if (e.source !== window || e.data?.__ac !== true) return;
  chrome.runtime.sendMessage({ type: "AC_EVENT", payload: e.data.payload }, () => {});
});
