import { useMemo } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import AuctionPlayerCard from "@/components/AuctionPlayerCard";
import { decide } from "@/lib/decision-engine";
import { useAnchorMap } from "@/lib/use-anchor-map";
import { useDraftStore } from "@/lib/draft-store";
import { Position } from "@/lib/draft-types";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  position?: Position;
  price?: number;
}

/**
 * Mobile-first player decision popup.
 *
 * IMPORTANT: this bypasses the shared <DialogContent> from
 * `@/components/ui/dialog` because that component hard-codes
 * `top-[50%] translate-y-[-50%]`. On a 402×598 phone screen with a tall
 * card, the dialog ended up positioned mostly below the fold — user
 * only saw the dimmed overlay (the "black screen" bug).
 *
 * Here we render Radix primitives directly with:
 *   - `inset-x-2 top-4`               → no transforms, deterministic spot
 *   - `max-h-[calc(100dvh-2rem)]`     → always fits the dynamic viewport
 *   - inner `overflow-y-auto`         → tall content scrolls inside
 */
export default function PlayerDecisionOverlay({
  open,
  onOpenChange,
  name,
  position,
  price,
}: Props) {
  const settings = useDraftStore((s) => s.settings);
  const keepers = useDraftStore((s) => s.keepers);
  const events = useDraftStore((s) => s.events);
  const prices = useDraftStore((s) => s.prices);
  const { map: anchorMap } = useAnchorMap();

  // Run the engine. Capture errors so the popup never silently blanks.
  const { decision, error } = useMemo(() => {
    if (!name) return { decision: null, error: null as string | null };
    try {
      return {
        decision: decide({
          settings,
          keepers,
          events,
          prices,
          player: name,
          position,
          // Pre-draft: there's no active bid. Passing the sheet price here
          // would make the engine think bidding is already at sheet value.
          currentPrice: 0,
          anchorMap,
        }),
        error: null,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[PlayerDecisionOverlay] decide() threw:", e);
      return { decision: null, error: msg };
    }
  }, [name, position, price, settings, keepers, events, prices, anchorMap]);

  // Setup completeness — most common reason the engine has nothing useful to say
  const setupComplete =
    settings &&
    settings.totalBudget > 0 &&
    settings.numTeams > 0 &&
    settings.roster &&
    Object.values(settings.roster).some((v) => Number(v) > 0);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-[100] bg-black/80",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-x-2 top-4 z-[101] mx-auto w-auto max-w-md",
            "max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain",
            "rounded-lg border bg-background p-4 shadow-lg",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {/* Required for Radix a11y. Visually hidden because DecisionCard renders its own header. */}
          <DialogPrimitive.Title className="sr-only">
            Pre-draft card for {name || "player"}
          </DialogPrimitive.Title>

          {decision ? (
            <DecisionCard d={decision} />
          ) : (
            <div className="space-y-3 rounded-md border border-border bg-secondary/30 p-4">
              <div className="text-center">
                <p className="text-base font-semibold text-foreground">{name || "Player"}</p>
                {position && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{position}</p>
                )}
                {price != null && price > 0 && (
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    sheet ${price}
                  </p>
                )}
              </div>

              <div className="border-t border-border/50 pt-3 text-center">
                {!setupComplete ? (
                  <>
                    <p className="text-sm font-medium text-foreground">
                      Finish setup to see decisions
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Complete the budget, roster, and prices in the setup wizard so the
                      engine can compute a recommendation.
                    </p>
                  </>
                ) : error ? (
                  <>
                    <p className="text-sm font-medium text-destructive">
                      Decision engine error
                    </p>
                    <p className="mt-1 break-words font-mono text-[11px] text-muted-foreground">
                      {error}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-foreground">
                      No decision available
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      The engine returned nothing for this player. Try reloading the
                      Draft page, or double-check that prices and roster are saved.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          <DialogPrimitive.Close
            aria-label="Close"
            className={cn(
              "absolute right-3 top-3 rounded-sm bg-background/80 p-1 opacity-80",
              "ring-offset-background transition-opacity hover:opacity-100",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "disabled:pointer-events-none",
            )}
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
