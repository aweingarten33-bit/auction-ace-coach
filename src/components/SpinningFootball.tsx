interface Props {
  size?: number;
  speed?: number; // seconds per rotation
}

export default function SpinningFootball({ size = 220, speed = 12 }: Props) {
  const r = size / 2;
  const textRadius = r + 28;
  const circumference = 2 * Math.PI * textRadius;
  const ringText = "AUCTION ACE  •  DRAFT ROOM  •  FANTASY FOOTBALL  •  ";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size + 80, height: size + 80 }}>
      {/* Rotating text ring */}
      <svg
        className="absolute"
        style={{
          width: size + 80,
          height: size + 80,
          animation: `football-orbit ${speed * 2.5}s linear infinite`,
        }}
        viewBox={`0 0 ${size + 80} ${size + 80}`}
      >
        <defs>
          <path
            id="ring-path"
            d={`M ${(size + 80) / 2},${(size + 80) / 2} m -${textRadius},0 a ${textRadius},${textRadius} 0 1,1 ${textRadius * 2},0 a ${textRadius},${textRadius} 0 1,1 -${textRadius * 2},0`}
          />
        </defs>
        <text
          className="font-bebas"
          fontSize="11"
          letterSpacing="3"
          fill="rgba(255,255,255,0.35)"
          style={{ fontFamily: '"Bebas Neue", "Anton", sans-serif' }}
        >
          <textPath href="#ring-path">{ringText.repeat(3)}</textPath>
        </text>
      </svg>

      {/* Football */}
      <svg
        width={size}
        height={size * 0.65}
        viewBox="0 0 200 130"
        style={{ animation: `football-wobble ${speed * 0.7}s ease-in-out infinite` }}
      >
        <defs>
          <radialGradient id="fb-grad" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#c17f3e" />
            <stop offset="60%" stopColor="#8B4513" />
            <stop offset="100%" stopColor="#4a2008" />
          </radialGradient>
          <radialGradient id="fb-shine" cx="35%" cy="25%" r="45%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>

        {/* Shadow */}
        <ellipse cx="100" cy="125" rx="72" ry="8" fill="rgba(0,0,0,0.4)" />

        {/* Body */}
        <ellipse cx="100" cy="62" rx="90" ry="52" fill="url(#fb-grad)" />
        <ellipse cx="100" cy="62" rx="90" ry="52" fill="url(#fb-shine)" />

        {/* Seam lines */}
        <path d="M 15,62 Q 100,10 185,62" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
        <path d="M 15,62 Q 100,114 185,62" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />

        {/* Center seam */}
        <line x1="100" y1="22" x2="100" y2="102" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />

        {/* Laces */}
        {[38, 50, 62, 74, 86].map((y) => (
          <line key={y} x1="88" y1={y} x2="112" y2={y} stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        ))}
        {/* Lace binding threads */}
        {[38, 50, 62, 74, 86].map((y) => (
          <line key={`t${y}`} x1="100" y1={y - 6} x2="100" y2={y + 6} stroke="white" strokeWidth="1" strokeLinecap="round" />
        ))}

        {/* Tip highlights */}
        <ellipse cx="18" cy="62" rx="5" ry="3" fill="rgba(255,255,255,0.15)" />
        <ellipse cx="182" cy="62" rx="5" ry="3" fill="rgba(255,255,255,0.15)" />
      </svg>
    </div>
  );
}
