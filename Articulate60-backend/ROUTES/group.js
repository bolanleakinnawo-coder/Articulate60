// Group practice: call connection settings and minutes used.
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth");
const User = require("../MODELS/User");
const { resolveTimeZone } = require("../utils/timeZone");
const { summarise } = require("../utils/groupUsage");
const crypto = require("crypto");
const ScheduledPractice = require("../MODELS/ScheduledPractice");
const { hasGroupPractice, limitsFor } = require("../utils/plans");
const {
  publicScheduled,
  isCodeLive,
  CODE_ALPHABET,
  CODE_LENGTH,
} = require("../services/groupRooms");

const PUBLIC_STUN = [
  { urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] },
];

// Optional relay (TURN) servers help members on strict mobile networks
// connect. Set ONE of these on the server:
//   CLOUDFLARE_TURN_KEY_ID + CLOUDFLARE_TURN_KEY_API_TOKEN  (Cloudflare Realtime TURN)
//   ICE_SERVERS = JSON array, e.g. from Metered or Twilio
//   TURN_URLS (comma separated) + TURN_USERNAME + TURN_CREDENTIAL
async function iceServers() {
  const keyId = process.env.CLOUDFLARE_TURN_KEY_ID;
  const token = process.env.CLOUDFLARE_TURN_KEY_API_TOKEN;
  if (keyId && token) {
    try {
      const res = await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ttl: 6 * 60 * 60 }),
        },
      );
      if (res.ok) {
        const body = await res.json();
        const list = Array.isArray(body.iceServers)
          ? body.iceServers
          : body.iceServers
            ? [body.iceServers]
            : [];
        if (list.length) return list;
      } else {
        console.error("Cloudflare TURN", res.status, await res.text());
      }
    } catch (err) {
      console.error("Cloudflare TURN", err.message);
    }
  }

  if (process.env.ICE_SERVERS) {
    try {
      const list = JSON.parse(process.env.ICE_SERVERS);
      if (Array.isArray(list) && list.length) return list;
    } catch {
      console.error("ICE_SERVERS is not valid JSON.");
    }
  }

  if (process.env.TURN_URLS && process.env.TURN_USERNAME) {
    return [
      ...PUBLIC_STUN,
      {
        urls: process.env.TURN_URLS.split(",").map((u) => u.trim()).filter(Boolean),
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_CREDENTIAL || "",
      },
    ];
  }

  return PUBLIC_STUN;
}

// GET /api/group/ice — servers the browser uses to connect calls.
router.get("/ice", authMiddleware, async (_req, res) => {
  res.json({ iceServers: await iceServers() });
});

// GET /api/group/usage — today's call time left (daily limit), plus the
// minutes used day by day.
router.get("/usage", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId, {
      plan: 1,
      planExpiresAt: 1,
      timeZone: 1,
      groupMinutes: 1,
    });
    if (!user) return res.status(404).json({ message: "User not found." });
    await resolveTimeZone(req, user);
    res.json(summarise(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load group minutes." });
  }
});

// ---- Practices planned for later ------------------------------------------
const MAX_PLANNED_PER_HOST = 10;
// Host-led topics are kept short (Sheriff, 2026-11-10).
const TOPIC_MAX = 60;
const MAX_DAYS_AHEAD = 30;
// A planned practice stays listed until 3 hours after its start time.
const LISTED_FOR_MS = 3 * 60 * 60 * 1000;

function clean(text, max) {
  return typeof text === "string" ? text.trim().slice(0, max) : "";
}

async function freeCode() {
  for (let tries = 0; tries < 20; tries += 1) {
    let code = "";
    for (const b of crypto.randomBytes(CODE_LENGTH))
      code += CODE_ALPHABET[b % CODE_ALPHABET.length];
    if (isCodeLive(code)) continue;
    const taken = await ScheduledPractice.exists({
      code,
      status: { $ne: "cancelled" },
    });
    if (!taken) return code;
  }
  throw new Error("Could not find a free code.");
}

function stillListed() {
  return {
    status: { $in: ["scheduled", "started"] },
    startsAt: { $gt: new Date(Date.now() - LISTED_FOR_MS) },
  };
}

// GET /api/group/scheduled — public upcoming practices + the member's own.
router.get("/scheduled", authMiddleware, async (req, res) => {
  try {
    const [publicDocs, mine] = await Promise.all([
      ScheduledPractice.find({ ...stillListed(), private: false })
        .sort({ startsAt: 1 })
        .limit(50)
        .lean(),
      ScheduledPractice.find({ ...stillListed(), host: req.userId })
        .sort({ startsAt: 1 })
        .lean(),
    ]);
    const toApp = (d) => publicScheduled(d, req.userId);
    res.json({
      upcoming: publicDocs.map(toApp),
      mine: mine.map(toApp),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load planned practices." });
  }
});

// POST /api/group/scheduled — plan a practice for later.
router.post("/scheduled", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId, {
      fullName: 1,
      username: 1,
      plan: 1,
      planExpiresAt: 1,
    });
    if (!user) return res.status(404).json({ message: "User not found." });
    if (!hasGroupPractice(user))
      return res.status(403).json({
        message: "Group practice comes with Loquiex Flourish and Infinity.",
        code: "no-plan",
      });

    const body = req.body || {};
    const startsAt = new Date(body.startsAt);
    const now = Date.now();
    if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() < now + 60000)
      return res
        .status(400)
        .json({ message: "Pick a date and time in the future." });
    if (startsAt.getTime() > now + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000)
      return res.status(400).json({
        message: `You can plan up to ${MAX_DAYS_AHEAD} days ahead.`,
      });

    const mode = body.mode === "host" ? "host" : "guided";
    const topic = mode === "host" ? clean(body.topic, TOPIC_MAX) : "";
    if (mode === "host" && !topic)
      return res
        .status(400)
        .json({ message: "Type the topic you'd like to discuss." });

    const planned = await ScheduledPractice.countDocuments({
      host: req.userId,
      status: "scheduled",
      startsAt: { $gt: new Date() },
    });
    if (planned >= MAX_PLANNED_PER_HOST)
      return res.status(400).json({
        message: `You already have ${MAX_PLANNED_PER_HOST} practices planned.`,
      });

    // "unlimited" (saved as 0) only for plans with unlimited seats.
    const wantsUnlimited = body.max === "unlimited" || Number(body.max) === 0;
    if (wantsUnlimited && !limitsFor(user).unlimitedSeats)
      return res.status(403).json({
        message: "Unlimited seats come with Loquiex Infinity.",
        code: "no-unlimited",
      });
    const max = wantsUnlimited
      ? 0
      : Math.min(6, Math.max(2, Math.floor(Number(body.max)) || 4));
    const doc = await ScheduledPractice.create({
      host: req.userId,
      hostName: user.fullName || user.username || "Member",
      mode,
      topic,
      categoryId: clean(body.categoryId, 60),
      categoryTitle: clean(body.categoryTitle, 80),
      prompt: clean(body.prompt, 500),
      private: body.private === true,
      max,
      code: await freeCode(),
      startsAt,
    });
    res.status(201).json({ scheduled: publicScheduled(doc, req.userId) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not plan the practice." });
  }
});

// POST /api/group/scheduled/:id/remind  { on: true|false }
router.post("/scheduled/:id/remind", authMiddleware, async (req, res) => {
  try {
    const on = req.body?.on !== false;
    const doc = await ScheduledPractice.findOneAndUpdate(
      { _id: req.params.id, ...stillListed() },
      on
        ? { $addToSet: { reminders: req.userId } }
        : { $pull: { reminders: req.userId } },
      { new: true },
    ).lean();
    if (!doc)
      return res.status(404).json({ message: "This practice has ended." });
    res.json({ scheduled: publicScheduled(doc, req.userId) });
  } catch (err) {
    if (err.name === "CastError")
      return res.status(404).json({ message: "Practice not found." });
    console.error(err);
    res.status(500).json({ message: "Could not save your reminder." });
  }
});

// DELETE /api/group/scheduled/:id — the host cancels a planned practice.
router.delete("/scheduled/:id", authMiddleware, async (req, res) => {
  try {
    const doc = await ScheduledPractice.findOneAndUpdate(
      { _id: req.params.id, host: req.userId, status: { $ne: "cancelled" } },
      { $set: { status: "cancelled" } },
    );
    if (!doc) return res.status(404).json({ message: "Practice not found." });
    res.json({ ok: true });
  } catch (err) {
    if (err.name === "CastError")
      return res.status(404).json({ message: "Practice not found." });
    console.error(err);
    res.status(500).json({ message: "Could not cancel the practice." });
  }
});

// Plans are set only by verified payments (ROUTES/billing.js). The old
// testing route POST /api/group/plan has been removed.

module.exports = router;
