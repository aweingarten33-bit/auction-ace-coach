/**
 * ComicCity — surreal 1940s noir comic-book city overlay.
 * Pure presentation. Fixed, pointer-events:none, behind app content.
 * Layers: sky → moon → distant skyline → neon billboards → buildings →
 *         steam vents → rain → fog → scanlines → smear/glitch → vignette.
 */
export default function ComicCity() {
  return (
    <div aria-hidden className="comic-city">
      {/* SKY GRADIENT + WARP */}
      <div className="cc-sky" />
      <div className="cc-moon" />
      <div className="cc-stars" />

      {/* DISTANT SKYLINE (SVG, hand-painted feel) */}
      <svg className="cc-skyline cc-skyline-far" viewBox="0 0 1600 600" preserveAspectRatio="none">
        <defs>
          <linearGradient id="far" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(280 70% 18%)" />
            <stop offset="100%" stopColor="hsl(220 80% 6%)" />
          </linearGradient>
        </defs>
        <path fill="url(#far)" stroke="hsl(60 100% 70% / 0.25)" strokeWidth="2"
          d="M0,600 L0,360 L40,360 L40,300 L90,300 L90,260 L140,260 L140,330 L200,330 L200,220 L260,220 L260,180 L320,180 L320,300 L380,300 L380,250 L440,250 L440,160 L500,160 L500,210 L560,210 L560,140 L620,140 L640,180 L700,180 L700,260 L770,260 L770,200 L830,200 L830,290 L900,290 L900,170 L970,170 L970,240 L1040,240 L1040,300 L1100,300 L1100,210 L1170,210 L1170,160 L1240,160 L1240,260 L1310,260 L1310,310 L1380,310 L1380,230 L1450,230 L1450,290 L1520,290 L1520,340 L1600,340 L1600,600 Z"/>
      </svg>

      {/* NEAR SKYLINE — thick comic outlines */}
      <svg className="cc-skyline cc-skyline-near" viewBox="0 0 1600 600" preserveAspectRatio="none">
        <defs>
          <linearGradient id="near" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(220 60% 9%)" />
            <stop offset="100%" stopColor="hsl(220 70% 3%)" />
          </linearGradient>
        </defs>
        <g stroke="black" strokeWidth="4" strokeLinejoin="miter" fill="url(#near)">
          <path d="M0,600 L0,420 L120,420 L120,330 L260,330 L260,260 L380,260 L380,360 L520,360 L520,200 L660,200 L660,300 L800,300 L800,180 L940,180 L940,280 L1080,280 L1080,360 L1220,360 L1220,240 L1360,240 L1360,340 L1480,340 L1480,420 L1600,420 L1600,600 Z"/>
        </g>
        {/* lit windows */}
        <g fill="hsl(48 100% 65%)">
          <rect x="40"  y="460" width="10" height="14"/><rect x="60"  y="460" width="10" height="14"/>
          <rect x="40"  y="490" width="10" height="14"/><rect x="80"  y="490" width="10" height="14"/>
          <rect x="280" y="290" width="8" height="12"/><rect x="300" y="290" width="8" height="12"/>
          <rect x="540" y="240" width="8" height="12"/><rect x="560" y="270" width="8" height="12"/>
          <rect x="820" y="220" width="8" height="12"/><rect x="860" y="240" width="8" height="12"/>
          <rect x="1100" y="320" width="8" height="12"/><rect x="1240" y="290" width="8" height="12"/>
        </g>
      </svg>

      {/* NEON BILLBOARDS — oversized, hyper-saturated */}
      <div className="cc-neon cc-neon-1">FANTASY</div>
      <div className="cc-neon cc-neon-2">AUCTION</div>
      <div className="cc-neon cc-neon-3">BID • LIVE</div>
      <div className="cc-neon cc-neon-4">★ KO ★</div>

      {/* STREETLIGHT POOLS */}
      <div className="cc-lamp cc-lamp-1" />
      <div className="cc-lamp cc-lamp-2" />
      <div className="cc-lamp cc-lamp-3" />

      {/* STEAM VENTS */}
      <div className="cc-steam cc-steam-1" />
      <div className="cc-steam cc-steam-2" />
      <div className="cc-steam cc-steam-3" />

      {/* RAIN */}
      <div className="cc-rain" />

      {/* HALFTONE COMIC DOTS */}
      <div className="cc-halftone" />

      {/* FOG */}
      <div className="cc-fog cc-fog-a" />
      <div className="cc-fog cc-fog-b" />

      {/* GLITCH / SMEAR FRAME */}
      <div className="cc-glitch" />

      {/* SCANLINES + VIGNETTE */}
      <div className="cc-scan" />
      <div className="cc-vignette" />
    </div>
  );
}
