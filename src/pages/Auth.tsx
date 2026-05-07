import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AuthPage() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup" | "reset" | "setNew">("signin");
  const [busy, setBusy] = useState(false);

  // Detect password recovery link (Supabase puts type=recovery in the URL hash)
  useEffect(() => {
    const hash = window.location.hash || "";
    if (hash.includes("type=recovery")) {
      setMode("setNew");
    }
  }, [location]);

  if (loading) return null;
  if (user && mode !== "setNew") return <Navigate to="/" replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return toast.error(error.message);
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) return toast.error(error.message);
        toast.success("Account created. You're signed in.");
      } else if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/auth",
        });
        if (error) return toast.error(error.message);
        toast.success("Check your email for the password setup link.");
      } else if (mode === "setNew") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) return toast.error(error.message);
        toast.success("Password set. You're signed in.");
        navigate("/", { replace: true });
      }
    } finally {
      setBusy(false);
    }
  };

  const titles: Record<typeof mode, string> = {
    signin: "Sign in",
    signup: "Create account",
    reset: "Set / reset password",
    setNew: "Choose a new password",
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-foreground">{titles[mode]}</h1>
          {mode === "reset" && (
            <p className="text-sm text-muted-foreground">We'll email you a link to set a password.</p>
          )}
        </div>

        {mode !== "setNew" && (
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" disabled={busy} />
          </div>
        )}

        {mode !== "reset" && (
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} />
          </div>
        )}

        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Please wait…" : mode === "reset" ? "Email me a link" : mode === "setNew" ? "Save password" : titles[mode]}
        </Button>

        {mode !== "setNew" && (
          <div className="space-y-1 text-center text-xs">
            {mode !== "signin" && (
              <button type="button" className="block w-full text-muted-foreground hover:text-foreground" onClick={() => setMode("signin")}>
                Back to sign in
              </button>
            )}
            {mode === "signin" && (
              <>
                <button type="button" className="block w-full text-muted-foreground hover:text-foreground" onClick={() => setMode("reset")}>
                  Forgot / set password?
                </button>
                <button type="button" className="block w-full text-muted-foreground hover:text-foreground" onClick={() => setMode("signup")}>
                  No account yet? Create one
                </button>
              </>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
