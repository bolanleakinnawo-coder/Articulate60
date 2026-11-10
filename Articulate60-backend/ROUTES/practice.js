const express = require("express");
const multer = require("multer");
const { PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");
const { randomUUID } = require("crypto");
const {
  isPaid,
  isOnAiTrial,
  canUseAiFeedback,
  aiDailyLimit,
  aiTrialEndsAt,
  planIdOf,
} = require("../utils/plans");
const router = express.Router();

const authMiddleware = require("../middleware/auth");
const r2 = require("../config/r2");
const Recording = require("../MODELS/Recording");
const User = require("../MODELS/User");
const {
  calculateStreak,
  getStreakStatus,
  localDayNumber,
  localDayStart,
} = require("../utils/streak");
const { resolveTimeZone } = require("../utils/timeZone");
const { emitToUser } = require("../services/realtime");
const { transcribeAudio } = require("../services/deepgram");
const { computeMetrics } = require("../utils/speechMetrics");
const { analyzeSpeech, isBusy } = require("../services/analyzer");

// Keep the audio in memory just long enough to push it to R2 — never
// touches disk. 15MB cap guards against abuse; a 2-minute recording
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

      const zone = await resolveTimeZone(req, user);
      const recordings = await Recording.find({ user: req.userId }).select(
        "createdAt",
      );
      const streak = getStreakStatus(recordings, zone);
      user.currentStreak = streak.current;
      user.longestStreak = streak.longest;
      user.lastPracticeDate = new Date();
      await user.save();

      // Other open tabs/devices update their streak straight away.
      emitToUser(req.userId, "streak:status", streak);

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
// total recorded speaking time (highest first; shown as hours, minutes, seconds).
// The leaderboard reads every recording, so it is worked out at most once
// every LEADERBOARD_TTL_MS and shared by everyone in between (it is loaded on
// every Home visit). Same answer for every member.
const LEADERBOARD_TTL_MS = 5 * 60 * 1000;
let leaderboardCache = { at: 0, data: null, pending: null };

router.get("/leaderboard", authMiddleware, async (_req, res) => {
  try {
    if (leaderboardCache.data && Date.now() - leaderboardCache.at < LEADERBOARD_TTL_MS) {
      return res.json(leaderboardCache.data);
    }
    if (!leaderboardCache.pending) {
      leaderboardCache.pending = buildLeaderboard()
        .then((data) => {
          leaderboardCache = { at: Date.now(), data, pending: null };
          return data;
        })
        .catch((err) => {
          leaderboardCache.pending = null;
          throw err;
        });
    }
    res.json(await leaderboardCache.pending);
  } catch (err) {
    console.error("Failed to fetch leaderboard:", err);
    if (leaderboardCache.data) return res.json(leaderboardCache.data);
    res.status(500).json({ message: "Failed to fetch leaderboard." });
  }
});

async function buildLeaderboard() {
  {
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
          lastActive: { $max: "$createdAt" },
        },
      },
      {
        $group: {
          _id: "$_id.user",
          sessions: { $sum: "$sessions" },
          speakingTimeSeconds: { $sum: "$speakingTimeSeconds" },
          practiceDays: { $push: "$_id.day" },
          lastActive: { $max: "$lastActive" },
        },
      },
    ]);

    const users = await User.find({
      _id: { $in: statsByUser.map((stats) => stats._id) },
    })
      .select("username profileImageUrl")
      .lean();
    const usersById = new Map(
      users.map((user) => [
        user._id.toString(),
        { username: user.username, profileImageUrl: user.profileImageUrl },
      ]),
    );

    const entries = statsByUser
      .filter((stats) => usersById.has(stats._id.toString()))
      .map((stats) => {
        // Days were grouped in UTC above, so count them in UTC too.
        const streak = calculateStreak(
          stats.practiceDays.map((day) => ({ createdAt: new Date(day) })),
          new Date(),
          "UTC",
        ).current;
        const user = usersById.get(stats._id.toString());

        return {
          userId: stats._id.toString(),
          username: user.username,
          profileImageUrl: user.profileImageUrl,
          currentStreak: streak,
          sessions: stats.sessions,
          speakingTimeSeconds: stats.speakingTimeSeconds,
          lastActive: stats.lastActive,
        };
      });

    const rankBy = (metric) =>
      [...entries]
        .sort(
          (left, right) =>
            right[metric] - left[metric] ||
            left.username.localeCompare(right.username),
        )
        .slice(0, 5)
        .map((entry) => ({
          userId: entry.userId,
          username: entry.username,
          profileImageUrl: entry.profileImageUrl,
          currentStreak: entry.currentStreak,
          speakingTimeSeconds: entry.speakingTimeSeconds,
          speakingTimeDisplay: formatSpeakingTime(entry.speakingTimeSeconds),
          lastActive: entry.lastActive,
          displayValue:
            metric === "currentStreak"
              ? `${entry.currentStreak} day${entry.currentStreak === 1 ? "" : "s"}`
              : metric === "sessions"
                ? `${entry.sessions} session${entry.sessions === 1 ? "" : "s"}`
                : formatSpeakingTime(entry.speakingTimeSeconds),
        }));

    return {
      streak: rankBy("currentStreak"),
      sessions: rankBy("sessions"),
      speakingTime: rankBy("speakingTimeSeconds"),
    };
  }
}

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
// Powers the streak badge and streak cards on Home. Worked out in the
// member's own time zone (sent by the app in the X-Time-Zone header).
// Returns { current, longest, needsPracticeToday, state, restoreDeadline,
// restoreMsLeft, daysSincePractice, lastPracticeDay, today, timeZone }.
router.get("/streak", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("timeZone");
    const zone = await resolveTimeZone(req, user);
    const recordings = await Recording.find({ user: req.userId }).select(
      "createdAt",
    );
    res.json(getStreakStatus(recordings, zone));
  } catch (err) {
    console.error("Failed to fetch streak:", err);
    res.status(500).json({ message: "Failed to fetch streak." });
  }
});

// POST /api/practice/recordings/:id/analyze
// Runs Deepgram (transcript + timings) then Gemini (feedback) on a saved
// recording. Paid plans (a verified payment covering today), or Free members
// in their first 3 days (up to 3 a day), unless ANALYZER_FOR_ALL=true (testing).
// Safe to call twice: finished results are returned without re-running.
const analyzeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20, // analyses per user per hour
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.userId),
  message: { message: "Too many analyses. Please try again later." },
});

const MIN_WORDS_TO_ANALYZE = 10;

function r2KeyFromUrl(audioUrl) {
  const base = `${process.env.R2_PUBLIC_URL}/`;
  if (audioUrl.startsWith(base))
    return decodeURIComponent(audioUrl.slice(base.length));
  return decodeURIComponent(new URL(audioUrl).pathname.replace(/^\//, ""));
}

// AI feedback sessions finished today, in the member's own calendar day.
// With `excludeId`, analyses still running on other recordings count too, so
// tapping "Get feedback" on several recordings at once can't pass the cap.
async function aiUsedToday(req, user, excludeId = null) {
  const zone = await resolveTimeZone(req, user);
  const today = localDayNumber(new Date(), zone);
  const dayStart = new Date(localDayStart(today, zone));
  const done = await Recording.countDocuments({
    user: user._id,
    analysisStatus: "done",
    analyzedAt: { $gte: dayStart },
  });
  const running = excludeId
    ? await Recording.countDocuments({
        user: user._id,
        _id: { $ne: excludeId },
        analysisStatus: "processing",
        updatedAt: { $gte: new Date(Date.now() - 3 * 60 * 1000) },
      })
    : 0;
  const used = done + running;
  return { used, resetsAt: new Date(localDayStart(today + 1, zone)) };
}

// GET /api/practice/ai-allowance
// What the Solo tab shows next to "Your level":
//   state "paid"   -> a paid plan (limit null = unlimited)
//   state "trial"  -> free member inside the 3-day trial
//   state "locked" -> free member whose trial has ended (no AI feedback)
router.get("/ai-allowance", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select(
      "plan planExpiresAt createdAt timeZone",
    );
    if (!user) return res.status(404).json({ message: "User not found." });

    const now = new Date();
    const planId = planIdOf(user, now);
    const paid = planId !== "free";
    const onTrial = !paid && isOnAiTrial(user, now);
    const limit = aiDailyLimit(user, now);
    const { used, resetsAt } =
      paid || onTrial ? await aiUsedToday(req, user) : { used: 0, resetsAt: null };
    const trialEnds = paid ? null : aiTrialEndsAt(user);

    res.json({
      state: paid ? "paid" : onTrial ? "trial" : "locked",
      planId,
      limit,
      used,
      left: limit === null ? null : Math.max(0, limit - used),
      resetsAt,
      trialEndsAt: trialEnds,
      trialDaysLeft: onTrial
        ? Math.max(1, Math.ceil((trialEnds.getTime() - now.getTime()) / 86400000))
        : 0,
    });
  } catch (err) {
    console.error("AI allowance failed:", err.message);
    res.status(500).json({ message: "Couldn't load your AI feedback allowance." });
  }
});

router.post(
  "/recordings/:id/analyze",
  authMiddleware,
  analyzeLimiter,
  async (req, res) => {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid recording id." });
    }

    let recording;
    try {
      // Only the owner can analyze their own recording.
      recording = await Recording.findOne({ _id: id, user: req.userId });
      if (!recording) {
        return res.status(404).json({ message: "Recording not found." });
      }

      const user = await User.findById(req.userId).select(
        "plan planExpiresAt createdAt timeZone",
      );

      // Finished results can always be read again.
      if (recording.analysisStatus === "done" && recording.analysis) {
        return res.json({
          transcript: recording.transcript,
          metrics: recording.metrics,
          analysis: recording.analysis,
        });
      }

      const testingForAll = process.env.ANALYZER_FOR_ALL === "true";
      if (!testingForAll && !(user && canUseAiFeedback(user))) {
        return res.status(403).json({
          code: "UPGRADE_REQUIRED",
          message:
            "Your free AI feedback trial has ended. Upgrade to Loquiex Bloom or higher to get AI feedback.",
        });
      }

      // Daily allowance (the member's own calendar day): the free trial's
      // 3 a day, or the paid plan's cap (Bloom 5, Flourish 12, Infinity none).
      const dailyLimit = aiDailyLimit(user);
      if (!testingForAll && dailyLimit !== null) {
        const { used } = await aiUsedToday(req, user, recording._id);
        if (used >= dailyLimit) {
          if (!isPaid(user)) {
            return res.status(403).json({
              code: "UPGRADE_REQUIRED",
              reason: "TRIAL_DAILY_LIMIT",
              message: `You've used today's ${dailyLimit} free AI feedback sessions. Come back tomorrow, or get Bloom for 5 a day.`,
            });
          }
          return res.status(429).json({
            code: "DAILY_LIMIT",
            message: `You've used today's ${dailyLimit} AI feedback sessions. Your recording is saved, and you can get feedback on it tomorrow from Profile.`,
          });
        }
      }

      const STALE_MS = 3 * 60 * 1000;
      if (
        recording.analysisStatus === "processing" &&
        Date.now() - new Date(recording.updatedAt).getTime() < STALE_MS
      ) {
        return res
          .status(409)
          .json({ message: "Analysis already in progress." });
      }

      recording.analysisStatus = "processing";
      recording.analysisError = "";
      await recording.save();

      // 1) Get the audio back from R2
      const object = await r2.send(
        new GetObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: r2KeyFromUrl(recording.audioUrl),
        }),
      );
      const audio = Buffer.from(await object.Body.transformToByteArray());

      // 2) Transcribe + measure
      const { transcript, words } = await transcribeAudio(
        audio,
        object.ContentType || "audio/webm",
      );
      const metrics = computeMetrics(words);

      if (metrics.wordCount < MIN_WORDS_TO_ANALYZE) {
        recording.analysisStatus = "failed";
        recording.analysisError = "too_short";
        recording.transcript = transcript;
        recording.metrics = metrics;
        await recording.save();
        return res.status(422).json({
          code: "TOO_SHORT",
          message:
            "We couldn't hear enough speech to give feedback. Try again a little closer to your mic.",
        });
      }

      // 3) AI feedback (text only)
      const analysis = await analyzeSpeech({
        transcript,
        topic: recording.topic,
        category: recording.category,
        level: recording.level,
        metrics,
      });

      recording.transcript = transcript;
      recording.metrics = metrics;
      recording.analysis = analysis;
      recording.analysisStatus = "done";
      recording.analyzedAt = new Date();
      await recording.save();

      res.json({ transcript, metrics, analysis });
    } catch (err) {
      // Log the reason, but never the transcript or audio.
      console.error("Analysis failed:", err.message);
      if (recording) {
        recording.analysisStatus = "failed";
        recording.analysisError = String(err.message).slice(0, 200);
        await recording.save().catch(() => {});
      }
      if (isBusy(err)) {
        return res.status(503).json({
          code: "AI_BUSY",
          message:
            "Our AI coach is very busy right now. Your recording is saved, so please try again in a minute.",
        });
      }
      res.status(502).json({
        message:
          "We couldn't analyse this recording right now. Please try again.",
      });
    }
  },
);

// Hours, minutes and seconds, e.g. "1h 04m 09s", "12m 30s", "45s".
function formatSpeakingTime(totalSeconds) {
  const total = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n) => String(n).padStart(2, "0");

  if (hours > 0) return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
  if (minutes > 0) return `${minutes}m ${pad(seconds)}s`;
  return `${seconds}s`;
}

module.exports = router;
