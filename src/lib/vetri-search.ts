import { supabase } from "@/integrations/supabase/client";
import type { VetriTake } from "@/lib/vetri-types";

export interface VetriTakeMatch {
  take: VetriTake;
  videoId: string;
  videoTitle: string;
  videoUrl: string;
  publishedAt: string | null;
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’`.]/g, "")
    .replace(/\s+(jr|sr|ii|iii|iv)\.?$/i, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string): string[] {
  return norm(s).split(" ").filter(Boolean);
}

/** Loose match: every token in needle appears as a token in haystack. */
export function playerMatches(haystack: string, needle: string): boolean {
  const h = new Set(tokens(haystack));
  const ns = tokens(needle);
  if (!ns.length) return false;
  return ns.every((t) => h.has(t));
}

interface RawNote {
  video_id: string;
  title: string;
  url: string;
  published_at: string | null;
  takes: any;
}

export async function searchVetriTakes(query: string, limit = 50): Promise<VetriTakeMatch[]> {
  const q = query.trim();
  if (!q) return [];
  const { data, error } = await supabase
    .from("vetri_notes")
    .select("video_id, title, url, published_at, takes")
    .eq("status", "ready")
    .order("published_at", { ascending: false })
    .limit(50);
  if (error || !data) return [];
  const matches: VetriTakeMatch[] = [];
  for (const row of data as RawNote[]) {
    const takes: VetriTake[] = Array.isArray(row.takes) ? row.takes : [];
    for (const t of takes) {
      if (!t?.player) continue;
      if (playerMatches(t.player, q)) {
        matches.push({
          take: t,
          videoId: row.video_id,
          videoTitle: row.title,
          videoUrl: row.url,
          publishedAt: row.published_at,
        });
        if (matches.length >= limit) return matches;
      }
    }
  }
  return matches;
}
