import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}
const Ctx = createContext<AuthCtx>({ user: null, session: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
      if (s?.user) {
        supabase.rpc("touch_last_seen").then(() => {});
      }
    });
    // getUser() validates the token with the server — catches stale/expired sessions
    // that getSession() (localStorage-only) would miss.
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        // No valid session — sign in anonymously so edge functions can identify the caller.
        const { error } = await supabase.auth.signInAnonymously();
        if (error) {
          // Anonymous sign-ins may be disabled; fall through so loading clears.
          setLoading(false);
        }
        return;
      }
      // Valid session already exists; sync state and mark ready.
      const { data: s } = await supabase.auth.getSession();
      setSession(s.session);
      setLoading(false);
      supabase.rpc("touch_last_seen").then(() => {});
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider value={{
      user: session?.user ?? null,
      session,
      loading,
      signOut: async () => { await supabase.auth.signOut(); },
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
