import { useState, useEffect } from "react";

const NAV = [
  { label: "Home", href: "/" },
  { label: "Work", href: "/work" },
  { label: "Labs", href: "/" },
  { label: "Contact", href: "/contact" },
];

const SOCIALS = [
  { label: "Twitter", href: "https://twitter.com/NoomoAgency" },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/noomoagency/mycompany/" },
  { label: "Email", href: "mailto:hello@noomoagency.com" },
  { label: "noomoagency.com", href: "https://noomoagency.com/?ref=labs" },
];

function App() {
  const [open, setOpen] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      {/* HEADER */}
      <header
        style={{
          position: "fixed",
          top: 0, left: 0, right: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "24px 32px",
          zIndex: 100,
          mixBlendMode: open ? "normal" : "difference",
          color: "#fff",
        }}
      >
        <a
          href="/"
          style={{
            fontFamily: "var(--display)",
            fontSize: "28px",
            letterSpacing: "0.02em",
            color: open ? "#fff" : "#000",
            mixBlendMode: open ? "normal" : "difference",
            filter: open ? "none" : "invert(1)",
          }}
        >
          NOOMO<span style={{ opacity: 0.5 }}>/</span>LABS
        </a>

        <button
          aria-label="Toggle menu"
          onClick={() => setOpen(v => !v)}
          style={{
            position: "relative",
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: open ? "transparent" : "#000",
            border: open ? "1px solid rgba(255,255,255,0.3)" : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.4s ease, border-color 0.4s ease",
          }}
        >
          <span
            style={{
              position: "absolute",
              width: 22,
              height: 1.5,
              background: "#fff",
              transition: "transform 0.4s cubic-bezier(0.7,0,0.3,1), top 0.4s ease",
              top: open ? "50%" : "calc(50% - 5px)",
              transform: open ? "translateY(-50%) rotate(45deg)" : "translateY(-50%)",
            }}
          />
          <span
            style={{
              position: "absolute",
              width: 22,
              height: 1.5,
              background: "#fff",
              transition: "transform 0.4s cubic-bezier(0.7,0,0.3,1), top 0.4s ease",
              top: open ? "50%" : "calc(50% + 5px)",
              transform: open ? "translateY(-50%) rotate(-45deg)" : "translateY(-50%)",
            }}
          />
        </button>
      </header>

      {/* PLACEHOLDER CONTENT BEHIND */}
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          padding: "0 32px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 12,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            opacity: 0.5,
            marginBottom: 24,
          }}
        >
          ↗ Tap the circle, top right
        </div>
        <h1
          style={{
            fontFamily: "var(--display)",
            fontSize: "clamp(48px, 12vw, 200px)",
            lineHeight: 0.9,
            letterSpacing: "-0.02em",
          }}
        >
          MENU
        </h1>
      </main>

      {/* FULLSCREEN MENU OVERLAY */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(8,8,10,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          color: "#fff",
          zIndex: 90,
          display: "flex",
          flexDirection: "column",
          padding: "120px 48px 40px",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.5s ease",
        }}
      >
        {/* Big nav links */}
        <nav
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "8px",
            maxWidth: 1400,
            width: "100%",
            margin: "0 auto",
          }}
        >
          {NAV.map((item, i) => (
            <a
              key={item.label}
              href={item.href}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              style={{
                fontFamily: "var(--display)",
                fontSize: "clamp(56px, 12vw, 180px)",
                lineHeight: 1,
                letterSpacing: "-0.02em",
                textTransform: "uppercase",
                position: "relative",
                display: "inline-block",
                width: "fit-content",
                color: hoverIdx === null || hoverIdx === i ? "#fff" : "rgba(255,255,255,0.25)",
                transition: `color 0.35s ease, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${0.05 * i + 0.15}s, opacity 0.6s ease ${0.05 * i + 0.15}s`,
                transform: open ? "translateY(0)" : "translateY(40px)",
                opacity: open ? 1 : 0,
              }}
            >
              {item.label}
              <span
                style={{
                  position: "absolute",
                  top: "0.2em",
                  right: "-0.7em",
                  fontFamily: "var(--mono)",
                  fontSize: "clamp(10px, 0.9vw, 13px)",
                  letterSpacing: "0.1em",
                  opacity: 0.45,
                }}
              >
                0{i + 1}
              </span>
            </a>
          ))}
        </nav>

        {/* Bottom row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: 24,
            fontFamily: "var(--mono)",
            fontSize: 12,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            opacity: open ? 1 : 0,
            transform: open ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.6s ease 0.4s",
            color: "rgba(255,255,255,0.7)",
            maxWidth: 1400,
            width: "100%",
            margin: "0 auto",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ opacity: 0.45 }}>Get in touch</span>
            <a href="mailto:hello@noomoagency.com" style={{ fontSize: 16, textTransform: "none", color: "#fff" }}>
              hello@noomoagency.com
            </a>
          </div>

          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {SOCIALS.map(s => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                style={{ transition: "color 0.25s ease" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
              >
                {s.label}
              </a>
            ))}
          </div>

          <div style={{ opacity: 0.45 }}>© {new Date().getFullYear()} Noomo Labs</div>
        </div>
      </div>
    </div>
  );
}

export default App;
