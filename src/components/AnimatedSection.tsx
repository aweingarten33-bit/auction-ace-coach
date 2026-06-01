import { useGSAP } from "@gsap/react";
import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);
export default function AnimatedSection({ children, delay = 0, className = "", fromY = 24, fromOpacity = 0 }) {
  const ref = useRef(null);
  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.from(ref.current, { scrollTrigger: { trigger: ref.current, start: "top 90%" }, y: fromY, opacity: fromOpacity, duration: 0.5, delay, ease: "power2.out" });
  }, [delay, fromY, fromOpacity]);
  return <div ref={ref} className={className}>{children}</div>;
}
