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
        position: "fixed", inset: 0, zIndex: 2, pointerEvents: "none",
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

      {/* ── EXPANDING CARD (fullscreen) ───────────────────────────────────── */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "stretch",
        minHeight: "100svh",
        boxSizing: "border-box",
        position: "relative", zIndex: 10,
      }}>
        <div style={{
          width: "100vw",
          height: "100svh",
          borderRadius: 0,
          overflow: "hidden",
          position: "relative",
        }}>
          {/* Football video plays inside the card */}
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

          {/* Crystal white glow overlay (keeps video color underneath) */}
          <div
            aria-hidden
            style={{
              position: "absolute", inset: 0,
              background:
                "radial-gradient(ellipse at center, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.2) 45%, rgba(255,255,255,0) 80%)",
              mixBlendMode: "screen",
              pointerEvents: "none",
            }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute", inset: 0,
              background:
                "radial-gradient(circle at 50% 40%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 55%)",
              mixBlendMode: "overlay",
              pointerEvents: "none",
            }}
          />

          {/* CRYSTAL SPARKLES */}
          <style>{`
            @keyframes crystalTwinkle {
              0%, 100% { opacity: 0; transform: scale(0.4) rotate(0deg); }
              50%      { opacity: 1; transform: scale(1) rotate(45deg); }
            }
            .crystal {
              position: absolute;
              pointer-events: none;
              mix-blend-mode: screen;
              filter: drop-shadow(0 0 8px rgba(255,255,255,0.9)) drop-shadow(0 0 16px rgba(180,220,255,0.6));
              animation: crystalTwinkle 3.5s ease-in-out infinite;
            }
            .crystal::before, .crystal::after {
              content: "";
              position: absolute;
              left: 50%; top: 50%;
              background: linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 50%, rgba(255,255,255,0) 100%);
              transform-origin: center;
            }
            .crystal::before { width: 2px; height: 100%; transform: translate(-50%, -50%); }
            .crystal::after  { width: 100%; height: 2px; transform: translate(-50%, -50%); }
          `}</style>

          {[
            { top: "8%",  left: "12%", size: 28, delay: "0s",   dur: "3.2s" },
            { top: "14%", left: "78%", size: 36, delay: "0.6s", dur: "4.1s" },
            { top: "22%", left: "44%", size: 18, delay: "1.2s", dur: "2.8s" },
            { top: "31%", left: "20%", size: 22, delay: "0.3s", dur: "3.6s" },
            { top: "38%", left: "88%", size: 30, delay: "1.8s", dur: "3.9s" },
            { top: "47%", left: "8%",  size: 40, delay: "0.9s", dur: "4.4s" },
            { top: "52%", left: "62%", size: 24, delay: "2.1s", dur: "3.1s" },
            { top: "59%", left: "34%", size: 32, delay: "0.4s", dur: "3.8s" },
            { top: "66%", left: "82%", size: 20, delay: "1.5s", dur: "2.9s" },
            { top: "71%", left: "18%", size: 26, delay: "2.4s", dur: "3.4s" },
            { top: "78%", left: "54%", size: 34, delay: "0.7s", dur: "4.0s" },
            { top: "85%", left: "76%", size: 22, delay: "1.9s", dur: "3.3s" },
            { top: "89%", left: "28%", size: 28, delay: "1.1s", dur: "3.7s" },
            { top: "16%", left: "58%", size: 20, delay: "2.7s", dur: "3.0s" },
            { top: "42%", left: "26%", size: 16, delay: "0.2s", dur: "2.6s" },
            { top: "27%", left: "68%", size: 24, delay: "1.6s", dur: "3.5s" },
            { top: "63%", left: "48%", size: 18, delay: "2.3s", dur: "2.9s" },
            { top: "75%", left: "8%",  size: 30, delay: "0.5s", dur: "4.2s" },
            { top: "5%",  left: "38%", size: 22, delay: "1.3s", dur: "3.2s" },
            { top: "94%", left: "60%", size: 26, delay: "0.8s", dur: "3.6s" },
          ].map((c, i) => (
            <div
              key={i}
              className="crystal"
              style={{
                top: c.top, left: c.left,
                width: c.size, height: c.size,
                animationDelay: c.delay,
                animationDuration: c.dur,
              }}
            />
          ))}

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
        position: "relative", zIndex: 10,
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
