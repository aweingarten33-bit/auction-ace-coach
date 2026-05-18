export default function HeroCanvas() {
  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
      <video
        src="/edge-video.mov"
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-cover"
      />
    </div>
  );
}
