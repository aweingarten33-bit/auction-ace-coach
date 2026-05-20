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
          boxShadow: "0 12px 60px rgba(0,0,0,0.18)",
          pointerEvents: "auto",
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


          {/* SUPERMAN ZOOM */}
          <style>{`
            @keyframes supermanZoom {
              0% {
                opacity: 0;
                transform: scale(0.05);
                filter: blur(8px);
              }
              60% {
                opacity: 1;
                filter: blur(1.5px);
              }
              100% {
                opacity: 1;
                transform: scale(1);
                filter: blur(0);
              }
            }
            .nfl-word, .nfl-ticker {
              display: inline-block;
              opacity: 0;
              will-change: transform, opacity, filter;
              transform-origin: center center;
            }
          `}</style>

          {/* Top headline */}
          <div className="drone-stage" style={{
            position: "absolute", top: 0, left: 0, right: 0,
            padding: "28px 24px 0",
            textAlign: "left",
          }}>
            <h1 style={{
              color: "white",
              fontSize: "clamp(1.25rem, 4.2vw, 2.4rem)",
              fontWeight: 700, lineHeight: 1.15, margin: 0,
              textAlign: "left",
              textShadow: "0 2px 12px rgba(0,0,0,0.5)",
            }}>
              <span style={{ whiteSpace: "nowrap", display: "block" }}>
                {cardExpanded && ["Personalized", "Fantasy", "Football"].map((w, i) => (
                  <span
                    key={w}
                    className="nfl-word"
                    style={{
                      animation: "supermanZoom 0.7s cubic-bezier(0.2, 0.7, 0.3, 1) forwards",
                      animationDelay: `${0.3 + i * 0.22}s`,
                      marginRight: "0.28em",
                    }}
                  >
                    {w}
                  </span>
                ))}
              </span>
              <span style={{ display: "block" }}>
                {cardExpanded && ["Auction", "Intelligence"].map((w, i) => (
                  <span
                    key={w}
                    className="nfl-word"
                    style={{
                      animation: "supermanZoom 0.7s cubic-bezier(0.2, 0.7, 0.3, 1) forwards",
                      animationDelay: `${1.1 + i * 0.22}s`,
                      marginRight: "0.28em",
                    }}
                  >
                    {w}
                  </span>
                ))}
              </span>
            </h1>
          </div>

          {/* Bottom powered-by */}
          <div className="drone-stage" style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            padding: "0 24px 28px",
            textAlign: "left",
          }}>
            <p style={{
              color: "rgba(255,255,255,0.9)",
              fontSize: "clamp(0.95rem, 2.6vw, 1.15rem)",
              lineHeight: 1.4, margin: 0,
              fontStyle: "italic",
              textAlign: "left",
              textShadow: "0 2px 12px rgba(0,0,0,0.5)",
            }}>
              {cardExpanded && (
                <>
                  {"Powered by our ESPN league history".split(" ").map((w, i) => (
                    <span
                      key={`a${i}`}
                      className="nfl-ticker"
                      style={{
                        animation: "supermanZoom 0.55s cubic-bezier(0.2, 0.7, 0.3, 1) forwards",
                        animationDelay: `${1.8 + i * 0.07}s`,
                        marginRight: "0.28em",
                      }}
                    >
                      {w}
                    </span>
                  ))}
                  <br />
                  {"and real-time auction data.".split(" ").map((w, i) => (
                    <span
                      key={`b${i}`}
                      className="nfl-ticker"
                      style={{
                        animation: "supermanZoom 0.55s cubic-bezier(0.2, 0.7, 0.3, 1) forwards",
                        animationDelay: `${2.3 + i * 0.07}s`,
                        marginRight: "0.28em",
                      }}
                    >
                      {w}
                    </span>
                  ))}
                </>
              )}
            </p>
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
      </div>
    </div>
  );
}
