// Streak notifications: Web Push subscriptions, notification switches and
// the reminder trigger.
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth");
const User = require("../MODELS/User");
const Recording = require("../MODELS/Recording");
const { getStreakStatus } = require("../utils/streak");
const { timeZoneFromRequest, resolveTimeZone } = require("../utils/timeZone");
const { pushReady, sendPushToUser } = require("../services/push");
const { noticeKindFor, pushPayloadFor } = require("../services/streakNotices");
const { runReminders } = require("../services/reminderJob");

function validSubscription(sub) {
  return (
    sub &&
    typeof sub.endpoint === "string" &&
    sub.endpoint.startsWith("https://") &&
    sub.endpoint.length < 1000 &&
    typeof sub.keys?.p256dh === "string" &&
    typeof sub.keys?.auth === "string"
  );
}

// GET /api/push/public-key — the VAPID key the browser subscribes with.
router.get("/public-key", (_req, res) => {
  res.json({
    enabled: pushReady(),
    publicKey: pushReady() ? process.env.VAPID_PUBLIC_KEY : null,
  });
});

// POST /api/push/subscribe  { subscription, timeZone }
router.post("/subscribe", authMiddleware, async (req, res) => {
  try {
    const { subscription } = req.body || {};
    if (!validSubscription(subscription)) {
      return res.status(400).json({ message: "Invalid push subscription." });
    }
    const entry = {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
      userAgent: String(req.get("user-agent") || "").slice(0, 200),
      createdAt: new Date(),
    };
    // A device belongs to whoever signed in on it last.
    await User.updateMany(
      { "pushSubscriptions.endpoint": entry.endpoint },
      { $pull: { pushSubscriptions: { endpoint: entry.endpoint } } },
    );
    const update = {
      $push: { pushSubscriptions: { $each: [entry], $slice: -10 } },
    };
    const zone = timeZoneFromRequest(req);
    if (zone) update.$set = { timeZone: zone };
    await User.updateOne({ _id: req.userId }, update);
    res.status(201).json({ subscribed: true });
  } catch (err) {
    console.error("Failed to save push subscription:", err);
    res.status(500).json({ message: "Couldn't turn on notifications." });
  }
});

// POST /api/push/unsubscribe  { endpoint }
router.post("/unsubscribe", authMiddleware, async (req, res) => {
  try {
    const { endpoint } = req.body || {};
    if (typeof endpoint !== "string") {
      return res.status(400).json({ message: "endpoint is required." });
    }
    await User.updateOne(
      { _id: req.userId },
      { $pull: { pushSubscriptions: { endpoint } } },
    );
    res.json({ subscribed: false });
  } catch (err) {
    console.error("Failed to remove push subscription:", err);
    res.status(500).json({ message: "Couldn't turn off notifications." });
  }
});

// GET /api/push/prefs and PUT /api/push/prefs { streakPopups, practiceNudges }
router.get("/prefs", authMiddleware, async (req, res) => {
  const user = await User.findById(req.userId).select("notificationPrefs");
  if (!user) return res.status(404).json({ message: "User not found." });
  res.json({
    streakPopups: user.notificationPrefs?.streakPopups !== false,
    practiceNudges: user.notificationPrefs?.practiceNudges !== false,
  });
});

router.put("/prefs", authMiddleware, async (req, res) => {
  try {
    const set = {};
    for (const key of ["streakPopups", "practiceNudges"]) {
      if (typeof req.body?.[key] === "boolean") {
        set[`notificationPrefs.${key}`] = req.body[key];
      }
    }
    const zone = timeZoneFromRequest(req);
    if (zone) set.timeZone = zone;
    await User.updateOne({ _id: req.userId }, { $set: set });
    res.json({ saved: true });
  } catch (err) {
    console.error("Failed to save notification settings:", err);
    res.status(500).json({ message: "Couldn't save your settings." });
  }
});

// POST /api/push/test — sends the member's current streak notice to their
// own devices, to check notifications work on a phone.
router.post("/test", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found." });
    if (!pushReady()) {
      return res
        .status(503)
        .json({ message: "Push isn't set up on the server." });
    }
    const zone = await resolveTimeZone(req, user);
    const recordings = await Recording.find({ user: user._id })
      .select("createdAt")
      .lean();
    const status = getStreakStatus(recordings, zone);
    const kind = noticeKindFor(status, {}) || "keep";
    const payload =
      status.state === "done"
        ? {
            title: `You've practised today. ${status.current}-day streak!`,
            body: "Notifications are working on this device.",
            url: "/app/home",
          }
        : pushPayloadFor(kind, status);
    const delivered = await sendPushToUser(user, {
      ...payload,
      kind,
      tag: "streak-test",
    });
    res.json({ delivered });
  } catch (err) {
    console.error("Test push failed:", err);
    res.status(500).json({ message: "Test notification failed." });
  }
});

// POST /api/push/run-reminders — for an external cron (every 15–30 min).
// Header: X-Cron-Secret: <CRON_SECRET>
router.post("/run-reminders", async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.get("x-cron-secret") !== secret) {
    return res.status(401).json({ message: "Not allowed." });
  }
  try {
    res.json(await runReminders());
  } catch (err) {
    console.error("Reminder run failed:", err);
    res.status(500).json({ message: "Reminder run failed." });
  }
});

module.exports = router;
