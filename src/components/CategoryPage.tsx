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
        {/* CHAPTER PLATE — Dick Tracy dossier folder */}
        <div className="relative ink-edge-yellow bg-card overflow-hidden">
          <div className="absolute inset-0 halftone-yellow opacity-40 pointer-events-none" />
          <div className="absolute inset-0 deco-rays opacity-50 pointer-events-none" />
          <div className="absolute inset-0 grain pointer-events-none" />

          {/* corner stamp */}
          <div className="absolute top-3 right-3 stamp-red text-[9px]">
            Eyes Only
          </div>

          <div className="relative p-5 pt-6">
            <div className="flex items-center gap-2 text-stamp text-[10px] spot-yellow">
              <span className="inline-block h-2 w-2 bg-primary border border-foreground" />
              FILE · {String(tools.length).padStart(2, "0")} ENTRIES
            </div>
            <h2
              className="toon-display mt-3 neon-yellow"
              style={{ fontSize: "3rem" }}
            >
              {category}
            </h2>
            <p className="mt-3 text-[12px] leading-snug text-foreground/80 text-stamp max-w-[85%]">
              « {tagline} »
            </p>
          </div>
        </div>

        {/* TOOL PANELS — pulp dossier cards, alternating yellow / purple drop */}
        <div className="mt-7 space-y-4">
          {tools.map((t, i) => {
            const purple = i % 2 === 1;
            return (
              <button
                key={t.label}
                onClick={() => t.to && navigate(t.to)}
                disabled={t.comingSoon}
                className={`group relative w-full ${
                  purple ? "ink-edge-purple" : "ink-edge-yellow"
                } bg-card text-left transition-all disabled:opacity-30 hover:-translate-y-0.5 hover:translate-x-0.5 overflow-hidden`}
              >
                <div className={`absolute inset-0 ${purple ? "halftone-purple" : "halftone-yellow"} opacity-25 pointer-events-none`} />

                <div className="relative flex items-stretch">
                  {/* number block — silhouette panel */}
                  <div className={`flex flex-col items-center justify-center silhouette w-16 py-3 border-r-[2.5px] border-foreground relative ${purple ? "deco-rays-purple" : "deco-rays"}`}>
                    <span className="text-stamp text-[8px] tracking-widest text-background/70">No.</span>
                    <span className={`toon-cartoon text-3xl leading-none ${purple ? "neon-purple" : "neon-yellow"} group-hover:scale-110 transition-transform`}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 p-4 pr-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`toon-cartoon text-[22px] ${purple ? "spot-purple" : "spot-yellow"}`}>
                        {t.label}
                      </h3>
                      {t.comingSoon && (
                        <span className="stamp-red text-[8px] !rotate-3">
                          Pending
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-foreground/75">
                      {t.description}
                    </p>
                  </div>
                  <div className="flex items-center pr-3">
                    <ChevronRight
                      className={`h-6 w-6 shrink-0 transition-all group-hover:translate-x-1 ${purple ? "text-accent" : "text-primary"} group-hover:scale-125`}
                      strokeWidth={3}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* American Psycho business-card footer */}
        <div className="mt-8 psycho-card text-center">
          <p className="biz-card text-[10px] mb-1">Vetri & Associates</p>
          <p className="biz-card text-[8px] opacity-70">Fantasy Acquisitions · Auction Counsel</p>
          <div className="mt-2 flex items-center justify-between text-[8px] biz-card opacity-60">
            <span>End · Chapter</span>
            <span>{String(tools.length).padStart(2, "0")} / {String(tools.length).padStart(2, "0")}</span>
          </div>
        </div>
      </div>
    </EditorialShell>
  );
}
