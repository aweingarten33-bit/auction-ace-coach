import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { World, WorldsData } from "./types";
import YouTubePlayer from "./YouTubePlayer";
import CrateTabs from "./CrateTabs";
import TrackInfo from "./TrackInfo";
import KeyHints from "./KeyHints";

export default function FunkContinuum() {
  const [worlds, setWorlds] = useState<World[]>([]);
  const [activeWorldId, setActiveWorldId] = useState("funk");
  const [trackIndex, setTrackIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/worlds.json")
      .then((r) => r.json())
      .then((data: WorldsData) => {
        setWorlds(data.worlds);
        setLoaded(true);
      });
  }, []);

  const activeWorld = worlds.find((w) => w.id === activeWorldId);
  const shorts = activeWorld?.shorts ?? [];
  const currentShort = shorts[trackIndex];

  const next = useCallback(() => {
    setTrackIndex((i) => (i + 1) % Math.max(shorts.length, 1));
  }, [shorts.length]);

  const prev = useCallback(() => {
    setTrackIndex((i) => (i - 1 + Math.max(shorts.length, 1)) % Math.max(shorts.length, 1));
  }, [shorts.length]);

  const togglePlay = useCallback(() => setPlaying((p) => !p), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft")  { e.preventDefault(); prev(); }
      if (e.key === " ")          { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev, togglePlay]);

  const handleWorldSelect = (id: string) => {
    setActiveWorldId(id);
    setTrackIndex(0);
    setPlaying(true);
  };

  if (!loaded) {
    return (
      <div className="funk-loading">
        <div className="funk-loading__spinner" />
        <p>Loading the crate…</p>
      </div>
    );
  }

  return (
    <div className="funk-root">
      {/* Noise grain overlay */}
      <div className="funk-grain" aria-hidden />

      {/* Crate tabs along top */}
      <header className="funk-header">
        <div className="funk-logo">
          <span className="funk-logo__text">FUNK CONTINUUM</span>
          <span className="funk-logo__sub">mixtape player</span>
        </div>
        {worlds.length > 0 && (
          <CrateTabs
            worlds={worlds}
            activeId={activeWorldId}
            onSelect={handleWorldSelect}
          />
        )}
      </header>

      {/* Player area */}
      <main className="funk-stage">
        <div className="funk-player-wrap">
          <AnimatePresence mode="wait">
            {currentShort && (
              <motion.div
                key={currentShort.youtubeId}
                className="funk-player-frame"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <YouTubePlayer
                  videoId={currentShort.youtubeId}
                  onEnded={next}
                  playing={playing}
                  onPlayingChange={setPlaying}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Nav arrows */}
          <button
            className="funk-nav funk-nav--prev"
            onClick={prev}
            aria-label="Previous track"
          >
            ←
          </button>
          <button
            className="funk-nav funk-nav--next"
            onClick={next}
            aria-label="Next track"
          >
            →
          </button>

          {/* Play/pause overlay click */}
          <button
            className="funk-play-overlay"
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Play"}
          >
            {!playing && <span className="funk-play-icon">▶</span>}
          </button>
        </div>

        {/* Track info */}
        {currentShort && activeWorld && (
          <aside className="funk-sidebar">
            <TrackInfo
              short={currentShort}
              index={trackIndex}
              total={shorts.length}
              worldName={activeWorld.name}
              worldColor={activeWorld.color}
            />
            <KeyHints />
          </aside>
        )}
      </main>

      {/* Progress dots */}
      {shorts.length > 0 && (
        <div className="funk-progress" aria-hidden>
          {shorts.map((s, i) => (
            <button
              key={s.youtubeId}
              className={`funk-dot ${i === trackIndex ? "funk-dot--active" : ""}`}
              onClick={() => { setTrackIndex(i); setPlaying(true); }}
              style={i === trackIndex && activeWorld ? { background: activeWorld.color } : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
