import { useEffect, useState } from "react";
import LandingSuperman from "./LandingSuperman";
import LandingV2 from "./LandingV2";

type Variant = "superman" | "v2";
const STORAGE_KEY = "landing-variant";

export default function LandingEditorial() {
  const [variant, setVariant] = useState<Variant>("superman");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "superman" || saved === "v2") setVariant(saved);
  }, []);

  const toggle = () => {
    const next: Variant = variant === "superman" ? "v2" : "superman";
    setVariant(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  return (
    <div style={{ position: "relative" }}>
      {variant === "superman" ? <LandingSuperman /> : <LandingV2 />}

      <button
        onClick={toggle}
        aria-label="Switch landing variant"
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 9999,
          background: "rgba(0,0,0,0.75)",
          color: "white",
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: 999,
          padding: "10px 16px",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          cursor: "pointer",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          userSelect: "none",
        }}
      >
        <span style={{ opacity: 0.55 }}>view</span>
        <span style={{ fontWeight: 700 }}>
          {variant === "superman" ? "[ superman ]" : "[ v2 ]"}
        </span>
        <span style={{ opacity: 0.55 }}>↻</span>
      </button>
    </div>
  );
}
