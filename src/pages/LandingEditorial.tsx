import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const LIME = "#d4ff00";
const CREAM = "#f3efe6";
const INK = "#0e0e0e";

export default function LandingEditorial() {
  const [phase, setPhase] = useState<"loading" | "wiping" | "ready">("loading");

  // cursor (normalized -1..1 around center)
  const mouse = useRef({ x: 0, y: 0 });
  const [, force] = useState(0);
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      mouse.current = { x: nx, y: ny };
      force((n) => (n + 1) % 1000);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  // preloader sequence: draw L7 → wipe up → reveal
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("wiping"), 1500);
    const t2 = setTimeout(() => setPhase("ready"), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden"
      style={{ background: CREAM, color: INK, cursor: "none" }}
    >
      <StyleTag />

      {/* ── Preloader (lime panel) ─────────────────────────────── */}
      <div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
        style={{
          background: LIME,
          transform: phase === "ready" ? "translateY(-101%)" : "translateY(0)",
          transition: "transform 900ms cubic-bezier(0.85,0,0.15,1)",
          pointerEvents: phase === "ready" ? "none" : "auto",
        }}
      >
        <MonogramDraw drawing={phase === "loading"} className="h-14 w-14 text-black" />
        <span
          className="absolute bottom-8 text-[11px] font-bold tracking-[0.3em] text-black"
          style={{ fontFamily: '"JetBrains Mono", monospace' }}
        >
          <DotLoader /> LOAD ACE
        </span>
      </div>

      {/* ── Cream reveal panel underneath (gives wipe its layer) ─ */}
      <div className="fixed inset-0 z-[99] pointer-events-none" style={{ background: CREAM }} />

      {/* ── Cursor-following gooey blob ────────────────────────── */}
      <BlobLayer mx={mouse.current.x} my={mouse.current.y} active={phase === "ready"} />

      {/* ── Topographic background (draws in after wipe) ──────── */}
      <TopoBackground active={phase === "ready"} mx={mouse.current.x} my={mouse.current.y} />

      {/* ── Custom cursor dot ─────────────────────────────────── */}
      <Cursor active={phase === "ready"} />

      {/* ── Top bar ───────────────────────────────────────────── */}
      <header
        className="relative z-10 flex items-center justify-between px-5 pt-5"
        style={{
          opacity: phase === "ready" ? 1 : 0,
          transform: phase === "ready" ? "translateY(0)" : "translateY(-12px)",
          transition: "opacity 600ms 200ms ease, transform 600ms 200ms ease",
        }}
      >
        <MagneticLink to="/team" className="lando-pill">
          <BagIcon className="h-3.5 w-3.5" /> ENTER
        </MagneticLink>
        <MagneticLink to="/passcode" className="lando-menu" aria-label="Menu">
          <span className="block h-px w-4 bg-current" />
        </MagneticLink>
      </header>

      {/* ── Wordmark ──────────────────────────────────────────── */}
      <div
        className="relative z-10 mt-6 flex flex-col items-center px-5 text-center"
        style={{
          opacity: phase === "ready" ? 1 : 0,
          transform: phase === "ready" ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 700ms 350ms ease, transform 800ms 350ms cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <MonogramDraw drawing={false} className="h-8 w-8 text-black" />
        <h1
          className="lando-wordmark mt-3 leading-none"
          style={{ fontSize: "clamp(2.5rem, 13vw, 7rem)" }}
        >
          <span className="lando-serif">Auction</span>
          <span className="lando-sans">ACE</span>
        </h1>
        <p
          className="mt-3 text-[11px] font-bold tracking-[0.3em] text-black"
          style={{ fontFamily: '"JetBrains Mono", monospace' }}
        >
          DRAFT&nbsp;ROOM&nbsp;SINCE&nbsp;2025
        </p>

        {/* ── The orb — touch it, crazy shit happens ───────────── */}
        <HeroOrb mx={mouse.current.x} my={mouse.current.y} active={phase === "ready"} />
      </div>

      {/* ── Magnetic action button ────────────────────────────── */}
      <MagneticButton phase={phase} />

      {/* ── Footer marker ─────────────────────────────────────── */}
      <div className="relative z-10 mt-auto px-5 pb-5 pt-24">
        <div
          className="flex items-center justify-between text-[10px] tracking-[0.3em] text-black/50"
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            opacity: phase === "ready" ? 1 : 0,
            transition: "opacity 600ms 600ms ease",
          }}
        >
          <span>AUCTION&nbsp;ACE</span>
          <span className="lando-pulse">● LIVE</span>
          <span>EST.&nbsp;2025</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */

function StyleTag() {
  return (
    <style>{`
      @keyframes lando-dash { to { stroke-dashoffset: 0; } }
      @keyframes lando-drift { 0%{transform:translate(0,0)} 50%{transform:translate(-6px,4px)} 100%{transform:translate(0,0)} }
      @keyframes lando-blob { 0%,100%{ d: path("M60,-50C72,-32,72,-7,64,15C56,37,40,55,18,62C-4,69,-32,64,-50,48C-68,32,-76,4,-69,-20C-62,-44,-40,-64,-15,-70C10,-76,48,-68,60,-50Z"); }
        50%{ d: path("M55,-58C68,-40,72,-15,66,8C60,31,44,52,21,63C-2,74,-32,75,-52,60C-72,45,-82,14,-74,-13C-66,-40,-40,-62,-13,-68C14,-74,42,-76,55,-58Z"); } }
      @keyframes lando-pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
      @keyframes lando-spin { to { transform: rotate(360deg); } }
      @keyframes lando-shard {
        0% { transform: translate(0,0) scale(1); opacity:1; }
        100% { transform: translate(var(--dx), var(--dy)) scale(.2); opacity:0; }
      }
      @keyframes lando-ring {
        0% { transform: scale(.3); opacity:.9; }
        100% { transform: scale(2.4); opacity:0; }
      }
      @keyframes lando-shake {
        0%,100%{transform:translate(0,0)}
        20%{transform:translate(-3px,2px)}
        40%{transform:translate(4px,-2px)}
        60%{transform:translate(-2px,-3px)}
        80%{transform:translate(3px,2px)}
      }

      .lando-pill {
        display:inline-flex; align-items:center; gap:.5rem;
        background:${LIME}; color:#000; padding:.55rem 1rem;
        border-radius:999px; font-family:"JetBrains Mono",monospace;
        font-size:11px; font-weight:700; letter-spacing:.2em;
        transition: transform 350ms cubic-bezier(0.22,1,0.36,1);
      }
      .lando-menu {
        display:grid; place-items:center; width:40px; height:40px;
        border:1px solid rgba(0,0,0,.35); border-radius:12px; color:#000;
        transition: transform 350ms cubic-bezier(0.22,1,0.36,1), background-color 250ms, color 250ms;
      }
      .lando-menu:hover { background:#000; color:${LIME}; }

      .lando-wordmark { display:inline-flex; align-items:baseline; gap:.05em; }
      .lando-serif {
        font-family:"Playfair Display","DM Serif Display",serif;
        font-weight:400; font-style:italic;
        transition: letter-spacing 600ms ease, transform 600ms cubic-bezier(0.22,1,0.36,1);
      }
      .lando-sans {
        font-family:"Inter","DM Sans",sans-serif; font-weight:900;
        letter-spacing:-0.03em;
        transition: font-stretch 600ms ease, letter-spacing 600ms ease, transform 600ms cubic-bezier(0.22,1,0.36,1);
      }
      .lando-wordmark:hover .lando-serif { letter-spacing:.04em; transform:translateY(-2px); }
      .lando-wordmark:hover .lando-sans  { letter-spacing:.02em; transform:translateY(2px); }

      .lando-pulse { animation: lando-pulse 1.8s ease-in-out infinite; }

      .lando-topo path, .lando-topo ellipse {
        stroke-dasharray: 1200;
        stroke-dashoffset: 1200;
      }
      .lando-topo.active path, .lando-topo.active ellipse {
        animation: lando-dash 2.2s cubic-bezier(0.22,1,0.36,1) forwards;
      }
      .lando-topo.active g { animation: lando-drift 12s ease-in-out infinite; }

      .lando-blob path { animation: lando-blob 7s ease-in-out infinite; }

      .lando-tap-label { animation: lando-pulse 2s ease-in-out infinite; }
    `}</style>
  );
}

/* ── Animated L7 monogram (self-draws) ─────────────────────── */
function MonogramDraw({ className = "", drawing = false }: { className?: string; drawing?: boolean }) {
  return (
    <svg viewBox="0 0 60 60" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M10 6 L10 46 L26 46 L26 38 L18 38 L18 6 Z M30 6 L52 6 L42 46 L34 46 L42 14 L30 14 Z"
        fill={drawing ? "none" : "currentColor"}
        stroke="currentColor"
        strokeWidth={drawing ? 1.5 : 0}
        style={
          drawing
            ? { strokeDasharray: 240, strokeDashoffset: 240, animation: "lando-dash 1.3s ease-out forwards" }
            : undefined
        }
      />
    </svg>
  );
}

/* ── Cursor-tracked gooey blob ─────────────────────────────── */
function BlobLayer({ mx, my, active }: { mx: number; my: number; active: boolean }) {
  const tx = mx * 40;
  const ty = my * 40;
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[1] flex items-center justify-center"
      style={{
        opacity: active ? 1 : 0,
        transition: "opacity 800ms ease",
      }}
    >
      <svg
        viewBox="-100 -100 200 200"
        className="lando-blob h-[70vmin] w-[70vmin]"
        style={{
          transform: `translate3d(${tx}px,${ty}px,0)`,
          transition: "transform 600ms cubic-bezier(0.22,1,0.36,1)",
          filter: "blur(0.3px)",
        }}
      >
        <defs>
          <radialGradient id="blob-grad" cx="40%" cy="40%">
            <stop offset="0%" stopColor={LIME} stopOpacity="0.55" />
            <stop offset="60%" stopColor={LIME} stopOpacity="0.18" />
            <stop offset="100%" stopColor={LIME} stopOpacity="0" />
          </radialGradient>
        </defs>
        <path
          d="M60,-50C72,-32,72,-7,64,15C56,37,40,55,18,62C-4,69,-32,64,-50,48C-68,32,-76,4,-69,-20C-62,-44,-40,-64,-15,-70C10,-76,48,-68,60,-50Z"
          fill="url(#blob-grad)"
        />
      </svg>
    </div>
  );
}

/* ── Topo background, parallax with cursor ─────────────────── */
function TopoBackground({ active, mx, my }: { active: boolean; mx: number; my: number }) {
  return (
    <svg
      className={`lando-topo pointer-events-none absolute inset-0 h-full w-full z-[2] ${active ? "active" : ""}`}
      viewBox="0 0 400 800"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <g
        fill="none"
        stroke={INK}
        strokeOpacity="0.1"
        strokeWidth="1"
        style={{
          transform: `translate3d(${mx * -10}px, ${my * -10}px, 0)`,
          transition: "transform 700ms cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <path d="M-50 200 Q 80 140 200 220 T 460 200" />
        <path d="M-50 260 Q 80 200 200 280 T 460 260" />
        <path d="M-50 320 Q 80 260 200 340 T 460 320" />
        <path d="M-50 420 Q 100 360 220 440 T 460 420" />
        <path d="M-50 500 Q 120 440 240 520 T 460 500" />
        <path d="M-50 580 Q 120 520 240 600 T 460 580" />
        <path d="M-50 660 Q 140 600 260 680 T 460 660" />
        <ellipse cx="60" cy="380" rx="55" ry="35" />
        <ellipse cx="60" cy="380" rx="35" ry="22" />
        <ellipse cx="320" cy="360" rx="70" ry="48" />
        <ellipse cx="320" cy="360" rx="48" ry="32" />
        <ellipse cx="320" cy="360" rx="26" ry="18" />
        <ellipse cx="90" cy="640" rx="60" ry="40" />
        <ellipse cx="90" cy="640" rx="38" ry="24" />
      </g>
    </svg>
  );
}

/* ── Custom cursor ─────────────────────────────────────────── */
function Cursor({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = ref.current; if (!el) return;
      el.style.transform = `translate3d(${e.clientX - 8}px, ${e.clientY - 8}px, 0)`;
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  return (
    <div
      ref={ref}
      className="pointer-events-none fixed left-0 top-0 z-[200] h-4 w-4 rounded-full mix-blend-difference"
      style={{
        background: LIME,
        opacity: active ? 1 : 0,
        transition: "opacity 400ms ease",
      }}
    />
  );
}

/* ── Magnetic wrappers ─────────────────────────────────────── */
function useMagnetic(strength = 0.35) {
  const ref = useRef<HTMLAnchorElement | HTMLButtonElement | null>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist < 140) {
        el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
      } else {
        el.style.transform = "translate(0,0)";
      }
    };
    const onLeave = () => { el.style.transform = "translate(0,0)"; };
    window.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [strength]);
  return ref;
}

function MagneticLink({
  to, children, className, ...rest
}: { to: string; children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLAnchorElement>) {
  const ref = useMagnetic(0.3) as React.RefObject<HTMLAnchorElement>;
  return (
    <Link to={to} ref={ref} className={className} {...rest}>
      {children}
    </Link>
  );
}

function MagneticButton({ phase }: { phase: "loading" | "wiping" | "ready" }) {
  const ref = useMagnetic(0.4) as React.RefObject<HTMLAnchorElement>;
  return (
    <Link
      to="/draft-room"
      ref={ref}
      className="group fixed bottom-5 right-5 z-10 grid h-16 w-16 place-items-center rounded-full text-black shadow-lg"
      style={{
        background: LIME,
        opacity: phase === "ready" ? 1 : 0,
        transition: "transform 400ms cubic-bezier(0.22,1,0.36,1), opacity 600ms 500ms ease",
        boxShadow: `0 10px 30px -10px ${LIME}`,
      }}
      aria-label="Enter draft room"
    >
      <HandIcon className="h-7 w-7" />
      <span
        className="lando-tap-label pointer-events-none absolute -top-7 right-1 text-[9px] font-bold tracking-[0.25em] text-black/70"
        style={{ fontFamily: '"JetBrains Mono", monospace' }}
      >
        TAP&nbsp;TO&nbsp;DRAFT
      </span>
    </Link>
  );
}

/* ── Misc icons ────────────────────────────────────────────── */
function DotLoader() {
  return (
    <span style={{ display: "inline-flex", gap: 3, marginRight: 6 }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 4, height: 4, borderRadius: 999, background: "#000",
            animation: `lando-pulse 1s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
    </span>
  );
}
function BagIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M5 8h14l-1.2 12.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}
function HandIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M11 2a1.5 1.5 0 0 0-1.5 1.5V11l-1.4-1.4a1.5 1.5 0 1 0-2.1 2.1l4.2 4.6a4 4 0 0 0 2.95 1.3H17a3 3 0 0 0 3-3v-4a1.5 1.5 0 0 0-3 0 1.5 1.5 0 0 0-3 0V3.5A1.5 1.5 0 0 0 12.5 2 1.5 1.5 0 0 0 11 3.5v-1Z" />
    </svg>
  );
}
