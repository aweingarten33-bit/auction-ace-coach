interface Props {
  size?: number;
  className?: string;
}

// Compact football helmet glyph — side profile, facemask + chinstrap
export default function HelmetIcon({ size = 22, className = "" }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      {/* Shell */}
      <path
        d="M6 18c0-6 4.5-10 11-10 5.5 0 9 3 9 7 0 2-1 3.5-2.5 4.5l-1 .6c-.6.4-.9 1-.9 1.7v1.4c0 1-.8 1.8-1.8 1.8H10c-2.5 0-4-1.6-4-4v-3z"
        fill="hsl(var(--primary))"
        stroke="hsl(var(--foreground))"
        strokeWidth="1"
      />
      {/* Shell shine */}
      <path
        d="M9 13c1.5-2.5 4-4 7-4.5"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Ear hole */}
      <circle cx="15" cy="19" r="1.4" fill="hsl(var(--foreground))" opacity="0.5" />
      {/* Facemask */}
      <path
        d="M22 21h2.5M22 23.5h2.5M21.5 18.5c1.8 0 3 1.2 3 3v2"
        stroke="hsl(var(--foreground))"
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Chinstrap */}
      <path
        d="M19 25.5l3-1"
        stroke="hsl(var(--foreground))"
        strokeWidth="0.9"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}
