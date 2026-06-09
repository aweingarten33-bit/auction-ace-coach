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
    let mounted = true;
    let initializing = true;

    const applySession = (s: Session | null) => {
      if (!mounted) return;
      setSession(s);
      if (s?.user) {
        supabase.rpc("touch_last_seen").then(() => {});
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      applySession(s);
      if (s || !initializing) {
        setLoading(false);
      }
    });

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          applySession(data.session);
          return;
        }

        // Auto sign-in anonymously so RLS-protected queries still work.
        // Keep auth loading until this finishes so protected pages never call
        // edge functions without a Bearer token on fresh Vercel loads.
        const { data: anonData } = await supabase.auth.signInAnonymously();
        applySession(anonData.session ?? null);
      } finally {
        initializing = false;
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
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
