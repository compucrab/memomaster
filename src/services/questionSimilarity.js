const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how",
  "in", "is", "it", "of", "on", "or", "that", "the", "this", "to", "was",
  "what", "when", "where", "which", "who", "why", "with",
]);

export function normalizeQuestion(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/!\\[[^\\]]*\\]\\([^)]*\\)/g, " ")
    .replace(/\\[([^\\]]+)\\]\\([^)]*\\)/g, "$1")
    .replace(/[\x60*_>#~]/g, " ")
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .replace(/[^\\p{L}\\p{N}]+/gu, " ")
    .trim()
    .replace(/\\s+/g, " ");
}

function meaningfulTokens(value) {
  return normalizeQuestion(value).split(" ").filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function tokenSimilarity(left, right) {
  const a = meaningfulTokens(left);
  const b = meaningfulTokens(right);
  if (!a.length || !b.length) return 0;
  let prior = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(current[j - 1] + 1, prior[j] + 1, prior[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prior = current;
  }
  return 1 - prior[b.length] / Math.max(a.length, b.length);
}

function bigramDice(left, right) {
  const pairs = (words) => {
    const result = new Set();
    for (let i = 0; i < words.length - 1; i += 1) result.add(words[i] + " " + words[i + 1]);
    return result;
  };
  const a = pairs(meaningfulTokens(left));
  const b = pairs(meaningfulTokens(right));
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const pair of a) if (b.has(pair)) shared += 1;
  return (2 * shared) / (a.size + b.size);
}

export function findSimilarQuestion(question, cards = [], excludeId = null) {
  const normalized = normalizeQuestion(question);
  const words = meaningfulTokens(question);
  if (!normalized || words.length < 4) return null;
  let best = null;
  for (const card of cards) {
    if (card.id === excludeId) continue;
    const existing = normalizeQuestion(card.front);
    if (!existing) continue;
    if (existing === normalized) return { card, score: 1, exact: true };
    const existingWords = meaningfulTokens(card.front);
    if (Math.min(words.length, existingWords.length) < 4) continue;
    const shared = new Set(words.filter((word) => existingWords.includes(word)));
    if (shared.size < 4) continue;
    const sequence = tokenSimilarity(question, card.front);
    const phrase = bigramDice(question, card.front);
    const score = Math.max(sequence, phrase * 0.96);
    if (score >= 0.86 && (!best || score > best.score)) best = { card, score, exact: false };
  }
  return best;
}
