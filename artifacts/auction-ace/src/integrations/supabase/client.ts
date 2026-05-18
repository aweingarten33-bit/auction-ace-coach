// Local no-op stub of the Supabase client so the original Auction Ace Coach
// UI can mount without a real Supabase backend. Every chained call resolves
// with empty data / no error so components render their empty states.

type Result<T = any> = { data: T; error: null };

const empty = (): Result<null> => ({ data: null, error: null });
const emptyArr = (): Result<any[]> => ({ data: [], error: null });

function createQueryBuilder(initial: Result<any> = emptyArr()): any {
  const builder: any = {};
  const passthrough = () => builder;
  const methods = [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike",
    "in", "is", "contains", "containedBy", "rangeGt", "rangeGte",
    "rangeLt", "rangeLte", "rangeAdjacent", "overlaps",
    "or", "and", "not", "filter", "match",
    "order", "limit", "range", "abortSignal", "csv", "geojson",
    "explain", "rollback", "returns",
  ];
  for (const m of methods) builder[m] = passthrough;
  builder.single = () => Promise.resolve(empty());
  builder.maybeSingle = () => Promise.resolve(empty());
  builder.then = (resolve: (v: Result<any>) => void) => Promise.resolve(initial).then(resolve);
  builder.catch = () => Promise.resolve(initial);
  return builder;
}

const channel = {
  on: () => channel,
  subscribe: () => channel,
  unsubscribe: () => Promise.resolve("ok"),
  send: () => Promise.resolve("ok"),
};

export const supabase: any = {
  auth: {
    onAuthStateChange: (_cb: any) => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    signInAnonymously: async () => ({ data: { user: null, session: null }, error: null }),
    signInWithOAuth: async () => ({ data: { url: null, provider: "stub" }, error: null }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
    signUp: async () => ({ data: { user: null, session: null }, error: null }),
    signOut: async () => ({ error: null }),
    setSession: async () => ({ data: { session: null }, error: null }),
    updateUser: async () => ({ data: { user: null }, error: null }),
  },
  from: (_table: string) => createQueryBuilder(emptyArr()),
  rpc: async () => empty(),
  channel: (_name: string) => channel,
  removeChannel: () => Promise.resolve("ok"),
  removeAllChannels: () => Promise.resolve("ok"),
  functions: {
    invoke: async () => empty(),
  },
  storage: {
    from: () => ({
      upload: async () => empty(),
      download: async () => empty(),
      remove: async () => empty(),
      list: async () => emptyArr(),
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
      createSignedUrl: async () => empty(),
    }),
  },
};
