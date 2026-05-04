import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_SETTINGS,
  DraftEvent,
  Keeper,
  LeagueSettings,
  PriceEstimate,
} from "./draft-types";

interface DraftState {
  settings: LeagueSettings;
  keepers: Keeper[];
  prices: PriceEstimate[];
  events: DraftEvent[];
  setupComplete: boolean;
  watchlist: string[];      // pinned player names (Spotify "save for later")
  dismissed: string[];      // queue dismissals — filtered from next refresh
  // actions
  setSettings: (s: Partial<LeagueSettings>) => void;
  setRoster: (key: keyof LeagueSettings["roster"], value: number) => void;
  setKeepers: (k: Keeper[]) => void;
  setPrices: (p: PriceEstimate[]) => void;
  addEvent: (e: DraftEvent) => void;
  undoEvent: () => void;
  completeSetup: () => void;
  resetAll: () => void;
  pinPlayer: (name: string) => void;
  unpinPlayer: (name: string) => void;
  dismissPlayer: (name: string) => void;
  clearDismissed: () => void;
}

export const useDraftStore = create<DraftState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      keepers: [],
      prices: [],
      events: [],
      setupComplete: false,
      watchlist: [],
      dismissed: [],
      setSettings: (s) =>
        set((state) => ({ settings: { ...state.settings, ...s } })),
      setRoster: (key, value) =>
        set((state) => ({
          settings: {
            ...state.settings,
            roster: { ...state.settings.roster, [key]: value },
          },
        })),
      setKeepers: (k) => set({ keepers: k }),
      setPrices: (p) => set({ prices: p }),
      addEvent: (e) => set((state) => ({ events: [...state.events, e] })),
      undoEvent: () =>
        set((state) => ({ events: state.events.slice(0, -1) })),
      completeSetup: () => set({ setupComplete: true }),
      resetAll: () =>
        set({
          settings: DEFAULT_SETTINGS,
          keepers: [],
          prices: [],
          events: [],
          setupComplete: false,
          watchlist: [],
          dismissed: [],
        }),
      pinPlayer: (name) =>
        set((s) => (s.watchlist.includes(name) ? s : { watchlist: [...s.watchlist, name] })),
      unpinPlayer: (name) =>
        set((s) => ({ watchlist: s.watchlist.filter((n) => n !== name) })),
      dismissPlayer: (name) =>
        set((s) => (s.dismissed.includes(name) ? s : { dismissed: [...s.dismissed, name] })),
      clearDismissed: () => set({ dismissed: [] }),
    }),
    { name: "auction-draft-coach-v1" }
  )
);
