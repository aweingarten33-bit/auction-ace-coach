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
      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{scrollbar-width:none}`}</style>

      <main className="mx-auto max-w-[440px] px-5 pt-10">
        {/* Headline */}
        <h1 className="text-[36px] leading-[1.05] font-semibold tracking-tight mb-8">
          Make plans
        </h1>

        {/* Category rail */}
        <div className="-mx-5 px-5 mb-7 flex gap-8 overflow-x-auto no-scrollbar">
          {CATEGORIES.map(({ icon: Icon, label }) => (
            <button
              key={label}
              className="flex flex-col items-center gap-2 shrink-0 text-white"
            >
              <Icon strokeWidth={1.25} className="size-9" />
              <span className="text-[14px] font-normal whitespace-nowrap">{label}</span>
            </button>
          ))}
        </div>

        {/* Feed */}
        <div className="flex flex-col gap-6">
          {FEED.map((card, i) => (
            <article
              key={i}
              className="relative overflow-hidden rounded-[20px] bg-[#0d0d0d] aspect-[3/4]"
            >
              {/* Visual */}
              {card.visual === "splatter" ? (
                <div className="absolute inset-0">
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(160deg, #d8d2bf 0%, #6b8a3a 35%, #1a4ab8 60%, #0a1430 100%)",
                    }}
                  />
                  <div
                    className="absolute inset-0 mix-blend-screen opacity-90"
                    style={{
                      background:
                        "radial-gradient(circle at 60% 40%, rgba(255,90,30,0.55) 0%, transparent 38%), radial-gradient(circle at 30% 65%, rgba(40,200,80,0.45) 0%, transparent 40%), radial-gradient(circle at 75% 25%, rgba(255,140,40,0.4) 0%, transparent 30%)",
                    }}
                  />
                  <div
                    className="absolute inset-0 opacity-70 mix-blend-overlay"
                    style={{
                      backgroundImage:
                        "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.4 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
                    }}
                  />
                </div>
              ) : (
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(ellipse at 50% 35%, #4a4540 0%, #1a1814 60%, #0a0908 100%)",
                  }}
                />
              )}

              {/* Bottom shade */}
              <div
                className="absolute inset-x-0 bottom-0 h-[75%] pointer-events-none"
                style={{
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.95) 10%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0) 100%)",
                }}
              />

              {card.badge && (
                <span className="absolute top-4 left-4 z-10 bg-[#dcff1e] text-black text-[14px] font-semibold px-2.5 py-1 rounded-md">
                  {card.badge}
                </span>
              )}

              {/* Content */}
              <div className="absolute inset-x-0 bottom-0 p-5">
                <div className="text-[12px] tracking-[0.16em] font-semibold text-white mb-2">
                  {card.tag}
                </div>
                <h2 className="text-[28px] leading-[1.1] font-bold tracking-tight mb-3">
                  {card.title}
                </h2>

                <div className="flex items-end justify-between gap-3">
                  <div className="text-[16px] leading-[1.35] text-white">
                    {card.when && <>{card.when}<br /></>}
                    {card.venue}
                    {card.price && <><br />{card.price}</>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button aria-label="Save" className="size-10 rounded-full bg-white/15 grid place-items-center">
                      <Bookmark className="size-[18px]" strokeWidth={1.5} />
                    </button>
                    <button aria-label="Like" className="size-10 rounded-full bg-white/15 grid place-items-center">
                      <ThumbsUp className="size-[18px]" strokeWidth={1.5} />
                    </button>
                    <button aria-label="Dislike" className="size-10 rounded-full bg-white/15 grid place-items-center">
                      <ThumbsDown className="size-[18px]" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>

      {/* Floating bottom: home pill (left) + search circle (right) */}
      <div className="fixed bottom-5 left-0 right-0 z-50 px-5 flex items-center justify-between max-w-[440px] mx-auto pointer-events-none">
        <Link
          to="/landing"
          aria-label="Home"
          className="size-14 rounded-full bg-[#1c1c1c]/95 backdrop-blur grid place-items-center text-white shadow-[0_10px_30px_rgba(0,0,0,0.7)] pointer-events-auto"
        >
          <Home className="size-[22px]" strokeWidth={1.5} />
        </Link>
        <Link
          to="/draft-room"
          aria-label="Search"
          className="size-14 rounded-full bg-[#1c1c1c]/95 backdrop-blur grid place-items-center text-white shadow-[0_10px_30px_rgba(0,0,0,0.7)] pointer-events-auto"
        >
          <Search className="size-[22px]" strokeWidth={1.5} />
        </Link>
      </div>
    </div>
  );
}
