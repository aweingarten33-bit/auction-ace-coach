import { motion, AnimatePresence } from "framer-motion";
import type { Short } from "./types";

interface Props {
  short: Short;
  index: number;
  total: number;
  worldName: string;
  worldColor: string;
}

const CONTEXT_LABELS: Record<Short["context"], string> = {
  live: "LIVE",
  interview: "INTERVIEW",
  edit: "EDIT",
  nostalgia: "NOSTALGIA",
  "music-video": "VIDEO",
};

export default function TrackInfo({ short, index, total, worldName, worldColor }: Props) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={short.youtubeId}
        className="funk-track-info"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="funk-track-info__header">
          <span className="funk-world-badge" style={{ color: worldColor, borderColor: worldColor }}>
            {worldName}
          </span>
          <span className="funk-track-pos">
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
        </div>

        <div className="funk-track-info__body">
          <h2 className="funk-track-title">{short.title}</h2>
          <p className="funk-track-artist">{short.artist}</p>
          <div className="funk-track-meta">
            <span className="funk-tag">{short.year}</span>
            <span className="funk-tag">{CONTEXT_LABELS[short.context]}</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
