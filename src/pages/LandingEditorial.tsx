import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

const VIDEO_SCALE_KEY = "landing-video-scale";
const VIDEO_POS_KEY   = "landing-video-pos";
const LIME = "#ccff00";

export default function LandingEditorial() {
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [showTuner,  setShowTuner]  = useState(false);
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

  // Lock body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const NavBar = ({ open, onToggle }: { open: boolean; onToggle: () => void }) => (
    <header className="flex items-center justify-between px-5 py-4 border-b border-white/10">
      {/* Star logo */}
      <span className="text-white text-[22px] select-none leading-none">✦</span>

      {/* Light / Dark pill */}
      <div className="flex items-center rounded-full border border-white/20 overflow-hidden text-[12px] font-medium select-none">
        <span className="px-4 py-[7px] text-white/40">Light</span>
        <span className="px-4 py-[7px] bg-white text-black rounded-full">Dark</span>
      </div>

      {/* Menu button */}
      <button
        onClick={onToggle}
        aria-label={open ? "Close menu" : "Open menu"}
        className="h-10 w-10 rounded-full border border-white/20 flex items-center justify-center text-white text-[15px] leading-none hover:border-white/40 transition-colors"
      >
        {open ? "✕" : "≡"}
      </button>
    </header>
  );

  return (
    <div
      className="bg-black text-white"
      style={{ fontFamily: "'Montserrat', 'Inter', sans-serif" }}
    >
      {/* ── STICKY NAV ──────────────────────────────────────────────────── */}
      <div className="fixed top-0 inset-x-0 z-50 bg-black">
        <NavBar open={menuOpen} onToggle={() => setMenuOpen((v) => !v)} />
      </div>

      {/* ── FULL-SCREEN MENU ─────────────────────────────────────────────── */}
      {menuOpen && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <NavBar open={menuOpen} onToggle={() => setMenuOpen(false)} />

          <nav className="flex-1 flex flex-col justify-center px-5 overflow-hidden">
            {[
              { label: "✦ HOME",        to: "/" },
              { label: "DRAFT ROOM",    to: "/draft-room" },
              { label: "SETUP",         to: "/setup" },
              { label: "CONNECT ESPN",  to: "/espn" },
              { label: "YOUR TEAM",     to: "/team" },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-end py-4 border-b border-white/10 hover:opacity-60 transition-opacity"
              >
                <span
                  className="font-black uppercase leading-none tracking-tight"
                  style={{ fontSize: "clamp(2rem, 10vw, 5rem)" }}
                >
                  {item.label}
                </span>
              </Link>
            ))}
          </nav>

          {/* Bottom CTA */}
          <div className="px-5 py-6">
            <Link
              to="/team"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-between rounded-full border border-white/20 px-6 py-3 hover:border-white/40 transition-colors"
            >
              <span className="text-[15px] font-medium">Enter Draft Room</span>
              <span
                className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-black text-lg"
                style={{ background: LIME }}
              >
                →
              </span>
            </Link>
          </div>
        </div>
      )}

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="min-h-screen flex flex-col justify-between pt-[72px] pb-10 px-5 overflow-hidden">

        {/* Giant headline */}
        <div className="pt-10">
          <h1
            className="font-black uppercase leading-[0.88] tracking-tight text-white"
            style={{ fontSize: "clamp(3.8rem, 20vw, 15rem)", letterSpacing: "-0.025em" }}
          >
            AUCTION
            <br />
            DRAFT.
          </h1>
        </div>

        {/* Video — circular, floating in the center */}
        <div className="flex justify-center py-4">
          <div
            className="relative overflow-hidden"
            style={{
              width: "min(72vw, 420px)",
              height: "min(72vw, 420px)",
              borderRadius: "50%",
              boxShadow: `0 0 0 1px rgba(255,255,255,0.08), 0 32px 80px rgba(0,0,0,0.8)`,
            }}
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              style={{
                transform: `scale(${videoScale})`,
                transformOrigin: `center ${videoPos}%`,
              }}
            >
              <source src={`${import.meta.env.BASE_URL}export.mp4`} type="video/mp4" />
            </video>
            {/* Rim light */}
            <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/10 pointer-events-none" />
          </div>
        </div>

        {/* Lower text block */}
        <div>
          <h2
            className="font-black uppercase leading-[0.88] tracking-tight text-white"
            style={{ fontSize: "clamp(3.8rem, 20vw, 15rem)", letterSpacing: "-0.025em" }}
          >
            YOUR
            <br />
            EDGE.
          </h2>

          {/* Body + CTA */}
          <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <p className="text-[15px] leading-relaxed text-white/50 max-w-xs font-normal">
              Budget-first draft planning powered by your league's actual 3-year auction history.
            </p>

            <Link
              to="/team"
              className="inline-flex items-center gap-4 self-start rounded-full border border-white/20 pl-6 pr-2 py-2 hover:border-white/40 transition-colors shrink-0"
            >
              <span className="text-[14px] font-semibold uppercase tracking-wide">Enter Draft Room</span>
              <span
                className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-black text-lg shrink-0"
                style={{ background: LIME }}
              >
                →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section className="border-t border-white/10 px-5 py-20">
        <p
          className="font-black uppercase leading-none tracking-tight text-white/20 mb-16"
          style={{ fontSize: "clamp(2rem, 10vw, 7rem)", letterSpacing: "-0.02em" }}
        >
          WHAT WE DO
        </p>

        <div className="divide-y divide-white/10">
          {[
            { n: "01", title: "LEAGUE HISTORY",    body: "3 years of your room's real auction prices — not ESPN projections. CMC goes for $47 in your league? We know." },
            { n: "02", title: "BUDGET PATHS",       body: "Not bid or pass. See the optimal spend path given your remaining budget and roster gaps." },
            { n: "03", title: "AI COACH",           body: "Ask \"what are my RB options at $30?\" Get players, tiers, and two strategic approaches. Not verdicts." },
          ].map((f) => (
            <div key={f.n} className="flex gap-6 py-8 group">
              <span className="font-mono text-[12px] text-white/30 mt-1 w-7 shrink-0">{f.n}</span>
              <div className="flex-1">
                <h3
                  className="font-black uppercase tracking-tight leading-none mb-3 group-hover:text-white/70 transition-colors"
                  style={{ fontSize: "clamp(1.4rem, 5vw, 2.5rem)", letterSpacing: "-0.02em" }}
                >
                  {f.title}
                </h3>
                <p className="text-[14px] text-white/40 leading-relaxed max-w-lg">{f.body}</p>
              </div>
              <span className="text-white/20 group-hover:text-white/50 transition-colors text-xl mt-1">↗</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── DARK PULLQUOTE ────────────────────────────────────────────────── */}
      <section className="border-t border-white/10 px-5 py-24">
        <h2
          className="font-black uppercase leading-[0.88] tracking-tight"
          style={{ fontSize: "clamp(2.8rem, 14vw, 11rem)", letterSpacing: "-0.025em" }}
        >
          <span className="text-white">YOUR LEAGUE</span>
          <br />
          <span className="text-white/20">PAYS $47.</span>
          <br />
          <span className="text-white">WE KNOW.</span>
        </h2>
        <p className="mt-8 text-[15px] text-white/40 max-w-sm leading-relaxed">
          Every league has its own pricing DNA. We use yours — three seasons of actual results pulled straight from ESPN.
        </p>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section className="border-t border-white/10 px-5 py-16">
        <div className="flex items-center justify-between flex-wrap gap-6">
          <span
            className="font-black uppercase leading-none tracking-tight"
            style={{ fontSize: "clamp(2rem, 8vw, 5.5rem)", letterSpacing: "-0.02em" }}
          >
            AUCTION DAY
            <br />
            IS COMING.
          </span>

          <Link
            to="/team"
            className="inline-flex items-center gap-4 rounded-full border border-white/20 pl-6 pr-2 py-2 hover:border-white/40 transition-colors shrink-0"
          >
            <span className="text-[14px] font-semibold uppercase tracking-wide">Get started</span>
            <span
              className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-black text-lg"
              style={{ background: LIME }}
            >
              →
            </span>
          </Link>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 px-5 py-6 flex items-center justify-between text-[12px] text-white/30">
        <span
          className="cursor-pointer hover:text-white/60 transition-colors select-none"
          onClick={() => setShowTuner((v) => !v)}
        >
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
    </div>
  );
}
