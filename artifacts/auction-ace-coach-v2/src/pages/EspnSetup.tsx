import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

type Creds = { leagueId: string; season: string; swid: string; s2: string };

const KEY = "espnCreds";

export default function EspnSetup() {
  const nav = useNavigate();
  const [c, setC] = useState<Creds>({
    leagueId: "",
    season: String(new Date().getFullYear()),
    swid: "",
    s2: "",
  });
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setC({ ...c, ...JSON.parse(raw) });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (k: keyof Creds, v: string) => setC((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setStatus("Testing…");
    localStorage.setItem(KEY, JSON.stringify(c));
    try {
      const qs = new URLSearchParams({
        leagueId: c.leagueId,
        season: c.season,
        swid: c.swid,
        s2: c.s2,
      });
      const r = await fetch(`/api/espn/teams?${qs.toString()}`);
      const data = await r.json();
      if (!r.ok) {
        setStatus(`❌ ${data.error || r.statusText} (status ${r.status})`);
        return;
      }
      const n = data.teams?.length ?? 0;
      if (n === 0) {
        setStatus("⚠️ Connected but no teams returned. Check league is private/public access.");
        return;
      }
      setStatus(`✅ Loaded ${n} teams. Redirecting…`);
      setTimeout(() => nav("/team"), 700);
    } catch (e) {
      setStatus(`❌ ${String(e)}`);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white px-6 py-12">
      <div className="max-w-md mx-auto">
        <Link to="/" className="text-[13px] text-white/60 hover:text-white">← Back</Link>
        <h1 className="text-3xl font-bold mt-6 mb-2">Connect ESPN</h1>
        <p className="text-white/60 mb-8 text-[14px]">
          Find your league ID in the ESPN URL. SWID + espn_s2 are cookies from your
          browser (DevTools → Application → Cookies → fantasy.espn.com).
        </p>

        <div className="space-y-4">
          <Field label="League ID" value={c.leagueId} onChange={(v) => update("leagueId", v)} placeholder="123456" />
          <Field label="Season"    value={c.season}   onChange={(v) => update("season", v)}   placeholder="2025" />
          <Field label="SWID"      value={c.swid}     onChange={(v) => update("swid", v)}     placeholder="{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}" />
          <Field label="espn_s2"   value={c.s2}       onChange={(v) => update("s2", v)}       placeholder="AEB...long string..." multiline />
        </div>

        <button
          onClick={save}
          className="mt-8 w-full bg-[#eb0000] hover:bg-[#c80000] rounded-full py-4 text-[15px] font-semibold transition-colors"
        >
          Save & Load Teams
        </button>

        {status && <p className="mt-4 text-[14px] text-white/80">{status}</p>}
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, multiline,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }) {
  const cls = "w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-[14px] text-white placeholder-white/30 focus:outline-none focus:border-white/50";
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wider text-white/60 mb-2">{label}</span>
      {multiline ? (
        <textarea className={cls} rows={3} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <input className={cls} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </label>
  );
}
