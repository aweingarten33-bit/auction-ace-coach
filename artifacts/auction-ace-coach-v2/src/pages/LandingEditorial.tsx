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

      {/* ── NOOMO-STYLE FULLSCREEN MENU ───────────────────────────────────── */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 250,
          background: "rgba(20,26,34,0.78)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? "auto" : "none",
          transition: "opacity 0.55s cubic-bezier(0.16,1,0.3,1)",
        }}
        onClick={() => setMenuOpen(false)}
      >
        {/* Close X */}
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
          aria-label="Close"
          style={{
            position: "absolute", top: 22, right: 32,
            width: 44, height: 44,
            background: "transparent", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 2,
          }}
        >
          <span style={{
            position: "absolute", width: 28, height: 2, background: "white",
            transform: "rotate(45deg)",
          }} />
          <span style={{
            position: "absolute", width: 28, height: 2, background: "white",
            transform: "rotate(-45deg)",
          }} />
        </button>

        {/* Centered team list */}
        <div
          onClick={(e) => e.stopPropagation()}
          onMouseLeave={() => setHoverIdx(null)}
          style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "100px 24px 120px",
            boxSizing: "border-box",
            overflowY: "auto",
          }}
        >
          {loadingTeams && (
            <p style={{
              color: "rgba(255,255,255,0.5)",
              fontFamily: "'Inter',sans-serif",
              fontSize: 14, letterSpacing: "0.18em", textTransform: "uppercase",
            }}>
              Loading teams…
            </p>
          )}

          {!loadingTeams && teams.length === 0 && (
            <button
              onClick={() => { setMenuOpen(false); navigate("/espn"); }}
              style={{
                background: "white", color: "#1a2332",
                borderRadius: 999, border: "none",
                padding: "18px 36px",
                fontFamily: "'Inter',sans-serif",
                fontSize: 14, fontWeight: 700,
                letterSpacing: "0.1em", textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              ⚡ Connect ESPN
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
                  display: "flex", alignItems: "baseline", gap: 18,
                  background: "none", border: "none", cursor: "pointer",
                  color: "white",
                  padding: "6px 0",
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 500,
                  fontSize: "clamp(2rem, 5.5vw, 4.5rem)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                  opacity: menuOpen ? (dim ? 0.25 : 1) : 0,
                  transform: menuOpen ? "translateY(0)" : "translateY(28px)",
                  transition: `opacity 0.5s cubic-bezier(0.16,1,0.3,1) ${menuOpen ? i * 60 + 220 : 0}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${menuOpen ? i * 60 + 220 : 0}ms`,
                }}
              >
                <span style={{
                  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  fontSize: "0.32em",
                  fontWeight: 500,
                  opacity: 0.55,
                  letterSpacing: 0,
                }}>
                  0{i + 1}
                </span>
                <span>{team.name}</span>
              </button>
            );
          })}

          {!loadingTeams && teams.length > 0 && (
            <button
              onClick={skip}
              style={{
                marginTop: 40,
                background: "none", border: "none",
                color: "rgba(255,255,255,0.45)",
                fontFamily: "'Inter',sans-serif",
                fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase",
                cursor: "pointer",
                opacity: menuOpen ? 1 : 0,
                transition: `opacity 0.5s ease ${menuOpen ? teams.length * 60 + 320 : 0}ms`,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "white")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
            >
              Skip for now
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
