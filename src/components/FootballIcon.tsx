interface Props {
  size?: number;
  className?: string;
  spin?: boolean;
}

// Tiny football glyph with laces
export default function FootballIcon({ size = 16, className = "", spin = false }: Props) {
  return (
    <svg
      width={size}
      height={size * 0.65}
      viewBox="0 0 32 22"
      className={`${className} ${spin ? "animate-[spin_6s_linear_infinite]" : ""}`}
      aria-hidden="true"
    >
      <ellipse
        cx="16"
        cy="11"
        rx="15"
        ry="9"
        fill="#8B4513"
        stroke="hsl(var(--foreground))"
        strokeWidth="0.8"
      />
      {/* Seam */}
      <path d="M2 11 Q16 2 30 11" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" fill="none" />
      <path d="M2 11 Q16 20 30 11" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" fill="none" />
      {/* Laces */}
      <line x1="13" y1="11" x2="19" y2="11" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
      {[9, 11, 13].map((x) => (
        <line key={x} x1={x + 4} y1="9.5" x2={x + 4} y2="12.5" stroke="white" strokeWidth="0.8" strokeLinecap="round" />
      ))}
    </svg>
  );
}
