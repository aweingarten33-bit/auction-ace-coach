// Renders source citations for a single coach reply. All data comes from the
// edge function meta event; nothing is persisted (intentionally session-only).
import { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import type { CoachMeta } from "@/lib/api";

interface Props {
  meta: CoachMeta;
}

function hostOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

export default function CoachMeta({ meta }: Props) {
  const [showSources, setShowSources] = useState(false);
  const { sources } = meta;

  return (
    <div className="mt-2 space-y-1.5 text-[11px]">


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
