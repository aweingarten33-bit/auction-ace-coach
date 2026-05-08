import { useEffect, useState } from "react";
import { Menu, X, ArrowDown, Play, ArrowUpRight, Star } from "lucide-react";
import heroImg from "@/assets/video-hero.jpg";

/**
 * Studio / Video page — Light+Shade architecture wearing
 * the app's Frank Miller / Neumorphism skin (navy + gold + blood red,
 * pill buttons, soft beveled cards, gold-bevel masthead).
 *
 * To plug in YOUR videos, edit the `reels` array and set ONE of:
 *   videoUrl: "https://.../file.mp4"
 *   vimeoId:  "1127370624"
 *   youtubeId:"dQw4w9WgXcQ"
 */

type Reel = {
  title: string;
  category: string;
  type: string;
  client: string;
  year: string;
  videoUrl?: string;
  vimeoId?: string;
  youtubeId?: string;
};

const navLinks = [
  { label: "The Studio", href: "#studio" },
  { label: "The Work", href: "#work" },
  { label: "Our Services", href: "#services" },
  { label: "Contact", href: "#contact" },
];

const reels: Reel[] = [
  // 👇 swap these for your real videos. Set vimeoId, youtubeId, or videoUrl.
  { title: "Cape & Cowl", category: "Apparel", type: "Brand Film", client: "Nightline", year: "2026" /* vimeoId: "123456789" */ },
  { title: "Midnight Run", category: "Automotive", type: "Spot", client: "Atlas Motors", year: "2025" },
  { title: "Ink & Gold", category: "Publishing", type: "Brand Campaign", client: "Frank Press", year: "2025" },
  { title: "Skyline Hymn", category: "Music", type: "Music Video", client: "Verge Records", year: "2024" },
];

const services = [
  "Advertising Production", "Content Production", "Post Production",
  "AI Production", "Motion Graphics", "Colour Grading",
  "Animation", "VFX", "Production Facilitation",
  "Green Production", "Creative", "Aerial Cinematography",
];

const spaced = (text: string) => text.split("").join("\u2003");

function useClock() {
  const [t, setT] = useState(() => new Date());
  useEffect(() => {
    const i = setInterval(() => setT(new Date()), 30_000);
    return () => clearInterval(i);
  }, []);
  return t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

/* ---------- shared decorative bits ---------- */

function CornerBrackets() {
  const c = "absolute h-6 w-6 border-[hsl(38_92%_55%/0.5)]";
  return (
    <>
      <span className={`${c} left-3 top-3 border-l border-t sm:left-6 sm:top-6`} />
      <span className={`${c} right-3 top-3 border-r border-t sm:right-6 sm:top-6`} />
      <span className={`${c} bottom-3 left-3 border-b border-l sm:bottom-6 sm:left-6`} />
      <span className={`${c} bottom-3 right-3 border-b border-r sm:bottom-6 sm:right-6`} />
    </>
  );
}

/** Pill — same neumorphic / bevel style as your auction draft assistant chips. */
function Pill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-5 py-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[hsl(38_92%_60%)] ${className}`}
      style={{
        background: "hsl(225 45% 10%)",
        boxShadow:
          "inset 0 1px 0 hsl(38 92% 55% / 0.3), inset 0 -1px 0 hsl(354 72% 30% / 0.4), 0 8px 18px -8px hsl(0 0% 0% / 0.8), 0 0 0 1px hsl(38 92% 55% / 0.2)",
      }}
    >
      {children}
    </span>
  );
}

/** Gold-bevel masthead text — matches "The Bro We're Senior Citizens" treatment. */
function GoldMasthead({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`bg-clip-text text-transparent ${className}`}
      style={{
        backgroundImage:
          "linear-gradient(180deg, hsl(48 100% 78%) 0%, hsl(42 92% 60%) 35%, hsl(34 82% 38%) 65%, hsl(20 60% 22%) 100%)",
        WebkitBackgroundClip: "text",
        filter:
          "drop-shadow(0 1px 0 hsl(48 100% 80% / 0.4)) drop-shadow(0 3px 6px hsl(20 60% 10% / 0.8))",
      }}
    >
      {children}
    </span>
  );
}

/** Soft neumorphic card surface — matches the "Draft strategy" / per-roster-slot card. */
const neuCard =
  "rounded-[1.75rem] bg-[hsl(225_45%_9%)] shadow-[inset_0_0_0_1px_hsl(38_92%_55%/0.25),inset_0_1px_0_hsl(38_92%_55%/0.4),0_22px_50px_-18px_hsl(354_80%_6%/0.9),0_1px_0_hsl(354_72%_36%/0.3)]";

/* ---------- drawer menu (themed) ---------- */

function DrawerMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-[hsl(225_60%_3%/0.75)] backdrop-blur-sm transition-opacity duration-500 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-md text-[hsl(40_55%_92%)] transition-transform duration-500 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          background:
            "radial-gradient(120% 80% at 100% 0%, hsl(354 72% 18% / 0.6), transparent 60%), hsl(225 50% 6%)",
          boxShadow:
            "inset 1px 0 0 hsl(38 92% 55% / 0.3), -20px 0 60px hsl(225 60% 3% / 0.8)",
        }}
      >
        <div className="flex h-full flex-col p-8">
          <div className="flex items-center justify-between">
            <Pill>L + S</Pill>
            <button onClick={onClose} aria-label="Close menu" className="grid h-10 w-10 place-items-center rounded-full bg-[hsl(225_45%_10%)] shadow-[inset_0_1px_0_hsl(38_92%_55%/0.3),0_4px_10px_hsl(0_0%_0%/0.5)]">
              <X className="h-4 w-4 text-[hsl(38_92%_60%)]" />
            </button>
          </div>

          <nav className="mt-16 flex flex-1 flex-col justify-center space-y-3">
            {navLinks.map((link, i) => (
              <a
                key={link.label}
                href={link.href}
                onClick={onClose}
                className="group flex items-baseline justify-between border-b border-[hsl(38_92%_55%/0.15)] py-4 transition hover:border-[hsl(38_92%_55%/0.6)]"
              >
                <span className="font-mono text-[10px] uppercase tracking-widest text-[hsl(38_92%_55%/0.6)]">
                  0{i + 1}
                </span>
                <span className="font-display text-3xl font-black tracking-tight transition sm:text-4xl">
                  <GoldMasthead className="opacity-90 group-hover:opacity-100">{link.label}</GoldMasthead>
                </span>
              </a>
            ))}
          </nav>

          <div className="mt-8 grid grid-cols-2 gap-6 font-mono text-[10px] uppercase tracking-widest text-[hsl(38_92%_55%/0.7)]">
            <div>Brisbane<br />Meanjin</div>
            <div className="text-right">Adelaide<br />Tarntanya</div>
          </div>
        </div>
      </aside>
    </>
  );
}

/* ---------- video tile ---------- */

function VideoTile({ reel, index, total }: { reel: Reel; index: number; total: number }) {
  const [playing, setPlaying] = useState(false);
  const hasVideo = !!(reel.videoUrl || reel.vimeoId || reel.youtubeId);

  const renderPlayer = () => {
    if (reel.videoUrl) {
      return <video src={reel.videoUrl} className="absolute inset-0 h-full w-full object-cover" autoPlay controls playsInline />;
    }
    if (reel.vimeoId) {
      return (
        <iframe
          src={`https://player.vimeo.com/video/${reel.vimeoId}?autoplay=1&title=0&byline=0&portrait=0`}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title={reel.title}
        />
      );
    }
    if (reel.youtubeId) {
      return (
        <iframe
          src={`https://www.youtube.com/embed/${reel.youtubeId}?autoplay=1&rel=0`}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title={reel.title}
        />
      );
    }
    return null;
  };

  return (
    <article className="group">
      <div className={`relative aspect-video overflow-hidden ${neuCard} p-2`}>
        <div className="relative h-full w-full overflow-hidden rounded-[1.25rem]">
          {playing && hasVideo ? (
            renderPlayer()
          ) : (
            <>
              <img
                src={heroImg}
                alt={reel.title}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover opacity-70 transition duration-700 group-hover:scale-105 group-hover:opacity-95"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-[hsl(225_60%_4%/0.5)] via-transparent to-[hsl(354_72%_18%/0.55)]" />
              <button
                type="button"
                onClick={() => hasVideo && setPlaying(true)}
                aria-label={`Play ${reel.title}`}
                className="absolute inset-0 grid cursor-pointer place-items-center"
              >
                <span
                  className="grid h-16 w-16 place-items-center rounded-full transition group-hover:scale-110"
                  style={{
                    background: "linear-gradient(180deg, hsl(42 92% 55%) 0%, hsl(34 82% 38%) 100%)",
                    boxShadow:
                      "inset 0 1px 0 hsl(48 100% 78% / 0.7), inset 0 -2px 0 hsl(20 60% 18% / 0.6), 0 10px 24px hsl(20 60% 8% / 0.7)",
                  }}
                >
                  <Play className="h-6 w-6 fill-[hsl(225_50%_6%)] text-[hsl(225_50%_6%)]" />
                </span>
              </button>
              <div className="absolute left-3 top-3 font-mono text-[10px] uppercase tracking-widest text-[hsl(38_92%_60%)]">
                {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
              </div>
              {!hasVideo && (
                <div className="absolute bottom-3 right-3">
                  <Pill className="text-[hsl(38_92%_55%/0.7)]">add video</Pill>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-4">
        <h3 className="font-display text-xl font-bold tracking-tight text-[hsl(40_55%_92%)] sm:text-2xl">
          ‘{reel.title}’
        </h3>
        <ArrowUpRight className="h-4 w-4 text-[hsl(38_92%_60%)]" />
      </div>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-[hsl(38_92%_55%/0.7)]">
        {reel.category} · {reel.type} · {reel.client} · {reel.year}
      </p>
    </article>
  );
}

/* ============================ PAGE ============================ */

export default function Studio() {
  const time = useClock();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main
      className="relative min-h-screen w-full overflow-x-hidden text-[hsl(40_55%_92%)]"
      style={{
        background:
          "radial-gradient(120% 80% at 0% 0%, hsl(354 72% 18% / 0.45), transparent 55%), radial-gradient(120% 80% at 100% 100%, hsl(354 72% 14% / 0.5), transparent 60%), hsl(225 50% 5%)",
      }}
    >
      <DrawerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* Persistent top chrome */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-start justify-between p-4 sm:p-6">
        <div className="pointer-events-auto">
          <Pill><Star className="h-3 w-3 fill-[hsl(38_92%_60%)] text-[hsl(38_92%_60%)]" /> L + S</Pill>
        </div>
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          className="pointer-events-auto grid h-12 w-12 place-items-center rounded-full"
          style={{
            background: "hsl(225 45% 10%)",
            boxShadow: "inset 0 1px 0 hsl(38 92% 55% / 0.3), 0 8px 20px hsl(0 0% 0% / 0.6)",
          }}
        >
          <Menu className="h-5 w-5 text-[hsl(38_92%_60%)]" />
        </button>
      </div>

      {/* HERO */}
      <section className="relative h-[100svh] w-full overflow-hidden">
        <img
          src={heroImg}
          alt="Cinematic golden hour"
          className="absolute inset-0 h-full w-full object-cover opacity-60"
          width={1920}
          height={1080}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,hsl(225_60%_4%/0.95)_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[hsl(354_72%_18%/0.4)] via-transparent to-[hsl(225_60%_4%/0.6)]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
          }}
        />
        <CornerBrackets />

        <div className="absolute inset-x-0 top-24 z-10 grid grid-cols-3 px-4 font-mono text-[10px] uppercase tracking-wider text-[hsl(38_92%_55%/0.8)] sm:top-16 sm:px-12 sm:text-xs">
          <div>Brisbane /<br />Meanjin</div>
          <div className="text-center">{time} AEST</div>
          <div className="text-right">Adelaide /<br />Tarntanya</div>
        </div>

        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-4">
          <h1 className="font-display text-center font-black leading-[0.85] tracking-tight">
            <GoldMasthead>
              <span className="block text-[clamp(3.5rem,16vw,12rem)]">LIGHT</span>
              <span className="block text-[clamp(3.5rem,16vw,12rem)]">+ SHADE</span>
            </GoldMasthead>
          </h1>
          <div className="mt-8">
            <Pill>Cinematic Production Studio</Pill>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-10 z-10 grid grid-cols-3 px-4 font-mono text-[10px] uppercase tracking-wider text-[hsl(38_92%_55%/0.8)] sm:bottom-12 sm:px-12 sm:text-xs">
          <div>Elevating brands<br />Pushing boundaries</div>
          <div className="flex items-center justify-center gap-1.5">
            <ArrowDown className="h-3 w-3 animate-bounce" />
            <span>Scroll</span>
          </div>
          <div className="text-right">Artist-led<br />Craft-obsessed</div>
        </div>
      </section>

      {/* WHAT WE DO */}
      <section id="studio" className="relative px-4 py-20 sm:px-12 sm:py-32">
        <div className="mb-10 flex items-baseline justify-between">
          <Pill>What we do</Pill>
          <span className="font-mono text-[10px] tracking-widest text-[hsl(38_92%_55%/0.6)]">01</span>
        </div>
        <h2 className="max-w-6xl font-display text-3xl font-black uppercase leading-[1.05] tracking-tight sm:text-5xl lg:text-7xl">
          <GoldMasthead>
            {spaced("Artist-Led")} <br />
            {spaced("Craft-Obsessed")} <br />
            {spaced("Story-Driven")}
          </GoldMasthead>
        </h2>

        <div className={`mt-16 ${neuCard} p-8 sm:p-12`}>
          <p className="max-w-3xl font-display text-lg leading-relaxed text-[hsl(40_55%_85%)] sm:text-xl">
            We meticulously assemble the right craftspeople, materials and ideas to elevate your
            message and move your audience to think, feel and do. Anyone with a camera can tell
            stories — <GoldMasthead>we craft them.</GoldMasthead>
          </p>
          <a
            href="#work"
            className="mt-8 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[hsl(38_92%_60%)] underline underline-offset-8 hover:text-[hsl(48_100%_70%)]"
          >
            See our work <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
      </section>

      {/* WORK */}
      <section id="work" className="relative px-4 py-20 sm:px-12 sm:py-32">
        <div className="mb-10 flex items-baseline justify-between">
          <Pill>Our Work</Pill>
          <span className="font-mono text-[10px] tracking-widest text-[hsl(38_92%_55%/0.6)]">02</span>
        </div>
        <h2 className="mb-16 font-display text-4xl font-black uppercase leading-none tracking-tight sm:text-7xl lg:text-8xl">
          <GoldMasthead>Visuals That Inspire</GoldMasthead>
        </h2>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-x-8 md:gap-y-16">
          {reels.map((r, i) => (
            <VideoTile key={r.title} reel={r} index={i} total={reels.length} />
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="relative px-4 py-20 sm:px-12 sm:py-32">
        <div className="mb-10 flex items-baseline justify-between">
          <Pill>Our Services</Pill>
          <span className="font-mono text-[10px] tracking-widest text-[hsl(38_92%_55%/0.6)]">03</span>
        </div>
        <h2 className="mb-12 font-display text-3xl font-black uppercase leading-tight tracking-tight sm:text-5xl">
          <GoldMasthead>Your Masters of Craft</GoldMasthead>
        </h2>

        <div className={`${neuCard} p-4 sm:p-6`}>
          <ul className="divide-y divide-[hsl(38_92%_55%/0.12)]">
            {services.map((s, i) => (
              <li
                key={s}
                className="group flex cursor-default items-center gap-6 py-4 transition hover:pl-3"
              >
                <span className="font-mono text-[10px] tracking-widest text-[hsl(38_92%_55%/0.6)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-display text-xl font-bold tracking-tight text-[hsl(40_55%_88%)] transition group-hover:text-[hsl(48_100%_70%)] sm:text-3xl">
                  {s}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CONTACT / MANIFESTO */}
      <section id="contact" className="relative px-4 py-24 sm:px-12 sm:py-40">
        <div className={`${neuCard} relative overflow-hidden p-10 sm:p-20`}>
          <CornerBrackets />
          <p className="mx-auto max-w-5xl text-center font-display text-2xl leading-snug tracking-tight sm:text-4xl lg:text-5xl">
            We are unapologetically artist-led and craft-obsessed. Creativity isn't just what we do —
            <GoldMasthead> it's who we are.</GoldMasthead>
          </p>
          <div className="mt-10 flex justify-center">
            <a
              href="mailto:hello@example.com"
              className="inline-flex items-center gap-2 rounded-full px-7 py-3 font-mono text-xs uppercase tracking-widest text-[hsl(225_50%_6%)]"
              style={{
                background: "linear-gradient(180deg, hsl(42 92% 55%) 0%, hsl(34 82% 38%) 100%)",
                boxShadow:
                  "inset 0 1px 0 hsl(48 100% 78% / 0.7), inset 0 -2px 0 hsl(20 60% 18% / 0.6), 0 10px 24px hsl(20 60% 8% / 0.7)",
              }}
            >
              Talk to us about your project <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-[hsl(38_92%_55%/0.15)] px-4 py-8 font-mono text-[10px] uppercase tracking-widest text-[hsl(38_92%_55%/0.7)] sm:px-12">
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <span>© 2026 — Studio</span>
          <span>Brisbane · Adelaide</span>
        </div>
      </footer>
    </main>
  );
}
