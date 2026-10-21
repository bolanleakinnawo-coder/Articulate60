// Turns Deepgram's word timings into plain numbers (no AI involved).
// Pace, pauses and fillers are measured here, not guessed by Gemini.

const LONG_PAUSE_SECONDS = 1.0;
const VERY_LONG_PAUSE_SECONDS = 2.0;
const SLOW_WPM = 110; // adjust these two to taste
const FAST_WPM = 170;
const MIN_SECONDS_FOR_PACE = 5;

const FILLER_TOKENS = new Set([
  "um", "umm", "uh", "uhh", "uhm", "er", "erm", "ah", "hmm", "mm", "mhm",
]);

const CRUTCH_PHRASES = [
  "you know", "i mean", "kind of", "sort of",
  "basically", "actually", "literally", "honestly",
];

const STOPWORDS = new Set([
  "the", "and", "but", "for", "with", "that", "this", "have", "has", "had",
  "was", "were", "are", "you", "your", "they", "them", "their", "its", "it's",
  "from", "not", "can", "will", "would", "could", "should", "about", "there",
  "what", "when", "which", "who", "how", "why", "just", "also", "very",
  "really", "then", "than", "into", "out", "all", "get", "got", "like",
  "because", "been", "being", "i'm", "i've", "don't", "did", "does", "one",
  "some", "more", "much", "many", "our", "she", "his", "her", "him", "we're",
  "i'll", "that's", "let", "say", "said", "going", "way", "thing", "things",
]);

function normalise(word) {
  return String(word || "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9']/g, "");
}

function emptyMetrics() {
  return {
    wordCount: 0,
    speakingSeconds: 0,
    wordsPerMinute: null,
    paceLabel: "unknown",
    paceNote: "We couldn't measure your pace because no speech was detected.",
    fillers: { total: 0, perMinute: 0, breakdown: {} },
    crutchPhrases: [],
    pauses: { long: 0, veryLong: 0, longestSeconds: 0, longest: [] },
    repetition: { immediateRepeats: 0, examples: [], frequentWords: [] },
    avgConfidence: null,
  };
}

function computeMetrics(words) {
  const tokens = (words || [])
    .map((w) => ({
      text: normalise(w.word),
      start: Number(w.start),
      end: Number(w.end),
      confidence: Number(w.confidence),
    }))
    .filter((t) => t.text && Number.isFinite(t.start) && Number.isFinite(t.end));

  if (tokens.length === 0) return emptyMetrics();

  const speakingSeconds = Math.max(
    tokens[tokens.length - 1].end - tokens[0].start,
    0.001,
  );
  const minutes = speakingSeconds / 60;

  // ---- Pace (fillers don't count as "words" for pace) ----
  const realWords = tokens.filter((t) => !FILLER_TOKENS.has(t.text));
  const wordsPerMinute =
    speakingSeconds >= MIN_SECONDS_FOR_PACE
      ? Math.round(realWords.length / minutes)
      : null;

  let paceLabel = "unknown";
  let paceNote = "Speak for a little longer so we can measure your pace.";
  if (wordsPerMinute !== null) {
    if (wordsPerMinute < SLOW_WPM) {
      paceLabel = "slow";
      paceNote = `About ${wordsPerMinute} words per minute, on the slower side. Try adding a little more energy.`;
    } else if (wordsPerMinute > FAST_WPM) {
      paceLabel = "fast";
      paceNote = `About ${wordsPerMinute} words per minute, quite fast. A short pause after key points helps listeners keep up.`;
    } else {
      paceLabel = "good";
      paceNote = `About ${wordsPerMinute} words per minute, a comfortable pace that's easy to follow.`;
    }
  }

  // ---- Pauses (gaps between words) ----
  const gaps = [];
  for (let i = 1; i < tokens.length; i++) {
    const length = tokens[i].start - tokens[i - 1].end;
    if (length >= LONG_PAUSE_SECONDS) {
      gaps.push({
        atSecond: Math.round(tokens[i - 1].end),
        seconds: Math.round(length * 10) / 10,
      });
    }
  }
  const longest = [...gaps].sort((a, b) => b.seconds - a.seconds).slice(0, 5);

  // ---- Fillers ----
  const breakdown = {};
  let fillerTotal = 0;
  for (const t of tokens) {
    if (FILLER_TOKENS.has(t.text)) {
      breakdown[t.text] = (breakdown[t.text] || 0) + 1;
      fillerTotal += 1;
    }
  }

  // ---- Crutch phrases ----
  const joined = ` ${tokens.map((t) => t.text).join(" ")} `;
  const crutchPhrases = CRUTCH_PHRASES.map((phrase) => ({
    phrase,
    count: joined.split(` ${phrase} `).length - 1,
  }))
    .filter((c) => c.count >= 2)
    .sort((a, b) => b.count - a.count);

  // ---- Repetition ----
  const examples = [];
  let immediateRepeats = 0;
  for (let i = 1; i < tokens.length; i++) {
    if (
      tokens[i].text === tokens[i - 1].text &&
      !FILLER_TOKENS.has(tokens[i].text)
    ) {
      immediateRepeats += 1;
      if (examples.length < 5) {
        examples.push(`${tokens[i].text} ${tokens[i].text}`);
      }
    }
  }

  const counts = {};
  for (const t of tokens) {
    if (t.text.length >= 3 && !STOPWORDS.has(t.text) && !FILLER_TOKENS.has(t.text)) {
      counts[t.text] = (counts[t.text] || 0) + 1;
    }
  }
  const frequentWords = Object.entries(counts)
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word, count]) => ({ word, count }));

  // ---- Audio clarity hint ----
  const confidences = tokens.map((t) => t.confidence).filter(Number.isFinite);
  const avgConfidence = confidences.length
    ? Math.round(
        (confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100,
      ) / 100
    : null;

  return {
    wordCount: realWords.length,
    speakingSeconds: Math.round(speakingSeconds),
    wordsPerMinute,
    paceLabel,
    paceNote,
    fillers: {
      total: fillerTotal,
      perMinute: Math.round((fillerTotal / minutes) * 10) / 10,
      breakdown,
    },
    crutchPhrases,
    pauses: {
      long: gaps.filter((g) => g.seconds < VERY_LONG_PAUSE_SECONDS).length,
      veryLong: gaps.filter((g) => g.seconds >= VERY_LONG_PAUSE_SECONDS).length,
      longestSeconds: longest[0]?.seconds || 0,
      longest,
    },
    repetition: { immediateRepeats, examples, frequentWords },
    avgConfidence,
  };
}

module.exports = { computeMetrics };