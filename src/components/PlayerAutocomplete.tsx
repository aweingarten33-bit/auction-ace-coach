import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { loadSleeperPlayers, searchPlayers, SleeperPlayer } from "@/lib/sleeper";
import { Badge } from "@/components/ui/badge";
import { POS_COLORS } from "@/lib/positions";

interface Props {
  value: string;
  onChange: (val: string) => void;
  onSelect?: (player: SleeperPlayer) => void;
  onEnter?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export default function PlayerAutocomplete({
  value,
  onChange,
  onSelect,
  onEnter,
  placeholder = "Player name",
  autoFocus,
  className,
}: Props) {
  const [players, setPlayers] = useState<SleeperPlayer[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

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

  const suggestions = value.trim().length >= 2 ? searchPlayers(players, value, 8) : [];

  useEffect(() => {
    if (!open) return;
    const active = listRef.current?.querySelector<HTMLButtonElement>(`[data-index="${highlight}"]`);
    active?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  const choose = (p: SleeperPlayer) => {
    onChange(p.full_name);
    onSelect?.(p);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className={`relative min-w-0 ${className || ""}`}>
      <Input
        role="combobox"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={open && suggestions[highlight] ? `${listboxId}-option-${highlight}` : undefined}
        placeholder={placeholder}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (open && suggestions.length) {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => (h + 1) % suggestions.length);
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
              return;
            }
            if (e.key === "Enter") {
              if (suggestions[highlight]) {
                e.preventDefault();
                choose(suggestions[highlight]);
                return;
              }
            }
            if (e.key === "Escape") {
              setOpen(false);
              return;
            }
          }
          if (e.key === "Enter") onEnter?.();
        }}
        className="font-medium"
      />
      {open && suggestions.length > 0 && (
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="absolute left-0 z-50 mt-1 max-h-80 w-full max-w-[calc(100vw-1.5rem)] overflow-auto rounded-md border border-border bg-popover shadow-lg sm:w-[min(22rem,90vw)]"
        >
          {suggestions.map((p, i) => (
            <button
              key={p.player_id}
              id={`${listboxId}-option-${i}`}
              role="option"
              aria-selected={i === highlight}
              data-index={i}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                choose(p);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={`flex w-full min-w-0 items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-accent/40 ${
                i === highlight ? "bg-accent/30" : ""
              }`}
            >
              <span className="min-w-0 truncate text-sm font-medium">{p.full_name}</span>
              <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                {p.team && <span>{p.team}</span>}
                {p.position && (
                  <Badge variant="outline" className={`${POS_COLORS[p.position as keyof typeof POS_COLORS] || ""} text-[10px] px-1.5 py-0`}>
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
