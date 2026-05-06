import { EspnSyncStatus as Status } from "@/hooks/useEspnLiveSync";
import { Activity, AlertTriangle, WifiOff, KeyboardIcon } from "lucide-react";

interface Props {
  status: Status;
  lastEventAt: number | null;
}

/**
 * Small status pill shown near the manual-entry input.
 * When ESPN sync drops or goes stale, we explicitly tell the user
 * manual entry is the active fallback so the AI keeps working.
 */
export default function EspnSyncStatusPill({ status, lastEventAt }: Props) {
  const ago = lastEventAt
    ? `${Math.max(1, Math.round((Date.now() - lastEventAt) / 1000))}s ago`
    : "—";

  const map: Record<Status, { label: string; cls: string; icon: any; hint?: string }> = {
    disabled: {
      label: "Manual entry",
      cls: "bg-secondary/60 text-muted-foreground border-border/60",
      icon: KeyboardIcon,
      hint: "Connect ESPN to auto-log picks",
    },
    connecting: {
      label: "Connecting ESPN…",
      cls: "bg-secondary/60 text-muted-foreground border-border/60",
      icon: Activity,
    },
    live: {
      label: `ESPN live · ${ago}`,
      cls: "bg-primary/15 text-primary border-primary/30",
      icon: Activity,
    },
    idle: {
      label: "ESPN connected",
      cls: "bg-primary/10 text-primary/90 border-primary/20",
      icon: Activity,
    },
    stale: {
      label: "ESPN quiet → manual fallback active",
      cls: "bg-amber-500/15 text-amber-600 border-amber-500/30",
      icon: AlertTriangle,
      hint: "Type picks below — AI keeps working",
    },
    offline: {
      label: "ESPN offline → manual fallback",
      cls: "bg-destructive/15 text-destructive border-destructive/30",
      icon: WifiOff,
      hint: "Type picks below — AI keeps working",
    },
  };

  const m = map[status];
  const Icon = m.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${m.cls}`}
      title={m.hint || "ESPN sync status"}
    >
      <Icon className="h-3 w-3" />
      <span>{m.label}</span>
    </span>
  );
}
