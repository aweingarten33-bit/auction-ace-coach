import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Trophy, Gavel, LineChart, Zap } from "lucide-react";

export default function AuthPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const signIn = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    setBusy(false);
    if (error) toast.error(error.message);
    else nav("/dashboard");
  };
  const signUp = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password: pw,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Account created"); nav("/dashboard"); }
  };
  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/dashboard`,
    });
    if (r.error) toast.error(r.error.message);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(circle at center, black 40%, transparent 75%)",
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-10 px-4 py-10 lg:flex-row lg:gap-16 lg:py-16">
        {/* Hero */}
        <div className="w-full max-w-md text-center lg:max-w-xl lg:text-left">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Built for fantasy auction drafts
          </div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground lg:text-5xl">
            Win your auction draft
            <span className="block bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
              before it starts.
            </span>
          </h1>
          <p className="mt-4 text-base text-muted-foreground lg:text-lg">
            Live bid coaching, value verdicts, and tier alerts — wired straight into your ESPN league.
          </p>

          <div className="mt-6 hidden flex-col gap-3 lg:flex">
            <Feature icon={<Gavel className="h-4 w-4" />} text="Real-time bid recommendations" />
            <Feature icon={<LineChart className="h-4 w-4" />} text="Per-player value vs. league market" />
            <Feature icon={<Zap className="h-4 w-4" />} text="Tier-break alerts you won't miss" />
          </div>
        </div>

        {/* Auth card */}
        <Card className="w-full max-w-md border-border/60 bg-card/80 p-6 shadow-glow backdrop-blur">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold leading-none">Auction Assistant</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">Sign in to start coaching</p>
            </div>
          </div>

          <Button className="w-full" size="lg" onClick={google}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.7 13-4.6l-6-5.1c-2 1.4-4.4 2.2-7 2.2-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39 16.2 43.5 24 43.5z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6 5.1c-.4.4 6.7-4.9 6.7-14.6 0-1.2-.1-2.4-.4-3.5z" />
            </svg>
            Continue with Google
          </Button>

          <p className="mt-5 text-center text-[11px] text-muted-foreground">
            By continuing you agree to play smart and bid sharp.
          </p>
        </Card>
      </div>
    </div>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-foreground/90">
      <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-card/60 text-primary">
        {icon}
      </span>
      {text}
    </div>
  );
}
