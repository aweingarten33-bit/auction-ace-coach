// Renders source citations, confidence badge, and a collapsible debug view
// for a single coach reply. All data comes from the edge function meta event;
// nothing is persisted (intentionally session-only).
import { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, FileText, Globe } from "lucide-react";
import type { CoachMeta } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Props {
  meta: CoachMeta;
}

const LABEL_TONE: Record<CoachMeta["confidence"]["label"], string> = {
  high: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  low: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
};

function hostOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

export default function CoachMeta({ meta }: Props) {
  const [showSources, setShowSources] = useState(false);
  const { confidence, sources, searched, firecrawlCache } = meta;
  const pdfPct = Math.round(confidence.pdf * 100);
  const webPct = Math.round(confidence.web * 100);

  return (
    <div className="mt-2 space-y-1.5 text-[11px]">
      {/* Confidence + cache row */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold uppercase tracking-wider",
            LABEL_TONE[confidence.label],
          )}
          title={confidence.basis}
        >
          {confidence.label} confidence
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-muted-foreground">
          <FileText className="h-3 w-3" /> PDF {pdfPct}%
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-muted-foreground">
          <Globe className="h-3 w-3" /> Web {webPct}%
        </span>
        {searched && firecrawlCache === "hit" && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            cached
          </span>
        )}
        {!searched && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            PDF only
          </span>
        )}
      </div>

      {/* Sources panel */}
      {sources.length > 0 && (
        <div className="rounded-lg border border-border/60 bg-muted/30">
          <button
            type="button"
            onClick={() => setShowSources((v) => !v)}
            className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-medium hover:bg-muted/60"
          >
            <span className="flex items-center gap-1.5">
              {showSources ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Sources used ({sources.length})
            </span>
          </button>
          {showSources && (
            <ul className="space-y-1 px-2.5 pb-2">
              {sources.map((s, i) => (
                <li key={s.url + i} className="rounded-md border border-border/40 bg-background/60 px-2 py-1.5">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                  >
                    <span className="truncate">[{i + 1}] {s.title || hostOf(s.url)}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">{hostOf(s.url)}</div>
                  {s.description && (
                    <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{s.description}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

    </div>
  );
}
