import { useEffect, useRef, useState } from "react";

// Cyberpunk-style letter scramble. Each character cycles through random
// glyphs and "lands" on its real letter on a stagger.
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&@!*+=/<>?";

type Props = {
  text: string;
  /** Toggle from false → true to play the scramble. */
  play: boolean;
  /** Total duration in ms. */
  duration?: number;
  className?: string;
};

export default function ScrambleText({ text, play, duration = 900, className = "" }: Props) {
  const [display, setDisplay] = useState(text);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!play) { setDisplay(text); return; }
    const start = performance.now();
    const len = text.length;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      let out = "";
      for (let i = 0; i < len; i++) {
        const ch = text[i];
        if (ch === " " || ch === "\u00A0") { out += ch; continue; }
        // Each letter "lands" at progress i/len, eased
        const landAt = i / len;
        if (t >= landAt + 0.15) out += ch;
        else out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      setDisplay(out);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else setDisplay(text);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [play, text, duration]);

  return <span className={className}>{display}</span>;
}
