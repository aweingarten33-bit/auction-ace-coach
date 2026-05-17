import { motion } from "framer-motion";
import type { World } from "./types";

interface Props {
  worlds: World[];
  activeId: string;
  onSelect: (id: string) => void;
}

export default function CrateTabs({ worlds, activeId, onSelect }: Props) {
  return (
    <div className="funk-tabs" role="tablist" aria-label="Worlds">
      {worlds.map((w, i) => {
        const isEmpty = w.shorts.length === 0;
        const isActive = w.id === activeId;

        return (
          <motion.button
            key={w.id}
            role="tab"
            aria-selected={isActive}
            aria-disabled={isEmpty}
            onClick={() => !isEmpty && onSelect(w.id)}
            className={[
              "funk-tab",
              isActive ? "funk-tab--active" : "",
              isEmpty ? "funk-tab--empty" : "",
            ].join(" ")}
            style={isActive ? { "--tab-color": w.color } as React.CSSProperties : undefined}
            initial={false}
            whileHover={!isEmpty ? { y: -2 } : {}}
            transition={{ duration: 0.15 }}
            tabIndex={isEmpty ? -1 : 0}
            title={isEmpty ? `${w.name} — coming soon` : w.name}
          >
            <span className="funk-tab__index">{String(i + 1).padStart(2, "0")}</span>
            <span className="funk-tab__name">{w.name}</span>
            {isEmpty && <span className="funk-tab__lock">⌛</span>}
          </motion.button>
        );
      })}
    </div>
  );
}
