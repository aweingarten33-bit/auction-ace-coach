import { Link } from "react-router-dom";
import {
  Bookmark, ThumbsUp, ThumbsDown,
  Home, Search,
  Moon, Clock, CalendarDays, Megaphone, Flame,
} from "lucide-react";

/* DICE-style mobile feed (visual parity, our content). */

const CATEGORIES = [
  { icon: Moon,         label: "Tonight" },
  { icon: Clock,        label: "This week" },
  { icon: CalendarDays, label: "Pick dates" },
  { icon: Megaphone,    label: "New shows" },
  { icon: Flame,        label: "Most viewed" },
];

const FEED = [
  {
    tag: "POPULAR",
    title: "The Auction Room: Mahomes, Allen",
    when: "Fri, May 8",
    venue: "Live Draft Lobby",
    price: "Free",
    visual: "splatter" as const,
    badge: null as string | null,
  },
  {
    tag: "LIST BY DRAFTROOM",
    title: "Vetri tells it like it is",
    when: "",
    venue: "You can't fake auction reps. Vetri's calls are the real thing — the math, the reads, the tells.",
    price: "",
    visual: "portrait" as const,
    badge: "New",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-black text-white pb-32 font-sans">
      <main className="mx-auto max-w-[440px] px-5 pt-6">
        {/* Headline */}
        <h1 className="text-[34px] leading-[1.1] font-semibold tracking-tight mb-7">
          Make plans
        </h1>

        {/* Category rail */}
        <div className="-mx-5 px-5 mb-6 flex gap-7 overflow-x-auto scrollbar-none">
          {CATEGORIES.map(({ icon: Icon, label }) => (
            <button
              key={label}
              className="flex flex-col items-center gap-2 shrink-0 text-white/95"
            >
              <Icon strokeWidth={1.25} className="size-8" />
              <span className="text-[13px] font-medium whitespace-nowrap">{label}</span>
            </button>
          ))}
        </div>

        {/* Feed */}
        <div className="flex flex-col gap-7">
          {FEED.map((card, i) => (
            <article
              key={i}
              className="relative overflow-hidden rounded-[22px] bg-[#111] aspect-[3/4]"
            >
              {/* Visual */}
              {card.visual === "splatter" ? (
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(ellipse at 65% 35%, #1d6bff 0%, transparent 55%), radial-gradient(circle at 70% 30%, #ff6a1f 0 2px, transparent 3px) 0 0/14px 14px, radial-gradient(circle at 30% 60%, #2dbb3d 0 2px, transparent 3px) 0 0/18px 18px, linear-gradient(135deg, #0c1410 0%, #0a0a0a 100%)",
                  }}
                  aria-hidden
                />
              ) : (
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(ellipse at 50% 35%, #4a4540 0%, #1a1814 60%, #0a0908 100%)",
                  }}
                  aria-hidden
                />
              )}

              {/* Bottom shade for legibility */}
              <div
                className="absolute inset-x-0 bottom-0 h-[70%]"
                style={{
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.7) 35%, rgba(0,0,0,0) 100%)",
                }}
                aria-hidden
              />

              {/* New badge */}
              {card.badge && (
                <span className="absolute top-4 left-4 z-10 bg-[#dcff1e] text-black text-[13px] font-semibold px-2.5 py-1 rounded-md">
                  {card.badge}
                </span>
              )}

              {/* Content */}
              <div className="absolute inset-x-0 bottom-0 p-5 pr-4">
                <div className="text-[11px] tracking-[0.14em] font-semibold text-white/90 mb-2">
                  {card.tag}
                </div>
                <h2 className="text-[26px] leading-[1.1] font-bold tracking-tight mb-3 pr-16">
                  {card.title}
                </h2>
                {card.when && (
                  <div className="text-[15px] leading-snug text-white/95">
                    {card.when}
                    <br />
                    {card.venue}
                    <br />
                    {card.price}
                  </div>
                )}
                {!card.when && card.venue && (
                  <p className="text-[14px] leading-snug text-white/85 pr-16">
                    {card.venue}
                  </p>
                )}

                {/* Action row bottom-right */}
                <div className="absolute right-4 bottom-5 flex items-center gap-2">
                  <button aria-label="Save" className="size-9 rounded-full bg-white/10 backdrop-blur-sm grid place-items-center">
                    <Bookmark className="size-[18px]" strokeWidth={1.5} />
                  </button>
                  <button aria-label="Like" className="size-9 rounded-full bg-white/10 backdrop-blur-sm grid place-items-center">
                    <ThumbsUp className="size-[18px]" strokeWidth={1.5} />
                  </button>
                  <button aria-label="Dislike" className="size-9 rounded-full bg-white/10 backdrop-blur-sm grid place-items-center">
                    <ThumbsDown className="size-[18px]" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>

      {/* Floating bottom controls — DICE pattern: home pill (left) + search circle (right) */}
      <div className="fixed bottom-5 left-0 right-0 z-50 px-5 flex items-center justify-between max-w-[440px] mx-auto">
        <Link
          to="/landing"
          aria-label="Home"
          className="size-14 rounded-full bg-[#1c1c1c]/90 backdrop-blur grid place-items-center text-white shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
        >
          <Home className="size-6" strokeWidth={1.5} />
        </Link>
        <Link
          to="/draft-room"
          aria-label="Search"
          className="size-14 rounded-full bg-[#1c1c1c]/90 backdrop-blur grid place-items-center text-white shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
        >
          <Search className="size-6" strokeWidth={1.5} />
        </Link>
      </div>
    </div>
  );
}
