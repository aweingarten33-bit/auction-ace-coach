import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

type Props = {
  to?: string;
  label?: string;
  className?: string;
};

/**
 * Back button used on every non-landing page. Defaults to history.back(),
 * falls back to `to` (or "/") if there's no history entry.
 */
export default function BackButton({ to, label = "Back", className = "" }: Props) {
  const nav = useNavigate();
  const handle = () => {
    if (to) { nav(to); return; }
    if (window.history.length > 1) nav(-1);
    else nav("/");
  };
  return (
    <button
      type="button"
      onClick={handle}
      aria-label={label}
      className={
        "fixed left-4 top-4 z-50 inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-2 text-[12px] font-medium text-[#0a0a0a] ring-1 ring-black/10 backdrop-blur-md transition hover:bg-white md:left-6 md:top-6 " +
        className
      }
    >
      <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
      <span className="uppercase tracking-[0.18em]">{label}</span>
    </button>
  );
}
