import EditorialShell from "@/components/EditorialShell";
import { useNavigate } from "react-router-dom";

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
      <div className="mx-auto max-w-md px-8 pt-16 pb-16 text-center">
        {/* Eyebrow + gold rule */}
        <div className="flex items-center justify-center gap-3">
          <span className="h-px w-6 bg-primary/70" />
          <span className="text-[9px] uppercase tracking-[0.42em] text-primary/90">
            {category}
          </span>
          <span className="h-px w-6 bg-primary/70" />
        </div>

        <h2
          className="mt-6 text-foreground"
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontWeight: 400,
            fontSize: "2.4rem",
            lineHeight: 1.05,
            letterSpacing: "-0.01em",
          }}
        >
          {tagline.split(" — ")[0]}
        </h2>

        {tagline.includes(" — ") && (
          <p
            className="mt-4 text-[12px] italic text-muted-foreground"
            style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
          >
            {tagline.split(" — ")[1]}
          </p>
        )}

        <div className="mt-12 flex flex-col items-stretch text-left">
          {tools.map((t, i) => (
            <button
              key={t.label}
              onClick={() => t.to && navigate(t.to)}
              disabled={t.comingSoon}
              className={`group w-full py-5 transition-colors disabled:opacity-40 ${
                i !== 0 ? "border-t border-border" : ""
              }`}
            >
              <div className="flex items-baseline gap-4">
                <span className="text-[10px] tabular-nums tracking-[0.2em] text-primary/80 w-6">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[20px] tracking-tight text-foreground transition-colors group-hover:text-primary"
                    style={{
                      fontFamily: '"Playfair Display", Georgia, serif',
                      fontWeight: 400,
                    }}
                  >
                    {t.label}
                    {t.comingSoon && (
                      <span className="ml-2 align-middle text-[8px] uppercase tracking-[0.28em] text-muted-foreground">
                        Soon
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                    {t.description}
                  </div>
                </div>
              </div>
            </button>
          ))}
          <div className="border-t border-border" />
        </div>
      </div>
    </EditorialShell>
  );
}
