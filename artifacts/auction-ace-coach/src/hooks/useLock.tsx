import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface LockCtx {
  locked: boolean;
  isAdmin: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}
const Ctx = createContext<LockCtx>({ locked: false, isAdmin: false, loading: true, refresh: async () => {} });

export function LockProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [locked, setLocked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const [{ data: s }, roleRes] = await Promise.all([
      supabase.from("app_settings").select("locked").eq("id", true).maybeSingle(),
      user
        ? supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    setLocked(!!s?.locked);
    // Admin via user_roles table OR via passcode stored in user metadata
    setIsAdmin(!!roleRes.data || !!user?.user_metadata?.is_admin);
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [authLoading, user?.id]);

  return <Ctx.Provider value={{ locked, isAdmin, loading, refresh }}>{children}</Ctx.Provider>;
}

export const useLock = () => useContext(Ctx);
