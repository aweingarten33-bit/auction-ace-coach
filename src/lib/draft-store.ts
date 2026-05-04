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
  // actions
  setSettings: (s: Partial<LeagueSettings>) => void;
  setRoster: (key: keyof LeagueSettings["roster"], value: number) => void;
  setKeepers: (k: Keeper[]) => void;
  setPrices: (p: PriceEstimate[]) => void;
  addEvent: (e: DraftEvent) => void;
  undoEvent: () => void;
  completeSetup: () => void;
  resetAll: () => void;
}

export const useDraftStore = create<DraftState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      keepers: [],
      prices: [],
      events: [],
      setupComplete: false,
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
        }),
    }),
    { name: "auction-draft-coach-v1" }
  )
);
