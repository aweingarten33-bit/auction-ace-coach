import { useEffect, useRef, useCallback } from "react";

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface Props {
  videoId: string;
  onEnded: () => void;
  playing: boolean;
  onPlayingChange: (playing: boolean) => void;
}

let apiReady = false;
const readyCallbacks: (() => void)[] = [];

function loadYTApi() {
  if (apiReady || document.getElementById("yt-iframe-api")) return;
  const tag = document.createElement("script");
  tag.id = "yt-iframe-api";
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
}

window.onYouTubeIframeAPIReady = () => {
  apiReady = true;
  readyCallbacks.forEach((cb) => cb());
  readyCallbacks.length = 0;
};

function whenReady(cb: () => void) {
  if (apiReady) { cb(); return; }
  readyCallbacks.push(cb);
  loadYTApi();
}

export default function YouTubePlayer({ videoId, onEnded, playing, onPlayingChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const readyRef = useRef(false);

  const createPlayer = useCallback(() => {
    if (!containerRef.current) return;
    playerRef.current?.destroy();
    readyRef.current = false;

    const div = document.createElement("div");
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(div);

    playerRef.current = new window.YT.Player(div, {
      videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
        enablejsapi: 1,
        fs: 0,
      },
      events: {
        onReady: (e) => {
          readyRef.current = true;
          e.target.setPlaybackQuality("hd720");
          if (playing) e.target.playVideo();
        },
        onStateChange: (e) => {
          if (e.data === window.YT.PlayerState.ENDED) onEnded();
          if (e.data === window.YT.PlayerState.PLAYING) onPlayingChange(true);
          if (e.data === window.YT.PlayerState.PAUSED) onPlayingChange(false);
        },
      },
    });
  }, [videoId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    whenReady(createPlayer);
    return () => { playerRef.current?.destroy(); playerRef.current = null; };
  }, [createPlayer]);

  useEffect(() => {
    if (!readyRef.current || !playerRef.current) return;
    try {
      if (playing) playerRef.current.playVideo();
      else playerRef.current.pauseVideo();
    } catch { /* player not ready */ }
  }, [playing]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ aspectRatio: "9/16" }}
    />
  );
}
