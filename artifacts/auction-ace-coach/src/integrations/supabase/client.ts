// Mock Supabase client — no real backend, returns hardcoded data for the
// frontend prototype. Replace with @supabase/supabase-js when wiring real auth.

const MOCK_TEAMS = [
  { id: 1,  name: "Show Me Your TDs",     abbrev: "SMYT" },
  { id: 2,  name: "Gridiron Gang",        abbrev: "GG"   },
  { id: 3,  name: "Belichick Yourself",   abbrev: "BLCK" },
  { id: 4,  name: "Purple Drank",         abbrev: "PRPL" },
  { id: 5,  name: "Burrow My Heart",      abbrev: "BURR" },
  { id: 6,  name: "Mahomes Alone",        abbrev: "MAHO" },
  { id: 7,  name: "Kelce's Angels",       abbrev: "KLCE" },
  { id: 8,  name: "Lamar in the Streets", abbrev: "LMAR" },
  { id: 9,  name: "CeeDee Lamb Chops",    abbrev: "CDLC" },
  { id: 10, name: "Tua Legit to Quit",    abbrev: "TUA"  },
  { id: 11, name: "Saquon and Garfunkel", abbrev: "SAQU" },
  { id: 12, name: "The Wu Tang Klan",     abbrev: "WUTG" },
];

async function noop() { return { data: null, error: null }; }

export const supabase = {
  auth: {
    async getSession() { return { data: { session: { user: { id: "anon" } } }, error: null }; },
    async signInAnonymously() { return { data: { user: { id: "anon" } }, error: null }; },
    onAuthStateChange(_cb: unknown) {
      return { data: { subscription: { unsubscribe() {} } } };
    },
    async signOut() { return { error: null }; },
  },
  functions: {
    async invoke(name: string) {
      if (name === "league-teams") {
        return { data: { teams: MOCK_TEAMS }, error: null };
      }
      return { data: null, error: null };
    },
  },
  rpc: noop,
  from(_table: string) {
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      maybeSingle: async () => ({ data: null, error: null }),
      single: async () => ({ data: null, error: null }),
      then: (resolve: any) => resolve({ data: [], error: null }),
    };
    return chain;
  },
};
