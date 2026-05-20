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

      {/* ── DROPDOWN MENU ─────────────────────────────────────────────────── */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 299 }}
        />
      )}
      <div style={{
        position: "fixed", top: 0, left: "50%",
        transform: menuOpen
          ? "translateX(-50%) translateY(0)"
          : "translateX(-50%) translateY(-110%)",
        transition: "transform 0.5s cubic-bezier(0.16,1,0.3,1)",
        zIndex: 300,
        width: "92vw", maxWidth: "400px",
        background: "rgba(4,8,20,0.55)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: "0 0 28px 28px",
        border: "1px solid rgba(255,255,255,0.1)",
        borderTop: "none",
        maxHeight: "88vh",
        overflow: "hidden",
        position: "fixed",
      }}>
        {/* Superman video plays behind the team list */}
        <video
          autoPlay loop muted playsInline preload="auto"
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover",
            objectPosition: "center top",
            pointerEvents: "none",
            opacity: 0.35,
            mixBlendMode: "screen",
          }}
        >
          <source src={`${import.meta.env.BASE_URL}video-output-0AF95F42-1823-4CCB-83D5-A4D004535139-1.mov`} type="video/quicktime" />
        </video>

        {/* Content sits on top of video */}
        <div style={{
          position: "relative", zIndex: 1,
          padding: "24px 24px 24px",
          paddingTop: "calc(env(safe-area-inset-top) + 68px)",
          maxHeight: "88vh",
          overflowY: "auto",
        }}>
        {/* Team list */}
        {loadingTeams && (
          <p style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Inter',sans-serif", fontSize: "14px", textAlign: "center", marginBottom: 16 }}>
            Loading teams…
          </p>
        )}
        {!loadingTeams && teams.length === 0 && (
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <button
              onClick={() => { setMenuOpen(false); navigate("/espn"); }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                background: "white", color: "#1a2332",
                borderRadius: "100px", border: "none",
                padding: "14px 28px",
                fontFamily: "'Inter',sans-serif", fontSize: "13px", fontWeight: 700,
                cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase",
              }}
            >
              ⚡ Connect ESPN
            </button>
          </div>
        )}
        {!loadingTeams && teams.map((team, i) => (
          <button
            key={team.id}
            onClick={() => pickTeam(team)}
            style={{
              display: "block", width: "100%", textAlign: "center",
              background: "none", border: "none",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              padding: "14px 0", color: "white", cursor: "pointer",
              fontFamily: "'Inter',sans-serif",
              fontSize: "13px", fontWeight: 600,
              letterSpacing: "0.12em", textTransform: "uppercase",
              opacity: menuOpen ? 1 : 0,
              transition: `opacity 0.35s ease ${i * 40 + 200}ms`,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "#60a5fa")}
            onMouseLeave={e => (e.currentTarget.style.color = "white")}
          >
            {team.name}
          </button>
        ))}

        {/* Choose Your Team CTA */}
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <button
            onClick={openMenu}
            style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              background: "white", color: "#1a2332",
              borderRadius: "100px", border: "none",
              padding: "14px 28px",
              fontFamily: "'Inter',sans-serif", fontSize: "13px", fontWeight: 700,
              cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase",
            }}
          >
            Choose Your Team
          </button>
        </div>

        <button
          onClick={skip}
          style={{
            display: "block", margin: "18px auto 0",
            background: "none", border: "none",
            color: "rgba(255,255,255,0.3)", fontFamily: "'Inter',sans-serif",
            fontSize: "12px", cursor: "pointer", letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
        >
          Skip for now
        </button>
        </div>{/* end scrollable content */}
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
          We Are a Fantasy Football Auction Tool
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
