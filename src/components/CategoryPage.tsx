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
        {/* CHAPTER PLATE — Sin City title card with rain + spot color */}
        <div className="relative ink-edge bg-background overflow-hidden">
          <div className="absolute inset-0 halftone-red opacity-60 pointer-events-none" />
          <div className="absolute inset-0 rain opacity-40 pointer-events-none" />
          <div className="absolute inset-0 vignette pointer-events-none" />
          {/* corner red splatter */}
          <div className="splatter bg-primary" style={{ top: "-18px", right: "-18px", width: "70px", height: "70px", opacity: 0.85 }} />
          <div className="splatter bg-primary" style={{ top: "20px", right: "30px", width: "14px", height: "14px" }} />

          <div className="relative p-5">
            <div className="flex items-center gap-2 text-stamp text-[10px] spot-red">
              <span className="inline-block h-2 w-2 bg-primary" />
              CHAPTER · {String(tools.length).padStart(2, "0")} PANELS
            </div>
            <h2
              className="title-slab mt-3 text-foreground rgb-split-strong"
              style={{ fontSize: "3.2rem" }}
            >
              {category}
            </h2>
            <p className="mt-2 text-[12px] leading-snug text-foreground/70 text-stamp max-w-[80%]">
              « {tagline} »
            </p>
          </div>
        </div>

        {/* TOOL PANELS — SF6 character select tiles */}
        <div className="mt-6 space-y-4">
          {tools.map((t, i) => (
            <button
              key={t.label}
              onClick={() => t.to && navigate(t.to)}
              disabled={t.comingSoon}
              className="group relative w-full ink-edge-sm bg-card text-left transition-all disabled:opacity-30 hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-[5px_5px_0_hsl(0_100%_50%)] overflow-hidden"
            >
              {/* halftone wash */}
              <div className="absolute inset-0 halftone opacity-50 pointer-events-none" />
              {/* speedlines on hover */}
              <div className="absolute inset-0 speedlines-red opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

              <div className="relative flex items-stretch">
                {/* number block — silhouette */}
                <div className="flex flex-col items-center justify-center silhouette w-14 py-3 border-r-2 border-foreground relative">
                  <span className="text-stamp text-[8px] tracking-widest text-background/70">No.</span>
                  <span className="title-slab text-3xl leading-none text-background group-hover:text-primary transition-colors">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                <div className="flex-1 min-w-0 p-4 pr-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="headline-noir text-[20px] text-foreground group-hover:rgb-split transition-all">
                      {t.label}
                    </h3>
                    {t.comingSoon && (
                      <span className="text-stamp text-[8px] px-1.5 py-0.5 bg-accent text-accent-foreground">
                        K.O. SOON
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                    {t.description}
                  </p>
                </div>
                <div className="flex items-center pr-3">
                  <ChevronRight
                    className="h-6 w-6 text-foreground shrink-0 transition-all group-hover:translate-x-1 group-hover:text-primary group-hover:scale-125"
                    strokeWidth={3}
                  />
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* footer stamp */}
        <div className="mt-8 flex items-center justify-between text-stamp text-[9px] text-foreground/50 border-t border-foreground/30 pt-3">
          <span>« Continued in next issue »</span>
          <span className="spot-red">END · CHAPTER</span>
        </div>
      </div>
    </EditorialShell>
  );
}
