import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const signInWithGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Google sign-in failed");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6">
      <button
        onClick={() => navigate("/")}
        className="absolute top-5 left-5 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Home
      </button>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Stay logged in across sessions and keep your ESPN connection.
        </p>
      </div>
      <Button onClick={signInWithGoogle} disabled={busy} size="lg" className="w-full max-w-xs">
        {busy ? "Redirecting…" : "Continue with Google"}
      </Button>
    </div>
  );
}
