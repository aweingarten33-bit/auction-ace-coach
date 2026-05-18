import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLock } from "@/hooks/useLock";

// Change this to whatever you want your admin passcode to be
const ADMIN_PASSCODE = "draftking";

export default function Passcode() {
  const navigate = useNavigate();
  const { refresh } = useLock();
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (code.trim().toLowerCase() !== ADMIN_PASSCODE) {
      setError(true);
      setCode("");
      return;
    }
    setBusy(true);
    await supabase.auth.updateUser({ data: { is_admin: true } });
    await refresh();
    navigate("/draft-room", { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-xs space-y-4 text-center">
        <p className="text-lg font-semibold">Admin access</p>
        <input
          type="password"
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(false); }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Enter passcode"
          autoFocus
          className="w-full rounded-lg border border-border bg-secondary/30 px-4 py-3 text-center text-sm outline-none focus:border-primary"
        />
        {error && <p className="text-sm text-destructive">Wrong passcode</p>}
        <button
          onClick={submit}
          disabled={busy || !code}
          className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Verifying…" : "Unlock"}
        </button>
      </div>
    </div>
  );
}
