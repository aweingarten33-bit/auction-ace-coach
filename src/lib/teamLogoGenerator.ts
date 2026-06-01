const PALETTES: [string, string, string][] = [
  ["#1a2548", "#e0223a", "#f4d27a"],
  ["#0d4f2e", "#ffd700", "#ffffff"],
  ["#1c1c1c", "#ff4500", "#ffffff"],
  ["#003087", "#d50a0a", "#ffffff"],
  ["#4b0082", "#c084fc", "#ffd700"],
  ["#8b0000", "#c0c0c0", "#ffffff"],
  ["#00308f", "#a2aaad", "#ffffff"],
  ["#004953", "#e2c700", "#ffffff"],
  ["#101820", "#f0d046", "#ffffff"],
  ["#1a1a2e", "#e94560", "#ffffff"],
  ["#2d6a4f", "#95d5b2", "#ffffff"],
  ["#560bad", "#f72585", "#ffffff"],
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) & 0xfffffff;
  }
  return h;
}

const KEYWORD_MAP: [string[], string][] = [
  // Birds
  [["eagle", "hawk", "falcon", "raven", "crow", "cardinal", "pelican", "osprey", "condor", "phoenix"], "🦅"],
  // Big cats
  [["lion", "tiger", "panther", "jaguar", "cougar", "leopard", "cheetah", "lynx", "cat", "wildcat"], "🦁"],
  // Bears / dogs
  [["bear", "grizzly", "polar", "panda"], "🐻"],
  [["wolf", "fox", "hound", "dog", "mutt", "dawg", "husky"], "🐺"],
  // Sea creatures
  [["shark", "dolphin", "whale", "marlin", "tuna", "fish", "ray", "manta"], "🦈"],
  // Reptiles / mythical
  [["dragon", "serpent", "snake", "viper", "cobra", "python", "gator", "croc", "lizard"], "🐉"],
  [["unicorn", "pegasus"], "🦄"],
  // Horned
  [["bull", "ox", "bison", "buffalo", "ram", "goat", "longhorn", "bronco", "mustang", "stallion", "horse", "colt"], "🐂"],
  // Primates
  [["gorilla", "ape", "monkey", "chimp", "baboon"], "🦍"],
  // Fire / heat
  [["fire", "flame", "blaze", "inferno", "heat", "burn", "torch", "ember", "lava", "magma", "pyro", "ignite", "scorcher"], "🔥"],
  // Lightning / electric
  [["lightning", "thunder", "bolt", "electric", "storm", "shock", "zap", "volt", "surge", "current"], "⚡"],
  // Ice / cold
  [["ice", "frost", "freeze", "cold", "snow", "blizzard", "arctic", "glacier", "frozen", "tundra", "cryo"], "❄️"],
  // Water / ocean
  [["wave", "tide", "ocean", "sea", "water", "flood", "tsunami", "rapids", "current", "surf"], "🌊"],
  // Celestial
  [["star", "stars", "galaxy", "universe", "cosmos", "astro", "stellar", "nebula", "constellation"], "⭐"],
  [["sun", "solar", "sunshine", "sunrise", "sunset", "dawn"], "☀️"],
  [["moon", "lunar", "midnight", "night", "eclipse"], "🌙"],
  [["rocket", "missile", "shuttle", "spacecraft", "orbit"], "🚀"],
  [["alien", "ufo", "extraterrestrial", "martian"], "👽"],
  // Royalty / power
  [["crown", "king", "queen", "royal", "prince", "princess", "knight", "emperor", "dynasty", "reign"], "👑"],
  [["sword", "blade", "saber", "katana", "dagger", "knight", "warrior", "gladiator", "spartan"], "⚔️"],
  [["shield", "defender", "guard", "fortress", "castle", "armor", "iron", "steel"], "🛡️"],
  [["fist", "punch", "boxer", "boxing", "knockout", "bruiser", "brawler", "slugger"], "👊"],
  [["skull", "death", "dead", "doom", "reaper", "ghost", "phantom", "specter", "wraith", "undead"], "💀"],
  [["bomb", "explosion", "blast", "boom", "nuke", "cannon", "missile", "torpedo"], "💣"],
  // Sports
  [["football", "gridiron", "pigskin", "touchdown", "fieldgoal"], "🏈"],
  [["trophy", "champion", "champ", "championship", "title", "belt", "cup", "title"], "🏆"],
  [["gold", "golden", "medal", "silver", "bronze", "olympic"], "🥇"],
  // Money
  [["money", "cash", "dollar", "bank", "rich", "wealthy", "banker", "financer", "treasure", "loot", "jackpot", "million", "billion"], "💰"],
  // Tech / robot
  [["robot", "machine", "mech", "cyborg", "android", "terminator", "tech", "cyber", "digital"], "🤖"],
  // Magic
  [["magic", "wizard", "witch", "sorcerer", "warlock", "spell", "mystic", "hex", "curse", "enchant", "alchemist"], "🧙"],
  // Ninja / stealth
  [["ninja", "shadow", "assassin", "stealth", "phantom", "hunter", "sniper"], "🥷"],
  // Pirate
  [["pirate", "buccaneer", "corsair", "privateer", "marauder", "plunder", "swashbuckler"], "🏴‍☠️"],
  // Senior / old (for their league!)
  [["senior", "old", "elder", "grandpa", "grandma", "veteran", "legend", "ancient", "boomer", "citizen", "citizens", "retired"], "👴"],
  // Misc
  [["demon", "devil", "satan", "infernal", "hellfire", "hellhound"], "😈"],
  [["angel", "heaven", "divine", "holy", "sacred", "blessed"], "😇"],
  [["viking", "berserker", "norse", "raider", "barbarian", "savage"], "🪓"],
  [["cowboy", "outlaw", "bandit", "gunslinger", "ranger", "texan", "lone"], "🤠"],
  [["animal", "beast", "monster", "creature", "titan", "giant", "colossus"], "👹"],
  [["mountain", "peak", "summit", "rocky", "sierra", "alpine", "highland"], "⛰️"],
  [["cannon", "artillery", "blaster", "laser", "plasma"], "💥"],
];

function getEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const [keywords, emoji] of KEYWORD_MAP) {
    if (keywords.some((k) => lower.includes(k))) return emoji;
  }
  return "🏈"; // default
}

function wrapLines(name: string, maxChars = 10): string[] {
  const words = name.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current.length + word.length + (current ? 1 : 0) <= maxChars) {
      current += (current ? " " : "") + word;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

export function generateTeamSVG(teamName: string): string {
  const hash = hashName(teamName);
  const [bg, accent, text] = PALETTES[hash % PALETTES.length];
  const emoji = getEmoji(teamName);
  const lines = wrapLines(teamName.toUpperCase(), 11);
  const lineH = 28;
  const textStartY = lines.length === 1 ? 300 : lines.length === 2 ? 288 : 276;

  const textEls = lines
    .map(
      (line, i) =>
        `<text x="180" y="${textStartY + i * lineH}" fill="${text}" font-size="22" font-weight="800" letter-spacing="2" text-anchor="middle" font-family="Inter, system-ui, sans-serif">${line}</text>`
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 440">
    <defs>
      <linearGradient id="bg${hash}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${bg}" stop-opacity="1"/>
        <stop offset="100%" stop-color="${bg}" stop-opacity="0.8"/>
      </linearGradient>
      <linearGradient id="acc${hash}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${accent}"/>
        <stop offset="100%" stop-color="${accent}" stop-opacity="0.7"/>
      </linearGradient>
      <clipPath id="clip${hash}">
        <path d="M180 8 L344 56 L344 240 Q344 340 180 432 Q16 340 16 240 L16 56 Z"/>
      </clipPath>
    </defs>
    <!-- Gold trim -->
    <path d="M180 0 L352 50 L352 242 Q352 348 180 442 Q8 348 8 242 L8 50 Z" fill="${accent}"/>
    <!-- Body -->
    <path d="M180 12 L340 58 L340 240 Q340 338 180 426 Q20 338 20 240 L20 58 Z" fill="url(#bg${hash})"/>
    <!-- Top band -->
    <g clip-path="url(#clip${hash})">
      <rect x="0" y="40" width="360" height="52" fill="${accent}" opacity="0.9"/>
      <rect x="0" y="38" width="360" height="2" fill="${accent}"/>
      <rect x="0" y="92" width="360" height="2" fill="${accent}"/>
    </g>
    <!-- Emoji icon -->
    <text x="180" y="230" font-size="100" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
    <!-- Divider -->
    <line x1="70" y1="258" x2="290" y2="258" stroke="${accent}" stroke-width="1.2"/>
    <!-- Team name -->
    ${textEls}
    <!-- Inner trim -->
    <path d="M180 24 L328 64 L328 240 Q328 332 180 414 Q32 332 32 240 L32 64 Z" fill="none" stroke="${accent}" stroke-width="0.8" opacity="0.4"/>
  </svg>`;
}

export function svgToDataUrl(svg: string): string {
  return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
}

export const LEAGUE_TEAMS_KEY = "auction-ace-league-teams";

export interface CachedTeam { id: number; name: string; abbrev?: string }

export function saveTeamsToCache(teams: CachedTeam[]) {
  try { localStorage.setItem(LEAGUE_TEAMS_KEY, JSON.stringify(teams)); } catch {}
}

export function loadTeamsFromCache(): CachedTeam[] {
  try {
    const raw = localStorage.getItem(LEAGUE_TEAMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
