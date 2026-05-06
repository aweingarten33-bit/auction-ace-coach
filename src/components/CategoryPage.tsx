import EditorialShell from "@/components/EditorialShell";
import { useNavigate } from "react-router-dom";
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
      <div className="mx-auto max-w-xl px-5 pt-6 pb-10">
        {/* Chapter card — comic panel */}
        <div className="relative ink-edge bg-background p-5 halftone-red">
          <div className="flex items-center gap-2 text-stamp text-[10px] text-primary">
            <span className="inline-block h-2 w-2 bg-primary" />
            CHAPTER · {category.toUpperCase()}
          </div>
          <h2
            className="headline-noir mt-3 text-foreground"
            style={{ fontSize: "3rem" }}
          >
            {category}
          </h2>
          <p className="mt-2 text-[12px] leading-snug text-muted-foreground text-stamp">
            « {tagline} »
          </p>
        </div>

        {/* Tools — stacked comic panels */}
        <div className="mt-5 space-y-3">
          {tools.map((t, i) => (
            <button
              key={t.label}
              onClick={() => t.to && navigate(t.to)}
              disabled={t.comingSoon}
              className="group relative w-full ink-edge-sm bg-card p-4 text-left transition-transform disabled:opacity-40 hover:-translate-y-0.5 hover:translate-x-0.5"
            >
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center justify-center bg-foreground text-background w-12 py-2 ink-edge-sm">
                  <span className="text-stamp text-[8px] tracking-widest opacity-60">No.</span>
                  <span className="headline-noir text-2xl leading-none">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="headline-noir text-[20px] text-foreground group-hover:text-primary transition-colors">
                      {t.label}
                    </h3>
                    {t.comingSoon && (
                      <span className="text-stamp text-[8px] px-1.5 py-0.5 bg-accent text-accent-foreground">
                        Soon
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                    {t.description}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-foreground shrink-0 mt-1 transition-transform group-hover:translate-x-1 group-hover:text-primary" strokeWidth={2.5} />
              </div>
            </button>
          ))}
        </div>

        {/* Footer stamp */}
        <div className="mt-6 flex items-center justify-between text-stamp text-[9px] text-muted-foreground">
          <span>« Continued inside »</span>
          <span>{tools.length} panels</span>
        </div>
      </div>
    </EditorialShell>
  );
}
