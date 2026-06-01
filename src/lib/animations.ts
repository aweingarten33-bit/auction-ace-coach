import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);
export const initMotionPreferences = () => { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { gsap.globalTimeline.clear(); gsap.set("*", { clearProps: "all" }); ScrollTrigger.getAll().forEach(st => st.kill()); return true; } return false; };
export const animateProgress = (selector, targetPercent, duration = 1.2, delay = 0) => { gsap.fromTo(selector, { width: "0%" }, { width: `${Math.min(100, targetPercent)}%`, duration, delay, ease: "power2.out" }); };
