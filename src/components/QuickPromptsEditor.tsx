// Lets the user customize which quick-question buttons appear in the assistant.
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, RotateCcw, Pencil } from "lucide-react";
import { QuickPrompt } from "@/lib/draft-store";

interface Props {
  prompts: QuickPrompt[];
  onSave: (prompts: QuickPrompt[]) => void;
  onReset: () => void;
}

export default function QuickPromptsEditor({ prompts, onSave, onReset }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<QuickPrompt[]>(prompts);

  function startEdit() {
    setDraft(prompts);
    setOpen(true);
  }

  function update(id: string, field: "label" | "prompt", value: string) {
    setDraft((d) => d.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  }

  function remove(id: string) {
    setDraft((d) => d.filter((p) => p.id !== id));
  }

  function add() {
    setDraft((d) => [
      ...d,
      { id: `qp-${Date.now()}`, label: "New question", prompt: "Ask the assistant…" },
    ]);
  }

  function save() {
    const cleaned = draft
      .map((p) => ({ ...p, label: p.label.trim(), prompt: p.prompt.trim() }))
      .filter((p) => p.label && p.prompt);
    onSave(cleaned);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? startEdit() : setOpen(false))}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 px-2 text-[10px] text-muted-foreground hover:text-foreground"
          title="Edit quick questions"
        >
          <Pencil className="h-3 w-3" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit quick questions</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Add, remove, or rewrite the buttons that appear above the chat. The label shows on
            the button; the question is what's actually sent to the assistant.
          </p>
        </DialogHeader>

        <div className="max-h-[55vh] space-y-3 overflow-auto pr-1">
          {draft.length === 0 && (
            <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              No quick questions. Add one below.
            </p>
          )}
          {draft.map((p, i) => (
            <div key={p.id} className="rounded-md border border-border bg-secondary/30 p-2.5">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Button {i + 1}
                </span>
                <Button
                  size="sm" variant="ghost"
                  className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-destructive"
                  onClick={() => remove(p.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <Input
                value={p.label}
                onChange={(e) => update(p.id, "label", e.target.value)}
                placeholder="Button label (e.g. Who should I nominate?)"
                className="mb-2 h-8 text-sm"
              />
              <Textarea
                value={p.prompt}
                onChange={(e) => update(p.id, "prompt", e.target.value)}
                placeholder="Full question sent to the assistant"
                className="min-h-[60px] text-xs"
              />
            </div>
          ))}
        </div>

        <DialogFooter className="flex-row items-center justify-between sm:justify-between">
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" onClick={add} className="gap-1 text-xs">
              <Plus className="h-3 w-3" /> Add question
            </Button>
            <Button
              size="sm" variant="ghost"
              onClick={() => { onReset(); setOpen(false); }}
              className="gap-1 text-xs text-muted-foreground"
              title="Reset to defaults"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </Button>
          </div>
          <div className="flex gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={save}>Save</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
