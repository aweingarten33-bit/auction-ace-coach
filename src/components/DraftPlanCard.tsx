import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDraftStore } from "@/lib/draft-store";
import { ChevronDown, ChevronUp, ClipboardList, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onGenerate: () => Promise<void> | void;
  generating: boolean;
}

export default function DraftPlanCard({ onGenerate, generating }: Props) {
  const { draftPlan, clearDraftPlan, events } = useDraftStore();
  const [collapsed, setCollapsed] = useState(false);

  const picksSinceSave = draftPlan
    ? Math.max(0, events.length - draftPlan.pickCountAtSave)
    : 0;
  const stale = picksSinceSave >= 5;

  const copyPlan = async () => {
    if (!draftPlan) return;
    try {
      await navigator.clipboard.writeText(draftPlan.content);
      toast.success("Plan copied");
    } catch {
      toast.error("Couldn't copy");
    }
  };

  return (
    <Card className="border-border/60 bg-secondary/20 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <ClipboardList className="h-3.5 w-3.5" />
          My draft plan
          {draftPlan && (
            <span className="ml-1 normal-case font-normal text-[10px] text-muted-foreground/80">
              · updated after pick {draftPlan.pickCountAtSave}
              {picksSinceSave > 0 && (
                <span className={stale ? "text-destructive" : ""}>
                  {" "}({picksSinceSave} pick{picksSinceSave === 1 ? "" : "s"} ago{stale ? " — refresh" : ""})
                </span>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 px-2 text-[11px]"
            onClick={onGenerate}
            disabled={generating}
            title={draftPlan ? "Regenerate plan with current state" : "Generate a draft plan"}
          >
            <RefreshCw className={`h-3 w-3 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Saving…" : draftPlan ? "Update" : "Generate"}
          </Button>
          {draftPlan && (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[11px]"
                onClick={() => setCollapsed((c) => !c)}
              >
                {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
              </Button>
            </>
          )}
        </div>
      </div>

      {!draftPlan && (
        <p className="text-xs text-muted-foreground">
          Save a strategy + top targets to refer back to during long gaps. Updates whenever you tap <strong>Update</strong>.
        </p>
      )}

      {draftPlan && !collapsed && (
        <>
          <div className="coach-md prose prose-sm max-w-none rounded-md bg-background/60 p-3 text-xs text-foreground">
            <ReactMarkdown>{draftPlan.content}</ReactMarkdown>
          </div>
          <div className="mt-2 flex items-center justify-end gap-1">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={copyPlan}>
              Copy
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-2 text-[11px] text-muted-foreground hover:text-destructive"
              onClick={clearDraftPlan}
            >
              <Trash2 className="h-3 w-3" />
              Clear
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
