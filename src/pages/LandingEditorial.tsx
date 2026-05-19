import { Link } from "react-router-dom";
import { useEffect, useRef, useState, useCallback } from "react";

const VIDEO_SCALE_KEY = "landing-video-scale";
const VIDEO_POS_KEY   = "landing-video-pos";
const LIME = "#ccff00";
const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#@$%&";

// ── Scramble hook ──────────────────────────────────────────────────────────
function useScramble(target: string, startDelay = 0) {
  const [text, setText] = useState(target.replace(/[A-Z]/g, "X"));
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    let iv: ReturnType<typeof setInterval>;
    let frame = 0;
    const frames = 22;
    t = setTimeout(() => {
      iv = setInterval(() => {
        frame++;
        setText(
          target.split("").map((ch, i) => {
            if (ch === " " || ch === "." || ch === "-") return ch;
            if (i <= (frame / frames) * target.length) return ch;
            return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
          }).join("")
        );
        if (frame >= frames) { clearInterval(iv); setText(target); }
      }, 35);
    }, startDelay);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, [target, startDelay]);
  return text;
}

export default function LandingEditorial() {
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [showTuner,  setShowTuner]  = useState(false);
  const [cursor,     setCursor]     = useState({ x: -300, y: -300 });
  const [heroReady,  setHeroReady]  = useState(false);
  const magnetRef = useRef<HTMLAnchorElement>(null);
  const magnetRef2 = useRef<HTMLAnchorElement>(null);

  const [videoScale, setVideoScale] = useState(() => {
    try { return parseFloat(localStorage.getItem(VIDEO_SCALE_KEY) || "1.6"); } catch { return 1.6; }
  });
  const [videoPos, setVideoPos] = useState(() => {
    try { return parseFloat(localStorage.getItem(VIDEO_POS_KEY) || "35"); } catch { return 35; }
  });

  useEffect(() => {
    try { localStorage.setItem(VIDEO_SCALE_KEY, String(videoScale)); } catch {}
  }, [videoScale]);
  useEffect(() => {
    try { localStorage.setItem(VIDEO_POS_KEY, String(videoPos)); } catch {}
  }, [videoPos]);

  // Cursor glow tracker
  useEffect(() => {
    const move = (e: MouseEvent) => setCursor({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  // Hero text entrance
  useEffect(() => { const t = setTimeout(() => setHeroReady(true), 100); return () => clearTimeout(t); }, []);

  // Lock body scroll when menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  // Scroll reveal
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) (e.target as HTMLElement).classList.add("sr-visible"); }),
      { threshold: 0.1 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  // Magnetic button
  const onMagnet = useCallback((ref: React.RefObject<HTMLAnchorElement | null>) => (e: React.MouseEvent) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) * 0.28;
    const y = (e.clientY - (r.top + r.height / 2)) * 0.28;
    el.style.transform = `translate(${x}px,${y}px)`;
  }, []);
  const offMagnet = useCallback((ref: React.RefObject<HTMLAnchorElement | null>) => () => {
    if (ref.current) ref.current.style.transform = "";
  }, []);

  // Scrambled words
  const w1 = useScramble("AUCTION", 300);
  const w2 = useScramble("DRAFT.", 500);
  const w3 = useScramble("YOUR", 700);
  const w4 = useScramble("EDGE.", 900);

  const NavBar = ({ open, onToggle }: { open: boolean; onToggle: () => void }) => (
    <header className="flex items-center justify-between px-5 py-4 border-b border-white/10">
      <span className="text-white text-[22px] select-none leading-none">✦</span>
      <div className="flex items-center rounded-full border border-white/20 overflow-hidden text-[12px] font-medium select-none">
        <span className="px-4 py-[7px] text-white/40">Light</span>
        <span className="px-4 py-[7px] bg-white text-black rounded-full">Dark</span>
      </div>
      <button
        onClick={onToggle}
        aria-label={open ? "Close menu" : "Open menu"}
        className="h-10 w-10 rounded-full border border-white/20 flex items-center justify-center text-white text-[18px] leading-none hover:border-white/50 transition-all duration-200"
      >
        <span style={{ display: "inline-block", transition: "transform 0.3s", transform: open ? "rotate(45deg)" : "none" }}>
          {open ? "✕" : "≡"}
        </span>
      </button>
    </header>
  );

  return (
    <div className="bg-black text-white" style={{ fontFamily: "'Montserrat','Inter',sans-serif" }}>

      {/* ── CURSOR GLOW ───────────────────────────────────────────────────── */}
      <div
        className="pointer-events-none fixed z-[9990]"
        style={{
          left: cursor.x - 180,
          top: cursor.y - 180,
          width: 360,
          height: 360,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(204,255,0,0.07) 0%, transparent 70%)`,
          transition: "left 80ms linear, top 80ms linear",
        }}
      />

      {/* ── STICKY NAV ────────────────────────────────────────────────────── */}
      <div className="fixed top-0 inset-x-0 z-50 bg-black/90 backdrop-blur-sm">
        <NavBar open={menuOpen} onToggle={() => setMenuOpen((v) => !v)} />
      </div>

      {/* ── FULL-SCREEN MENU ──────────────────────────────────────────────── */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black flex flex-col"
          style={{ animation: "menuIn 0.35s cubic-bezier(0.16,1,0.3,1) forwards" }}
        >
          <NavBar open={menuOpen} onToggle={() => setMenuOpen(false)} />
          <nav className="flex-1 flex flex-col justify-center px-5 overflow-hidden">
            {[
              { label: "✦ HOME",       to: "/" },
              { label: "DRAFT ROOM",   to: "/draft-room" },
              { label: "SETUP",        to: "/setup" },
              { label: "CONNECT ESPN", to: "/espn" },
              { label: "YOUR TEAM",    to: "/team" },
            ].map((item, i) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-end py-4 border-b border-white/10 hover:opacity-50 transition-opacity"
                style={{ animation: `menuItemIn 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 60}ms both` }}
              >
                <span className="font-black uppercase leading-none tracking-tight"
                  style={{ fontSize: "clamp(2rem, 10vw, 5rem)" }}>
                  {item.label}
                </span>
              </Link>
            ))}
          </nav>
          <div className="px-5 py-6" style={{ animation: "menuItemIn 0.4s cubic-bezier(0.16,1,0.3,1) 350ms both" }}>
            <Link
              to="/team"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-between rounded-full border border-white/20 px-6 py-3 hover:border-white/50 transition-colors"
            >
              <span className="text-[15px] font-medium">Choose Your Team</span>
              <span className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-black text-lg" style={{ background: LIME }}>→</span>
            </Link>
          </div>
        </div>
      )}

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative h-screen min-h-[640px] flex flex-col justify-end pb-10 px-5 overflow-hidden">
        {/* Full-screen video */}
        <video autoPlay loop muted playsInline
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ transform: `scale(${videoScale})`, transformOrigin: `center ${videoPos}%`, filter: "brightness(0.42) saturate(0.7)" }}>
          <source src={`${import.meta.env.BASE_URL}export.mp4`} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/85 pointer-events-none" />

        {/* Scrambling headline — each word slams in */}
        <div className="relative z-10">
          <h1
            className="font-black uppercase leading-[0.88] tracking-tight text-white overflow-hidden"
            style={{ fontSize: "clamp(3.8rem, 20vw, 15rem)", letterSpacing: "-0.025em" }}
          >
            {[w1, w2, w3, w4].map((word, i) => (
              <span
                key={i}
                className="block"
                style={{
                  opacity: heroReady ? 1 : 0,
                  transform: heroReady ? "none" : "translateY(60px) skewY(3deg)",
                  transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 120 + 100}ms, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 120 + 100}ms`,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {word}
              </span>
            ))}
          </h1>

          <div
            className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
            style={{
              opacity: heroReady ? 1 : 0,
              transform: heroReady ? "none" : "translateY(20px)",
              transition: "opacity 0.6s ease 700ms, transform 0.6s ease 700ms",
            }}
          >
            <p className="text-[15px] leading-relaxed text-white/50 max-w-xs font-normal">
              Budget-first draft planning powered by your league's actual 3-year auction history.
            </p>

            <Link
              ref={magnetRef}
              to="/team"
              onMouseMove={onMagnet(magnetRef)}
              onMouseLeave={offMagnet(magnetRef)}
              className="inline-flex items-center gap-4 self-start rounded-full border border-white/30 pl-6 pr-2 py-2 shrink-0"
              style={{ transition: "transform 0.15s ease, border-color 0.2s" }}
            >
              <span className="text-[14px] font-semibold uppercase tracking-wide text-white">Choose Your Team</span>
              <span className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-black text-lg shrink-0" style={{ background: LIME }}>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────────── */}
      <section className="border-t border-white/10 px-5 py-20" data-reveal>
        <p className="font-black uppercase leading-none tracking-tight text-white/15 mb-16"
          style={{ fontSize: "clamp(2rem, 10vw, 7rem)", letterSpacing: "-0.02em" }}>
          WHAT WE DO
        </p>
        <div className="divide-y divide-white/10">
          {[
            { n: "01", title: "LEAGUE HISTORY",  body: "3 years of your room's real auction prices — not ESPN projections. CMC goes for $47 in your league? We know." },
            { n: "02", title: "BUDGET PATHS",    body: "Not bid or pass. See the optimal spend path given your remaining budget and roster gaps." },
            { n: "03", title: "LIVE DRAFT SYNC", body: "Connects directly to your ESPN auction. Picks come in automatically — no manual logging mid-draft." },
          ].map((f, i) => (
            <div
              key={f.n}
              className="flex gap-6 py-8 group cursor-default"
              data-reveal
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <span className="font-mono text-[12px] text-white/25 mt-1 w-7 shrink-0">{f.n}</span>
              <div className="flex-1">
                <h3 className="font-black uppercase tracking-tight leading-none mb-3 transition-colors duration-200 group-hover:text-white/60"
                  style={{ fontSize: "clamp(1.4rem, 5vw, 2.5rem)", letterSpacing: "-0.02em" }}>
                  {f.title}
                </h3>
                <p className="text-[14px] text-white/35 leading-relaxed max-w-lg transition-colors duration-200 group-hover:text-white/55">{f.body}</p>
              </div>
              <span className="text-white/15 group-hover:text-white/40 transition-all duration-300 text-xl mt-1 group-hover:translate-x-1 group-hover:-translate-y-1 inline-block">↗</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── PULLQUOTE ─────────────────────────────────────────────────────── */}
      <section className="border-t border-white/10 px-5 py-24" data-reveal>
        <h2 className="font-black uppercase leading-[0.88] tracking-tight"
          style={{ fontSize: "clamp(2.8rem, 14vw, 11rem)", letterSpacing: "-0.025em" }}>
          <span className="text-white">YOUR LEAGUE</span><br />
          <span className="text-white/15">PAYS $47.</span><br />
          <span className="text-white">WE KNOW.</span>
        </h2>
        <p className="mt-8 text-[15px] text-white/35 max-w-sm leading-relaxed">
          Every league has its own pricing DNA. We use yours — three seasons of actual results pulled straight from ESPN.
        </p>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section className="border-t border-white/10 px-5 py-16" data-reveal>
        <div className="flex items-center justify-between flex-wrap gap-6">
          <span className="font-black uppercase leading-none tracking-tight"
            style={{ fontSize: "clamp(2rem, 8vw, 5.5rem)", letterSpacing: "-0.02em" }}>
            AUCTION DAY<br />IS COMING.
          </span>
          <Link
            ref={magnetRef2}
            to="/team"
            onMouseMove={onMagnet(magnetRef2)}
            onMouseLeave={offMagnet(magnetRef2)}
            className="inline-flex items-center gap-4 rounded-full border border-white/20 pl-6 pr-2 py-2 shrink-0"
            style={{ transition: "transform 0.15s ease, border-color 0.2s" }}
          >
            <span className="text-[14px] font-semibold uppercase tracking-wide">Choose Your Team</span>
            <span className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-black text-lg" style={{ background: LIME }}>→</span>
          </Link>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 px-5 py-6 flex items-center justify-between text-[12px] text-white/25">
        <span className="cursor-pointer hover:text-white/50 transition-colors select-none" onClick={() => setShowTuner((v) => !v)}>
          ✦ Auction Ace Coach
        </span>
        <span>© 2025 — All bids final</span>
      </footer>

      {/* ── VIDEO TUNER ───────────────────────────────────────────────────── */}
      {showTuner && (
        <div className="fixed bottom-20 left-1/2 z-[9999] -translate-x-1/2 bg-black border border-white/20 rounded-2xl px-6 py-5 w-80 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[12px] font-semibold text-white">Video Tuner</p>
            <button onClick={() => setShowTuner(false)} className="text-white/40 hover:text-white text-xl leading-none">×</button>
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-[11px] text-white/40 mb-2">Zoom — {Math.round(videoScale * 100)}%</p>
              <input type="range" min="1.0" max="3.0" step="0.05" value={videoScale}
                onChange={(e) => setVideoScale(parseFloat(e.target.value))}
                className="w-full" style={{ accentColor: LIME }} />
            </div>
            <div>
              <p className="text-[11px] text-white/40 mb-2">Pan — {Math.round(videoPos)}% from top</p>
              <input type="range" min="0" max="100" step="1" value={videoPos}
                onChange={(e) => setVideoPos(parseFloat(e.target.value))}
                className="w-full" style={{ accentColor: LIME }} />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes menuIn {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes menuItemIn {
          from { opacity: 0; transform: translateX(30px); }
          to   { opacity: 1; transform: none; }
        }
        [data-reveal] {
          opacity: 0;
          transform: translateY(32px);
          transition: opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1);
        }
        [data-reveal].sr-visible {
          opacity: 1;
          transform: none;
        }
      `}</style>
    </div>
  );
}
