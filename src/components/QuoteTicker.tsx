// SportsCenter-style chyron ticker — Stuart Scott swagger + Rich Eisen pacing,
// stacked with Vetri / Fantasy Focus voices. All colors via design tokens.
const QUOTES = [
  { who: "STUART SCOTT", text: "Booyah! He's as cool as the other side of the pillow." },
  { who: "STUART SCOTT", text: "Don't hate the player. Hate the bid sheet." },
  { who: "RICH EISEN", text: "And here we go… clock's ticking, wallet's open." },
  { who: "RICH EISEN", text: "You can't stop him. You can only hope to nominate him." },
  { who: "VETRI", text: "Bid like you've seen the spreadsheet. Because you have." },
  { who: "FANTASY FOCUS", text: "The room is sleeping on RBs. Wake up first." },
  { who: "STUART SCOTT", text: "He must be the bus driver — 'cause he was takin' him to school." },
  { who: "RICH EISEN", text: "Welcome back to the Auction Room. Nobody's safe." },
  { who: "VETRI", text: "Tier breaks are the only thing that matter. Chase the cliff." },
  { who: "YATES", text: "Don't pay retail. Ever. That's the whole gig." },
  { who: "BERRY", text: "Love your team going in. Hate everyone else's." },
  { who: "STUART SCOTT", text: "Call him butter — 'cause he's on a roll." },
  { who: "RICH EISEN", text: "That, my friends, is how you win an auction." },
  { who: "VETRI", text: "Every $1 you don't spend on a stud, you waste on a scrub." },
];

export default function QuoteTicker() {
  const loop = [...QUOTES, ...QUOTES];
  return (
    <div className="border-b border-primary/40 bg-black overflow-hidden">
      <div className="flex items-stretch gap-0">
        {/* Red lower-third tag, ESPN-style */}
        <div className="flex shrink-0 items-center bg-gradient-chyron px-3 py-1 shadow-chyron">
          <span className="font-chyron text-[11px] font-extrabold italic tracking-wider text-white">
            <span className="mr-1 inline-block h-2 w-2 translate-y-[-1px] rounded-full bg-accent live-pulse align-middle"></span>
            SPORTSCENTER · LIVE
          </span>
        </div>
        <div className="relative flex-1 overflow-hidden bg-black">
          <div className="flex w-max animate-ticker gap-8 whitespace-nowrap py-1.5 pl-4">
            {loop.map((q, i) => (
              <span key={i} className="font-lower-third text-[11px]">
                <span className="text-accent">{q.who}</span>
                <span className="mx-2 text-primary">›</span>
                <span className="font-sans normal-case tracking-normal text-foreground/90" style={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}>
                  {q.text}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
