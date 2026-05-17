export interface Short {
  youtubeId: string;
  title: string;
  artist: string;
  year: string;
  context: "live" | "interview" | "edit" | "nostalgia" | "music-video";
}

export interface World {
  id: string;
  name: string;
  color: string;
  accent: string;
  shorts: Short[];
}

export interface WorldsData {
  worlds: World[];
}
