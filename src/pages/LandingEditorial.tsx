import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowDown, BarChart3, Zap, Brain, ChevronRight } from "lucide-react";

const VIDEO_SCALE_KEY = "landing-video-scale";
const VIDEO_POS_KEY = "landing-video-pos";

export default function LandingEditorial() {
  const [showSlider, setShowSlider] = useState(false);
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

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) (e.target as HTMLElement).classList.add("is-visible"); }),
      { threshold: 0.12 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div
      className="bg-white text-[#1d1d1f] overflow-x-hidden"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" }}
    >
      {/* ── NAV ─────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 h-12 flex items-center border-b border-black/[0.07] bg-white/80 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-6xl px-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 select-none group">
            <img
              src={`${import.meta.env.BASE_URL}football-real.png`}
              alt=""
              className="h-5 w-5 object-contain"
              style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.2))" }}
            />
            <span className="text-[15px] font-semibold tracking-tight text-[#1d1d1f]">
              Auction Ace
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-7 text-[13px] text-[#6e6e73]">
            <Link to="/draft-room" className="hover:text-[#1d1d1f] transition-colors">Draft Room</Link>
            <Link to="/espn" className="hover:text-[#1d1d1f] transition-colors">Connect ESPN</Link>
            <Link to="/setup" className="hover:text-[#1d1d1f] transition-colors">Setup</Link>
          </div>

          <Link
            to="/team"
            className="flex items-center gap-1 text-[13px] font-medium text-white bg-[#1d1d1f] rounded-full px-4 py-[7px] hover:bg-[#2d2d2d] transition-colors"
          >
            Get started <ChevronRight className="h-3.5 w-3.5 -mr-0.5" strokeWidth={2.5} />
          </Link>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="bg-black pt-16 pb-8 px-4 md:px-8 flex flex-col items-center">
        {/* Theater frame */}
        <div
          className="relative w-full overflow-hidden"
          style={{
            maxWidth: "1200px",
            borderRadius: "16px",
            aspectRatio: "16 / 9",
            boxShadow: "0 32px 80px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.06)",
          }}
        >
          {/* Video */}
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{
              transform: `scale(${videoScale})`,
              transformOrigin: `center ${videoPos}%`,
              filter: "brightness(0.52) saturate(0.75) contrast(1.05)",
            }}
          >
            <source src={`${import.meta.env.BASE_URL}export.mp4`} type="video/mp4" />
          </video>

          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/70 pointer-events-none" />

          {/* Text inside the frame */}
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-end pb-10 px-6 text-center">
            <h1
              className="text-white font-bold leading-[0.9] mb-4"
              style={{
                fontSize: "clamp(2.8rem, 9vw, 8rem)",
                letterSpacing: "-0.04em",
              }}
            >
              Auction
              <span className="font-light italic" style={{ letterSpacing: "-0.03em" }}>
                {" "}Ready.
              </span>
            </h1>
            <p className="text-[14px] md:text-[16px] text-white/60 max-w-sm mx-auto leading-relaxed mb-7 font-light">
              Budget-path planning powered by your league's actual 3-year auction history.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link
                to="/team"
                className="text-[13px] md:text-[15px] font-semibold text-[#1d1d1f] bg-white rounded-full px-6 py-2.5 hover:bg-white/90 transition-all shadow-sm"
              >
                Enter Draft Room
              </Link>
              <Link
                to="/espn"
                className="text-[13px] md:text-[15px] font-medium text-white/85 border border-white/25 rounded-full px-6 py-2.5 hover:border-white/60 hover:text-white transition-all"
              >
                Connect ESPN
              </Link>
            </div>
          </div>
        </div>

        {/* Below-video eyebrow on black bg */}
        <div className="mt-5 flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.35em] text-white/30">
          <span>Fantasy Football</span>
          <span className="text-white/15">·</span>
          <span>Auction Draft Planning</span>
        </div>

        {/* Scroll cue */}
        <div className="mt-6">
          <ArrowDown className="h-5 w-5 text-white/20 animate-bounce mx-auto" strokeWidth={1.5} />
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────── */}
      <section className="bg-white pt-28 pb-24 px-5">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16" data-reveal>
            <p className="text-[11px] uppercase tracking-[0.35em] text-[#6e6e73] mb-5">
              Built for auction drafts
            </p>
            <h2
              className="text-[#1d1d1f] font-bold leading-tight"
              style={{ fontSize: "clamp(2.2rem, 5vw, 3.8rem)", letterSpacing: "-0.035em" }}
            >
              Every dollar.
              <br />
              <span className="text-[#6e6e73] font-light">Every decision.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#d2d2d7] border border-[#d2d2d7] rounded-2xl overflow-hidden">
            {[
              {
                icon: <BarChart3 className="h-5 w-5" strokeWidth={1.5} />,
                title: "3 Years of League History",
                desc: "Real auction prices from your actual room — not ESPN projections. Know what CMC actually costs in your league.",
              },
              {
                icon: <Zap className="h-5 w-5" strokeWidth={1.5} />,
                title: "Budget Path Planning",
                desc: "Not just bid or pass. See your optimal spend path given what you still need and what's left in your budget.",
              },
              {
                icon: <Brain className="h-5 w-5" strokeWidth={1.5} />,
                title: "AI Draft Coach",
                desc: "Ask \"what are my RB options at $30?\" Get concrete players, tier context, and strategic tradeoffs.",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="bg-white p-9 flex flex-col gap-4"
                data-reveal
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className="text-[#eb0000]">{f.icon}</div>
                <h3
                  className="text-[#1d1d1f] font-semibold leading-snug"
                  style={{ fontSize: "clamp(1.1rem, 2vw, 1.25rem)", letterSpacing: "-0.015em" }}
                >
                  {f.title}
                </h3>
                <p className="text-[14px] leading-relaxed text-[#6e6e73]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DARK PULLQUOTE ────────────────────────────────────────────── */}
      <section className="bg-[#1d1d1f] py-32 px-5">
        <div className="mx-auto max-w-3xl text-center" data-reveal>
          <p className="text-[11px] uppercase tracking-[0.35em] text-white/30 mb-8">
            The edge you've been missing
          </p>
          <h2
            className="text-white font-bold leading-tight mb-8"
            style={{ fontSize: "clamp(1.9rem, 4.5vw, 3.4rem)", letterSpacing: "-0.03em" }}
          >
            Your league pays $47 for CMC.
            <br />
            <span className="text-white/35 font-light">ESPN says $38.</span>
          </h2>
          <p className="text-[16px] text-white/45 max-w-lg mx-auto leading-relaxed font-light">
            Every league has its own pricing DNA. We use yours — three seasons of actual
            auction results pulled straight from ESPN.
          </p>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section className="bg-[#f5f5f7] py-28 px-5">
        <div className="mx-auto max-w-4xl">
          <div className="mb-16" data-reveal>
            <p className="text-[11px] uppercase tracking-[0.35em] text-[#6e6e73] mb-5">
              Simple setup
            </p>
            <h2
              className="text-[#1d1d1f] font-bold leading-tight"
              style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)", letterSpacing: "-0.03em" }}
            >
              Up in 3 steps.
            </h2>
          </div>

          <div className="divide-y divide-[#d2d2d7]">
            {[
              {
                n: "01",
                title: "Connect your ESPN league",
                body: "Paste your SWID and espn_s2 cookies once. The app reads your roster, budget, and the last 3 seasons of auction data.",
              },
              {
                n: "02",
                title: "Set keepers and budget",
                body: "Add keeper costs, set your total auction budget, configure your roster slots — takes under two minutes.",
              },
              {
                n: "03",
                title: "Draft with the edge",
                body: "Real-time budget path, AI coach on demand, live ESPN sync as picks come off the board.",
              },
            ].map((s, i) => (
              <div
                key={s.n}
                className="flex items-start gap-10 py-10"
                data-reveal
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <span className="font-mono text-[13px] text-[#6e6e73] shrink-0 pt-1 w-7">
                  {s.n}
                </span>
                <div>
                  <h3
                    className="text-[#1d1d1f] font-semibold mb-2"
                    style={{ fontSize: "clamp(1.1rem, 2.2vw, 1.35rem)", letterSpacing: "-0.015em" }}
                  >
                    {s.title}
                  </h3>
                  <p className="text-[15px] leading-relaxed text-[#6e6e73] max-w-xl font-light">
                    {s.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────── */}
      <section className="bg-white py-28 px-5">
        <div className="mx-auto max-w-2xl text-center" data-reveal>
          <h2
            className="text-[#1d1d1f] font-bold leading-tight mb-5"
            style={{ fontSize: "clamp(2rem, 5vw, 3.6rem)", letterSpacing: "-0.035em" }}
          >
            Auction day is coming.
          </h2>
          <p className="text-[16px] text-[#6e6e73] mb-10 max-w-sm mx-auto leading-relaxed font-light">
            Get your league on the same page before the bidding starts.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              to="/team"
              className="text-[15px] font-semibold text-white bg-[#1d1d1f] rounded-full px-8 py-3.5 hover:bg-[#2d2d2d] transition-colors"
            >
              Enter Draft Room
            </Link>
            <Link
              to="/espn"
              className="text-[15px] text-[#1d1d1f] border border-[#d2d2d7] rounded-full px-8 py-3.5 hover:border-[#1d1d1f] transition-colors"
            >
              Connect ESPN →
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="border-t border-[#d2d2d7] py-7 px-5">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-3 text-[12px] text-[#6e6e73]">
          <span
            className="cursor-pointer hover:text-[#1d1d1f] transition-colors select-none"
            onClick={() => setShowSlider((v) => !v)}
          >
            Auction Ace Coach
          </span>
          <span>© 2025 — All bids final</span>
        </div>
      </footer>

      {/* ── VIDEO TUNER (hidden, tap footer to open) ─────────────────── */}
      {showSlider && (
        <div className="fixed bottom-20 left-1/2 z-[9999] -translate-x-1/2 bg-white border border-[#d2d2d7] rounded-2xl shadow-xl px-6 py-5 w-80">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] font-semibold text-[#1d1d1f]">Video Tuner</p>
            <button
              onClick={() => setShowSlider(false)}
              className="text-[#6e6e73] hover:text-[#1d1d1f] text-xl leading-none"
            >
              ×
            </button>
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-[11px] text-[#6e6e73] mb-2">
                Zoom — {Math.round(videoScale * 100)}%
              </p>
              <input
                type="range"
                min="1.0"
                max="3.0"
                step="0.05"
                value={videoScale}
                onChange={(e) => setVideoScale(parseFloat(e.target.value))}
                className="w-full accent-[#eb0000]"
              />
            </div>
            <div>
              <p className="text-[11px] text-[#6e6e73] mb-2">
                Pan — {Math.round(videoPos)}% from top
              </p>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={videoPos}
                onChange={(e) => setVideoPos(parseFloat(e.target.value))}
                className="w-full accent-[#eb0000]"
              />
            </div>
          </div>
        </div>
      )}

      <style>{`
        [data-reveal] {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.65s cubic-bezier(0.16,1,0.3,1), transform 0.65s cubic-bezier(0.16,1,0.3,1);
        }
        [data-reveal].is-visible {
          opacity: 1;
          transform: none;
        }
        @keyframes football-wobble {
          0%, 100% { transform: rotate(-18deg) scale(1); }
          25% { transform: rotate(-12deg) scale(1.04); }
          75% { transform: rotate(-22deg) scale(0.97); }
        }
      `}</style>
    </div>
  );
}
