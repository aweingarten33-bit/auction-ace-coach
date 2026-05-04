import { useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Trash2, Plus, FileText, Sparkles, Upload, Loader2 } from "lucide-react";
import { parsePriceSheet } from "@/lib/draft-math";
import { PriceEstimate } from "@/lib/draft-types";
import { toast } from "sonner";

const PARSE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-price-sheet`;

interface Props {
  prices: PriceEstimate[];
  setPrices: (p: PriceEstimate[]) => void;
  pricesText: string;
  setPricesText: (s: string) => void;
}

export default function PriceSheetEditor({ prices, setPrices, pricesText, setPricesText }: Props) {
  const [showRaw, setShowRaw] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickPrice, setQuickPrice] = useState("");
  const [filter, setFilter] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      return toast.error("File too large (max 15MB)");
    }
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      // base64 encode in chunks to avoid stack overflow on large files
      let binary = "";
      const bytes = new Uint8Array(buf);
      const CHUNK = 0x8000;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
      }
      const fileBase64 = btoa(binary);
      const resp = await fetch(PARSE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ fileBase64, mimeType: file.type || "application/pdf" }),
      });
      if (!resp.ok) {
        const t = await resp.json().catch(() => ({}));
        throw new Error(t.error || `Parse failed (${resp.status})`);
      }
      const { players } = await resp.json() as { players: { name: string; price: number }[] };
      if (!players?.length) {
        toast.error("No players found in file");
        return;
      }
      // Merge with existing — overwrite duplicates with new prices
      const map = new Map<string, PriceEstimate>();
      for (const p of prices) map.set(p.name.toLowerCase(), p);
      for (const p of players) map.set(p.name.toLowerCase(), { name: p.name, price: p.price });
      const merged = Array.from(map.values());
      setPrices(merged);
      setPricesText(merged.map((p) => `${p.name} - ${p.price}`).join("\n"));
      toast.success(`Imported ${players.length} players from ${file.name}`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // Parse on every keystroke for the live preview
  const parsed = useMemo(() => parsePriceSheet(pricesText), [pricesText]);
  const validCount = parsed.length;
  const totalLines = pricesText.split(/\r?\n/).filter((l) => l.trim()).length;
  const skipped = Math.max(0, totalLines - validCount);

  // Sync parsed → prices whenever it changes meaningfully
  const syncParsed = () => {
    setPrices(parsed);
    toast.success(`Parsed ${parsed.length} players`);
  };

  // Inline list edits operate directly on `prices` (committed state)
  const filtered = filter
    ? prices.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()))
    : prices;

  const updatePrice = (idx: number, value: number) => {
    const next = [...prices];
    next[idx] = { ...next[idx], price: value };
    setPrices(next);
    setPricesText(next.map((p) => `${p.name} - ${p.price}`).join("\n"));
  };
  const removeRow = (idx: number) => {
    const next = prices.filter((_, i) => i !== idx);
    setPrices(next);
    setPricesText(next.map((p) => `${p.name} - ${p.price}`).join("\n"));
  };
  const addQuick = () => {
    const name = quickName.trim();
    const price = parseInt(quickPrice, 10);
    if (!name) return toast.error("Player name required");
    if (!Number.isFinite(price) || price <= 0) return toast.error("Valid price required");
    if (prices.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      return toast.error("Already in your sheet");
    }
    const next = [...prices, { name, price }];
    setPrices(next);
    setPricesText(next.map((p) => `${p.name} - ${p.price}`).join("\n"));
    setQuickName(""); setQuickPrice("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Player Price Estimates</p>
          <p className="text-[11px] text-muted-foreground">
            Upload a PDF/screenshot of last year's results, or paste/type below.
          </p>
        </div>
        <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">
          {prices.length} players · ${prices.reduce((s, p) => s + p.price, 0)} total
        </Badge>
      </div>

      {/* Upload PDF/image */}
      <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-3">
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp,image/heic"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
          }}
        />
        <Button
          variant="outline"
          className="w-full border-primary/40 hover:bg-primary/10"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reading sheet with AI...</>
          ) : (
            <><Upload className="mr-2 h-4 w-4" /> Upload PDF or screenshot</>
          )}
        </Button>
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          Last year's auction results, FantasyPros export, ESPN screenshot — AI extracts names + prices automatically.
        </p>
      </div>

      {/* Quick-add */}
      <div className="grid grid-cols-[1fr_90px_auto] gap-2">
        <Input
          placeholder="Player name"
          value={quickName}
          onChange={(e) => setQuickName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addQuick()}
        />
        <Input
          type="number"
          inputMode="numeric"
          placeholder="$"
          value={quickPrice}
          onChange={(e) => setQuickPrice(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addQuick()}
        />
        <Button onClick={addQuick} size="icon" variant="outline">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Filter / list */}
      {prices.length > 0 && (
        <>
          <Input
            placeholder={`Filter ${prices.length} players...`}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-8 text-sm"
          />
          <div className="max-h-72 space-y-1 overflow-auto rounded-md border border-border/60 bg-secondary/20 p-1">
            {filtered.map((p) => {
              const idx = prices.findIndex((x) => x.name === p.name);
              return (
                <div key={p.name} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-secondary/60">
                  <span className="flex-1 truncate font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={p.price}
                    onChange={(e) => updatePrice(idx, parseInt(e.target.value) || 0)}
                    className="h-7 w-16 text-right font-mono text-xs"
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeRow(idx)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
            {!filtered.length && (
              <p className="py-4 text-center text-xs text-muted-foreground">No matches.</p>
            )}
          </div>
        </>
      )}

      {/* Bulk paste */}
      <div className="rounded-md border border-border/60 bg-secondary/20">
        <button
          onClick={() => setShowRaw((v) => !v)}
          className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
        >
          <span className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Paste a sheet
            {validCount > 0 && (
              <span className="ml-2 normal-case text-primary">({validCount} parsed{skipped ? `, ${skipped} skipped` : ""})</span>
            )}
          </span>
          {showRaw ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {showRaw && (
          <div className="border-t border-border/60 p-3 space-y-2">
            <p className="text-[11px] text-muted-foreground">
              Accepts almost anything: <code>Name - 65</code>, <code>Name $65</code>, <code>Name, QB, 65</code>, tab-separated FantasyPros/ESPN exports. We grab the last number on each line as the price.
            </p>
            <Textarea
              rows={10}
              placeholder={"Christian McCaffrey - 70\nJalen Hurts $45\nCeeDee Lamb, WR, 55\nJustin Jefferson\tWR\t62"}
              value={pricesText}
              onChange={(e) => setPricesText(e.target.value)}
              className="font-mono text-xs"
            />
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                {validCount} valid · {skipped} skipped
              </p>
              <Button size="sm" onClick={syncParsed} disabled={!validCount}>
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Use parsed list
              </Button>
            </div>
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Optional — but with prices the coach can flag steals, reaches, and market inflation in real time.
      </p>
    </div>
  );
}
