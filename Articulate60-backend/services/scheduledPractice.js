// Planned group practices: reminders shortly before they start.
//
// Every minute, practices starting within the next REMIND_BEFORE_MIN minutes
// get one reminder: a phone notification (when push is set up) and an
// in-app message to any open tab. It goes to the host and to everyone who
// tapped "Remind me". Each practice is claimed with one atomic write, so it
// is never reminded twice.
const ScheduledPractice = require("../MODELS/ScheduledPractice");
const User = require("../MODELS/User");
const { pushReady, sendPushToUser } = require("./push");
const { emitToUser } = require("./realtime");

// Sheriff (2026-11-10): remind 5 minutes before.
const REMIND_BEFORE_MIN = 5;
const RUN_EVERY_MS = 60 * 1000;

function titleOf(doc) {
  return doc.mode === "host" ? doc.topic : doc.prompt || doc.categoryTitle;
}

async function remindDue(now = new Date()) {
  const soon = new Date(now.getTime() + REMIND_BEFORE_MIN * 60 * 1000);
  // Missed by more than an hour (server asleep): don't remind late.
  const tooLate = new Date(now.getTime() - 60 * 60 * 1000);
  const due = await ScheduledPractice.find({
    status: "scheduled",
    reminderSentAt: null,
    startsAt: { $lte: soon, $gte: tooLate },
  })
    .select("_id")
    .lean();

  let sent = 0;
  for (const { _id } of due) {
    const doc = await ScheduledPractice.findOneAndUpdate(
      { _id, reminderSentAt: null },
      { $set: { reminderSentAt: now } },
      { new: true },
    ).lean();
    if (!doc) continue; // another run claimed it
    const minutes = Math.max(
      0,
      Math.round((new Date(doc.startsAt) - now) / 60000),
    );
    const when = minutes <= 0 ? "now" : `in ${minutes} min`;
    const title = titleOf(doc);
    const recipients = [doc.host, ...(doc.reminders || [])].map(String);
    const unique = [...new Set(recipients)];
    const users = await User.find({ _id: { $in: unique } })
      .select("pushSubscriptions")
      .lean();
    for (const user of users) {
      const isHost = String(user._id) === String(doc.host);
      const payload = {
        title: isHost
          ? `Your group practice starts ${when}`
          : `Group practice starts ${when}`,
        body: isHost
          ? `"${title}". Open Loquiex to start it.`
          : `"${title}", hosted by ${doc.hostName || "a member"}.`,
        url: "/app/practice?tab=group",
        tag: `group-scheduled-${doc._id}`,
        kind: "group-scheduled",
        action: "Open Loquiex",
      };
      emitToUser(user._id, "group:reminder", {
        id: String(doc._id),
        title,
        startsAt: new Date(doc.startsAt).toISOString(),
        isHost,
      });
      if (pushReady()) {
        try {
          sent += await sendPushToUser(user, payload);
        } catch (err) {
          console.error("Group reminder push failed", err.message);
        }
      }
    }
  }
  return { due: due.length, sent };
}

let timer = null;
let running = false;
function startScheduledPracticeJob() {
  if (timer) return;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await remindDue();
    } catch (err) {
      console.error("Group practice reminders failed:", err);
    } finally {
      running = false;
    }
  };
  timer = setInterval(tick, RUN_EVERY_MS);
  timer.unref?.();
  setTimeout(tick, 20 * 1000).unref?.();
}

module.exports = { startScheduledPracticeJob, remindDue, titleOf };
