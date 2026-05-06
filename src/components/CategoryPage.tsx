import { ReactNode } from "react";
import EditorialShell from "@/components/EditorialShell";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

interface Tool {
  label: string;
  description: string;
  to?: string;
  comingSoon?: boolean;
}

interface Props {
  category: string;
  tagline: string;
  tools: Tool[];
}

export default function CategoryPage({ category, tagline, tools }: Props) {
  const navigate = useNavigate();
  return (
    <EditorialShell activeCategory={category}>
      <div className="mx-auto max-w-xl px-6 pt-12 pb-8">
        <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
          Section
        </p>
        <h2
          className="mt-3 text-4xl tracking-tight text-foreground"
          style={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 500 }}
        >
          {category}
        </h2>
        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground max-w-md">
          {tagline}
        </p>

        <div className="mt-10 space-y-0">
          {tools.map((t, i) => (
            <button
              key={t.label}
              onClick={() => t.to && navigate(t.to)}
              disabled={t.comingSoon}
              className={`group w-full flex items-center justify-between gap-4 py-5 text-left transition-colors disabled:opacity-40 ${
                i !== 0 ? "border-t border-border/70" : ""
              } hover:bg-secondary/40 px-1`}
            >
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] tabular-nums uppercase tracking-[0.22em] text-muted-foreground/70">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[17px] font-medium tracking-tight text-foreground">
                    {t.label}
                  </span>
                  {t.comingSoon && (
                    <span className="ml-1 text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                      Soon
                    </span>
                  )}
                </div>
                <div className="mt-1 pl-7 text-[12px] leading-relaxed text-muted-foreground">
                  {t.description}
                </div>
              </div>
              {!t.comingSoon && (
                <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
              )}
            </button>
          ))}
        </div>
      </div>
    </EditorialShell>
  );
}
