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
        isWordOfTheDay,
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
        isWordOfTheDay: isWordOfTheDay === "true",
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

// GET /api/practice/leaderboard
// Ranks all users with saved recordings by current streak, sessions, and
// total recorded speaking time.
router.get("/leaderboard", authMiddleware, async (_req, res) => {
  try {
    const statsByUser = await Recording.aggregate([
      {
        $group: {
          _id: {
            user: "$user",
            day: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
                timezone: "UTC",
              },
            },
          },
          sessions: { $sum: 1 },
          speakingTimeSeconds: { $sum: "$durationSeconds" },
        },
      },
      {
        $group: {
          _id: "$_id.user",
          sessions: { $sum: "$sessions" },
          speakingTimeSeconds: { $sum: "$speakingTimeSeconds" },
          practiceDays: { $push: "$_id.day" },
        },
      },
    ]);

    const users = await User.find({
      _id: { $in: statsByUser.map((stats) => stats._id) },
    })
      .select("username")
      .lean();
    const usernames = new Map(
      users.map((user) => [user._id.toString(), user.username]),
    );

    const entries = statsByUser
      .filter((stats) => usernames.has(stats._id.toString()))
      .map((stats) => {
        const streak = calculateStreak(
          stats.practiceDays.map((day) => ({ createdAt: new Date(day) })),
        ).current;

        return {
          userId: stats._id.toString(),
          username: usernames.get(stats._id.toString()),
          currentStreak: streak,
          sessions: stats.sessions,
          speakingTimeSeconds: stats.speakingTimeSeconds,
        };
      });

    const rankBy = (metric) =>
      [...entries]
        .sort(
          (left, right) =>
            right[metric] - left[metric] ||
            left.username.localeCompare(right.username),
        )
        .slice(0, 10)
        .map((entry) => ({
          userId: entry.userId,
          username: entry.username,
          displayValue:
            metric === "currentStreak"
              ? `${entry.currentStreak} day${entry.currentStreak === 1 ? "" : "s"}`
              : metric === "sessions"
                ? `${entry.sessions} session${entry.sessions === 1 ? "" : "s"}`
                : formatSpeakingTime(entry.speakingTimeSeconds),
        }));

    res.json({
      streak: rankBy("currentStreak"),
      sessions: rankBy("sessions"),
      speakingTime: rankBy("speakingTimeSeconds"),
    });
  } catch (err) {
    console.error("Failed to fetch leaderboard:", err);
    res.status(500).json({ message: "Failed to fetch leaderboard." });
  }
});

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

function formatSpeakingTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

module.exports = router;
