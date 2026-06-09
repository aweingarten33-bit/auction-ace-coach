import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { loadSleeperPlayers, searchPlayers, type SleeperPlayer } from "@/lib/sleeper";
import { POS_COLORS } from "@/lib/positions";
import type { SlotGroup } from "@/lib/planner-slots";

interface Props {
  value: string;
  onChange: (val: string) => void;
  group: SlotGroup;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}

const GROUP_FILTER: Record<SlotGroup, string[] | null> = {
  QB: ["QB"],
  RB: ["RB"],
  WR: ["WR"],
  TE: ["TE"],
  FLEX: ["RB", "WR", "TE"],
  SUPERFLEX: ["QB"],
  K: ["K"],
  DST: ["DST"],
  BENCH: null,
};

export default function SlotTargetsInput({
  value,
  onChange,
  group,
  placeholder = "targets…",
  className,
  ariaLabel,
}: Props) {
  const [players, setPlayers] = useState<SleeperPlayer[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSleeperPlayers().then(setPlayers).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Suggestions filter by the last comma-separated token + position group.
  const { token, prefix } = useMemo(() => {
    const idx = value.lastIndexOf(",");
    const prefix = idx >= 0 ? value.slice(0, idx + 1) : "";
    const tail = idx >= 0 ? value.slice(idx + 1) : value;
    return { token: tail.trimStart(), prefix };
  }, [value]);

  const allowed = GROUP_FILTER[group];
  const suggestions = useMemo(() => {
    if (token.trim().length < 2) return [];
    const base = searchPlayers(players, token, 20);
    const filtered = allowed
      ? base.filter((p) => p.position && allowed.includes(p.position))
      : base;
    return filtered.slice(0, 8);
  }, [players, token, allowed]);

  const choose = (p: SleeperPlayer) => {
    const sep = prefix && !prefix.endsWith(" ") ? " " : "";
    onChange(`${prefix}${sep}${p.full_name}`);
    setOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <div ref={wrapRef} className={`relative min-w-0 flex-1 ${className || ""}`}>
      <Input
        ref={inputRef}
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open || !suggestions.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => (h + 1) % suggestions.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
          } else if (e.key === "Enter" && suggestions[highlight]) {
            e.preventDefault();
            choose(suggestions[highlight]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="h-8 w-full rounded-lg px-2 text-xs"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 z-50 mt-1 max-h-72 w-[min(20rem,calc(100vw-2rem))] overflow-auto rounded-md border border-border bg-popover shadow-lg">
          {suggestions.map((p, i) => (
            <button
              key={p.player_id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                choose(p);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={`flex w-full min-w-0 items-center justify-between gap-3 px-3 py-2 text-left hover:bg-accent/40 ${
                i === highlight ? "bg-accent/30" : ""
              }`}
            >
              <span className="min-w-0 truncate text-sm font-medium">{p.full_name}</span>
              <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                {p.team && <span>{p.team}</span>}
                {p.position && (
                  <Badge
                    variant="outline"
                    className={`${POS_COLORS[p.position as keyof typeof POS_COLORS] || ""} text-[10px] px-1.5 py-0`}
                  >
                    {p.position}
                  </Badge>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
