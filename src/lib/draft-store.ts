import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_SETTINGS,
  DraftEvent,
  Keeper,
  LeagueSettings,
  PriceEstimate,
} from "./draft-types";
import {
  computeTierValues,
  mergeVetriIntoPrices,
  VetriRanking,
} from "./vetri-tiers";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export interface QuickPrompt {
  id: string;
  label: string;   // button text
  prompt: string;  // full question sent to the assistant
}

export const DEFAULT_QUICK_PROMPTS: QuickPrompt[] = [
  { id: "qp-bid",      label: "Who should I bid on next?",  prompt: "Based on my roster, budget, and what's left on the board, who should I go after next and how much should I pay?" },
  { id: "qp-nominate", label: "Who should I nominate?",     prompt: "Who should I nominate next to drain other teams' budgets without overcommitting myself?" },
  { id: "qp-pivot",    label: "Should I change my plan?",   prompt: "Should I pivot my strategy given how the draft is unfolding? If yes, to what?" },
  { id: "qp-spend",    label: "Am I spending too much?",    prompt: "Am I overspending so far? Compare what I've spent to what's normal for this point in the draft and tell me what to do." },
  { id: "qp-hole",     label: "What's my biggest hole?",    prompt: "What's the biggest weakness on my roster right now and what's the cheapest way to fix it?" },
  { id: "qp-sleepers", label: "Any sleepers I'm missing?",  prompt: "Give me 2-3 sleeper or value picks I should be watching for later in the draft based on what's still available." },
];

interface DraftState {
  settings: LeagueSettings;
  keepers: Keeper[];
  prices: PriceEstimate[];
  events: DraftEvent[];
  setupComplete: boolean;
  watchlist: string[];      // pinned player names (Spotify "save for later")
  dismissed: string[];      // queue dismissals — filtered from next refresh
  // Vetri tier sheet (auto-mapped to $ values feeding prices/coach)
  vetriRankings: VetriRanking[];
  vetriDecay: number;       // tier decay 0.4-0.8 (default 0.55)
  vetriAutoSync: boolean;   // re-merge into prices when settings/tiers change
  priceOverrides: string[]; // normalized player names where user manually set price (Vetri won't overwrite)
  quickPrompts: QuickPrompt[]; // editable assistant quick-question buttons
  showMath: boolean;           // when true, assistant always shows the full math behind each rec
  // actions
  setSettings: (s: Partial<LeagueSettings>) => void;
  setRoster: (key: keyof LeagueSettings["roster"], value: number) => void;
  setKeepers: (k: Keeper[]) => void;
  setPrices: (p: PriceEstimate[]) => void;
  setPlayerPrice: (name: string, price: number, override?: boolean) => void;
  addEvent: (e: DraftEvent) => void;
  undoEvent: () => void;
  completeSetup: () => void;
  resetAll: () => void;
  pinPlayer: (name: string) => void;
  unpinPlayer: (name: string) => void;
  dismissPlayer: (name: string) => void;
  clearDismissed: () => void;
  // Vetri actions
  setVetriRankings: (r: VetriRanking[]) => void;
  setVetriDecay: (d: number) => void;
  setVetriAutoSync: (b: boolean) => void;
  syncVetriToPrices: () => void;
  clearPriceOverride: (name: string) => void;
  clearVetri: () => void;
  // Quick prompts
  setQuickPrompts: (p: QuickPrompt[]) => void;
  resetQuickPrompts: () => void;
  setShowMath: (b: boolean) => void;
}

export const useDraftStore = create<DraftState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      keepers: [],
      prices: [],
      events: [],
      setupComplete: false,
      watchlist: [],
      dismissed: [],
      vetriRankings: [],
      vetriDecay: 0.55,
      vetriAutoSync: true,
      priceOverrides: [],
      quickPrompts: DEFAULT_QUICK_PROMPTS,
      setQuickPrompts: (p) => set({ quickPrompts: p }),
      resetQuickPrompts: () => set({ quickPrompts: DEFAULT_QUICK_PROMPTS }),
      showMath: false,
      setShowMath: (b) => set({ showMath: b }),
      setSettings: (s) =>
        set((state) => {
          const next = { ...state.settings, ...s };
          // Auto-recompute Vetri values when budget/teams/scoring/leagueType change
          if (state.vetriAutoSync && state.vetriRankings.length) {
            const computed = computeTierValues(state.vetriRankings, next, state.vetriDecay);
            const prices = mergeVetriIntoPrices(state.prices, computed, new Set(state.priceOverrides));
            return { settings: next, prices };
          }
          return { settings: next };
        }),
      setRoster: (key, value) =>
        set((state) => {
          const settings = {
            ...state.settings,
            roster: { ...state.settings.roster, [key]: value },
          };
          if (state.vetriAutoSync && state.vetriRankings.length) {
            const computed = computeTierValues(state.vetriRankings, settings, state.vetriDecay);
            const prices = mergeVetriIntoPrices(state.prices, computed, new Set(state.priceOverrides));
            return { settings, prices };
          }
          return { settings };
        }),
      setKeepers: (k) => set({ keepers: k }),
      setPrices: (p) => set({ prices: p }),
      setPlayerPrice: (name, price, override = true) =>
        set((state) => {
          const key = norm(name);
          const existing = state.prices.find((pp) => norm(pp.name) === key);
          const nextPrices = existing
            ? state.prices.map((pp) => (norm(pp.name) === key ? { ...pp, price } : pp))
            : [...state.prices, { name, price }];
          const overrides = override
            ? state.priceOverrides.includes(key)
              ? state.priceOverrides
              : [...state.priceOverrides, key]
            : state.priceOverrides;
          return { prices: nextPrices, priceOverrides: overrides };
        }),
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
          vetriRankings: [],
          vetriDecay: 0.55,
          vetriAutoSync: true,
          priceOverrides: [],
        }),
      pinPlayer: (name) =>
        set((s) => (s.watchlist.includes(name) ? s : { watchlist: [...s.watchlist, name] })),
      unpinPlayer: (name) =>
        set((s) => ({ watchlist: s.watchlist.filter((n) => n !== name) })),
      dismissPlayer: (name) =>
        set((s) => (s.dismissed.includes(name) ? s : { dismissed: [...s.dismissed, name] })),
      clearDismissed: () => set({ dismissed: [] }),
      setVetriRankings: (rankings) =>
        set((state) => {
          if (!state.vetriAutoSync) return { vetriRankings: rankings };
          const computed = computeTierValues(rankings, state.settings, state.vetriDecay);
          const prices = mergeVetriIntoPrices(state.prices, computed, new Set(state.priceOverrides));
          return { vetriRankings: rankings, prices };
        }),
      setVetriDecay: (decay) =>
        set((state) => {
          if (!state.vetriAutoSync || !state.vetriRankings.length) return { vetriDecay: decay };
          const computed = computeTierValues(state.vetriRankings, state.settings, decay);
          const prices = mergeVetriIntoPrices(state.prices, computed, new Set(state.priceOverrides));
          return { vetriDecay: decay, prices };
        }),
      setVetriAutoSync: (b) => set({ vetriAutoSync: b }),
      syncVetriToPrices: () => {
        const s = get();
        if (!s.vetriRankings.length) return;
        const computed = computeTierValues(s.vetriRankings, s.settings, s.vetriDecay);
        const prices = mergeVetriIntoPrices(s.prices, computed, new Set(s.priceOverrides));
        set({ prices });
      },
      clearPriceOverride: (name) =>
        set((s) => ({ priceOverrides: s.priceOverrides.filter((n) => n !== norm(name)) })),
      clearVetri: () => set({ vetriRankings: [] }),
    }),
    { name: "auction-draft-coach-v1" }
  )
);
