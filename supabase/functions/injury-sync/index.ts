// Pulls live NFL injury status from Sleeper (primary) and ESPN (fallback),
// merges by player name, and writes injury_status/note onto espn_player_ranks
// so the value math can fade injured players automatically.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

type InjuryRow = { status: string; note: string | null; source: "sleeper" | "espn" };

// Normalize raw provider strings to a small canonical set the UI/value math uses.
function canonStatus(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.toUpperCase();
  if (/(SEASON|IR|INJURED RESERVE|PUP|NFI|RETIRED|SUSPEND)/.test(s)) return "OUT_SEASON";
  if (/(OUT)/.test(s)) return "OUT";
  if (/(DOUBT)/.test(s)) return "DOUBTFUL";
  if (/(QUEST|GAME ?TIME)/.test(s)) return "QUESTIONABLE";
  if (/(PROBABLE|ACTIVE|HEALTHY|FULL)/.test(s)) return null;
  return s.length > 24 ? null : s;
}

async function fetchSleeper(): Promise<Map<string, InjuryRow>> {
  const out = new Map<string, InjuryRow>();
  try {
    const r = await fetch("https://api.sleeper.app/v1/players/nfl");
    if (!r.ok) return out;
    const data = await r.json() as Record<string, any>;
    for (const p of Object.values(data)) {
      if (!p?.full_name) continue;
      if (p.position && !["QB","RB","WR","TE","K","DEF"].includes(p.position)) continue;
      const status = canonStatus(p.injury_status);
      if (!status) continue;
      out.set(norm(p.full_name), {
        status,
        note: p.injury_notes || p.injury_body_part || null,
        source: "sleeper",
      });
    }
  } catch (e) { console.warn("sleeper fetch failed", e); }
  return out;
}

async function fetchEspn(): Promise<Map<string, InjuryRow>> {
  const out = new Map<string, InjuryRow>();
  try {
    const r = await fetch("https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries");
    if (!r.ok) return out;
    const data = await r.json() as any;
    const teams: any[] = data?.injuries ?? [];
    for (const t of teams) {
      for (const inj of (t.injuries ?? [])) {
        const name = inj?.athlete?.displayName;
        if (!name) continue;
        const status = canonStatus(inj.status || inj.type?.description);
        if (!status) continue;
        out.set(norm(name), {
          status,
          note: inj?.shortComment || inj?.longComment || inj?.details?.detail || null,
          source: "espn",
        });
      }
    }
  } catch (e) { console.warn("espn fetch failed", e); }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(url, serviceKey);

    const [sleeper, espn] = await Promise.all([fetchSleeper(), fetchEspn()]);
    // Sleeper wins on conflict; ESPN fills the gaps.
    const merged = new Map<string, InjuryRow>(espn);
    for (const [k, v] of sleeper) merged.set(k, v);

    if (merged.size === 0) return j({ ok: true, updated: 0, note: "no injuries found" });

    // Pull current-season rows so we only update ones we know about.
    const { data: ranks, error: readErr } = await sb
      .from("espn_player_ranks")
      .select("id, player_name_norm, season")
      .order("season", { ascending: false })
      .limit(2000);
    if (readErr) return j({ error: readErr.message }, 500);

    const now = new Date().toISOString();
    const updates: Array<{ id: string; injury_status: string; injury_note: string | null; injury_source: string; injury_updated_at: string }> = [];
    const seenIds = new Set<string>();
    for (const row of ranks ?? []) {
      const hit = merged.get(row.player_name_norm);
      if (!hit) continue;
      if (seenIds.has(row.id)) continue;
      seenIds.add(row.id);
      updates.push({
        id: row.id,
        injury_status: hit.status,
        injury_note: hit.note,
        injury_source: hit.source,
        injury_updated_at: now,
      });
    }

    // Clear stale injuries on rows whose player is no longer in the merged map.
    const clearIds: string[] = [];
    for (const row of ranks ?? []) {
      if (!merged.has(row.player_name_norm)) clearIds.push(row.id);
    }

    let updated = 0;
    for (let i = 0; i < updates.length; i += 200) {
      const chunk = updates.slice(i, i + 200);
      // upsert by primary key
      const { error } = await sb.from("espn_player_ranks").upsert(chunk, { onConflict: "id" });
      if (error) return j({ error: `upsert: ${error.message}`, updated }, 500);
      updated += chunk.length;
    }

    if (clearIds.length) {
      for (let i = 0; i < clearIds.length; i += 500) {
        const chunk = clearIds.slice(i, i + 500);
        await sb.from("espn_player_ranks")
          .update({ injury_status: null, injury_note: null, injury_source: null, injury_updated_at: now })
          .in("id", chunk);
      }
    }

    return j({ ok: true, updated, cleared: clearIds.length, sources: { sleeper: sleeper.size, espn: espn.size } });
  } catch (e) {
    return j({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
