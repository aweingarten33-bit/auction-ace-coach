import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initMotionPreferences } from "@/lib/animations";

document.documentElement.classList.add("dark");

if ("serviceWorker" in navigator) {
  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const isPreviewHost =
    window.location.hostname.includes("id-preview--") ||
    window.location.hostname.includes("lovableproject.com") ||
    window.location.hostname.includes("lovable.app");

  if (isInIframe || isPreviewHost) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
  }
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
});

initMotionPreferences();
createRoot(document.getElementById("root")!).render(<App />);
