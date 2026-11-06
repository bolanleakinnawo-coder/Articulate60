// Web Push (VAPID). Free, no third-party account needed.
// Needs VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT in .env.
// Generate the keys once with:  npx web-push generate-vapid-keys
const webpush = require("web-push");
const User = require("../MODELS/User");

let configured = false;

function setupPush() {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn(
      "Push notifications are off: set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.",
    );
    return false;
  }
  webpush.setVapidDetails(
    VAPID_SUBJECT || "mailto:hello@loquiex.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
  );
  configured = true;
  return true;
}

function pushReady() {
  return configured;
}

// Sends one notification to every device the member allowed. Devices whose
// subscription has expired (404/410) are removed.
async function sendPushToUser(user, payload) {
  if (!configured || !user.pushSubscriptions?.length) return 0;
  const body = JSON.stringify(payload);
  const expired = [];
  let delivered = 0;

  await Promise.all(
    user.pushSubscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          body,
          { TTL: 6 * 60 * 60, urgency: "normal", topic: payload.tag },
        );
        delivered += 1;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          expired.push(sub.endpoint);
        } else {
          console.error("Push failed:", err.statusCode, err.body || err.message);
        }
      }
    }),
  );

  if (expired.length) {
    await User.updateOne(
      { _id: user._id },
      { $pull: { pushSubscriptions: { endpoint: { $in: expired } } } },
    );
  }
  return delivered;
}

module.exports = { setupPush, pushReady, sendPushToUser };
