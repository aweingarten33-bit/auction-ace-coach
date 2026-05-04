// Vetri / Fantasy Focus quote rotator — scrolling ticker at the top of the app
// Adds podcast-show flavor without disrupting layout. All colors via design tokens.
const QUOTES = [
  { who: "VETRI", text: "Bid like you've seen the spreadsheet. Because you have." },
  { who: "FANTASY FOCUS", text: "The room is sleeping on RBs. Wake up first." },
  { who: "VETRI", text: "Tier breaks are the only thing that matter. Chase the cliff." },
  { who: "YATES", text: "Don't pay retail. Ever. That's the whole gig." },
  { who: "BERRY", text: "Love your team going in. Hate everyone else's." },
  { who: "VETRI", text: "If the math says walk, you walk. No vibes-based bidding." },
  { who: "STEPHANIA", text: "Health is a tier. Treat it like one." },
  { who: "FANTASY FOCUS", text: "Nominate to drain. Bid to win. Know which is which." },
  { who: "VETRI", text: "Every $1 you don't spend on a stud, you waste on a scrub." },
  { who: "YATES", text: "The best ability is availability — and the second is leverage." },
];

export default function QuoteTicker() {
  // Duplicate the list so the marquee loops seamlessly
  const loop = [...QUOTES, ...QUOTES];
  return (
    <div className="border-b border-primary/30 bg-card/95 overflow-hidden">
      <div className="flex items-center gap-3 px-3 py-1">
        <span className="shrink-0 rounded-sm bg-primary px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-widest text-primary-foreground">
          ON AIR
        </span>
        <div className="relative flex-1 overflow-hidden">
          <div className="flex w-max animate-ticker gap-8 whitespace-nowrap">
            {loop.map((q, i) => (
              <span key={i} className="font-mono text-[10px] tracking-wide">
                <span className="text-primary font-bold">{q.who}</span>
                <span className="mx-2 text-muted-foreground">›</span>
                <span className="text-foreground/85">{q.text}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
