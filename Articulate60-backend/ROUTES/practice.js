const express = require("express");
const multer = require("multer");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { randomUUID } = require("crypto");
const router = express.Router();

const authMiddleware = require("../middleware/auth");
const r2 = require("../config/r2");
const Recording = require("../MODELS/Recording");
const User = require("../MODELS/User");
const { calculateStreak } = require("../utils/streak");

// Keep the audio in memory just long enough to push it to R2 — never
// touches disk. 15MB cap guards against abuse; a 60-second recording
// is nowhere near this.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

// POST /api/practice/complete
// multipart/form-data fields: audio (file), topic, category, level,
// durationSeconds, wentWell, improveNextTime
router.post(
  "/complete",
  authMiddleware,
  upload.single("audio"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No audio file uploaded." });
      }

      const {
        topic,
        category,
        level,
        durationSeconds,
        wentWell,
        improveNextTime,
      } = req.body;

      if (!topic || !level || !durationSeconds) {
        return res
          .status(400)
          .json({ message: "topic, level, and durationSeconds are required." });
      }

      const key = `recordings/${req.userId}/${randomUUID()}.webm`;

      await r2.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: key,
          Body: req.file.buffer,
          ContentType: req.file.mimetype || "audio/webm",
        }),
      );

      // R2_PUBLIC_URL is your bucket's public base URL — either the
      // r2.dev subdomain Cloudflare gives you, or a custom domain
      // you've connected to the bucket. Set this in your .env.
      const audioUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

      const recording = await Recording.create({
        user: req.userId,
        topic,
        category: category || "",
        level: Number(level),
        durationSeconds: Number(durationSeconds),
        audioUrl,
        reflection: {
          wentWell: wentWell || "",
          improveNextTime: improveNextTime || "",
        },
      });

      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      const recordings = await Recording.find({ user: req.userId }).select(
        "createdAt",
      );
      const streak = calculateStreak(recordings);
      user.currentStreak = streak.current;
      user.longestStreak = streak.longest;
      user.lastPracticeDate = new Date();
      await user.save();

      res.status(201).json({
        recording,
        streak: {
          current: streak.current,
          longest: user.longestStreak,
        },
      });
    } catch (err) {
      console.error("Failed to save recording:", err);
      res.status(500).json({ message: "Failed to save recording." });
    }
  },
);

// GET /api/practice/recent?limit=1
// Powers the "Your Recent Activity" section on Home.
router.get("/recent", authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 5, 20);

    const recordings = await Recording.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json(recordings);
  } catch (err) {
    console.error("Failed to fetch recent activity:", err);
    res.status(500).json({ message: "Failed to fetch recent activity." });
  }
});

// GET /api/practice/recordings
// Full recording history for the signed-in user's profile.
router.get("/recordings", authMiddleware, async (req, res) => {
  try {
    const recordings = await Recording.find({ user: req.userId }).sort({
      createdAt: -1,
    });
    res.json(recordings);
  } catch (err) {
    console.error("Failed to fetch recordings:", err);
    res.status(500).json({ message: "Failed to fetch recordings." });
  }
});

// GET /api/practice/streak
// Powers the streak badge on Home.
router.get("/streak", authMiddleware, async (req, res) => {
  try {
    const recordings = await Recording.find({ user: req.userId }).select(
      "createdAt",
    );
    const streak = calculateStreak(recordings);
    res.json({
      current: streak.current,
      longest: streak.longest,
      needsPracticeToday: streak.needsPracticeToday,
    });
  } catch (err) {
    console.error("Failed to fetch streak:", err);
    res.status(500).json({ message: "Failed to fetch streak." });
  }
});

module.exports = router;
