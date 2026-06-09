import { useEffect, useState } from "react";

/**
 * TERRACE DISPATCH — Archive Zine landing page
 * One scrolling broadsheet. Photocopied. Stapled. Crooked on purpose.
 */
export default function Zine() {
  const [scroll, setScroll] = useState(0);
  useEffect(() => {
    const onScroll = () => setScroll(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="zine-root min-h-screen w-full overflow-x-hidden">
      <style>{`
        .zine-root {
          --paper: #e8e4d8;
          --paper-2: #ddd6c4;
          --ink: #15130f;
          --ink-soft: #2a2620;
          --bleed: #b8120a;       /* bled-through red stamp */
          --pitch: #1f5e2a;       /* bruised pitch green */
          --tape:  #e7c200;       /* warning-tape yellow */

          background: var(--paper);
          color: var(--ink);
          font-family: "Special Elite", "Courier Prime", "Courier New", ui-monospace, monospace;
          position: relative;
        }
        /* halftone + paper noise */
        .zine-root::before {
          content: "";
          position: fixed; inset: 0;
          pointer-events: none; z-index: 50;
          background-image:
            radial-gradient(rgba(0,0,0,0.18) 1px, transparent 1.2px),
            radial-gradient(rgba(0,0,0,0.06) 1px, transparent 1px);
          background-size: 3px 3px, 7px 7px;
          background-position: 0 0, 1px 2px;
          mix-blend-mode: multiply;
          opacity: 0.55;
        }
        .zine-root::after {
          content:"";
          position: fixed; inset:0;
          pointer-events:none; z-index: 51;
          background:
            repeating-linear-gradient(0deg, rgba(0,0,0,0.04) 0 1px, transparent 1px 3px),
            radial-gradient(ellipse at 30% 20%, transparent 40%, rgba(0,0,0,0.18) 100%);
          mix-blend-mode: multiply;
        }
        .zine-stamp {
          font-family: "Anton", "Impact", sans-serif;
          letter-spacing: 0.02em;
          color: var(--bleed);
          border: 4px double var(--bleed);
          padding: 6px 14px 4px;
          display: inline-block;
          transform: rotate(-7deg);
          text-transform: uppercase;
          opacity: 0.92;
          filter: blur(0.2px) contrast(1.1);
        }
        .zine-mast {
          font-family: "Anton", "Impact", sans-serif;
          font-weight: 900;
          line-height: 0.82;
          letter-spacing: -0.02em;
          text-transform: uppercase;
          /* toner crack */
          background:
            radial-gradient(circle at 20% 30%, transparent 1px, var(--ink) 1.2px) 0 0/2px 2px,
            var(--ink);
          -webkit-background-clip: text; background-clip: text;
          color: transparent;
        }
        .zine-type {
          font-family: "Special Elite", "Courier Prime", monospace;
        }
        .zine-cut {
          background: var(--paper-2);
          box-shadow:
            0 0 0 1px rgba(0,0,0,0.25),
            6px 8px 0 -2px rgba(0,0,0,0.18),
            18px 22px 30px -10px rgba(0,0,0,0.35);
        }
        .zine-tape {
          position: absolute;
          background: var(--tape);
          opacity: 0.78;
          mix-blend-mode: multiply;
          box-shadow: 0 1px 0 rgba(0,0,0,0.15);
        }
        .zine-staple {
          width: 18px; height: 3px;
          background: linear-gradient(180deg, #888 0%, #444 50%, #222 100%);
          box-shadow: 0 1px 0 rgba(0,0,0,0.4);
          position: absolute;
        }
        .zine-circle-pen {
          border: 2px solid var(--bleed);
          border-radius: 50%;
          padding: 2px 10px;
          display: inline-block;
          transform: rotate(-3deg);
          color: var(--bleed);
        }
        .zine-strike { text-decoration: line-through; text-decoration-color: var(--bleed); text-decoration-thickness: 3px; }
        .zine-marker {
          background: linear-gradient(180deg, transparent 55%, var(--tape) 55% 92%, transparent 92%);
          padding: 0 2px;
        }
        .zine-photo {
          filter: grayscale(1) contrast(1.6) brightness(0.95);
          background: #999;
          mix-blend-mode: multiply;
        }
        .zine-halftone {
          background-image:
            radial-gradient(circle, var(--ink) 30%, transparent 32%);
          background-size: 5px 5px;
          color: transparent;
        }
        .zine-btn {
          font-family: "Anton", "Impact", sans-serif;
          letter-spacing: 0.04em;
          background: var(--ink);
          color: var(--paper);
          padding: 18px 28px 14px;
          text-transform: uppercase;
          border: none;
          cursor: pointer;
          box-shadow: 6px 6px 0 0 var(--bleed);
          transition: transform 0.05s steps(2), box-shadow 0.05s steps(2);
        }
        .zine-btn:hover { transform: translate(2px, 2px); box-shadow: 4px 4px 0 0 var(--bleed); }
        .zine-btn:active { transform: translate(6px, 6px); box-shadow: 0 0 0 0 var(--bleed); }
        .crooked-1 { transform: rotate(-1.2deg); }
        .crooked-2 { transform: rotate(0.8deg); }
        .crooked-3 { transform: rotate(-0.5deg); }
        .fold-line {
          position: absolute; left: 0; right: 0; height: 1px;
          background: rgba(0,0,0,0.25);
          box-shadow: 0 1px 0 rgba(255,255,255,0.4);
        }
      `}</style>

      {/* Google Fonts — display=swap */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Anton&family=Special+Elite&family=Courier+Prime:wght@400;700&display=swap"
        rel="stylesheet"
      />

      {/* ============ COVER ============ */}
      <section className="relative px-5 pt-6 pb-16 max-w-[820px] mx-auto">
        {/* masthead bar */}
        <div className="flex items-end justify-between border-b-4 border-double border-[var(--ink)] pb-2 zine-type text-[11px] uppercase tracking-widest">
          <span>Issue No. 047 · Unsanctioned</span>
          <span>£0.00 / Pass it on</span>
        </div>

        {/* Title */}
        <h1 className="zine-mast text-[clamp(72px,18vw,180px)] mt-4 crooked-1">
          Terrace<br />Dispatch
        </h1>

        <div className="flex flex-wrap items-center gap-3 mt-3">
          <span className="zine-stamp text-xl">Property of nobody</span>
          <span className="zine-type text-[12px] uppercase tracking-wider opacity-80">
            Photocopied · Stapled · Smuggled in
          </span>
        </div>

        {/* Hero "photo" — a halftone block */}
        <div className="relative mt-8 zine-cut crooked-2">
          <div className="zine-staple" style={{ top: 8, left: 24 }} />
          <div className="zine-staple" style={{ top: 8, right: 24 }} />
          <div
            className="zine-photo h-[260px] sm:h-[340px] w-full"
            style={{
              backgroundImage:
                "radial-gradient(circle at 40% 35%, #111 0 8%, transparent 9%), radial-gradient(circle at 60% 65%, #222 0 12%, transparent 13%)",
              backgroundColor: "#7a7a7a",
            }}
            aria-label="Floodlit terrace, halftone"
          />
          <div className="absolute bottom-2 left-3 zine-type text-[10px] uppercase tracking-widest opacity-75">
            Fig. 1 — North end, 11:47 PM
          </div>
        </div>

        {/* Lede */}
        <p className="zine-type mt-8 text-[15px] leading-7 max-w-[60ch] crooked-3">
          A weekly dispatch for the people who actually go. Not the studios. Not the
          accounts with blue ticks. Not the men in the boxes. We pass real notes —
          line-ups they won't post, scout reports they won't print,{" "}
          <span className="zine-marker">odds the books haven't moved yet</span>, and
          the kind of context you only get standing in the cold next to someone who's
          been doing this for thirty years.
        </p>

        <div className="mt-6 flex items-center gap-4">
          <button
            className="zine-btn"
            onClick={() => document.getElementById("manifesto")?.scrollIntoView({ behavior: "auto" })}
          >
            Read the back page →
          </button>
          <span className="zine-circle-pen zine-type text-[12px]">No app. No login.</span>
        </div>

        {/* tape strips */}
        <div className="zine-tape" style={{ top: 30, right: -10, width: 120, height: 22, transform: "rotate(18deg)" }} />
        <div className="zine-tape" style={{ top: 380, left: -20, width: 90, height: 18, transform: "rotate(-12deg)" }} />
      </section>

      <div className="fold-line" style={{ position: "relative", margin: "0 auto", maxWidth: 820 }} />

      {/* ============ MIDDLE — communal spread ============ */}
      <section className="relative px-5 py-14 max-w-[820px] mx-auto">
        <div className="flex items-baseline gap-3 mb-6">
          <span className="zine-stamp">Pages 4–5</span>
          <h2 className="zine-mast text-3xl crooked-2">The Crowd Speaks</h2>
        </div>

        {/* Three column-ish marginalia */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <article className="zine-cut p-5 crooked-1 relative">
            <div className="zine-tape" style={{ top: -8, left: 18, width: 60, height: 16 }} />
            <h3 className="font-['Anton'] uppercase text-2xl leading-none mb-2">
              They moved the line.<br />
              <span className="zine-strike opacity-80">Nobody noticed.</span>
            </h3>
            <p className="zine-type text-[13px] leading-6">
              Tuesday, 04:12. The handle drops two and a half before the team sheet
              even leaks. Someone always knows first. The dispatch tells you who.
            </p>
            <div className="mt-3 zine-circle-pen text-[11px]">circled in pen</div>
          </article>

          <article className="zine-cut p-5 crooked-2 relative">
            <h3 className="font-['Anton'] uppercase text-2xl leading-none mb-2">
              Scout note, smuggled
            </h3>
            <p className="zine-type text-[13px] leading-6">
              "Left back can't turn. Whole right side eats him alive after the 60th
              minute. Don't ask me how I know."
            </p>
            <p className="zine-type text-[11px] mt-3 opacity-70">— anon., posted on a fence</p>
          </article>

          <article className="zine-cut p-5 crooked-3 relative sm:col-span-2">
            <div className="zine-staple" style={{ top: 8, left: "50%" }} />
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="zine-halftone h-[110px]" style={{ backgroundSize: "4px 4px" }} />
              <div className="col-span-2">
                <h3 className="font-['Anton'] uppercase text-2xl leading-none mb-2">
                  What you get in the envelope
                </h3>
                <ul className="zine-type text-[13px] leading-6 list-none space-y-1">
                  <li>— Friday team-sheet leaks (before the leaks leak)</li>
                  <li>— One <span className="zine-marker">market-mover</span> per slate, no padding</li>
                  <li>— A scout's margin notes. Hand-typed. Misspelled.</li>
                  <li>— The week's grievance, fully unedited</li>
                </ul>
              </div>
            </div>
          </article>
        </div>

        {/* big quote */}
        <blockquote className="mt-12 crooked-1">
          <div className="font-['Anton'] uppercase text-[clamp(28px,7vw,64px)] leading-[0.95]">
            "The official world<br />
            <span style={{ color: "var(--bleed)" }}>doesn't go to away days.</span>"
          </div>
          <div className="zine-type text-[12px] mt-3 opacity-80">— marginalia, Issue 031</div>
        </blockquote>

        {/* Specimen card */}
        <div className="mt-12 zine-cut p-5 crooked-2 relative">
          <div className="zine-tape" style={{ top: -10, right: 30, width: 80, height: 18, transform: "rotate(8deg)" }} />
          <div className="flex items-baseline justify-between border-b border-dashed border-[var(--ink)] pb-2 mb-3">
            <span className="font-['Anton'] uppercase text-xl">Specimen — Issue 046</span>
            <span className="zine-type text-[11px] uppercase opacity-70">redacted for non-subscribers</span>
          </div>
          <pre className="zine-type text-[12px] leading-5 whitespace-pre-wrap">
{`> 19:42 :: handle on the under drifts 0.5 — no news yet
> 20:11 :: ████████ ruled out, source: kit man's brother
> 20:34 :: book finally moves. you already moved.
> 21:00 :: kickoff. you knew.`}
          </pre>
        </div>
      </section>

      <div className="fold-line" style={{ position: "relative", margin: "0 auto", maxWidth: 820 }} />

      {/* ============ BACK PAGE — manifesto + CTA ============ */}
      <section id="manifesto" className="relative px-5 pt-16 pb-24 max-w-[820px] mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <span className="zine-stamp">Back page</span>
          <span className="zine-type text-[11px] uppercase tracking-widest opacity-70">
            Editor's note · do not skip
          </span>
        </div>

        <h2 className="zine-mast text-[clamp(56px,14vw,140px)] crooked-1">
          Subscribe.<br />
          Or don't.
        </h2>

        <div className="zine-type text-[15px] leading-7 mt-6 max-w-[60ch] space-y-4">
          <p>
            Twelve dollars a month. Cancel by ripping it up. We'll mail you a paper
            copy and a PDF that looks like it was photocopied through a screen door,
            because it was.
          </p>
          <p>
            We don't have an app. We don't have notifications. We don't sell your
            address — we don't even keep it past the envelope. If you want a slick
            product, the official world has a thousand of them.{" "}
            <span className="zine-marker">This isn't that.</span>
          </p>
          <p className="font-bold">
            If you've read this far, you already know whether you're in.
          </p>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <button className="zine-btn text-2xl">I'm in →</button>
          <div className="zine-type text-[12px] leading-5 max-w-[28ch] opacity-80">
            First issue ships Friday.<br />
            No second emails. Ever.
          </div>
        </div>

        {/* Colophon */}
        <footer className="mt-20 border-t-4 border-double border-[var(--ink)] pt-4 zine-type text-[11px] uppercase tracking-widest flex flex-wrap justify-between gap-2">
          <span>Printed nowhere · Distributed everywhere</span>
          <span>© nobody, {new Date().getFullYear()}</span>
        </footer>

        {/* page-number stamp */}
        <div
          className="absolute right-4 bottom-4 zine-stamp text-sm"
          style={{ transform: `rotate(${-6 + (scroll % 4)}deg)` }}
        >
          Pg. 12
        </div>
      </section>
    </div>
  );
}
