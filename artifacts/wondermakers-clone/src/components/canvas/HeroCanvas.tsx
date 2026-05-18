export default function HeroCanvas() {
  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-white">
      <style>{`
        @keyframes heroDrift {
          0%   { transform: translate(-50%, -50%) scale(1.2); }
          50%  { transform: translate(-52%, -48%) scale(1.35); }
          100% { transform: translate(-50%, -50%) scale(1.2); }
        }
        @keyframes heroKenBurns {
          0%   { transform: translate(-50%, -50%) scale(1); }
          50%  { transform: translate(-51%, -49%) scale(1.08); }
          100% { transform: translate(-50%, -50%) scale(1); }
        }
        .hero-drift { animation: heroDrift 40s ease-in-out infinite; }
        .hero-kb    { animation: heroKenBurns 30s ease-in-out infinite; }
      `}</style>

      <video
        autoPlay
        loop
        muted
        playsInline
        aria-hidden
        className="hero-drift"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "blur(40px) saturate(1.1)",
          opacity: 0.25,
        }}
      >
        <source src="/edge-video.mp4" type="video/mp4" />
      </video>

      <video
        autoPlay
        loop
        muted
        playsInline
        className="hero-kb"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "100%",
          height: "100%",
          objectFit: "contain",
          opacity: 0.35,
        }}
      >
        <source src="/edge-video.mp4" type="video/mp4" />
        <source src="/edge-video.mov" type="video/quicktime" />
      </video>

      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0) 35%, rgba(0,0,0,0.35) 75%, rgba(0,0,0,0.6) 100%)",
        }}
      />

      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 18%, rgba(255,255,255,0) 82%, rgba(255,255,255,0.95) 100%)",
        }}
      />

      <svg
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0.18,
          mixBlendMode: "overlay",
        }}
      >
        <filter id="heroGrain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#heroGrain)" />
      </svg>
    </div>
  );
}
