import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const BG_IMAGES = ["IMG_2304.jpeg", "IMG_2308.jpeg", "IMG_2309.jpeg", "IMG_2310.jpeg"];

export default function LandingV2() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      background: "#1f2933",
      minHeight: "100svh",
      fontFamily: "'Inter', sans-serif",
      position: "relative",
      overflow: "hidden",
      color: "white",
    }}>

      {/* ── FULL-BLEED FOOTBALL VIDEO BACKGROUND ──────────────────────────── */}
      <video
        autoPlay loop muted playsInline preload="auto"
        style={{
          position: "fixed", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover",
          objectPosition: "center center",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <source src={`${import.meta.env.BASE_URL}export.mp4`} type="video/mp4" />
      </video>

      {/* Dark vignette */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
        background: "linear-gradient(to bottom, rgba(31,41,51,0.55) 0%, rgba(15,21,28,0.6) 60%, rgba(8,12,18,0.8) 100%)",
      }} />

      {/* ── DARK HEADER BAR ───────────────────────────────────────────────── */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
        background: "rgba(31,41,51,0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 32px",
        height: 72,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 700, fontSize: 13,
          color: "rgba(255,255,255,0.4)",
          letterSpacing: "0.2em", textTransform: "uppercase",
        }}>
          Draft Room
        </div>
        <div style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 13, fontWeight: 600,
          color: "rgba(255,255,255,0.6)",
          letterSpacing: "0.01em",
          textAlign: "right",
        }}>
          2025 Season
        </div>
      </header>

      {/* ── CENTERED HERO ─────────────────────────────────────────────────── */}
      <main style={{
        position: "relative", zIndex: 10,
        minHeight: "100svh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: "120px 32px 140px",
        boxSizing: "border-box",
      }}>
        <h1 style={{
          margin: 0,
          fontFamily: "'Inter', sans-serif",
          fontWeight: 700,
          fontSize: "clamp(2.2rem, 6vw, 5rem)",
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
          color: "white",
          opacity: visible ? 1 : 0,
          transform: visible ? "none" : "translateY(24px)",
          transition: "opacity 0.9s ease 0.1s, transform 0.9s cubic-bezier(0.16,1,0.3,1) 0.1s",
        }}>
          Draft with<br />
          <span style={{ color: "#5fd4d4", fontStyle: "italic" }}>the Edge.</span>
        </h1>

        <p style={{
          marginTop: 24,
          fontFamily: "'Inter', sans-serif",
          fontWeight: 400,
          fontSize: "clamp(1rem, 2vw, 1.25rem)",
          color: "rgba(255,255,255,0.6)",
          lineHeight: 1.6,
          maxWidth: 480,
          opacity: visible ? 1 : 0,
          transform: visible ? "none" : "translateY(20px)",
          transition: "opacity 0.9s ease 0.35s, transform 0.9s cubic-bezier(0.16,1,0.3,1) 0.35s",
        }}>
          Budget-first auction strategy powered by<br />your league's 3-year price history.
        </p>

        <button
          onClick={() => navigate("/draft-room")}
          style={{
            marginTop: 48,
            background: "#5fd4d4", color: "#0a1420",
            border: "none", borderRadius: "100px",
            padding: "18px 52px",
            fontFamily: "'Inter', sans-serif",
            fontSize: "15px", fontWeight: 700,
            letterSpacing: "0.04em",
            cursor: "pointer",
            boxShadow: "0 8px 32px rgba(95,212,212,0.3)",
            opacity: visible ? 1 : 0,
            transform: visible ? "none" : "translateY(16px)",
            transition: "opacity 0.9s ease 0.55s, transform 0.9s cubic-bezier(0.16,1,0.3,1) 0.55s",
          }}
        >
          Enter Draft Room
        </button>
      </main>

    </div>
  );
}
