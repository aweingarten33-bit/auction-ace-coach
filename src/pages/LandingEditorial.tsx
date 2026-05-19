import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedTeam } from "@/hooks/useSelectedTeam";
import { toast } from "sonner";

interface Team { id: number; name: string; abbrev?: string }

// Cycle through all 4 images as background
const BG_IMAGES = ["IMG_2304.jpeg", "IMG_2308.jpeg", "IMG_2309.jpeg", "IMG_2310.jpeg"];

export default function LandingEditorial() {
  const navigate    = useNavigate();
  const { setTeam } = useSelectedTeam();

  const [panelOpen,    setPanelOpen]    = useState(false);
  const [teams,        setTeams]        = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [heroReady,    setHeroReady]    = useState(false);
  const [bgIndex,      setBgIndex]      = useState(0);

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

  const bgSrc = `${import.meta.env.BASE_URL}${BG_IMAGES[bgIndex]}`;

  return (
    <div style={{ position: "relative", minHeight: "100svh", overflow: "hidden", fontFamily: "'Playfair Display', Georgia, serif" }}>

      {/* ── FULL-BLEED BACKGROUND ─────────────────────────────────────────── */}
      <img
        src={bgSrc}
        alt=""
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover",
          objectPosition: "center center",
          pointerEvents: "none",
          userSelect: "none",
        }}
      />

      {/* Gradient overlay — dark at edges, lets image breathe in center */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "linear-gradient(to bottom, rgba(4,10,22,0.45) 0%, rgba(4,10,22,0) 30%, rgba(4,10,22,0) 55%, rgba(4,10,22,0.82) 100%)",
      }} />

      {/* ── UI LAYER ──────────────────────────────────────────────────────── */}
      <div style={{ position: "relative", zIndex: 10, minHeight: "100svh", display: "flex", flexDirection: "column" }}>

        {/* Top nav */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "22px 22px",
        }}>
          {/* Logo */}
          <div style={{ color: "white", lineHeight: 1.05, fontWeight: 700, fontSize: "21px", textShadow: "0 1px 12px rgba(0,0,0,0.5)" }}>
            Auction<br />Ace
          </div>

          {/* CTA — frosted glass pill */}
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

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Bottom text + image switcher */}
        <div style={{ padding: "0 24px 40px" }}>
          <h1 style={{
            color: "white",
            fontSize: "clamp(2.8rem, 9vw, 5.5rem)",
            fontWeight: 700, lineHeight: 1.06, margin: "0 0 14px 0",
            textShadow: "0 2px 24px rgba(0,0,0,0.4)",
            opacity:   heroReady ? 1 : 0,
            transform: heroReady ? "none" : "translateY(28px)",
            transition: "opacity 0.9s ease 0.3s, transform 0.9s cubic-bezier(0.16,1,0.3,1) 0.3s",
          }}>
            Draft with<br /><em>the Edge.</em>
          </h1>
          <p style={{
            color: "rgba(255,255,255,0.65)",
            fontFamily: "'Inter', sans-serif",
            fontSize: "15px", lineHeight: 1.6,
            maxWidth: "280px", margin: "0 0 20px 0",
            opacity: heroReady ? 1 : 0,
            transition: "opacity 0.9s ease 0.55s",
          }}>
            Budget-first planning powered by your league's actual 3-year auction history.
          </p>

          {/* Image switcher dots */}
          <div style={{ display: "flex", gap: "8px", opacity: heroReady ? 1 : 0, transition: "opacity 0.9s ease 0.7s" }}>
            {BG_IMAGES.map((_, i) => (
              <button
                key={i}
                onClick={() => setBgIndex(i)}
                style={{
                  width: i === bgIndex ? 24 : 8, height: 8,
                  borderRadius: 4,
                  background: i === bgIndex ? "white" : "rgba(255,255,255,0.35)",
                  border: "none", cursor: "pointer", padding: 0,
                  transition: "width 0.3s ease, background 0.3s ease",
                }}
              />
            ))}
          </div>
        </div>
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

        {/* Fold shadow */}
        <div style={{
          position: "absolute", top: 0, left: 0, bottom: 0, width: "32px",
          background: "linear-gradient(to right, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)",
          zIndex: 10, pointerEvents: "none",
        }} />

        {/* Panel background */}
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(8,8,12,0.88)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          overflow: "hidden",
        }}>
          {/* Ice crystal glows */}
          <div style={{ position: "absolute", top: "-5%",  right: "-10%", width: "65%", height: "45%", borderRadius: "50%", background: "radial-gradient(circle, rgba(180,220,255,0.28) 0%, transparent 70%)", filter: "blur(35px)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: "25%",  left: "-15%", width: "55%",  height: "40%", borderRadius: "50%", background: "radial-gradient(circle, rgba(60,130,255,0.22) 0%, transparent 70%)",  filter: "blur(45px)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: "5%", right: "-5%", width: "60%",  height: "50%", borderRadius: "50%", background: "radial-gradient(circle, rgba(120,190,255,0.18) 0%, transparent 70%)", filter: "blur(55px)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: "35%",left: "5%",   width: "45%",  height: "35%", borderRadius: "50%", background: "radial-gradient(circle, rgba(200,235,255,0.14) 0%, transparent 70%)", filter: "blur(40px)", pointerEvents: "none" }} />
        </div>

        {/* Panel content */}
        <div style={{
          position: "relative", zIndex: 5,
          height: "100%", display: "flex", flexDirection: "column",
          paddingTop: "env(safe-area-inset-top)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px" }}>
            <span style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'Inter', sans-serif", fontSize: "10px", letterSpacing: "0.3em", textTransform: "uppercase" }}>
              Your Team
            </span>
            <button
              onClick={() => setPanelOpen(false)}
              style={{
                background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "50%", width: 40, height: 40,
                cursor: "pointer", color: "white", fontSize: "15px",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "sans-serif",
              }}
            >✕</button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "4px 22px 48px" }}>
            {loadingTeams && (
              <p style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'Inter',sans-serif", fontSize: "14px", paddingTop: "16px" }}>Loading teams…</p>
            )}
            {!loadingTeams && teams.length === 0 && (
              <p style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Inter',sans-serif", fontSize: "14px", lineHeight: 1.6, paddingTop: "16px" }}>No teams found. Connect ESPN first.</p>
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
        <div onClick={() => setPanelOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 299 }} />
      )}
    </div>
  );
}
