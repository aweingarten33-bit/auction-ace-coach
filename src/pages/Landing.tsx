import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Bookmark, ThumbsUp, ThumbsDown, Home, Ticket, User, Search, Moon, Clock, Calendar, Megaphone, Flame } from "lucide-react";

/* ---------- DICE-style feed (mobile-first) ---------- */

const CATEGORIES = [
  { icon: Moon,      label: "Tonight" },
  { icon: Clock,     label: "This week" },
  { icon: Calendar,  label: "Pick dates" },
  { icon: Megaphone, label: "New shows" },
  { icon: Flame,     label: "Most viewed" },
];

const FEED = [
  {
    tag: "POPULAR",
    title: "QB1 Auction Night: Mahomes, Allen",
    meta: "Fri, May 8\nThe Auction Room\nFree",
    accent: "from-emerald-500/40 via-blue-600/40 to-orange-500/40",
    badge: null as string | null,
  },
  {
    tag: "LIST BY DRAFTROOM",
    title: "Vetri tells it like it is",
    meta: "Why your auction strategy is broken — and the math that fixes it.",
    accent: "from-zinc-800 to-zinc-950",
    badge: "New",
  },
  {
    tag: "THIS WEEK",
    title: "Tier Breaks: RB Cliff Watch",
    meta: "Sun, May 10\nLive Bid Strip\nMembers",
    accent: "from-rose-700/50 via-amber-600/40 to-zinc-900",
    badge: null,
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground pb-28">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md">
        <div className="mx-auto max-w-[480px] px-5 py-4 flex items-center justify-between">
          <Link to="/" className="text-base font-bold tracking-tight">DRAFTROOM</Link>
          <div className="flex items-center gap-3 text-foreground/70">
            <Search className="size-5" />
            <User className="size-5" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[480px] px-5">
        {/* ── Headline ── */}
        <h1 className="mt-4 mb-6 text-4xl font-extrabold tracking-tight">Make plans</h1>

        {/* ── Category rail ── */}
        <div className="-mx-5 px-5 mb-8 flex gap-7 overflow-x-auto scrollbar-none">
          {CATEGORIES.map(({ icon: Icon, label }) => (
            <button
              key={label}
              className="flex flex-col items-center gap-2 shrink-0 text-foreground/85 hover:text-foreground transition"
            >
              <Icon strokeWidth={1.25} className="size-7" />
              <span className="text-[13px] whitespace-nowrap">{label}</span>
            </button>
          ))}
        </div>

        {/* ── Feed ── */}
        <div className="flex flex-col gap-6">
          {FEED.map((card, i) => (
            <article
              key={i}
              className="relative overflow-hidden rounded-[28px] bg-[hsl(var(--surface))] aspect-[3/4] flex flex-col justify-between"
            >
              {/* Visual layer */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.accent}`} aria-hidden />
              <div
                className="absolute inset-0 opacity-40 mix-blend-overlay"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.15) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(0,0,0,0.4) 0, transparent 50%)",
                }}
                aria-hidden
              />
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/40 to-transparent" aria-hidden />

              {/* Top label / badge */}
              <div className="relative p-5 flex items-start justify-between">
                <span className="text-[11px] font-semibold tracking-[0.18em] text-white/85">
                  {card.tag}
                </span>
                {card.badge && (
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-md">
                    {card.badge}
                  </span>
                )}
              </div>

              {/* Bottom content */}
              <div className="relative p-5 pt-3 text-white">
                <h2 className="text-[26px] leading-[1.15] font-extrabold tracking-tight mb-3">
                  {card.title}
                </h2>
                <p className="text-[15px] leading-snug text-white/80 whitespace-pre-line mb-4">
                  {card.meta}
                </p>

                <div className="flex items-center gap-2">
                  <button className="size-10 rounded-full bg-white/15 backdrop-blur grid place-items-center hover:bg-white/25 transition">
                    <Bookmark className="size-4" />
                  </button>
                  <button className="size-10 rounded-full bg-white/15 backdrop-blur grid place-items-center hover:bg-white/25 transition">
                    <ThumbsUp className="size-4" />
                  </button>
                  <button className="size-10 rounded-full bg-white/15 backdrop-blur grid place-items-center hover:bg-white/25 transition">
                    <ThumbsDown className="size-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* ── CTA ── */}
        <div className="mt-10 text-center">
          <p className="text-[15px] text-foreground/70 mb-4">
            Get into your account to find your kind of drafts
          </p>
          <Button asChild size="lg" className="w-full max-w-xs">
            <Link to="/auth">LOG IN / SIGN UP</Link>
          </Button>
        </div>
      </main>

      {/* ── Bottom nav (DICE-style floating pill) ── */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-2 bg-[hsl(0_0%_10%)] rounded-full px-3 py-2 shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
          {[
            { icon: Home,   to: "/landing" },
            { icon: Ticket, to: "/draft-room" },
            { icon: User,   to: "/auth" },
            { icon: Search, to: "/draft-room" },
          ].map(({ icon: Icon, to }, i) => (
            <Link
              key={i}
              to={to}
              className="size-11 grid place-items-center rounded-full text-white/85 hover:text-white hover:bg-white/10 transition"
            >
              <Icon className="size-5" strokeWidth={1.5} />
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
