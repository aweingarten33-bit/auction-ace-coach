import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black text-white">
      {/* Fullscreen looping hero video */}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src="/video/hero.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      />

      {/* Darkening overlay for legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/80" />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-5 md:px-10">
          <span className="font-condensed text-sm uppercase tracking-[0.3em] text-white/80">
            The Auction Room
          </span>
          <Link
            to="/auth"
            className="font-condensed text-xs uppercase tracking-[0.25em] text-white/80 hover:text-white"
          >
            Enter →
          </Link>
        </header>

        {/* Hero copy — bottom-anchored, F&B style */}
        <main className="mt-auto px-6 pb-16 md:px-10 md:pb-24">
          <h1 className="font-heading text-[14vw] font-black uppercase leading-[0.85] tracking-tight md:text-[10vw]">
            Built<br />For The<br />Draft.
          </h1>
          <p className="mt-6 max-w-md font-condensed text-base uppercase tracking-[0.2em] text-white/70 md:text-lg">
            Football. Auctions. Decisions in seconds.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to="/team"
              className="rounded-full bg-white px-7 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-white/90"
            >
              Get started
            </Link>
            <Link
              to="/auth"
              className="rounded-full border border-white/40 px-7 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white/10"
            >
              Connect ESPN
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
