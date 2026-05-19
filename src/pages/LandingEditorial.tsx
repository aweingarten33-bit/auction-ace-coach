import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedTeam } from "@/hooks/useSelectedTeam";
import { toast } from "sonner";

interface Team { id: number; name: string; abbrev?: string }

const VIDEO_SCALE_KEY = "landing-video-scale";
const VIDEO_POS_KEY   = "landing-video-pos";

export default function LandingEditorial() {
  const navigate   = useNavigate();
  const { setTeam } = useSelectedTeam();

  const [panelOpen,    setPanelOpen]    = useState(false);
  const [teams,        setTeams]        = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [heroReady,    setHeroReady]    = useState(false);
  const [showTuner,    setShowTuner]    = useState(false);

  const [videoScale, setVideoScale] = useState(() => {
    try { return parseFloat(localStorage.getItem(VIDEO_SCALE_KEY) || "1.6"); } catch { return 1.6; }
  });
  const [videoPos, setVideoPos] = useState(() => {
    try { return parseFloat(localStorage.getItem(VIDEO_POS_KEY) || "35"); } catch { return 35; }
  });

  useEffect(() => { try { localStorage.setItem(VIDEO_SCALE_KEY, String(videoScale)); } catch {} }, [videoScale]);
  useEffect(() => { try { localStorage.setItem(VIDEO_POS_KEY,   String(videoPos));   } catch {} }, [videoPos]);
  useEffect(() => { const t = setTimeout(() => setHeroReady(true), 200); return () => clearTimeout(t); }, []);
  useEffect(() => {
    document.body.style.overflow = panelOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [panelOpen]);

  const openPanel = async () => {
    setPanelOpen(true);
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
    <div style={{ background: "#ede8df", minHeight: "100vh", fontFamily: "'Playfair Display', Georgia, serif" }}>

      {/* ── HERO CARD ──────────────────────────────────────────────────────── */}
      <div
        style={{
          margin: "12px",
          borderRadius: "28px",
          overflow: "hidden",
          height: "calc(100svh - 24px)",
          position: "relative",
          transition: "transform 0.65s cubic-bezier(0.32,0,0.15,1), filter 0.65s ease",
          willChange: "transform, filter",
          // Subtle depth push when curtain opens
          transform: panelOpen ? "scale(0.95) translateX(-2%)" : "scale(1) translateX(0)",
          filter:    panelOpen ? "brightness(0.5)"              : "brightness(1)",
        }}
      >
        {/* Video */}
        <video
          autoPlay loop muted playsInline
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover", pointerEvents: "none",
            transform: `scale(${videoScale})`,
            transformOrigin: `center ${videoPos}%`,
            filter: "brightness(0.58) saturate(0.75)",
          }}
        >
          <source src={`${import.meta.env.BASE_URL}export.mp4`} type="video/mp4" />
        </video>

        {/* Gradient */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.75) 100%)",
        }} />

        {/* Top nav inside card */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "22px 22px",
        }}>
          {/* Logo */}
          <div style={{ color: "white", lineHeight: 1.05, fontWeight: 700, fontSize: "21px" }}>
            Auction<br />Ace
          </div>

          {/* CTA button — frosted glass pill */}
          <button
            onClick={openPanel}
            style={{
              display: "flex", alignItems: "center", gap: "10px",
              background: "rgba(255,255,255,0.14)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              border: "1px solid rgba(255,255,255,0.28)",
              borderRadius: "100px",
              padding: "10px 10px 10px 18px",
              color: "white", cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px", fontWeight: 600,
            }}
          >
            Choose Your Team
            <span style={{
              background: "white", color: "#111",
              borderRadius: "50%", width: 32, height: 32,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "15px", fontWeight: 700, flexShrink: 0,
            }}>→</span>
          </button>
        </div>

        {/* Bottom text */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10, padding: "0 24px 36px" }}>
          <h1 style={{
            color: "white",
            fontSize: "clamp(2.8rem, 9vw, 5.5rem)",
            fontWeight: 700, lineHeight: 1.06, margin: "0 0 14px 0",
            opacity:   heroReady ? 1 : 0,
            transform: heroReady ? "none" : "translateY(28px)",
            transition: "opacity 0.9s ease 0.3s, transform 0.9s cubic-bezier(0.16,1,0.3,1) 0.3s",
          }}>
            Draft with<br /><em>the Edge.</em>
          </h1>
          <p style={{
            color: "rgba(255,255,255,0.6)",
            fontFamily: "'Inter', sans-serif",
            fontSize: "15px", lineHeight: 1.6,
            maxWidth: "280px", margin: 0,
            opacity: heroReady ? 1 : 0,
            transition: "opacity 0.9s ease 0.55s",
          }}>
            Budget-first planning powered by your league's actual 3-year auction history.
          </p>
        </div>

        {/* Hidden video tuner tap target */}
        <button
          onClick={() => setShowTuner(v => !v)}
          style={{
            position: "absolute", bottom: 10, right: 14, zIndex: 10,
            background: "none", border: "none",
            color: "rgba(255,255,255,0.15)", fontSize: "11px", cursor: "pointer",
          }}
        >✦</button>
      </div>

      {/* ── CURTAIN PANEL ─────────────────────────────────────────────────── */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "82vw", maxWidth: "400px",
        zIndex: 300,
        transform: panelOpen ? "translateX(0) skewX(0deg)" : "translateX(108%) skewX(-1.5deg)",
        transition: "transform 0.65s cubic-bezier(0.25,0.46,0.45,0.94)",
        willChange: "transform",
      }}>

        {/* Curtain fold shadow — left edge */}
        <div style={{
          position: "absolute", top: 0, left: 0, bottom: 0, width: "32px",
          background: "linear-gradient(to right, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)",
          zIndex: 10, pointerEvents: "none", borderRadius: "0 0 0 0",
        }} />

        {/* Panel background — dark glass with color bleed */}
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(8,8,12,0.88)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          overflow: "hidden",
        }}>
          {/* Graffiti-inspired color glows */}
          <div style={{ position: "absolute", top: "-5%",  right: "-10%", width: "65%", height: "45%",  borderRadius: "50%", background: "radial-gradient(circle, rgba(255,200,0,0.3) 0%, transparent 70%)",   filter: "blur(35px)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: "25%",  left: "-15%", width: "55%",  height: "40%",  borderRadius: "50%", background: "radial-gradient(circle, rgba(0,140,255,0.22) 0%, transparent 70%)",  filter: "blur(45px)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: "5%", right: "-5%", width: "60%",  height: "50%",  borderRadius: "50%", background: "radial-gradient(circle, rgba(160,0,255,0.18) 0%, transparent 70%)", filter: "blur(55px)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: "35%",left: "5%",   width: "45%",  height: "35%",  borderRadius: "50%", background: "radial-gradient(circle, rgba(255,60,0,0.2) 0%, transparent 70%)",   filter: "blur(40px)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: "55%",  right: "10%",  width: "40%",  height: "30%",  borderRadius: "50%", background: "radial-gradient(circle, rgba(0,255,120,0.12) 0%, transparent 70%)", filter: "blur(50px)", pointerEvents: "none" }} />
        </div>

        {/* Content */}
        <div style={{
          position: "relative", zIndex: 5,
          height: "100%", display: "flex", flexDirection: "column",
          paddingTop: "env(safe-area-inset-top)",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "20px 20px",
          }}>
            <span style={{
              color: "rgba(255,255,255,0.35)",
              fontFamily: "'Inter', sans-serif",
              fontSize: "10px", letterSpacing: "0.3em", textTransform: "uppercase",
            }}>
              Your Team
            </span>
            <button
              onClick={() => setPanelOpen(false)}
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "50%", width: 40, height: 40,
                cursor: "pointer", color: "white", fontSize: "15px",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "sans-serif",
              }}
            >✕</button>
          </div>

          {/* Team list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 22px 48px" }}>
            {loadingTeams && (
              <p style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'Inter',sans-serif", fontSize: "14px", paddingTop: "16px" }}>
                Loading teams…
              </p>
            )}

            {!loadingTeams && teams.length === 0 && (
              <p style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Inter',sans-serif", fontSize: "14px", lineHeight: 1.6, paddingTop: "16px" }}>
                No teams found. Connect ESPN first.
              </p>
            )}

            {!loadingTeams && teams.map((team, i) => (
              <button
                key={team.id}
                onClick={() => pickTeam(team)}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  background: "none", border: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                  padding: "16px 0", color: "white", cursor: "pointer",
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "clamp(1.5rem, 5vw, 1.9rem)",
                  fontWeight: 700, lineHeight: 1.1,
                  opacity:   panelOpen ? 1 : 0,
                  transform: panelOpen ? "none" : "translateX(20px)",
                  transition: `opacity 0.45s ease ${i * 50 + 280}ms, transform 0.45s cubic-bezier(0.16,1,0.3,1) ${i * 50 + 280}ms`,
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "#ccff00")}
                onMouseLeave={e => (e.currentTarget.style.color = "white")}
              >
                {team.name}
              </button>
            ))}

            <button
              onClick={skip}
              style={{
                marginTop: "28px", background: "none", border: "none",
                color: "rgba(255,255,255,0.25)", fontFamily: "'Inter',sans-serif",
                fontSize: "13px", cursor: "pointer", padding: 0,
                opacity: panelOpen ? 1 : 0,
                transition: "opacity 0.4s ease 650ms, color 0.2s",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
            >
              Skip for now →
            </button>
          </div>
        </div>
      </div>

      {/* Click-outside to close */}
      {panelOpen && (
        <div
          onClick={() => setPanelOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 299 }}
        />
      )}

      {/* ── VIDEO TUNER ───────────────────────────────────────────────────── */}
      {showTuner && (
        <div style={{
          position: "fixed", bottom: "80px", left: "50%", transform: "translateX(-50%)",
          zIndex: 9999, background: "rgba(0,0,0,0.92)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "16px", padding: "20px 24px", width: "300px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
            <span style={{ color: "white", fontSize: "12px", fontFamily: "'Inter',sans-serif", fontWeight: 600 }}>Video Tuner</span>
            <button onClick={() => setShowTuner(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "18px" }}>×</button>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", fontFamily: "'Inter',sans-serif", marginBottom: "8px" }}>Zoom — {Math.round(videoScale * 100)}%</p>
            <input type="range" min="1" max="3" step="0.05" value={videoScale}
              onChange={e => setVideoScale(parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: "#ccff00" }} />
          </div>
          <div>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", fontFamily: "'Inter',sans-serif", marginBottom: "8px" }}>Pan — {Math.round(videoPos)}% from top</p>
            <input type="range" min="0" max="100" step="1" value={videoPos}
              onChange={e => setVideoPos(parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: "#ccff00" }} />
          </div>
        </div>
      )}
    </div>
  );
}
