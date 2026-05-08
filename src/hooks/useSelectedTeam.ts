// Tracks which ESPN team the current visitor identifies as.
// Stored in localStorage — no auth required. Used to personalize roster,
// budget remaining, slots filled, and AI coach recommendations.
import { useEffect, useState, useCallback } from "react";

export interface SelectedTeam {
  id: number;
  name: string;
  abbrev?: string;
}

const KEY = "selected_team_v1";

function read(): SelectedTeam | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.id === "number" && typeof parsed?.name === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function useSelectedTeam() {
  const [team, setTeamState] = useState<SelectedTeam | null>(() => read());

  // Listen for cross-tab + same-tab updates
  useEffect(() => {
    const onStorage = () => setTeamState(read());
    window.addEventListener("storage", onStorage);
    window.addEventListener("selected-team-changed", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("selected-team-changed", onStorage);
    };
  }, []);

  const setTeam = useCallback((t: SelectedTeam | null) => {
    if (t) {
      localStorage.setItem(KEY, JSON.stringify(t));
    } else {
      localStorage.removeItem(KEY);
    }
    setTeamState(t);
    window.dispatchEvent(new Event("selected-team-changed"));
  }, []);

  return { team, setTeam };
}
