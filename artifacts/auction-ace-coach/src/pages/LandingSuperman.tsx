import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const BG_IMAGES = ["IMG_2304.jpeg", "IMG_2308.jpeg", "IMG_2309.jpeg", "IMG_2310.jpeg"];

export default function LandingSuperman() {
  const navigate = useNavigate();
  const [cardExpanded, setCardExpanded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setCardExpanded(true), 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      background: "#0a0e1a",
      minHeight: "100svh",
      fontFamily: "'Playfair Display', Georgia, serif",
      position: "relative",
      overflow: "hidden",
    }}>

      {/* ── FULL-SCREEN FORTRESS BACKGROUND ───────────────────────────────── */}
      <img
        src={`${import.meta.env.BASE_URL}${BG_IMAGES[0]}`}
        alt=""
        style={{
          position: "fixed", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover",
          objectPosition: "center center",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Dark vignette */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 2, pointerEvents: "none",
        background: "linear-gradient(to bottom, rgba(10,14,26,0.35) 0%, rgba(10,14,26,0.1) 40%, rgba(10,14,26,0.6) 100%)",
      }} />

      {/* ── EXPANDING CARD ────────────────────────────────────────────────── */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 10,
      }}>
        <div style={{
          width: cardExpanded ? "88vw" : "28vw",
          maxWidth: "420px",
          height: "72svh",
          borderRadius: "24px",
          overflow: "hidden",
          position: "relative",
          transition: "width 1.1s cubic-bezier(0.16,1,0.3,1)",
          willChange: "width",
          boxShadow: "0 12px 60px rgba(0,0,0,0.4)",
          pointerEvents: "auto",
        }}>
          {/* Football video */}
          <video
            autoPlay loop muted playsInline preload="auto"
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%",
              objectFit: "cover",
              objectPosition: "center center",
              pointerEvents: "none",
              opacity: 0.5,
              filter: "brightness(1.3) contrast(1.05) saturate(1.2)",
            }}
          >
            <source src={`${import.meta.env.BASE_URL}export.mp4`} type="video/mp4" />
          </video>

          {/* Crystal glow */}
          <div aria-hidden style={{
            position: "absolute", inset: 0,
            background: "radial-gradient(ellipse at center, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.2) 45%, rgba(255,255,255,0) 80%)",
            mixBlendMode: "screen",
            pointerEvents: "none",
          }} />

          {/* Zoom-in text animation */}
          <style>{`
            @keyframes supermanZoom {
              0%   { opacity: 0; transform: scale(0.05); filter: blur(8px); }
              60%  { opacity: 1; filter: blur(1.5px); }
              100% { opacity: 1; transform: scale(1); filter: blur(0); }
            }
            .nfl-word { display: inline-block; opacity: 0; will-change: transform, opacity, filter; transform-origin: center center; }
          `}</style>

          {/* Top headline */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "28px 24px 0" }}>
            <h1 style={{
              color: "white", fontSize: "clamp(1.25rem, 4.2vw, 2.4rem)",
              fontWeight: 700, lineHeight: 1.15, margin: 0,
              textShadow: "0 2px 12px rgba(0,0,0,0.5)",
            }}>
              <span style={{ whiteSpace: "nowrap", display: "block" }}>
                {cardExpanded && ["Personalized", "Fantasy", "Football"].map((w, i) => (
                  <span key={w} className="nfl-word" style={{
                    animation: "supermanZoom 0.7s cubic-bezier(0.2,0.7,0.3,1) forwards",
                    animationDelay: `${0.3 + i * 0.22}s`,
                    marginRight: "0.28em",
                  }}>{w}</span>
                ))}
              </span>
              <span style={{ display: "block" }}>
                {cardExpanded && ["Auction", "Intelligence"].map((w, i) => (
                  <span key={w} className="nfl-word" style={{
                    animation: "supermanZoom 0.7s cubic-bezier(0.2,0.7,0.3,1) forwards",
                    animationDelay: `${1.1 + i * 0.22}s`,
                    marginRight: "0.28em",
                  }}>{w}</span>
                ))}
              </span>
            </h1>
          </div>

          {/* Bottom sub-copy */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 24px 28px" }}>
            <p style={{
              color: "rgba(255,255,255,0.85)", fontSize: "clamp(0.9rem, 2.4vw, 1.1rem)",
              lineHeight: 1.4, margin: 0, fontStyle: "italic",
              textShadow: "0 2px 12px rgba(0,0,0,0.5)",
              opacity: cardExpanded ? 1 : 0,
              transition: "opacity 0.8s ease 1.8s",
            }}>
              Powered by your league's ESPN history<br />and real-time auction data.
            </p>
          </div>
        </div>
      </div>

      {/* ── ENTER DRAFT ROOM BUTTON ───────────────────────────────────────── */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        zIndex: 20,
        display: "flex", flexDirection: "column", alignItems: "center",
        paddingBottom: "max(32px, env(safe-area-inset-bottom))",
        opacity: cardExpanded ? 1 : 0,
        transition: "opacity 0.8s ease 1.4s",
      }}>
        <button
          onClick={() => navigate("/draft-room")}
          style={{
            background: "white", color: "#0a0e1a",
            border: "none", borderRadius: "100px",
            padding: "18px 48px",
            fontFamily: "'Inter', sans-serif",
            fontSize: "15px", fontWeight: 700,
            letterSpacing: "0.06em", textTransform: "uppercase",
            cursor: "pointer",
            boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
          }}
        >
          Enter Draft Room
        </button>
      </div>

    </div>
  );
}
