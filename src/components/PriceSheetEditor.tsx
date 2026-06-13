import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Trash2, Plus, FileText, Sparkles, Upload, Loader2, Zap } from "lucide-react";
import PlayerAutocomplete from "@/components/PlayerAutocomplete";
import PlayerDetailsOverlay from "@/components/PlayerDetailsOverlay";
import { parsePriceSheet } from "@/lib/draft-math";
import { PriceEstimate, Position } from "@/lib/draft-types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { buildTierPrices, tierForPosRank, injuryMultiplier, type AuctionRow } from "@/lib/league-tier-prices";
import cheatSheet2026 from "@/assets/cheat-sheet-2026.json";

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
  const [posFilter, setPosFilter] = useState<"ALL" | "QB" | "RB" | "WR" | "TE" | "K" | "DST">("ALL");
  const [sortBy, setSortBy] = useState<"default" | "price-desc" | "price-asc" | "name">("default");
  const [posByName, setPosByName] = useState<Map<string, string>>(new Map());
  const [uploading, setUploading] = useState(false);
  const [autoBusy, setAutoBusy] = useState(false);
  const [detailFor, setDetailFor] = useState<{ name: string; position?: Position; price?: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Pull positions from cached ESPN ranks so we can filter the list by position.
  // This is a secondary source — prices now also carry position directly from autoFillFromEspn.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("espn_player_ranks")
        .select("player_name, position");
      if (cancelled || !data) return;
      const m = new Map<string, string>();
      for (const r of data) {
        if (r.player_name && r.position) m.set(r.player_name.toLowerCase(), r.position);
      }
      setPosByName(m);
    })();
    return () => { cancelled = true; };
  }, []);

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
        const summary = (hist.data as { summary?: { season: number; picks: number; status: string; error?: string }[] })?.summary ?? [];
        const detail = summary.length
          ? summary.map((s) => `${s.season}: ${s.status}${s.error ? ` (${s.error})` : ""}`).join(" • ")
          : "no draft data returned";
        throw new Error(`No auction history pulled. ESPN says — ${detail}`);
      }

      // 3) Pull this year's ranks (incl. last season's actual PPG)
      const { data: rRows, error: rErr } = await supabase
        .from("espn_player_ranks")
        .select("player_name, position, pos_rank, auction_value, prior_ppg, injury_status");
      if (rErr) throw rErr;
      if (!rRows?.length) {
        throw new Error("No player ranks cached. Try again in a moment.");
      }

      // 3b) Re-rank within position by last season's PPG so we can sanity-check
      // ESPN's preseason rank against real production.
      const ppgRankByName = new Map<string, number>();
      const byPos = new Map<string, typeof rRows>();
      for (const r of rRows) {
        if (!r.position || r.prior_ppg == null) continue;
        const arr = byPos.get(r.position) ?? [];
        arr.push(r);
        byPos.set(r.position, arr);
      }
      for (const arr of byPos.values()) {
        arr.sort((a, b) => (b.prior_ppg ?? 0) - (a.prior_ppg ?? 0));
        arr.forEach((r, i) => ppgRankByName.set(r.player_name, i + 1));
      }

      // 4) For each ranked player → tier → league avg $
      // Blend ESPN preseason rank (70%) with last year's PPG rank (30%) so a
      // proven producer ESPN is sleeping on still gets bumped up a tier.
      // First, compute each player's tier so we can build a per-tier ESPN-value mean.
      type Pre = { r: typeof rRows[number]; tier: number; pos: Position };
      const pre: Pre[] = [];
      for (const r of rRows) {
        if (!r.position || !r.pos_rank) continue;
        const ppgRank = ppgRankByName.get(r.player_name);
        const blendedRank = ppgRank
          ? Math.round(r.pos_rank * 0.7 + ppgRank * 0.3)
          : r.pos_rank;
        const tier = tierForPosRank(r.position, blendedRank);
        const pos = (r.position === "DEF" || r.position === "D/ST" ? "DST" : r.position) as Position;
        pre.push({ r, tier, pos });
      }

      // Per (position, tier) mean of ESPN's auction_value — used to convert
      // ESPN's scale into a *relative* tilt within the tier. We don't trust
      // ESPN's absolute dollars (their league settings ≠ yours), only the
      // shape of who's worth more than whom inside the same tier.
      const tierEspnMean = new Map<string, number>();
      {
        const sums = new Map<string, { sum: number; n: number }>();
        for (const { r, tier, pos } of pre) {
          const v = Number(r.auction_value);
          if (!Number.isFinite(v) || v <= 0) continue;
          const k = `${pos}|${tier}`;
          const cur = sums.get(k) ?? { sum: 0, n: 0 };
          cur.sum += v;
          cur.n += 1;
          sums.set(k, cur);
        }
        for (const [k, { sum, n }] of sums) tierEspnMean.set(k, sum / n);
      }

      // Build final prices: league tier avg × per-player tilt × injury fade.
      const built: { name: string; price: number; position: Position }[] = [];
      for (const { r, tier, pos } of pre) {
        const tp = tierPrices.find((t) => t.position === r.position && t.tier === tier);
        const tierAvg = tp?.avg ? tp.avg : (r.auction_value ?? 0);
        const espnVal = Number(r.auction_value);
        const espnMean = tierEspnMean.get(`${pos}|${tier}`);
        // Tilt is clamped to ±35% so an outlier ESPN number can't blow up the tier.
        let tilt = 1;
        if (Number.isFinite(espnVal) && espnVal > 0 && espnMean && espnMean > 0) {
          tilt = Math.min(1.35, Math.max(0.65, espnVal / espnMean));
        }
        const basePrice = Math.max(1, Math.round(tierAvg * tilt));
        // Auto-fade injured players (season-ending → ~$1, soft injuries scaled).
        const mult = injuryMultiplier((r as { injury_status?: string | null }).injury_status);
        const price = mult < 1 ? Math.max(1, Math.round(basePrice * mult)) : basePrice;
        if (price > 0) built.push({ name: r.player_name, price, position: pos });
      }
      if (!built.length) throw new Error("Couldn't map ranks to league tier prices");
      mergeImported(built, "ESPN auto-fill");
      toast.success(`Auto-filled ${built.length} players (ESPN ranks + last season's PPG)`);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Auto-fill failed");
    } finally {
      setAutoBusy(false);
    }
  };

  // FIX: accept optional position so auto-fill and future imports can carry it through
  const mergeImported = (incoming: { name: string; price: number; position?: Position }[], filename: string, mode: "merge" | "replace" = "merge") => {
    if (!incoming.length) {
      toast.error("No players found in file");
      return;
    }
    const map = new Map<string, PriceEstimate>();
    if (mode === "merge") for (const p of prices) map.set(p.name.toLowerCase(), p);
    for (const p of incoming) {
      const existing = map.get(p.name.toLowerCase());
      map.set(p.name.toLowerCase(), {
        name: p.name,
        price: p.price,
        position: p.position ?? existing?.position,
      });
    }
    const merged = Array.from(map.values());
    setPrices(merged);
    setPricesText(merged.map((p) => `${p.name} - ${p.price}`).join("\n"));
    toast.success(`${mode === "replace" ? "Replaced with" : "Imported"} ${incoming.length} players from ${filename}`);
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
      // PDF/image is a full cheat sheet upload — REPLACE existing prices entirely
      mergeImported(players || [], file.name, "replace");
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
  const filtered = useMemo(() => {
    let arr = prices;
    if (filter) {
      const q = filter.toLowerCase();
      arr = arr.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (posFilter !== "ALL") {
      arr = arr.filter((p) => {
        // FIX: prefer position stored directly on the price entry (set by autoFillFromEspn),
        // fall back to the Supabase-loaded posByName map for any entries without it.
        const pos = p.position ?? posByName.get(p.name.toLowerCase());
        if (posFilter === "DST") return pos === "DST" || pos === "DEF" || pos === "D/ST";
        return pos === posFilter;
      });
    }
    if (sortBy === "price-desc") arr = [...arr].sort((a, b) => b.price - a.price);
    else if (sortBy === "price-asc") arr = [...arr].sort((a, b) => a.price - b.price);
    else if (sortBy === "name") arr = [...arr].sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }, [prices, filter, posFilter, sortBy, posByName]);

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
  // Accepts "Name", "Name - 25", "Name $25", "Name 25"
  const parseQuickInput = (raw: string): { name: string; price?: number } => {
    const s = raw.trim();
    const m = s.match(/^(.+?)\s*[-–:]?\s*\$?(\d+)\s*$/);
    if (m && m[1] && !/\d/.test(m[1].trim())) {
      return { name: m[1].trim(), price: parseInt(m[2], 10) };
    }
    return { name: s };
  };

  // Auto-fill price from existing sheet when the typed name matches
  useEffect(() => {
    const { name, price } = parseQuickInput(quickName);
    if (price != null) {
      setQuickPrice(String(price));
      return;
    }
    if (!name || name.length < 2) return;
    const k = name.toLowerCase();
    const hit = prices.find((p) => p.name.toLowerCase() === k);
    if (hit) setQuickPrice(String(hit.price));
  }, [quickName, prices]);

  const addQuick = () => {
    const { name, price: parsedPrice } = parseQuickInput(quickName);
    const price = parsedPrice ?? parseInt(quickPrice, 10);
    if (!name) return toast.error("Player name required");
    if (!Number.isFinite(price) || price <= 0) return toast.error("Valid price required");
    const existing = prices.find((p) => p.name.toLowerCase() === name.toLowerCase());
    const next = existing
      ? prices.map((p) => (p.name.toLowerCase() === name.toLowerCase() ? { ...p, price } : p))
      : [...prices, { name, price }];
    setPrices(next);
    setPricesText(next.map((p) => `${p.name} - ${p.price}`).join("\n"));
    setQuickName(""); setQuickPrice("");
    toast.success(`${existing ? "Updated" : "Added"} ${name} — $${price}`);
  };

  const loadCheatSheet2026 = () => {
    const sheet = cheatSheet2026 as { name: string; position?: string; team?: string; price: number }[];
    const incoming = sheet.map((p) => ({
      name: p.name,
      price: p.price,
      position: (p.position as Position | undefined) ?? undefined,
    }));
    setPrices(incoming);
    setPricesText(incoming.map((p) => `${p.name} - ${p.price}`).join("\n"));
    toast.success(`Loaded 2026 cheat sheet — ${incoming.length} players ($${incoming.reduce((a, b) => a + b.price, 0)} total)`);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Player Values</p>
          <p className="text-[11px] text-muted-foreground">
            Pulled from your PDF cheat sheet. Upload a new PDF to override.
          </p>
        </div>
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
            <><Upload className="mr-2 h-4 w-4" /> Upload your own PDF / CSV / Excel / screenshot</>
          )}
        </Button>
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          PDFs are AI-parsed and replace the current prices.
        </p>
      </div>

      {/* Quick add — type a name, price auto-fills from the sheet (or use "Name - 25" syntax) */}
      <div className="rounded-md border border-border/60 bg-secondary/10 p-2">
        <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
          Quick add / update — type "Player Name" (auto-fills $) or "Player Name - 25"
        </p>
        <div className="flex items-center gap-1.5">
          <PlayerAutocomplete
            value={quickName}
            onChange={setQuickName}
            onSelect={(p) => {
              const hit = prices.find((x) => x.name.toLowerCase() === p.full_name.toLowerCase());
              if (hit) setQuickPrice(String(hit.price));
            }}
            onEnter={addQuick}
            placeholder="Player name…"
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground">$</span>
          <Input
            type="number"
            inputMode="numeric"
            value={quickPrice}
            onChange={(e) => setQuickPrice(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addQuick(); }}
            className="h-9 w-16 text-right font-mono text-xs"
            placeholder="$"
          />
          <Button size="sm" onClick={addQuick} className="h-9 px-2">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filter / list */}
      {prices.length > 0 && (
        <>
          <p className="text-[11px] font-medium text-primary">
            Values are for the 2026 auction draft (based on 2023–2025 league data).
          </p>
          <Input
            placeholder={`Filter ${prices.length} players...`}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-8 text-sm"
          />
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex gap-1">
              {(["ALL", "QB", "RB", "WR", "TE", "K", "DST"] as const).map((p) => (
                <Button
                  key={p}
                  type="button"
                  size="sm"
                  variant={posFilter === p ? "default" : "outline"}
                  className="h-7 px-2 text-[11px]"
                  onClick={() => setPosFilter(p)}
                >
                  {p}
                </Button>
              ))}
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="ml-auto h-7 rounded-md border border-input bg-background px-2 text-[11px]"
            >
              <option value="default">Sort: list order</option>
              <option value="price-desc">Sort: price (high → low)</option>
              <option value="price-asc">Sort: price (low → high)</option>
              <option value="name">Sort: name (A → Z)</option>
            </select>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Showing {filtered.length} of {prices.length}
            {posFilter !== "ALL" ? ` · ${posFilter} only` : ""}
          </p>
          {posFilter !== "ALL" && posByName.size === 0 && prices.every((p) => !p.position) && (
            <div className="mb-1 rounded border border-dashed border-border/60 bg-secondary/10 px-2 py-1 text-[11px] italic text-muted-foreground">
              Loading positions…
            </div>
          )}
          {posFilter !== "ALL" && filtered.length === 0 && (posByName.size > 0 || prices.some((p) => p.position)) && (
            <div className="mb-1 rounded border border-dashed border-border/60 bg-secondary/10 px-2 py-1 text-[11px] italic text-muted-foreground">
              No {posFilter} players in your price sheet.
            </div>
          )}
          <div
            className="max-h-80 space-y-1 overflow-y-auto overscroll-contain rounded-md border border-border/60 bg-secondary/20 p-1"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {filtered.map((p) => {
              const idx = prices.findIndex((x) => x.name === p.name);
              return (
                <div key={p.name} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-secondary/60">
                  <button
                    type="button"
                    onClick={() => {
                      const pos = (p.position ?? posByName.get(p.name.toLowerCase())) as Position | undefined;
                      setDetailFor({ name: p.name, position: pos, price: p.price });
                    }}
                    className="flex-1 truncate text-left font-medium hover:text-primary hover:underline"
                  >
                    {p.name}
                  </button>
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

      <PlayerDetailsOverlay
        open={!!detailFor}
        onOpenChange={(o) => !o && setDetailFor(null)}
        name={detailFor?.name ?? ""}
        position={detailFor?.position}
      />
    </div>
  );
}
