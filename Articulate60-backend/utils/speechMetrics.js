// Turns Deepgram's word timings into plain numbers (no AI involved).
// Pace, pauses and fillers are MEASURED here and passed on as evidence.
// This file does not judge them: whether a pace, a pause or a filler is a
// problem depends on the message and the task, and that judgement belongs to
// the Loquiex coach (see loquiex-guide.md), not to a fixed threshold.

const LIST_PAUSE_SECONDS = 1.0; // only decides which pauses are LISTED, not what is "bad"
const VERY_LONG_PAUSE_SECONDS = 2.0;
const MIN_SECONDS_FOR_PACE = 5;
const MAX_PAUSES_LISTED = 12;
const MAX_FILLERS_LISTED = 15;

const FILLER_TOKENS = new Set([
  "um",
  "umm",
  "uh",
  "uhh",
  "uhm",
  "er",
  "erm",
  "ah",
  "hmm",
  "mm",
  "mhm",
]);

// Phrases that are SOMETIMES fillers. We only report that they were used more
// than once; deciding whether each one was a filler in context is left to the coach.
const CANDIDATE_PHRASES = [
  "you know",
  "i mean",
  "kind of",
  "sort of",
  "basically",
  "actually",
  "literally",
  "honestly",
];

const STOPWORDS = new Set([
  "the",
  "and",
  "but",
  "for",
  "with",
  "that",
  "this",
  "have",
  "has",
  "had",
  "was",
  "were",
  "are",
  "you",
  "your",
  "they",
  "them",
  "their",
  "its",
  "it's",
  "from",
  "not",
  "can",
  "will",
  "would",
  "could",
  "should",
  "about",
  "there",
  "what",
  "when",
  "which",
  "who",
  "how",
  "why",
  "just",
  "also",
  "very",
  "really",
  "then",
  "than",
  "into",
  "out",
  "all",
  "get",
  "got",
  "like",
  "because",
  "been",
  "being",
  "i'm",
  "i've",
  "don't",
  "did",
  "does",
  "one",
  "some",
  "more",
  "much",
  "many",
  "our",
  "she",
  "his",
  "her",
  "him",
  "we're",
  "i'll",
  "that's",
  "let",
  "say",
  "said",
  "going",
  "way",
  "thing",
  "things",
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
    fillers: { total: 0, perMinute: 0, breakdown: {}, positions: [] },
    crutchPhrases: [],
    pauses: { long: 0, veryLong: 0, longestSeconds: 0, longest: [], all: [] },
    repetition: { immediateRepeats: 0, examples: [], frequentWords: [] },
    avgConfidence: null,
  };
}

function computeMetrics(words) {
  const tokens = (words || [])
    .map((w) => ({
      text: normalise(w.word),
      shown: String(w.punctuated_word || w.word || "").replace(
        /[.,!?;:]+$/g,
        "",
      ),
      start: Number(w.start),
      end: Number(w.end),
      confidence: Number(w.confidence),
    }))
    .filter(
      (t) => t.text && Number.isFinite(t.start) && Number.isFinite(t.end),
    );

  if (tokens.length === 0) return emptyMetrics();

  // The word(s) just before / after a position, so a pause or filler can be
  // located in the transcript without inventing anything.
  const before = (i) => tokens[i - 1]?.shown?.slice(0, 30) || "";
  const after = (i) => tokens[i + 1]?.shown?.slice(0, 30) || "";

  const speakingSeconds = Math.max(
    tokens[tokens.length - 1].end - tokens[0].start,
    0.001,
  );
  const minutes = speakingSeconds / 60;

  // ---- Pace: a measurement only (fillers are not counted as words) ----
  const realWords = tokens.filter((t) => !FILLER_TOKENS.has(t.text));
  const wordsPerMinute =
    speakingSeconds >= MIN_SECONDS_FOR_PACE
      ? Math.round(realWords.length / minutes)
      : null;

  // ---- Pauses (gaps between words), with surrounding words ----
  const gaps = [];
  for (let i = 1; i < tokens.length; i++) {
    const length = tokens[i].start - tokens[i - 1].end;
    if (length >= LIST_PAUSE_SECONDS) {
      gaps.push({
        atSecond: Math.round(tokens[i - 1].end),
        seconds: Math.round(length * 10) / 10,
        before: tokens[i - 1].shown.slice(0, 30),
        after: tokens[i].shown.slice(0, 30),
      });
    }
  }
  const bySize = [...gaps].sort((a, b) => b.seconds - a.seconds);
  const longest = bySize.slice(0, 5);
  const all = bySize
    .slice(0, MAX_PAUSES_LISTED)
    .sort((a, b) => a.atSecond - b.atSecond);

  // ---- Filler sounds, with positions ----
  const breakdown = {};
  const positions = [];
  let fillerTotal = 0;
  tokens.forEach((t, i) => {
    if (!FILLER_TOKENS.has(t.text)) return;
    breakdown[t.text] = (breakdown[t.text] || 0) + 1;
    fillerTotal += 1;
    if (positions.length < MAX_FILLERS_LISTED) {
      positions.push({
        word: t.text,
        atSecond: Math.round(t.start),
        before: before(i),
        after: after(i),
      });
    }
  });

  // ---- Phrases used more than once (candidates only) ----
  const joined = ` ${tokens.map((t) => t.text).join(" ")} `;
  const crutchPhrases = CANDIDATE_PHRASES.map((phrase) => ({
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
    if (
      t.text.length >= 3 &&
      !STOPWORDS.has(t.text) &&
      !FILLER_TOKENS.has(t.text)
    ) {
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
    // No verdict: "measured" simply means we have a number. Older saved reports
    // may still hold "slow" / "good" / "fast"; the screen ignores those now.
    paceLabel: wordsPerMinute === null ? "unknown" : "measured",
    paceNote:
      wordsPerMinute === null
        ? "Speak for a little longer so we can measure your pace."
        : `About ${wordsPerMinute} words per minute, measured from your recording.`,
    fillers: {
      total: fillerTotal,
      perMinute: Math.round((fillerTotal / minutes) * 10) / 10,
      breakdown,
      positions,
    },
    crutchPhrases,
    pauses: {
      long: gaps.filter((g) => g.seconds < VERY_LONG_PAUSE_SECONDS).length,
      veryLong: gaps.filter((g) => g.seconds >= VERY_LONG_PAUSE_SECONDS).length,
      longestSeconds: longest[0]?.seconds || 0,
      longest,
      all,
    },
    repetition: { immediateRepeats, examples, frequentWords },
    avgConfidence,
  };
}

module.exports = { computeMetrics };
