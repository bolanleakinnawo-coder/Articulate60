// Deletes a member's account and everything tied to it.
//
// Removed: the user row, recordings (and their audio files in R2), AI
// feedback (stored on the recordings), wins/testimonials, password reset
// links, push subscriptions (on the user row), waitlist and "notify me"
// sign-ups with the same email, and the profile photo in R2.
//
// Kept: Payment rows. They hold no personal details (no email or name), only
// the user id, amount and Paystack reference, and are needed for accounting,
// refunds and chargebacks. Plans are prepaid with no auto-renewal, so there
// is no Paystack subscription to cancel.
const { ListObjectsV2Command, DeleteObjectsCommand } = require("@aws-sdk/client-s3");
const r2 = require("../config/r2");
const User = require("../MODELS/User");
const Recording = require("../MODELS/Recording");
const Testimonial = require("../MODELS/Testimonial");
const Payment = require("../MODELS/Payment");
const PasswordReset = require("../MODELS/PasswordReset");
const WaitlistSignup = require("../MODELS/WaitlistSignup");
const LearnNotification = require("../MODELS/LearnNotification");
const { disconnectUser } = require("./realtime");

function r2KeyFromUrl(url) {
  const base = (process.env.R2_PUBLIC_URL || "").replace(/\/+$/, "");
  if (!url || !base || !url.startsWith(`${base}/`)) return null;
  return decodeURIComponent(url.slice(base.length + 1));
}

async function deleteR2Keys(keys) {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) return;
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    await r2.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
      }),
    );
  }
}

async function listR2Prefix(prefix) {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) return [];
  const keys = [];
  let token;
  do {
    const page = await r2.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }),
    );
    (page.Contents || []).forEach((o) => keys.push(o.Key));
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

// Files are removed after the database rows. If R2 is down the account is
// still gone; the leftover files are logged so they can be removed by hand.
async function deleteFiles(userId, fileKeys) {
  try {
    const underPrefix = await listR2Prefix(`recordings/${userId}/`);
    const all = [...new Set([...fileKeys, ...underPrefix])];
    await deleteR2Keys(all);
  } catch (err) {
    console.error(
      `Account ${userId} deleted, but some files could not be removed from R2:`,
      err.message,
      fileKeys,
    );
  }
}

async function deleteAccount(user) {
  const userId = String(user._id);

  const recordings = await Recording.find({ user: userId }).select("audioUrl").lean();
  const fileKeys = [
    ...recordings.map((r) => r2KeyFromUrl(r.audioUrl)),
    r2KeyFromUrl(user.profileImageUrl),
  ].filter(Boolean);

  // Pending checkouts can't be applied any more. If one is paid later, the
  // billing service flags it for a refund (see services/billing.js).
  await Payment.updateMany(
    { user: userId, status: "pending" },
    { $set: { status: "abandoned", flagReason: "account deleted" } },
  );

  await Promise.all([
    Recording.deleteMany({ user: userId }),
    Testimonial.deleteMany({ user: userId }),
    PasswordReset.deleteMany({ user: userId }),
    WaitlistSignup.deleteMany({ email: user.email }),
    LearnNotification.deleteMany({ email: user.email }),
  ]);
  // The user row goes last, so a failure above can simply be retried.
  await User.deleteOne({ _id: userId });

  // Sign out every open tab (also removes them from any group call).
  disconnectUser(userId, "account:deleted", {});

  // Don't make the member wait for file clean-up.
  setImmediate(() => deleteFiles(userId, fileKeys));

  return { recordings: recordings.length };
}

module.exports = { deleteAccount };
