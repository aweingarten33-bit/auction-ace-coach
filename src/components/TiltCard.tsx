import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";
export default function TiltCard({ children, className = "", maxTilt = 6, glow = true }) {
  const ref = useRef(null);
  const x = useMotionValue(0); const y = useMotionValue(0);
  const mouseX = useSpring(x, { stiffness: 200, damping: 20 }); const mouseY = useSpring(y, { stiffness: 200, damping: 20 });
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [`${maxTilt}deg`, `-${maxTilt}deg`]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [`-${maxTilt}deg`, `${maxTilt}deg`]);
  const handleMouseMove = (e) => { if (!ref.current) return; const r = ref.current.getBoundingClientRect(); x.set((e.clientX - r.left)/r.width - 0.5); y.set((e.clientY - r.top)/r.height - 0.5); if(glow){ ref.current.style.setProperty('--mouse-x', `${e.clientX-r.left}px`); ref.current.style.setProperty('--mouse-y', `${e.clientY-r.top}px`); }};
  const handleMouseLeave = () => { x.set(0); y.set(0); };
  return <motion.div ref={ref} className={`relative ${className}`} style={{ rotateX, rotateY, transformStyle: "preserve-3d" }} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} whileTap={{ scale: 0.98 }}><div className="relative z-10">{children}</div>{glow && <div className="absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 pointer-events-none" style={{ background: "radial-gradient(400px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), hsl(var(--primary)/0.15), transparent 60%)" }}/>}</motion.div>;
}
