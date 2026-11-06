// Group practice: call connection settings and minutes used.
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth");
const User = require("../MODELS/User");
const { resolveTimeZone } = require("../utils/timeZone");
const { summarise } = require("../utils/groupUsage");

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

// GET /api/group/usage — this month's group minutes, day by day.
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

// Plans are set only by verified payments (ROUTES/billing.js). The old
// testing route POST /api/group/plan has been removed.

module.exports = router;
