import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function AuthPage() {
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || user || busy) return;
    setBusy(true);
    supabase.auth.signInAnonymously().then(({ error }) => {
      if (error) {
        toast.error(error.message);
        setBusy(false);
      }
    });
  }, [loading, user, busy]);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
      Setting things up…
    </div>
  );
}
