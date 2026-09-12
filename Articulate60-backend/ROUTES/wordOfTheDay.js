// routes/wordOfTheDay.js
//
// Add this route to your Express app. It picks the same word for
// everyone on a given day, and automatically moves to the next word
// at midnight server time, cycling back to the start after it runs
// through the whole list.

const express = require("express");
const router = express.Router();
const Word = require("../MODELS/Word"); // adjust path if needed

router.get("/api/word-of-the-day", async (req, res) => {
  try {
    const totalWords = await Word.countDocuments();
    if (totalWords === 0) {
      return res
        .status(404)
        .json({ error: "No words found. Did you run the seed script?" });
    }

    const startDate = new Date("2026-09-12"); // today — word #1 (Pragmatic) shows today, then rotates forward daily
    const today = new Date();
    const daysSinceStart = Math.floor(
      (today - startDate) / (1000 * 60 * 60 * 24),
    );
    const index = ((daysSinceStart % totalWords) + totalWords) % totalWords; // safe against negative values

    const word = await Word.findOne({ order: index });
    if (!word) {
      return res
        .status(404)
        .json({ error: "Word not found for today's index." });
    }

    res.json({ word: word.word, meaning: word.meaning });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Something went wrong fetching the word of the day." });
  }
});

module.exports = router;

// In your main server file (e.g. app.js or server.js), wire this up with:
//   const wordOfTheDayRoute = require('./ROUTES/wordOfTheDay');
//   app.use(wordOfTheDayRoute);
