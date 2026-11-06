// Streak reminder job. Runs every 15 minutes inside the server and can also
// be triggered from outside (POST /api/push/run-reminders) by a free cron
// service, which also keeps a sleeping Render instance awake.
//
// Every time below is the member's own local time:
//   keep      19:00  streak going, not practised yet today
//   restore   09:00  grace day starts (missed yesterday), with time left
//             20:00  last call on the grace day, with time left
//   comeback  18:00  3, 7, 14 and 30 days after the last practice, then monthly
//   first     18:00  on sign-up day (if they joined over an hour ago) and
//                    1, 3 and 7 days after joining, until the first practice
// Each reminder goes out at most once per local day.
const User = require("../MODELS/User");
const Recording = require("../MODELS/Recording");
const {
  getStreakStatus,
  zonedParts,
  localDayNumber,
} = require("../utils/streak");
const { noticeKindFor, pushPayloadFor } = require("./streakNotices");
const { pushReady, sendPushToUser } = require("./push");
const { emitToUser } = require("./realtime");

const RUN_EVERY_MS = 15 * 60 * 1000;
// A slot stays open for a few hours so a restart or a sleeping server
// doesn't make anyone miss the day's reminder.
const SLOT_HOURS = 3;

const COMEBACK_DAYS = [3, 7, 14, 30];
const FIRST_STREAK_DAYS = [0, 1, 3, 7];

function inSlot(hour, start) {
  return hour >= start && hour < Math.min(24, start + SLOT_HOURS);
}

// Which reminder (if any) is due for this member right now.
function dueReminder(user, status, now) {
  const kind = noticeKindFor(status, user.notificationPrefs || {});
  if (!kind) return null;
  const { hour } = zonedParts(now, status.timeZone);

  if (kind === "keep" && inSlot(hour, 19)) return { kind, slot: "keep" };

  if (kind === "restore") {
    if (inSlot(hour, 20)) return { kind, slot: "restore-pm" };
    if (inSlot(hour, 9)) return { kind, slot: "restore-am" };
    return null;
  }

  if (kind === "comeback" && inSlot(hour, 18)) {
    const d = status.daysSincePractice;
    if (COMEBACK_DAYS.includes(d) || (d > 30 && d % 30 === 0)) {
      return { kind, slot: "comeback" };
    }
    return null;
  }

  if (kind === "first" && inSlot(hour, 18)) {
    const joinedDay = localDayNumber(user.createdAt, status.timeZone);
    const daysSinceJoin = localDayNumber(now, status.timeZone) - joinedDay;
    const joinedOverAnHourAgo = now - new Date(user.createdAt) > 60 * 60 * 1000;
    if (FIRST_STREAK_DAYS.includes(daysSinceJoin) && joinedOverAnHourAgo) {
      return { kind, slot: "first" };
    }
  }
  return null;
}

// Claims the reminder for today in one atomic write, so two server
// instances (or a cron call during a scheduled run) never send it twice.
async function claim(userId, slot, today) {
  const field = `reminderLog.${slot}`;
  const result = await User.updateOne(
    { _id: userId, [field]: { $ne: today } },
    { $set: { [field]: today } },
  );
  return result.modifiedCount === 1;
}

async function runReminders(now = new Date()) {
  if (!pushReady()) return { checked: 0, sent: 0 };
  let checked = 0;
  let sent = 0;

  const cursor = User.find({ "pushSubscriptions.0": { $exists: true } })
    .select("timeZone notificationPrefs pushSubscriptions reminderLog createdAt")
    .cursor();

  for await (const user of cursor) {
    checked += 1;
    try {
      const recordings = await Recording.find({ user: user._id })
        .select("createdAt")
        .lean();
      const status = getStreakStatus(recordings, user.timeZone, now);
      const due = dueReminder(user, status, now);
      if (!due) continue;
      if (!(await claim(user._id, due.slot, status.today))) continue;

      const payload = {
        ...pushPayloadFor(due.kind, status),
        kind: due.kind,
        tag: `streak-${due.kind}`,
      };
      sent += await sendPushToUser(user, payload);
      // Open tabs refresh their streak card at the same moment.
      emitToUser(user._id, "streak:status", status);
    } catch (err) {
      console.error("Streak reminder failed for", String(user._id), err);
    }
  }
  return { checked, sent };
}

let timer = null;
let running = false;

function startReminderJob() {
  if (timer) return;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runReminders();
    } catch (err) {
      console.error("Streak reminder run failed:", err);
    } finally {
      running = false;
    }
  };
  timer = setInterval(tick, RUN_EVERY_MS);
  setTimeout(tick, 30 * 1000); // first run shortly after start-up
}

module.exports = { startReminderJob, runReminders, dueReminder };
