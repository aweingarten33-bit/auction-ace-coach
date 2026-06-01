import ReactMarkdown from "react-markdown";
import { Calculator } from "lucide-react";

// Matches the strict math anchor format the coach must end bid recs with:
//   *(Bank $X · max bid $Y · N slots left)*
const ANCHOR_RE =
  /\*\(Bank \$(\d+) \u00B7 max bid \$(\d+) \u00B7 (\d+) slots left\)\*\s*$/;

interface Props {
  content: string;
}

export default function CoachMessage({ content }: Props) {
  const trimmed = content.trimEnd();
  const m = trimmed.match(ANCHOR_RE);

  if (!m) {
    return (
      <div className="prose prose-sm max-w-none text-foreground">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  }

  const body = trimmed.slice(0, m.index).trimEnd();
  const [, bank, maxBid, slots] = m;

  return (
    <div className="space-y-2">
      <div className="prose prose-sm max-w-none text-foreground">
        <ReactMarkdown>{body}</ReactMarkdown>
      </div>
      <div
        role="note"
        aria-label="Bid math anchor"
        className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1.5 font-mono text-[12px] tabular-nums text-primary shadow-sm ring-1 ring-primary/20"
      >
        <Calculator className="h-3.5 w-3.5 shrink-0" />
        <span>
          <span className="text-muted-foreground">Bank</span>{" "}
          <span className="font-bold text-foreground">${bank}</span>
        </span>
        <span className="text-muted-foreground/60">·</span>
        <span>
          <span className="text-muted-foreground">Max bid</span>{" "}
          <span className="font-bold text-foreground">${maxBid}</span>
        </span>
        <span className="text-muted-foreground/60">·</span>
        <span>
          <span className="font-bold text-foreground">{slots}</span>{" "}
          <span className="text-muted-foreground">slots left</span>
        </span>
      </div>
    </div>
  );
}
