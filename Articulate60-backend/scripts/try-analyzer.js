// Test the analyzer on a local audio file, with no database, R2 or app needed.
//
//   node scripts/try-analyzer.js ./my-recording.webm "Describe your ideal weekend"
//   node scripts/try-analyzer.js ./my-recording.m4a --skip-ai     (Deepgram only)
//
// Use only your own practice recordings while Gemini is on the free tier.

const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { transcribeAudio } = require("../services/deepgram");
const { computeMetrics } = require("../utils/speechMetrics");
const { analyzeSpeech } = require("../services/analyzer");

const MIME = {
  ".webm": "audio/webm",
  ".m4a": "audio/mp4",
  ".mp4": "audio/mp4",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
};

(async () => {
  const args = process.argv.slice(2);
  const skipAi = args.includes("--skip-ai");
  const [file, topic = "Talk about anything you like"] = args.filter(
    (a) => !a.startsWith("--"),
  );

  if (!file) {
    console.log(
      'Usage: node scripts/try-analyzer.js <audio-file> ["topic"] [--skip-ai]',
    );
    process.exit(1);
  }

  const buffer = fs.readFileSync(file);
  const mime = MIME[path.extname(file).toLowerCase()] || "audio/webm";

  console.log("1) Transcribing with Deepgram...");
  const { transcript, words } = await transcribeAudio(buffer, mime);
  console.log("\nTRANSCRIPT:\n" + (transcript || "(nothing heard)"));

  const metrics = computeMetrics(words);
  console.log("\nMETRICS:\n" + JSON.stringify(metrics, null, 2));

  if (skipAi) return;
  if (metrics.wordCount < 10) {
    console.log(
      "\nToo little speech to analyse (under 10 words). Skipping Gemini.",
    );
    return;
  }

  console.log("\n2) Analysing with Gemini...");
  const analysis = await analyzeSpeech({
    transcript,
    topic,
    category: "",
    level: 1,
    metrics,
  });
  console.log("\nANALYSIS:\n" + JSON.stringify(analysis, null, 2));
})().catch((err) => {
  console.error("\nFailed:", err.message);
  process.exit(1);
});
