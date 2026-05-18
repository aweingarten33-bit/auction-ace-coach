export default function HeroCanvas() {
  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-white">
      <video
        autoPlay
        loop
        muted
        playsInline
        aria-hidden
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "100%",
          height: "100%",
          transform: "translate(-50%, -50%) scale(1.2)",
          objectFit: "cover",
          filter: "blur(40px) saturate(1.1)",
          opacity: 0.45,
        }}
      >
        <source src="/edge-video.mp4" type="video/mp4" />
      </video>
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "100%",
          height: "100%",
          transform: "translate(-50%, -50%)",
          objectFit: "contain",
          opacity: 0.55,
        }}
      >
        <source src="/edge-video.mp4" type="video/mp4" />
        <source src="/edge-video.mov" type="video/quicktime" />
      </video>
    </div>
  );
}
