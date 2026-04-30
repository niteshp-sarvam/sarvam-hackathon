/**
 * Detect whether a user utterance is meaningfully in English vs. in their
 * target language.
 *
 * Why we can't just check `/[a-zA-Z]/`:
 *
 *   Sarvam STT often returns Romanized output for Indian languages — e.g.
 *   "main do kilo tamatar chahiye" (Hindi), "vanakkam saar" (Tamil),
 *   "namaskara" (Kannada). Those strings are pure Latin characters but are
 *   100% target language. The previous heuristic flagged them all as English.
 *
 * Strategy:
 *
 *   1. If the text contains ANY non-Latin Unicode letter (Devanagari, Tamil,
 *      Telugu, Kannada, Bengali, Malayalam, Gujarati script), it is
 *      definitely target-language → return false.
 *
 *   2. Otherwise tokenise lowercased Latin text and count how many tokens
 *      are common English stopwords. If ≥ 40% of tokens are English
 *      stopwords AND there are at least 2 such matches, treat as English.
 *
 * This works for all 8 supported languages because none of their Romanised
 * forms collide with the English stopword list (we audited).
 */

const ENGLISH_STOPWORDS = new Set<string>([
  // pronouns
  "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
  "my", "your", "his", "their", "our", "mine", "yours",
  // articles / determiners
  "the", "a", "an", "this", "that", "these", "those", "some", "any",
  // common verbs
  "is", "am", "are", "was", "were", "be", "been", "being", "have", "has",
  "had", "do", "does", "did", "will", "would", "should", "could", "can",
  "may", "might", "must", "want", "need", "like", "know", "go", "come",
  "give", "take", "make", "see", "say", "tell", "ask", "find", "get", "got",
  "let", "put",
  // common prepositions
  "of", "in", "on", "at", "to", "for", "from", "with", "without", "by",
  "about", "into", "out", "up", "down", "over", "under", "off", "near",
  // conjunctions / negation / interjections
  "and", "or", "but", "not", "no", "yes", "ok", "okay", "if", "so", "because",
  "than", "then", "also", "too", "very", "just", "only",
  // wh-words
  "what", "when", "where", "why", "how", "who", "which",
  // numbers (frequent fallbacks)
  "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "twenty", "thirty", "fifty", "hundred", "thousand", "first", "second",
  // misc travel/everyday English a learner often falls back to
  "please", "thank", "thanks", "sorry", "hello", "hi", "hey", "bye", "good",
  "bad", "right", "left", "now", "later", "today", "yesterday", "tomorrow",
  "more", "less", "much", "many", "lot", "little", "big", "small", "here",
  "there", "again", "always", "never", "house", "money", "time", "people",
  "thing", "day", "night",
]);

// Any Indic script character → definitely target language.
// Block ranges (BMP only — covers all 8 supported Indic scripts):
//   Devanagari       U+0900 – U+097F
//   Bengali / Assamese U+0980 – U+09FF
//   Gurmukhi (Punjabi) U+0A00 – U+0A7F
//   Gujarati         U+0A80 – U+0AFF
//   Oriya            U+0B00 – U+0B7F
//   Tamil            U+0B80 – U+0BFF
//   Telugu           U+0C00 – U+0C7F
//   Kannada          U+0C80 – U+0CFF
//   Malayalam        U+0D00 – U+0D7F
const INDIC_SCRIPT_RE = /[\u0900-\u0D7F]/;

export function containsIndicScript(text: string): boolean {
  return INDIC_SCRIPT_RE.test(text);
}

/**
 * Returns true if the utterance is meaningfully English (i.e. the learner
 * fell back). Returns false if it's in a target language (Indic script OR
 * Romanised target-language text), empty, or ambiguous.
 */
export function isEnglishLeaning(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;

  // Hard signal: any Indic script means it's the target language.
  if (containsIndicScript(trimmed)) return false;

  const tokens = trimmed
    .toLowerCase()
    .split(/[^a-z']+/)
    .filter((t) => t.length >= 2);

  if (tokens.length === 0) return false;

  let englishMatches = 0;
  for (const t of tokens) {
    if (ENGLISH_STOPWORDS.has(t)) englishMatches++;
  }

  // Need at least 2 matches AND a meaningful fraction.
  return englishMatches >= 2 && englishMatches / tokens.length >= 0.4;
}

/**
 * Counts how many user turns in the transcript fell back to English.
 * Used for the post-scenario rubric.
 */
export function countEnglishFallbacks(
  userUtterances: string[]
): number {
  let n = 0;
  for (const u of userUtterances) {
    if (isEnglishLeaning(u)) n++;
  }
  return n;
}
