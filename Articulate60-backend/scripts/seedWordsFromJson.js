// scripts/seedWordsFromJson.js
//
// Reads words.json directly (an array of { word, meaning } objects)
// and inserts them into MongoDB. Simpler and safer than parsing a
// .txt file — no numbering format to get wrong.
//
// USAGE:
//   node scripts/seedWordsFromJson.js scripts/words.json

const fs = require("fs");
const mongoose = require("mongoose");
const Word = require("../MODELS/Word"); // adjust path if needed

function parseTextWordList(rawText) {
  const entries = [];
  let current = null;

  for (const line of rawText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)) {
    const numberedMatch = line.match(/^\d+\.\s*(.+)$/);

    if (numberedMatch) {
      if (current) entries.push(current);
      current = { word: numberedMatch[1], meaning: "" };
    } else if (current) {
      current.meaning = current.meaning ? `${current.meaning} ${line}` : line;
    }
  }

  if (current) entries.push(current);
  return entries;
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: node seedWordsFromJson.js <path-to-words.json>");
    process.exit(1);
  }

  require("dotenv").config();
  const MONGO_URI =
    process.env.MONGO_URL ||
    process.env.MONGO_URI ||
    "mongodb://localhost:27017/articulate60";

  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const raw = fs.readFileSync(inputPath, "utf8");
  const entries = inputPath.toLowerCase().endsWith(".json")
    ? JSON.parse(raw)
    : parseTextWordList(raw);

  if (!Array.isArray(entries) || entries.length === 0) {
    console.error(
      "No entries found in the JSON file — aborting without touching the database.",
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`Loaded ${entries.length} words from JSON.`);

  await Word.deleteMany({});
  console.log("Cleared existing words collection.");

  const documents = entries.map((entry, index) => ({
    word: entry.word,
    meaning: entry.meaning,
    order: index,
  }));

  await Word.insertMany(documents);
  console.log(`Inserted ${documents.length} words into MongoDB.`);

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
