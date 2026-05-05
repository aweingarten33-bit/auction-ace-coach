import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Trash2, Plus, FileText, Sparkles, Upload, Loader2, Zap } from "lucide-react";
import PlayerAutocomplete from "@/components/PlayerAutocomplete";
import { parsePriceSheet } from "@/lib/draft-math";
import { PriceEstimate } from "@/lib/draft-types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { buildTierPrices, tierForPosRank, type AuctionRow } from "@/lib/league-tier-prices";

const PARSE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-price-sheet`;

/**
 * Parse a 2D array (from CSV or XLSX) into player/price rows.
 * Auto-detects which columns hold the player name and the price.
 *  - Name column = column with the most string cells that look like "First Last"
 *  - Price column = column with the most positive integers in the range $1–$300
 * Skips header rows and blank rows.
 */
function parseTabular(rows: any[][]): { name: string; price: number }[] {
  if (!rows.length) return [];
  const width = Math.max(...rows.map((r) => r.length));
  const looksLikeName = (v: any) =>
    typeof v === "string" && /^[A-Za-z][A-Za-z'.\-]+\s+[A-Za-z][A-Za-z'.\-]+/.test(v.trim());
  const toPrice = (v: any): number | null => {
    if (typeof v === "number" && Number.isFinite(v) && v >= 1 && v <= 400) return Math.round(v);
    if (typeof v === "string") {
      const m = v.replace(/[$,]/g, "").trim().match(/^-?\d+(\.\d+)?$/);
      if (m) {
        const n = Math.round(parseFloat(m[0]));
        if (n >= 1 && n <= 400) return n;
      }
    }
    return null;
  };

  // Score each column
  const nameScores = new Array(width).fill(0);
  const priceScores = new Array(width).fill(0);
  for (const row of rows) {
    for (let c = 0; c < width; c++) {
      if (looksLikeName(row[c])) nameScores[c]++;
      if (toPrice(row[c]) != null) priceScores[c]++;
    }
  }
  const nameCol = nameScores.indexOf(Math.max(...nameScores));
  // Find best price col that isn't the name col
  let priceCol = -1, best = 0;
  for (let c = 0; c < width; c++) {
    if (c === nameCol) continue;
    if (priceScores[c] > best) { best = priceScores[c]; priceCol = c; }
  }
  if (nameCol < 0 || priceCol < 0 || nameScores[nameCol] === 0 || best === 0) return [];

  const out: { name: string; price: number }[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const name = typeof row[nameCol] === "string" ? row[nameCol].trim() : "";
    const price = toPrice(row[priceCol]);
    if (!name || !looksLikeName(name) || price == null) continue;
    // Strip trailing team/pos junk like "Jalen Hurts PHI QB"
    const clean = name.replace(/\s+(QB|RB|WR|TE|K|DST|DEF|D\/ST)\b.*$/i, "")
                      .replace(/\s+[A-Z]{2,4}$/g, "").trim();
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: clean, price });
  }
  return out;
}

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
  const [autoBusy, setAutoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const autoFillFromEspn = async () => {
    setAutoBusy(true);
    try {
      // Must be signed in — edge functions need a real user JWT (anon key won't pass)
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session?.access_token) {
        toast.error("Please sign in to auto-fill from ESPN");
        return;
      }
      // 1) Make sure last 3 drafts + this year's ranks are cached
      const [hist, ranks] = await Promise.all([
        supabase.functions.invoke("espn-historical-draft", { body: { seasonsBack: 3 } }),
        supabase.functions.invoke("espn-player-ranks", { body: {} }),
      ]);
      if (hist.error || (hist.data as { error?: string })?.error) {
        throw new Error((hist.data as { error?: string })?.error || hist.error?.message || "Couldn't pull ESPN draft history");
      }
      if (ranks.error || (ranks.data as { error?: string })?.error) {
        throw new Error((ranks.data as { error?: string })?.error || ranks.error?.message || "Couldn't pull ESPN player ranks");
      }

      // 2) Build league tier prices from history
      const { data: hRows, error: hErr } = await supabase
        .from("league_auction_history")
        .select("season, player_name, position, bid_amount");
      if (hErr) throw hErr;
      const tierPrices = buildTierPrices((hRows ?? []) as AuctionRow[]);
      if (!tierPrices.length) {
        throw new Error("No auction history found in your last 3 ESPN drafts. Connect ESPN first.");
      }

      // 3) Pull this year's ranks
      const { data: rRows, error: rErr } = await supabase
        .from("espn_player_ranks")
        .select("player_name, position, pos_rank, auction_value");
      if (rErr) throw rErr;
      if (!rRows?.length) {
        throw new Error("No player ranks cached. Try again in a moment.");
      }

      // 4) For each ranked player → tier → league avg $
      const built: { name: string; price: number }[] = [];
      for (const r of rRows) {
        if (!r.position || !r.pos_rank) continue;
        const tier = tierForPosRank(r.position, r.pos_rank);
        const tp = tierPrices.find((t) => t.position === r.position && t.tier === tier);
        const price = tp?.avg ? Math.max(1, Math.round(tp.avg)) : (r.auction_value ?? 0);
        if (price > 0) built.push({ name: r.player_name, price });
      }
      if (!built.length) throw new Error("Couldn't map ranks to league tier prices");
      mergeImported(built, "ESPN auto-fill");
      toast.success(`Auto-filled ${built.length} players from your last 3 ESPN drafts`);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Auto-fill failed");
    } finally {
      setAutoBusy(false);
    }
  };

  const mergeImported = (incoming: { name: string; price: number }[], filename: string) => {
    if (!incoming.length) {
      toast.error("No players found in file");
      return;
    }
    const map = new Map<string, PriceEstimate>();
    for (const p of prices) map.set(p.name.toLowerCase(), p);
    for (const p of incoming) map.set(p.name.toLowerCase(), { name: p.name, price: p.price });
    const merged = Array.from(map.values());
    setPrices(merged);
    setPricesText(merged.map((p) => `${p.name} - ${p.price}`).join("\n"));
    toast.success(`Imported ${incoming.length} players from ${filename}`);
  };

  const handleUpload = async (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      return toast.error("File too large (max 15MB)");
    }
    const name = file.name.toLowerCase();
    const isCsv = name.endsWith(".csv") || file.type === "text/csv";
    const isXlsx = name.endsWith(".xlsx") || name.endsWith(".xls") || file.type.includes("spreadsheet") || file.type.includes("excel");

    setUploading(true);
    try {
      // Fast path: CSV / XLSX parsed locally — no AI cost, instant
      if (isCsv || isXlsx) {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        // Concatenate ALL sheets so multi-tab workbooks (e.g. one tab per position) work
        const allRows: any[][] = [];
        for (const sheetName of wb.SheetNames) {
          const sheet = wb.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "", blankrows: false });
          allRows.push(...rows);
        }
        const players = parseTabular(allRows);
        if (!players.length) {
          toast.error("Couldn't auto-detect name + price columns. Try the AI parser by uploading as PDF, or paste the data instead.");
          return;
        }
        mergeImported(players, file.name);
        return;
      }

      // PDF / image → AI parse
      const buf = await file.arrayBuffer();
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
      mergeImported(players || [], file.name);
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
            Auto-fill from your ESPN league (last 3 drafts × this year's ranks). Upload/paste only if you want to override.
          </p>
        </div>
      </div>

      {/* PRIMARY: Auto-fill from ESPN */}
      <div className="rounded-md border border-primary/50 bg-primary/10 p-3">
        <Button
          className="w-full bg-gradient-primary text-primary-foreground"
          onClick={autoFillFromEspn}
          disabled={autoBusy}
        >
          {autoBusy ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Pulling from ESPN...</>
          ) : (
            <><Zap className="mr-2 h-4 w-4" /> Auto-fill from ESPN (last 3 drafts)</>
          )}
        </Button>
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          Uses your league's actual auction history + ESPN's current positional ranks. Requires ESPN connected on the ESPN page.
        </p>
      </div>

      {/* OR divider */}
      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        OR
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* FALLBACK: Upload CSV / XLSX / PDF / image */}
      <div className="rounded-md border border-dashed border-border/60 bg-secondary/20 p-3">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/pdf,image/png,image/jpeg,image/webp,image/heic"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
          }}
        />
        <Button
          variant="outline"
          className="w-full"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...</>
          ) : (
            <><Upload className="mr-2 h-4 w-4" /> Upload CSV / Excel / PDF / screenshot</>
          )}
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

      <p className="text-[11px] text-muted-foreground">
        Optional — but with prices the assistant can flag steals, reaches, and market inflation in real time.
      </p>
    </div>
  );
}
