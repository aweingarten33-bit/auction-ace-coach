export default function HeroCanvas() {
  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none">
      <video
        src="/edge-video.mov"
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          minWidth: "100%",
          minHeight: "100%",
          width: "auto",
          height: "auto",
          transform: "translate(-50%, -50%)",
          objectFit: "cover",
        }}
      />
    </div>
  );
}
