import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedTeam } from "@/hooks/useSelectedTeam";
import { toast } from "sonner";

interface Team { id: number; name: string; abbrev?: string }

const BG_IMAGES = ["IMG_2304.jpeg", "IMG_2308.jpeg", "IMG_2309.jpeg", "IMG_2310.jpeg"];

export default function LandingSuperman() {
  const navigate    = useNavigate();
  const { setTeam } = useSelectedTeam();

  const [menuOpen,     setMenuOpen]     = useState(false);
  const [teams,        setTeams]        = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [cardExpanded, setCardExpanded] = useState(false);
  const [bgIndex]                       = useState(0);

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
      background: "#0a0e1a",
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

      {/* Dark vignette */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 2, pointerEvents: "none",
        background: "linear-gradient(to bottom, rgba(10,14,26,0.35) 0%, rgba(10,14,26,0.1) 40%, rgba(10,14,26,0.5) 100%)",
      }} />

      {/* ── TOP NAV ───────────────────────────────────────────────────────── */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
        display: "flex", alignItems: "center", justifyContent: "flex-end",
        padding: "16px 20px",
      }}>
        <button
          onClick={openMenu}
          style={{
            width: 48, height: 48,
            background: "rgba(8,14,28,0.45)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
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
        <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 299 }} />
      )}
      <div style={{
        position: "fixed", top: 0, left: "50%",
        transform: menuOpen ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(-110%)",
        transition: "transform 0.5s cubic-bezier(0.16,1,0.3,1)",
        zIndex: 300,
        width: "92vw", maxWidth: "400px",
        background: "rgba(4,8,20,0.72)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderRadius: "0 0 28px 28px",
        border: "1px solid rgba(255,255,255,0.1)",
        borderTop: "none",
        maxHeight: "70vh",
        overflowY: "auto",
        padding: "24px 24px 28px",
        paddingTop: "calc(env(safe-area-inset-top) + 68px)",
      }}>
        {loadingTeams && (
          <p style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Inter',sans-serif", fontSize: "14px", textAlign: "center", marginBottom: 16 }}>
            Loading teams…
          </p>
        )}
        {!loadingTeams && teams.length === 0 && (
          <div style={{ textAlign: "center", marginBottom: 16 }}>
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
        <button
          onClick={skip}
          style={{
            display: "block", margin: "20px auto 0",
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
        display: "flex", justifyContent: "center", alignItems: "center",
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 10,
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
              objectFit: "cover", objectPosition: "center center",
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
            mixBlendMode: "screen", pointerEvents: "none",
          }} />
          <div aria-hidden style={{
            position: "absolute", inset: 0,
            background: "radial-gradient(circle at 50% 40%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 55%)",
            mixBlendMode: "overlay", pointerEvents: "none",
          }} />

          <style>{`
            @keyframes fadeUp {
              from { opacity: 0; transform: translateY(14px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            .card-text { opacity: 0; animation-fill-mode: forwards; animation-timing-function: cubic-bezier(0.16,1,0.3,1); }
          `}</style>

          {/* Top headline */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "28px 24px 0" }}>
            <h1 style={{
              color: "white", fontSize: "clamp(1.25rem, 4.2vw, 2.4rem)",
              fontWeight: 700, lineHeight: 1.15, margin: 0,
              textShadow: "0 2px 12px rgba(0,0,0,0.5)",
            }}>
              {cardExpanded && (
                <>
                  <span className="card-text" style={{ display: "block", animationName: "fadeUp", animationDuration: "0.7s", animationDelay: "0.3s" }}>
                    Personalized Fantasy Football
                  </span>
                  <span className="card-text" style={{ display: "block", animationName: "fadeUp", animationDuration: "0.7s", animationDelay: "0.55s" }}>
                    Auction Intelligence
                  </span>
                </>
              )}
            </h1>
          </div>

          {/* Bottom sub-copy */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 24px 28px" }}>
            {cardExpanded && (
              <p className="card-text" style={{
                color: "rgba(255,255,255,0.85)",
                fontSize: "clamp(0.9rem, 2.4vw, 1.05rem)",
                lineHeight: 1.5, margin: 0, fontStyle: "italic",
                textShadow: "0 2px 12px rgba(0,0,0,0.5)",
                animationName: "fadeUp", animationDuration: "0.7s", animationDelay: "0.8s",
              }}>
                Powered by your league's ESPN history<br />and real-time auction data.
              </p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
