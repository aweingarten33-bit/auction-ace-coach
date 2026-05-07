import { useMemo } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import DecisionCard from "@/components/DecisionCard";
import { decide } from "@/lib/decision-engine";
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

  const decision = useMemo(() => {
    if (!name) return null;
    try {
      return decide({
        settings,
        keepers,
        events,
        prices,
        player: name,
        position,
        currentPrice: price ?? 0,
      });
    } catch (e) {
      console.error("[PlayerDecisionOverlay] decide() threw:", e);
      return null;
    }
  }, [name, position, price, settings, keepers, events, prices]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/80",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-x-2 top-4 z-50 mx-auto w-auto max-w-md",
            "max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain",
            "rounded-lg border bg-background p-4 shadow-lg",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <DialogPrimitive.Title className="sr-only">
            Pre-draft card for {name}
          </DialogPrimitive.Title>

          {decision ? (
            <DecisionCard d={decision} />
          ) : (
            <div className="rounded-md border border-border bg-secondary/30 p-4 text-center">
              <p className="text-sm font-semibold text-foreground">{name || "Player"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Couldn't build a decision card for this player. Make sure you've completed setup
                (budget, roster, prices) — then try again from the Draft room.
              </p>
            </div>
          )}

          <DialogPrimitive.Close
            aria-label="Close"
            className={cn(
              "absolute right-3 top-3 rounded-sm opacity-70",
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
