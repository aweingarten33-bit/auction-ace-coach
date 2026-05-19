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
    const t = setTimeout(() => setCardExpanded(true), 120);
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
      background: "#eceae6",
      minHeight: "100svh",
      fontFamily: "'Playfair Display', Georgia, serif",
      position: "relative",
      overflow: "hidden",
    }}>

      {/* ── FULL-SCREEN FORTRESS BACKGROUND ───────────────────────────────── */}
      <img
        src={`${import.meta.env.BASE_URL}${BG_IMAGES[bgIndex]}`}
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
      {/* Subtle dark vignette over bg */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
        background: "linear-gradient(to bottom, rgba(10,14,26,0.35) 0%, rgba(10,14,26,0.1) 40%, rgba(10,14,26,0.5) 100%)",
      }} />

      {/* ── TOP NAV ───────────────────────────────────────────────────────── */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, backdropFilter: "blur(0px)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 20px",
      }}>
        {/* Empty left */}
        <div style={{ width: 48 }} />

        {/* Hamburger */}
        <button
          onClick={openMenu}
          style={{
            width: 48, height: 48,
            background: "#1a2332",
            borderRadius: "14px",
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: "5px",
          }}
        >
          <span style={{ display: "block", width: 20, height: 2, background: "white", borderRadius: 2 }} />
          <span style={{ display: "block", width: 20, height: 2, background: "white", borderRadius: 2 }} />
          <span style={{ display: "block", width: 20, height: 2, background: "white", borderRadius: 2 }} />
        </button>
      </div>

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
        width: "90vw", maxWidth: "380px",
        background: "#1a2332",
        borderRadius: "0 0 24px 24px",
        padding: "80px 32px 36px",
        paddingTop: "calc(env(safe-area-inset-top) + 72px)",
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
      </div>

      {/* ── EXPANDING CARD ────────────────────────────────────────────────── */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: "80px",
        paddingBottom: "40px",
        minHeight: "100svh",
        boxSizing: "border-box",
        position: "relative", zIndex: 2,
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
          boxShadow: "0 12px 60px rgba(0,0,0,0.18)",
        }}>
          {/* Football video plays inside the card */}
          <video
            autoPlay loop muted playsInline
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%",
              objectFit: "cover",
              objectPosition: "center center",
              pointerEvents: "none",
            }}
          >
            <source src={`${import.meta.env.BASE_URL}export.mp4`} type="video/mp4" />
          </video>

          {/* Bottom gradient for text */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to bottom, transparent 40%, rgba(10,16,28,0.75) 100%)",
            pointerEvents: "none",
          }} />

          {/* Bottom text */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            padding: "0 24px 28px",
          }}>
            <h1 style={{
              color: "white",
              fontSize: "clamp(2.2rem, 8vw, 4rem)",
              fontWeight: 700, lineHeight: 1.06, margin: 0,
              opacity: cardExpanded ? 1 : 0,
              transform: cardExpanded ? "none" : "translateY(20px)",
              transition: "opacity 0.8s ease 0.7s, transform 0.8s cubic-bezier(0.16,1,0.3,1) 0.7s",
            }}>
              Draft with<br /><em>the Edge.</em>
            </h1>
          </div>
        </div>
      </div>

      {/* ── TAGLINE BELOW CARD ────────────────────────────────────────────── */}
      <div style={{
        textAlign: "center",
        padding: "0 32px 60px",
        position: "relative", zIndex: 2,
        opacity: cardExpanded ? 1 : 0,
        transition: "opacity 0.9s ease 1.1s",
      }}>
        <p style={{
          fontStyle: "italic",
          fontSize: "clamp(1.1rem, 4vw, 1.5rem)",
          lineHeight: 1.55,
          color: "rgba(255,255,255,0.75)",
          margin: 0,
        }}>
          Budget-first planning powered<br />by your league's actual draft history.
        </p>
      </div>
    </div>
  );
}
