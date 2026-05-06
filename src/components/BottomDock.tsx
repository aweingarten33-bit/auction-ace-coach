// Reusable bottom-sheet dock — same animation/style as BudgetPlannerV2.
// Used by every mobile tab so they all "rise from the ground" consistently.
import { useEffect, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

const C = {
  page: "#0b1f3a",
  surface: "#081a30",
  ink: "#ffffff",
  muted: "#9ca3af",
  faint: "#6b7280",
  hair: "rgba(255,255,255,0.10)",
  hairlite: "rgba(255,255,255,0.06)",
};

const SERIF = "'Instrument Serif', 'EB Garamond', Georgia, serif";
const SANS = "'Geist', ui-sans-serif, system-ui, sans-serif";
const MONO = "'Geist Mono', ui-monospace, 'SF Mono', monospace";

interface BottomDockProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  caption?: string;
  children: ReactNode;
  height?: string;
}

export default function BottomDock({
  open, onOpenChange, title, caption, children, height = "85vh",
}: BottomDockProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@300;400&display=swap');
        .bd-scroll::-webkit-scrollbar { width: 6px; }
        .bd-scroll::-webkit-scrollbar-thumb { background: ${C.hair}; border-radius: 3px; }
      `}</style>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => onOpenChange(false)}
              style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
            />
            <motion.aside
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 260 }}
              style={{
                position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 45,
                height, background: C.page, color: C.ink,
                borderTop: `1px solid ${C.hair}`,
                borderTopLeftRadius: 24, borderTopRightRadius: 24,
                display: "flex", flexDirection: "column",
                fontFamily: SANS,
                boxShadow: "0 -20px 60px rgba(0,0,0,0.5)",
              }}
            >
              <div style={{ display: "grid", placeItems: "center", padding: "10px 0 4px" }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: C.hair }} />
              </div>

              <div style={{
                padding: "12px 24px 16px", borderBottom: `1px solid ${C.hairlite}`,
                display: "flex", justifyContent: "space-between", alignItems: "flex-start",
              }}>
                <div>
                  <div style={{ fontFamily: SERIF, fontSize: 30, fontStyle: "italic", lineHeight: 1, color: C.ink }}>
                    {title}
                  </div>
                  {caption && (
                    <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.18em", color: C.faint, marginTop: 6 }}>
                      {caption}
                    </div>
                  )}
                </div>
                <button onClick={() => onOpenChange(false)} aria-label="Close" style={{
                  width: 32, height: 32, borderRadius: "50%", background: "transparent",
                  border: `1px solid ${C.hair}`, color: C.ink, cursor: "pointer",
                  fontFamily: SERIF, fontSize: 18, display: "grid", placeItems: "center",
                }}>×</button>
              </div>

              <div className="bd-scroll" style={{ flex: 1, overflowY: "auto" }}>
                {children}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
