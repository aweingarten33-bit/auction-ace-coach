import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DecisionCard from "@/components/DecisionCard";
import { decide } from "@/lib/decision-engine";
import { useDraftStore } from "@/lib/draft-store";
import { Position } from "@/lib/draft-types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  position?: Position;
  price?: number;
}

export default function PlayerDecisionOverlay({ open, onOpenChange, name, position, price }: Props) {
  const settings = useDraftStore((s) => s.settings);
  const keepers = useDraftStore((s) => s.keepers);
  const events = useDraftStore((s) => s.events);
  const prices = useDraftStore((s) => s.prices);

  const decision = useMemo(() => {
    if (!name) return null;
    return decide({
      settings,
      keepers,
      events,
      prices,
      player: name,
      position,
      currentPrice: price ?? 0,
    });
  }, [name, position, price, settings, keepers, events, prices]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-4 left-1/2 -translate-x-1/2 translate-y-0 max-w-md max-h-[90vh] overflow-y-auto p-4">
        <DialogHeader className="sr-only">
          <DialogTitle>Pre-draft card for {name}</DialogTitle>
        </DialogHeader>
        {decision && <DecisionCard d={decision} />}
      </DialogContent>
    </Dialog>
  );
}
