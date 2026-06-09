import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2, Lock, RefreshCw, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLock } from "@/hooks/useLock";
import { toast } from "sonner";

interface Row {
  user_id: string;
  email: string | null;
  display_name: string | null;
  league_id: number | null;
  created_at: string;
  first_seen_at: string | null;
  last_seen_at: string | null;
  visit_count: number;
}

const fmt = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
};

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const { locked, refresh: refreshLock } = useLock();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingLock, setTogglingLock] = useState(false);

  const toggleLock = async (next: boolean) => {
    setTogglingLock(true);
    const { error } = await supabase
      .from("app_settings")
      .update({ locked: next, updated_at: new Date().toISOString() })
      .eq("id", true);
    setTogglingLock(false);
    if (error) return toast.error(error.message);
    await refreshLock();
    toast.success(next ? "Site locked — non-admins now see 404" : "Site unlocked");
  };

  const load = async () => {
    setLoading(true);
    if (!user) return;
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    const admin = !!roleRow;
    setIsAdmin(admin);
    if (!admin) { setLoading(false); return; }
    const { data } = await supabase
      .from("profiles")
      .select("user_id, email, display_name, league_id, created_at, first_seen_at, last_seen_at, visit_count")
      .order("last_seen_at", { ascending: false, nullsFirst: false });
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && user) load();
    else if (!authLoading && !user) setLoading(false);
  }, [authLoading, user?.id]);

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (isAdmin === false) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <h1 className="mb-2 text-xl font-bold">Admins only</h1>
        <p className="mb-4 text-sm text-muted-foreground">You don't have access to this page.</p>
        <Button asChild variant="outline"><Link to="/draft">Back</Link></Button>
      </div>
    );
  }

  const now = Date.now();
  const active24h = rows.filter((r) => r.last_seen_at && now - new Date(r.last_seen_at).getTime() < 86400000).length;
  const active7d = rows.filter((r) => r.last_seen_at && now - new Date(r.last_seen_at).getTime() < 7 * 86400000).length;

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/draft"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link>
        </Button>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="mr-1 h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <div className="mb-6 flex items-center gap-2">
        <Users className="h-5 w-5" />
        <h1 className="text-2xl font-bold">Usage Report</h1>
      </div>

      <Card className={`mb-4 p-4 ${locked ? "border-destructive/60 bg-destructive/5" : ""}`}>
        <div className="flex items-start gap-3">
          <Lock className={`mt-0.5 h-4 w-4 ${locked ? "text-destructive" : "text-muted-foreground"}`} />
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Site lockdown</p>
              <Switch checked={locked} disabled={togglingLock} onCheckedChange={toggleLock} />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {locked
                ? "🔒 LOCKED — everyone except you sees a 404. You can still use /admin to unlock."
                : "Off. Flip on the day before your draft to make the site appear broken (404) to everyone but you."}
            </p>
          </div>
        </div>
      </Card>


      <div className="mb-4 grid grid-cols-3 gap-3">
        <Card className="p-3">
          <p className="text-[11px] text-muted-foreground">Total users</p>
          <p className="text-2xl font-bold">{rows.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[11px] text-muted-foreground">Active (24h)</p>
          <p className="text-2xl font-bold text-success">{active24h}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[11px] text-muted-foreground">Active (7d)</p>
          <p className="text-2xl font-bold">{active7d}</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">User</th>
                <th className="px-3 py-2 text-left">League</th>
                <th className="px-3 py-2 text-right">Visits</th>
                <th className="px-3 py-2 text-right">Last seen</th>
                <th className="px-3 py-2 text-right">First seen</th>
                <th className="px-3 py-2 text-right">Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.user_id} className="border-t border-border/60">
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.display_name || r.email || r.user_id.slice(0, 8)}</div>
                    {r.email && r.display_name && (
                      <div className="text-[11px] text-muted-foreground">{r.email}</div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {r.league_id ? (
                      <Badge variant="outline" className="font-mono text-[10px]">{r.league_id}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{r.visit_count}</td>
                  <td className="px-3 py-2 text-right text-xs">{fmt(r.last_seen_at)}</td>
                  <td className="px-3 py-2 text-right text-xs text-muted-foreground">{fmt(r.first_seen_at)}</td>
                  <td className="px-3 py-2 text-right text-xs text-muted-foreground">{fmt(r.created_at)}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">No users yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
