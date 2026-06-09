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
  { id: "qp-bid",       label: "Should I bid?",            prompt: "Should I bid on the player who was just nominated? Give me a max bid and a one-line take." },
  { id: "qp-nominate",  label: "Who should I nominate?",   prompt: "Who should I nominate next to drain other teams' budgets without overcommitting myself?" },
  { id: "qp-next",      label: "What's my next move?",     prompt: "Based on my roster, budget, and what's still available, what's my next move and how much should I be willing to pay?" },
  { id: "qp-thin",      label: "Am I too thin?",           prompt: "Looking at my roster and what's left on the board, am I getting too thin anywhere? Where's my biggest hole?" },
  { id: "qp-value",     label: "Best value left?",         prompt: "What's the single best value still on the board right now and why?" },
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
  // Saved draft plan — sticky strategy + targets the user can refer to between picks
  draftPlan: { content: string; updatedAt: number; pickCountAtSave: number } | null;
  // Slot $ allocations for the Planner page (id => dollars). Generated lazily from settings.roster.
  slotAllocations: Record<string, number>;
  // Slots manually locked by the user (frozen — excluded from auto-redistribute).
  lockedSlots: Record<string, boolean>;
  // Free-text target players per slot (id => "Hurts, Josh Allen").
  slotNotes: Record<string, string>;
  // Slots the user has manually edited — never auto-overwrite these.
  touchedSlots: Record<string, boolean>;
  // Active budget-planner strategy preset.
  plannerStrategy: "hero-qb" | "balanced-qbs" | "bargain-qb";
  // Anchor players — named "must-have" targets w/ pre-allocated $.
  // Subtracted from pool before slots are distributed.
  anchors: { id: string; name: string; price: number }[];
  // Chosen draft strategy id (see src/lib/strategies.ts). "none" = no preset.
  strategyId: string;
  // User-written rules text used when strategyId === "custom".
  customStrategyRules: string;
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
  setDraftPlan: (content: string, pickCountAtSave: number) => void;
  clearDraftPlan: () => void;
  setSlotAllocation: (id: string, amount: number) => void;
  setSlotAllocations: (a: Record<string, number>) => void;
  clearSlotAllocations: () => void;
  toggleSlotLock: (id: string) => void;
  clearSlotLocks: () => void;
  setSlotNote: (id: string, note: string) => void;
  clearSlotNotes: () => void;
  markSlotTouched: (id: string) => void;
  clearTouchedSlots: () => void;
  setPlannerStrategy: (s: "hero-qb" | "balanced-qbs" | "bargain-qb") => void;
  addAnchor: () => void;
  updateAnchor: (id: string, patch: Partial<{ name: string; price: number }>) => void;
  removeAnchor: (id: string) => void;
  clearAnchors: () => void;
  
  setStrategyId: (id: string) => void;
  setCustomStrategyRules: (text: string) => void;
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
      strategyId: "none",
      setStrategyId: (id) =>
        set((s) => {
          // Clear allocations for any slot the user hasn't locked, so the new
          // strategy's suggestions become visible immediately.
          const kept: Record<string, number> = {};
          for (const [slotId, amt] of Object.entries(s.slotAllocations)) {
            if (s.lockedSlots[slotId]) kept[slotId] = amt;
          }
          return { strategyId: id, slotAllocations: kept };
        }),
      customStrategyRules: "",
      setCustomStrategyRules: (text) => set({ customStrategyRules: text }),
      quickPrompts: DEFAULT_QUICK_PROMPTS,
      setQuickPrompts: (p) => set({ quickPrompts: p }),
      resetQuickPrompts: () => set({ quickPrompts: DEFAULT_QUICK_PROMPTS }),
      showMath: true,
      setShowMath: (b) => set({ showMath: b }),
      draftPlan: null,
      setDraftPlan: (content, pickCountAtSave) =>
        set({ draftPlan: { content, updatedAt: Date.now(), pickCountAtSave } }),
      clearDraftPlan: () => set({ draftPlan: null }),
      slotAllocations: {},
      setSlotAllocation: (id, amount) =>
        set((s) => ({ slotAllocations: { ...s.slotAllocations, [id]: amount } })),
      setSlotAllocations: (a) => set({ slotAllocations: a }),
      clearSlotAllocations: () => set({ slotAllocations: {} }),
      lockedSlots: {},
      toggleSlotLock: (id) =>
        set((s) => {
          const nextLocks = { ...s.lockedSlots };
          const nextAllocs = { ...s.slotAllocations };
          if (nextLocks[id]) {
            // Unlocking → release the value so the slot rejoins redistribute.
            delete nextLocks[id];
            delete nextAllocs[id];
          } else {
            nextLocks[id] = true;
          }
          return { lockedSlots: nextLocks, slotAllocations: nextAllocs };
        }),
      clearSlotLocks: () => set({ lockedSlots: {} }),
      slotNotes: {},
      setSlotNote: (id, note) =>
        set((s) => ({ slotNotes: { ...s.slotNotes, [id]: note } })),
      clearSlotNotes: () => set({ slotNotes: {} }),
      touchedSlots: {},
      markSlotTouched: (id) =>
        set((s) => ({ touchedSlots: { ...s.touchedSlots, [id]: true } })),
      clearTouchedSlots: () => set({ touchedSlots: {} }),
      plannerStrategy: "balanced-qbs",
      setPlannerStrategy: (s) => set({ plannerStrategy: s, touchedSlots: {} }),
      anchors: [],
      addAnchor: () =>
        set((s) =>
          s.anchors.length >= 5
            ? s
            : { anchors: [...s.anchors, { id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: "", price: 0 }] },
        ),
      updateAnchor: (id, patch) =>
        set((s) => ({
          anchors: s.anchors.map((a) =>
            a.id === id
              ? {
                  ...a,
                  ...(patch.name !== undefined ? { name: patch.name } : {}),
                  ...(patch.price !== undefined ? { price: Math.max(0, Math.min(999, Math.floor(patch.price))) } : {}),
                }
              : a,
          ),
        })),
      removeAnchor: (id) => set((s) => ({ anchors: s.anchors.filter((a) => a.id !== id) })),
      clearAnchors: () => set({ anchors: [] }),
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
          quickPrompts: DEFAULT_QUICK_PROMPTS,
          showMath: false,
          draftPlan: null,
          slotAllocations: {},
          lockedSlots: {},
          slotNotes: {},
          touchedSlots: {},
          plannerStrategy: "balanced-qbs",
          anchors: [],
          
          strategyId: "none",
          customStrategyRules: "",
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
    {
      name: "auction-draft-coach-v1",
      version: 2,
      migrate: (persisted: any) => {
        if (persisted && !["hero-qb", "balanced-qbs", "bargain-qb"].includes(persisted.plannerStrategy)) {
          persisted.plannerStrategy = "balanced-qbs";
          persisted.touchedSlots = {};
        }
        return persisted;
      },
    }
  )
);
