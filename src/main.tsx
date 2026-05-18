import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initMotionPreferences } from "@/lib/animations";

document.documentElement.classList.add("dark");

initMotionPreferences();
createRoot(document.getElementById("root")!).render(<App />);
