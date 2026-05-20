import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedTeam } from "@/hooks/useSelectedTeam";
import { toast } from "sonner";

interface Team { id: number; name: string; abbrev?: string }

const BG_IMAGES = ["IMG_2304.jpeg", "IMG_2308.jpeg", "IMG_2309.jpeg", "IMG_2310.jpeg"];

export default function LandingEditorial() {
  const navigate    = useNavigate();
  const { setTeam } = useSelectedTeam();

  const [menuOpen,     setMenuOpen]     = useState(false);
  const [teams,        setTeams]        = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [cardExpanded, setCardExpanded] = useState(false);
  const [hoverIdx,     setHoverIdx]     = useState<number | null>(null);
  const [bgIndex]                       = useState(0);

  // Expand card on load
  useEffect(() => {
    const t = setTimeout(() => setCardExpanded(true), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const openMenu = async () => {
    setMenuOpen(true);
    if (teams.length > 0) return;
    setLoadingTeams(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) await supabase.auth.signInAnonymously();
      const { data } = await supabase.functions.invoke("league-teams");
      const list: Team[] = (data?.teams ?? []).map((t: any) => ({ id: t.id, name: t.name, abbrev: t.abbrev }));
      setTeams(list);
    } catch { /* silent */ } finally { setLoadingTeams(false); }
  };

  const pickTeam = (team: Team) => {
    setTeam(team);
    toast.success(`Let's go, ${team.name}!`);
    navigate("/draft-room", { replace: true });
  };

  const skip = () => {
    setTeam(null);
    navigate("/draft-room", { replace: true });
  };

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

      {/* Dark vignette over video */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
        background: "linear-gradient(to bottom, rgba(31,41,51,0.45) 0%, rgba(15,21,28,0.55) 60%, rgba(8,12,18,0.7) 100%)",
      }} />

      {/* ── BLEND-STYLE DARK HEADER BAR ───────────────────────────────────── */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
        background: "#1f2933",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 32px",
        height: 84,
      }}>
        {/* Logo */}
        <div style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 600,
          fontSize: 28,
          color: "white",
          letterSpacing: "-0.01em",
        }}>
          auction<span style={{ color: "#5fd4d4" }}>.</span>
        </div>

        {/* Right side: Let's draft + hamburger */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <button
            onClick={openMenu}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.5)",
              color: "white",
              padding: "12px 26px",
              fontFamily: "'Inter', sans-serif",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              letterSpacing: "0.02em",
              transition: "background 0.25s ease",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            Let's draft
          </button>

          <button
            onClick={openMenu}
            aria-label="Menu"
            style={{
              width: 40, height: 40,
              background: "transparent",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexDirection: "column", gap: "6px",
            }}
          >
            <span style={{ display: "block", width: 26, height: 2, background: "white" }} />
            <span style={{ display: "block", width: 26, height: 2, background: "white" }} />
            <span style={{ display: "block", width: 26, height: 2, background: "white" }} />
          </button>
        </div>
      </header>

      {/* ── NOOMO-LABS-STYLE FULLSCREEN MENU ──────────────────────────────── */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 250,
          background: "#fafafa",
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? "auto" : "none",
          transition: "opacity 0.5s cubic-bezier(0.16,1,0.3,1)",
          overflowY: "auto",
        }}
        onClick={() => setMenuOpen(false)}
      >
        {/* Pixelated soft pattern background */}
        <div
          aria-hidden
          style={{
            position: "absolute", inset: 0,
            backgroundImage:
              "radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)",
            backgroundSize: "8px 8px",
            pointerEvents: "none",
          }}
        />

        {/* Top bar with logo + bracketed X */}
        <div style={{
          position: "sticky", top: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "24px 32px",
          zIndex: 3,
        }}>
          <div style={{
            fontFamily: "'Anton', 'Inter', sans-serif",
            fontSize: 28, color: "#000", letterSpacing: "0.02em",
          }}>
            auction<span style={{ fontStyle: "italic", fontFamily: "'Inter', cursive", fontWeight: 400 }}> labs</span>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
            aria-label="Close"
            style={{
              position: "relative",
              width: 56, height: 56,
              background: "transparent", border: "none", cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 22, fontWeight: 500, color: "#000",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "0 6px",
              lineHeight: 1,
            }}
          >
            <span>[</span>
            <span style={{ fontSize: 18 }}>×</span>
            <span>]</span>
          </button>
        </div>

        {/* Centered bracketed team list */}
        <div
          onClick={(e) => e.stopPropagation()}
          onMouseLeave={() => setHoverIdx(null)}
          style={{
            position: "relative", zIndex: 2,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "40px 24px 80px",
            gap: "clamp(20px, 4vw, 44px)",
            minHeight: "calc(100svh - 100px)",
            boxSizing: "border-box",
          }}
        >
          {loadingTeams && (
            <p style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13, color: "#666", letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}>
              [ LOADING TEAMS… ]
            </p>
          )}

          {!loadingTeams && teams.length === 0 && (
            <button
              onClick={() => { setMenuOpen(false); navigate("/espn"); }}
              style={{
                background: "transparent", color: "#000",
                border: "none", cursor: "pointer",
                fontFamily: "'Anton', sans-serif",
                fontSize: "clamp(2.4rem, 7vw, 5rem)",
                lineHeight: 1, letterSpacing: "0.02em",
                textTransform: "uppercase",
              }}
            >
              [ CONNECT ESPN ]
            </button>
          )}

          {!loadingTeams && teams.map((team, i) => {
            const dim = hoverIdx !== null && hoverIdx !== i;
            return (
              <button
                key={team.id}
                onClick={() => pickTeam(team)}
                onMouseEnter={() => setHoverIdx(i)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: dim ? "rgba(10,21,56,0.2)" : "#0a1538",
                  padding: 0,
                  fontFamily: "'Anton', 'Inter', sans-serif",
                  fontWeight: 400,
                  fontSize: "clamp(2.2rem, 7vw, 5rem)",
                  lineHeight: 1,
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                  opacity: menuOpen ? 1 : 0,
                  transform: menuOpen ? "translateY(0)" : "translateY(30px)",
                  transition: `color 0.3s ease, opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${menuOpen ? i * 60 + 200 : 0}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${menuOpen ? i * 60 + 200 : 0}ms`,
                }}
              >
                [{team.name}]
              </button>
            );
          })}

          {!loadingTeams && teams.length > 0 && (
            <button
              onClick={skip}
              style={{
                marginTop: 24,
                background: "none", border: "none", cursor: "pointer",
                color: "#666",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase",
                opacity: menuOpen ? 1 : 0,
                transition: `opacity 0.6s ease ${menuOpen ? teams.length * 60 + 320 : 0}ms, color 0.25s ease`,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "#000")}
              onMouseLeave={e => (e.currentTarget.style.color = "#666")}
            >
              SKIP FOR NOW
            </button>
          )}
        </div>
      </div>

      {/* ── BLEND-STYLE CENTERED HERO ─────────────────────────────────────── */}
      <main style={{
        position: "relative", zIndex: 10,
        minHeight: "100svh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: "120px 32px 80px",
        boxSizing: "border-box",
      }}>
        <h1 style={{
          margin: 0,
          fontFamily: "'Inter', sans-serif",
          fontWeight: 500,
          fontSize: "clamp(2rem, 5.5vw, 4.5rem)",
          lineHeight: 1.15,
          letterSpacing: "-0.01em",
          color: "#5fd4d4",
          opacity: cardExpanded ? 1 : 0,
          transform: cardExpanded ? "none" : "translateY(20px)",
          transition: "opacity 1s ease 0.2s, transform 1s cubic-bezier(0.16,1,0.3,1) 0.2s",
          maxWidth: 1100,
        }}>
          Fantasy Football Auction Tool <span style={{ fontStyle: "italic", opacity: 0.85 }}>(personalized to your league and your team)</span>
        </h1>

        <p style={{
          marginTop: 28,
          fontFamily: "'Inter', sans-serif",
          fontWeight: 700,
          fontSize: "clamp(1.1rem, 2.2vw, 1.75rem)",
          color: "white",
          textDecoration: "underline",
          textUnderlineOffset: "6px",
          textDecorationThickness: "2px",
          opacity: cardExpanded ? 1 : 0,
          transform: cardExpanded ? "none" : "translateY(20px)",
          transition: "opacity 1s ease 0.5s, transform 1s cubic-bezier(0.16,1,0.3,1) 0.5s",
        }}>
          ESPN + Real-Time + Auction Data
        </p>
      </main>
    </div>
  );
}
