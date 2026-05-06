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
      <div className="mx-auto max-w-2xl px-4 pt-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Section
        </p>
        <h2
          className="mt-1 text-3xl font-bold tracking-tight"
          style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
        >
          {category}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{tagline}</p>

        <div className="mt-5 divide-y divide-border/60 border-y border-border/60">
          {tools.map((t) => (
            <button
              key={t.label}
              onClick={() => t.to && navigate(t.to)}
              disabled={t.comingSoon}
              className="w-full flex items-center justify-between gap-3 py-4 text-left disabled:opacity-50"
            >
              <div className="min-w-0">
                <div className="text-[15px] font-semibold text-foreground">
                  {t.label}
                  {t.comingSoon && (
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                      Soon
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {t.description}
                </div>
              </div>
              {!t.comingSoon && (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>
    </EditorialShell>
  );
}
