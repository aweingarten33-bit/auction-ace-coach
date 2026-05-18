// No-op stub of Lovable OAuth — original uses cloud OAuth providers that
// aren't wired up in this Replit-hosted port.
export const lovable = {
  auth: {
    signInWithOAuth: async (
      _provider: "google" | "apple" | "microsoft" | "lovable",
      _opts?: { redirect_uri?: string; extraParams?: Record<string, string> },
    ) => ({ redirected: false, error: null, tokens: null }),
  },
};
