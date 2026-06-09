import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/** Tweens to new value with ease-out-expo. Pulses briefly on change for emphasis. */
export default function AnimatedNumber({ value, duration = 450, prefix = "", suffix = "", className }: Props) {
  const [display, setDisplay] = useState(value);
  const [bump, setBump] = useState(false);
  const fromRef = useRef(value);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === display) return;
    fromRef.current = display;
    startRef.current = null;
    setBump(true);
    const tick = (t: number) => {
      if (startRef.current === null) startRef.current = t;
      const elapsed = t - startRef.current;
      const p = Math.min(1, elapsed / duration);
      // ease-out-expo
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      const next = fromRef.current + (value - fromRef.current) * eased;
      setDisplay(next);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else {
        setDisplay(value);
        setTimeout(() => setBump(false), 200);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return (
    <span className={`tabular-nums transition-transform duration-200 ease-out-expo ${bump ? "scale-110" : "scale-100"} ${className ?? ""}`}>
      {prefix}{Math.round(display)}{suffix}
    </span>
  );
}
