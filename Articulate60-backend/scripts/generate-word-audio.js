/**
 * generate-word-audio.js
 *
 * Reads a word list (word + meaning), fetches a real pronunciation
 * audio URL from the Free Dictionary API where available, and falls
 * back to Google Cloud TTS (free tier: 1M chars/month) for any word
 * that has no dictionary audio.
 *
 * Output: words-with-audio.json — ready to bulk-import into MongoDB.
 *
 * SETUP:
 *   npm install node-fetch@2 @google-cloud/text-to-speech
 *   (Google Cloud TTS fallback is optional — only needed for words
 *   the Dictionary API doesn't cover. Skip that part if you don't
 *   want to set up a Google Cloud project.)
 *
 * USAGE:
 *   node generate-word-audio.js words.txt
 *
 * INPUT FORMAT (words.txt) — same format as your list, e.g.:
 *   1. Pragmatic
 *   Focused on practical solutions and results rather than theory or ideals.
 *   2. Ambivalent
 *   Having mixed or conflicting feelings about something.
 *   ...
 */

const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch"); // v2 for CommonJS require()

// ---- 1. Parse the raw word list into { word, meaning } objects ----
function parseWordList(rawText) {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const entries = [];
  let current = null;

  for (const line of lines) {
    const numberedMatch = line.match(/^(\d+)\.\s*(.+)$/);
    if (numberedMatch) {
      if (current) entries.push(current);
      current = { word: numberedMatch[2].trim(), meaning: "" };
    } else if (current) {
      // Meaning may wrap across lines; append with a space
      current.meaning = current.meaning ? `${current.meaning} ${line}` : line;
    }
  }
  if (current) entries.push(current);

  // De-duplicate by lowercased word, keep the first occurrence
  const seen = new Set();
  const deduped = [];
  for (const entry of entries) {
    const key = entry.word.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(entry);
    }
  }
  return deduped;
}

// ---- 2. Try the Free Dictionary API for a real recorded pronunciation ----
let dictionaryErrorLogged = false;
async function getDictionaryAudio(word) {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
    );
    if (!res.ok) {
      if (!dictionaryErrorLogged) {
        console.log(
          `\n  [debug] Dictionary API returned status ${res.status} for "${word}"`,
        );
        dictionaryErrorLogged = true;
      }
      return null;
    }
    const data = await res.json();
    for (const entry of data) {
      const withAudio = (entry.phonetics || []).find(
        (p) => p.audio && p.audio.length > 0,
      );
      if (withAudio) {
        // Some entries return protocol-relative URLs like "//ssl.gstatic.com/..."
        return withAudio.audio.startsWith("//")
          ? `https:${withAudio.audio}`
          : withAudio.audio;
      }
    }
    return null;
  } catch (err) {
    if (!dictionaryErrorLogged) {
      console.log(
        `\n  [debug] Dictionary API request failed for "${word}": ${err.message}`,
      );
      dictionaryErrorLogged = true;
    }
    return null;
  }
}

// ---- 3. Fallback: generate audio with Google Cloud TTS (free tier) ----
// Only runs for words with no dictionary audio. Comment this whole
// section out if you don't want to set up Google Cloud credentials —
// you'll just end up with `audioUrl: null` for uncovered words, which
// you can catch in the UI (e.g. hide the play button, or use the
// browser's built-in speechSynthesis as a live fallback instead).
let ttsClient = null;
async function getTtsAudioBuffer(word) {
  if (!ttsClient) {
    const textToSpeech = require("@google-cloud/text-to-speech");
    ttsClient = new textToSpeech.TextToSpeechClient();
  }
  const [response] = await ttsClient.synthesizeSpeech({
    input: { text: word },
    voice: { languageCode: "en-US", ssmlGender: "FEMALE" },
    audioConfig: { audioEncoding: "MP3", speakingRate: 0.9 },
  });
  return response.audioContent; // Buffer
}

// ---- 4. Main run ----
async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: node generate-word-audio.js <path-to-word-list.txt>");
    process.exit(1);
  }

  let rawText = fs.readFileSync(inputPath, "utf8");
  // Strip a leading BOM (common when .txt files are saved on Windows) —
  // without this, the very first numbered word gets silently skipped.
  rawText = rawText.replace(/^\uFEFF/, "");
  const entries = parseWordList(rawText);
  console.log(`Parsed ${entries.length} unique words.`);

  const outputDir = path.join(__dirname, "generated-audio");
  fs.mkdirSync(outputDir, { recursive: true });

  const results = [];
  let dictionaryHits = 0;
  let ttsFallbacks = 0;
  let misses = 0;

  for (let i = 0; i < entries.length; i++) {
    const { word, meaning } = entries[i];
    process.stdout.write(`[${i + 1}/${entries.length}] ${word} ... `);

    let audioUrl = await getDictionaryAudio(word);

    if (audioUrl) {
      dictionaryHits++;
      console.log("dictionary audio found");
    } else {
      // Fallback to TTS — remove this block if you're skipping Google Cloud setup
      try {
        const audioBuffer = await getTtsAudioBuffer(word);
        const filename = `${word.toLowerCase().replace(/[^a-z0-9]/g, "-")}.mp3`;
        fs.writeFileSync(path.join(outputDir, filename), audioBuffer);
        audioUrl = `/audio/${filename}`; // adjust to wherever you'll host these locally-generated files (S3, Cloudinary, or Express static route)
        ttsFallbacks++;
        console.log("generated via TTS");
      } catch (err) {
        misses++;
        console.log("no audio available (TTS not configured or failed)");
      }
    }

    results.push({ word, meaning, audioUrl: audioUrl || null });

    // Be polite to the free Dictionary API — small delay between requests
    await new Promise((r) => setTimeout(r, 150));
  }

  fs.writeFileSync(
    path.join(__dirname, "words-with-audio.json"),
    JSON.stringify(results, null, 2),
  );

  console.log("\n--- Done ---");
  console.log(`Dictionary audio: ${dictionaryHits}`);
  console.log(`TTS-generated:    ${ttsFallbacks}`);
  console.log(`No audio found:   ${misses}`);
  console.log("Output: words-with-audio.json");
  console.log("TTS files (if any): ./generated-audio/");
}

main();
