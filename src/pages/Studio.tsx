import { useEffect, useState } from "react";
import { Menu, X, ArrowDown, Play, ArrowUpRight } from "lucide-react";
import heroImg from "@/assets/video-hero.jpg";

/**
 * Light + Shade inspired studio / video page.
 * Cinematic hero, slide-in drawer menu, corner brackets,
 * spaced-letter headings, work grid, services list.
 *
 * To plug in your own videos: edit `reels` and set `videoUrl` to a
 * direct .mp4 URL or a Vimeo/YouTube embed (in an <iframe>).
 */

const navLinks = [
  { label: "The Studio", href: "#studio" },
  { label: "Our Crew", href: "#crew" },
  { label: "The Work", href: "#work" },
  { label: "Our Services", href: "#services" },
  { label: "Contact", href: "#contact" },
];

const tiles = [
  { kicker: "The", title: "Studio" },
  { kicker: "Our", title: "Crew" },
  { kicker: "The", title: "Work" },
  { kicker: "Our", title: "Services" },
  { kicker: "Our", title: "Contact" },
];

type Reel = {
  title: string;
  category: string;
  type: string;
  client: string;
  year: string;
  videoUrl?: string; // drop your .mp4 here
};

const reels: Reel[] = [
  { title: "Cape & Cowl", category: "Apparel", type: "Brand Film", client: "Nightline", year: "2026" },
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

function spaced(text: string) {
  return text.split("").join("\u2003"); // em-space between letters
}

function useClock() {
  const [t, setT] = useState(() => new Date());
  useEffect(() => {
    const i = setInterval(() => setT(new Date()), 30_000);
    return () => clearInterval(i);
  }, []);
  return t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function CornerBrackets() {
  const c = "absolute h-6 w-6 border-[hsl(40_55%_86%/0.4)]";
  return (
    <>
      <span className={`${c} left-3 top-3 border-l border-t sm:left-6 sm:top-6`} />
      <span className={`${c} right-3 top-3 border-r border-t sm:right-6 sm:top-6`} />
      <span className={`${c} bottom-3 left-3 border-b border-l sm:bottom-6 sm:left-6`} />
      <span className={`${c} bottom-3 right-3 border-b border-r sm:bottom-6 sm:right-6`} />
    </>
  );
}

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
        className={`fixed inset-0 z-40 bg-[hsl(225_60%_3%/0.7)] transition-opacity duration-500 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-md bg-[hsl(225_60%_5%)] text-[hsl(40_55%_92%)] shadow-[-20px_0_60px_hsl(225_60%_3%/0.8)] transition-transform duration-500 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col p-8">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm font-bold tracking-widest">L+S</span>
            <button
              onClick={onClose}
              aria-label="Close menu"
              className="grid h-10 w-10 place-items-center"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="mt-16 flex flex-1 flex-col justify-center space-y-2">
            {navLinks.map((link, i) => (
              <a
                key={link.label}
                href={link.href}
                onClick={onClose}
                className="group flex items-baseline justify-between border-b border-[hsl(40_55%_86%/0.1)] py-4 transition hover:border-[hsl(38_92%_55%)]"
              >
                <span className="font-mono text-[10px] uppercase tracking-widest text-[hsl(40_55%_60%)]">
                  0{i + 1}
                </span>
                <span className="font-display text-3xl font-black tracking-tight transition group-hover:text-[hsl(38_92%_55%)] sm:text-4xl">
                  {link.label}
                </span>
              </a>
            ))}
          </nav>

          <div className="mt-8 grid grid-cols-2 gap-6 font-mono text-[10px] uppercase tracking-widest text-[hsl(40_55%_70%)]">
            <div>
              Brisbane<br />Meanjin
            </div>
            <div className="text-right">
              Adelaide<br />Tarntanya
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function VideoTile({ reel, index, total }: { reel: Reel; index: number; total: number }) {
  const [playing, setPlaying] = useState(false);

  return (
    <article className="group">
      <div className="relative aspect-video overflow-hidden bg-[hsl(225_40%_10%)]">
        {playing && reel.videoUrl ? (
          <video
            src={reel.videoUrl}
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            controls
            playsInline
          />
        ) : (
          <>
            <img
              src={heroImg}
              alt={reel.title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover opacity-70 transition duration-700 group-hover:scale-105 group-hover:opacity-95"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(225_60%_4%/0.4)] to-[hsl(354_72%_20%/0.4)]" />
            <button
              type="button"
              onClick={() => reel.videoUrl && setPlaying(true)}
              aria-label={`Play ${reel.title}`}
              className="absolute inset-0 grid cursor-pointer place-items-center"
            >
              <span className="grid h-16 w-16 place-items-center rounded-full border border-[hsl(40_55%_86%/0.6)] bg-[hsl(225_60%_4%/0.4)] transition group-hover:scale-110 group-hover:border-[hsl(38_92%_55%)]">
                <Play className="h-6 w-6 fill-[hsl(40_55%_92%)] text-[hsl(40_55%_92%)]" />
              </span>
            </button>
            <div className="absolute left-3 top-3 font-mono text-[10px] uppercase tracking-widest text-[hsl(40_55%_88%)]">
              {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </div>
            {!reel.videoUrl && (
              <div className="absolute bottom-3 right-3 rounded-full bg-[hsl(225_60%_4%/0.7)] px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-[hsl(40_55%_70%)]">
                add video
              </div>
            )}
          </>
        )}
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-4">
        <h3 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
          ‘{reel.title}’
        </h3>
        <ArrowUpRight className="h-4 w-4 text-[hsl(40_55%_70%)]" />
      </div>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-[hsl(40_55%_70%)]">
        {reel.category} · {reel.type} · {reel.client} · {reel.year}
      </p>
    </article>
  );
}

export default function Studio() {
  const time = useClock();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-[hsl(225_50%_5%)] text-[hsl(40_55%_92%)]">
      <DrawerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* Persistent top chrome */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-start justify-between p-4 sm:p-8">
        <span className="pointer-events-auto font-mono text-base font-bold tracking-widest">L+S</span>
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          className="pointer-events-auto grid h-10 w-10 place-items-center bg-[hsl(225_60%_4%/0.4)] backdrop-blur-sm"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* HERO */}
      <section className="relative h-[100svh] w-full overflow-hidden">
        <img
          src={heroImg}
          alt="Golden hour through tangled branches"
          className="absolute inset-0 h-full w-full object-cover"
          width={1920}
          height={1080}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,hsl(225_60%_4%/0.85)_100%)]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
          }}
        />
        <CornerBrackets />

        <div className="absolute inset-x-0 top-20 z-10 grid grid-cols-3 px-4 font-mono text-[10px] uppercase tracking-wider text-[hsl(40_55%_88%)] sm:top-12 sm:px-12 sm:text-xs">
          <div>Brisbane /<br />Meanjin</div>
          <div className="text-center">{time} AEST</div>
          <div className="text-right">Adelaide /<br />Tarntanya</div>
        </div>

        <div className="absolute inset-0 z-10 flex items-center justify-center px-4">
          <h1 className="font-display text-center font-black leading-[0.85] tracking-tight drop-shadow-[0_4px_24px_hsl(225_60%_4%/0.7)]">
            <span className="block text-[clamp(3.5rem,16vw,12rem)]">LIGHT</span>
            <span className="block text-[clamp(3.5rem,16vw,12rem)]">+ SHADE</span>
          </h1>
        </div>

        <div className="absolute inset-x-0 bottom-8 z-10 grid grid-cols-3 px-4 font-mono text-[10px] uppercase tracking-wider text-[hsl(40_55%_88%)] sm:bottom-12 sm:px-12 sm:text-xs">
          <div>Elevating brands<br />Pushing boundaries</div>
          <div className="flex items-center justify-center gap-1.5">
            <ArrowDown className="h-3 w-3 animate-bounce" />
            <span>Scroll</span>
          </div>
          <div className="text-right">Artist-led<br />Craft-obsessed</div>
        </div>
      </section>

      {/* WHAT WE DO — spaced heading */}
      <section id="studio" className="relative px-4 py-20 sm:px-12 sm:py-32">
        <div className="mb-12 flex items-baseline justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(40_55%_70%)] sm:text-xs">
            What we do
          </p>
          <p className="font-mono text-[10px] tracking-widest text-[hsl(40_55%_70%)]">01</p>
        </div>
        <h2 className="max-w-6xl font-display text-3xl font-black uppercase leading-[1.05] tracking-tight sm:text-5xl lg:text-7xl">
          {spaced("Artist-Led")} <br />
          {spaced("Craft-Obsessed")} <br />
          <span className="text-[hsl(38_92%_55%)]">{spaced("Story-Driven")}</span>
        </h2>
        <a
          href="#work"
          className="mt-12 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[hsl(40_55%_88%)] underline underline-offset-8 hover:text-[hsl(38_92%_55%)]"
        >
          Learn more <ArrowUpRight className="h-3 w-3" />
        </a>
      </section>

      {/* TILE GRID */}
      <section className="relative px-4 pb-20 sm:px-12 sm:pb-32">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-6 lg:grid-cols-5">
          {tiles.map((t) => (
            <a
              key={t.title}
              href="#"
              className="group relative aspect-[3/4] overflow-hidden bg-[hsl(225_40%_10%)]"
            >
              <img
                src={heroImg}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover opacity-60 transition duration-700 group-hover:scale-105 group-hover:opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(225_60%_4%/0.95)] via-[hsl(225_60%_4%/0.4)] to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end p-3 sm:p-5">
                <span className="font-display text-xs italic text-[hsl(40_55%_80%)] sm:text-sm">
                  {t.kicker}
                </span>
                <span className="font-display text-2xl font-black leading-none tracking-tight sm:text-4xl">
                  {t.title}
                </span>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* MASTERS OF CRAFT — featured reel */}
      <section className="relative border-t border-[hsl(40_55%_86%/0.1)] px-4 py-20 sm:px-12 sm:py-32">
        <h3 className="mb-8 font-display text-2xl font-black uppercase tracking-tight sm:text-4xl">
          {spaced("Masters of craft")}
        </h3>
        <p className="max-w-3xl font-display text-lg leading-relaxed text-[hsl(40_55%_85%)] sm:text-xl">
          We meticulously assemble the right craftspeople, materials and ideas to elevate your
          message and move your audience to think, feel and do. Anyone with a camera can tell
          stories — we craft them.
        </p>

        {/* Featured reel placeholder */}
        <div className="relative mt-12 aspect-video w-full overflow-hidden bg-[hsl(225_40%_10%)]">
          <img
            src={heroImg}
            alt="Featured reel"
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[hsl(225_60%_4%/0.6)] to-transparent" />
          <div className="absolute inset-0 grid place-items-center">
            <button
              aria-label="Play reel"
              className="grid h-20 w-20 place-items-center rounded-full border border-[hsl(40_55%_86%/0.7)] bg-[hsl(225_60%_4%/0.4)] transition hover:scale-110 hover:border-[hsl(38_92%_55%)]"
            >
              <Play className="h-8 w-8 fill-[hsl(40_55%_92%)] text-[hsl(40_55%_92%)]" />
            </button>
          </div>
          <div className="absolute bottom-4 left-4 font-mono text-[10px] uppercase tracking-widest text-[hsl(40_55%_88%)]">
            2026 Reel · 01:49
          </div>
        </div>
      </section>

      {/* WORK GRID */}
      <section id="work" className="relative border-t border-[hsl(40_55%_86%/0.1)] px-4 py-20 sm:px-12 sm:py-32">
        <div className="mb-12 flex items-baseline justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(40_55%_70%)] sm:text-xs">
            Our Work — 02
          </p>
        </div>
        <h2 className="mb-16 font-display text-4xl font-black uppercase leading-none tracking-tight sm:text-7xl lg:text-8xl">
          Visuals That <span className="text-[hsl(38_92%_55%)]">Inspire</span>
        </h2>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-x-8 md:gap-y-16">
          {reels.map((r, i) => (
            <VideoTile key={r.title} reel={r} index={i} total={reels.length} />
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="relative border-t border-[hsl(40_55%_86%/0.1)] px-4 py-20 sm:px-12 sm:py-32">
        <p className="mb-8 font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(40_55%_70%)] sm:text-xs">
          Our Services — 03
        </p>
        <h2 className="mb-12 max-w-4xl font-display text-3xl font-black uppercase leading-tight tracking-tight sm:text-5xl">
          Your Masters of Craft
        </h2>
        <ul className="divide-y divide-[hsl(40_55%_86%/0.1)] border-y border-[hsl(40_55%_86%/0.1)]">
          {services.map((s, i) => (
            <li
              key={s}
              className="group flex cursor-default items-center gap-6 py-4 transition hover:pl-3"
            >
              <span className="font-mono text-[10px] tracking-widest text-[hsl(40_55%_60%)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-display text-xl font-bold tracking-tight transition group-hover:text-[hsl(38_92%_55%)] sm:text-3xl">
                {s}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* MANIFESTO */}
      <section id="contact" className="relative border-t border-[hsl(40_55%_86%/0.1)] px-4 py-24 sm:px-12 sm:py-40">
        <p className="mx-auto max-w-5xl font-display text-2xl leading-snug tracking-tight sm:text-4xl lg:text-6xl">
          We are unapologetically artist-led and craft-obsessed. Creativity isn't just what we do —
          <span className="text-[hsl(38_92%_55%)]"> it's who we are.</span>
        </p>
        <a
          href="mailto:hello@example.com"
          className="mt-12 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[hsl(40_55%_88%)] underline underline-offset-8 hover:text-[hsl(38_92%_55%)]"
        >
          Talk to us about your project <ArrowUpRight className="h-3 w-3" />
        </a>
      </section>

      <footer className="border-t border-[hsl(40_55%_86%/0.1)] px-4 py-8 font-mono text-[10px] uppercase tracking-widest text-[hsl(40_55%_70%)] sm:px-12">
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <span>© 2026 — Studio</span>
          <span>Brisbane · Adelaide</span>
        </div>
      </footer>
    </main>
  );
}
