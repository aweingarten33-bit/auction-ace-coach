// Parse "Should I bid on X?" / "bid on X at $40" / bare player name into
// { player, price } when possible.

const PRICE_RE = /(?:\$|\bat\s+\$?|for\s+\$?)\s*(\d{1,3})\b/i;
const STRIP_QUESTION = /\?+\s*$/;

const STOPWORDS = new Set([
  "should",
  "i",
  "bid",
  "on",
  "for",
  "at",
  "the",
  "a",
  "is",
  "going",
  "currently",
  "now",
  "right",
  "him",
  "her",
  "this",
  "that",
  "guy",
  "what",
  "do",
  "you",
  "think",
  "about",
  "of",
  "max",
  "max-bid",
  "maxbid",
  "price",
  "would",
  "could",
  "can",
  "any",
  "value",
  "worth",
  "buy",
]);

const BID_INTENT_RE =
  /\b(should\s+i\s+(?:bid|buy|grab|take|pay)|bid\s+on|max\s+bid|worth\s+\$?\d|pay\s+for|how\s+much\s+for)\b/i;

export interface BidQuery {
  player: string | null;
  price: number | null;
  /** True if the prompt clearly asks for a bid recommendation. */
  isBidIntent: boolean;
  /** True if intent is a bid recommendation but no price was found. */
  needsPrice: boolean;
}

/** Strip a leading honorific or trailing role/team junk from a token sequence. */
function isLikelyNameToken(t: string): boolean {
  if (!t) return false;
  if (STOPWORDS.has(t.toLowerCase())) return false;
  // Allow apostrophes, periods, hyphens (e.g. CeeDee, A.J., Smith-Schuster)
  return /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'.\-]*$/.test(t);
}

export function parseBidQuery(raw: string): BidQuery {
  const text = (raw || "").trim();
  if (!text) {
    return { player: null, price: null, isBidIntent: false, needsPrice: false };
  }

  const isBidIntent =
    BID_INTENT_RE.test(text) ||
    /^(?:bid|buy|grab|take|pay)\b/i.test(text);

  // Price: $40, at 40, for $40
  const priceMatch = text.match(PRICE_RE);
  const price = priceMatch ? Number(priceMatch[1]) : null;

  // Strip the price and trailing "?" so it doesn't leak into name parsing.
  let work = text.replace(PRICE_RE, " ").replace(STRIP_QUESTION, " ");

  // Common pivot: take everything after "bid on" / "buy" / "for" if present.
  const pivot = work.match(/\b(?:bid\s+on|buy|grab|take|pay\s+for|on)\s+(.+)$/i);
  if (pivot) work = pivot[1];

  // If no pivot and we have a bid intent, drop leading question words.
  work = work
    .replace(/^(?:should\s+i\s+\w+|what(?:'s|\s+is)|how\s+much|max\s+bid(?:\s+on)?)\s+/i, "")
    .replace(/[?.!,;:]+/g, " ")
    .trim();

  // Tokenize and keep the first run of name-like tokens.
  const tokens = work.split(/\s+/).filter(Boolean);
  const nameTokens: string[] = [];
  let started = false;
  for (const t of tokens) {
    if (isLikelyNameToken(t)) {
      nameTokens.push(t);
      started = true;
    } else if (started) {
      break;
    }
  }

  let player: string | null = null;
  if (nameTokens.length) {
    player = nameTokens
      .slice(0, 4) // first/middle/last/suffix
      .map((t) => t.replace(/^[a-z]/, (c) => c.toUpperCase()))
      .join(" ");
  } else if (!isBidIntent && tokens.length && tokens.every(isLikelyNameToken)) {
    // Bare input that looks like just a name — treat as player query.
    player = tokens.map((t) => t.replace(/^[a-z]/, (c) => c.toUpperCase())).join(" ");
  }

  // A bare 1-4-token name with no bid words should still count as a bid intent
  // when paired with the followup flow that asks for a price.
  const bareNameOnly =
    !isBidIntent &&
    !!player &&
    tokens.length <= 4 &&
    tokens.every(isLikelyNameToken);

  const finalIntent = isBidIntent || bareNameOnly;
  const needsPrice = finalIntent && !!player && price == null;

  return { player, price, isBidIntent: finalIntent, needsPrice };
}
