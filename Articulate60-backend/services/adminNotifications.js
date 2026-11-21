// Round 14 (Sheriff): Admin > Notifications. The admin picks a group, types
// one message ({name} is optional) and presses Send (or schedules it). The
// app works out who is in the group right now and sends it to all of them at
// once: a phone notification where they allowed it, and an in-app notice if
// they have Loquiex open. Nothing here is sent automatically.
const User = require("../MODELS/User");
const Recording = require("../MODELS/Recording");
const ScheduledPractice = require("../MODELS/ScheduledPractice");
const LearnNotification = require("../MODELS/LearnNotification");
const AdminNotification = require("../MODELS/AdminNotification");
const { getStreakStatus, localDayNumber, localDayStart, safeZone } = require("../utils/streak");
const { planIdOf, aiDailyLimit, hasGroupPractice } = require("../utils/plans");
const { summarise } = require("../utils/groupUsage");
const { pushReady, sendPushToUser } = require("./push");
const { emitToUser } = require("./realtime");

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const STREAK_MILESTONES = [3, 7, 14, 21, 30, 50, 60, 90, 100, 150, 200, 365];

// Sheriff's list, in Sheriff's words. `who` says who the app picks.
const GROUPS = [
  { id: "inactive_24h", label: "24-hour inactivity reminder", who: "Last practice was 1 to 3 days ago.", url: "/app/practice" },
  { id: "inactive_3d", label: "3-day inactivity reminder", who: "Last practice was 3 to 7 days ago.", url: "/app/practice" },
  { id: "inactive_7d", label: "7-day inactivity reminder", who: "Last practice was 7 to 10 days ago.", url: "/app/practice" },
  { id: "inactive_10d", label: "10-day+ inactive members", who: "No practice for 10 days or more (or never, 10+ days after joining).", url: "/app/practice" },
  { id: "streak_expiring", label: "Streak about to expire (5 hours to)", who: "On a streak, haven't practised today, and 5 hours or less left in their day.", url: "/app/practice" },
  { id: "streak_lost", label: "Streak lost", who: "Lost their streak in the last 7 days.", url: "/app/practice" },
  { id: "milestone", label: "Milestone celebration", who: "Streak is on a milestone today (3, 7, 14, 21, 30, 50, 60, 90, 100, 150, 200 or 365 days).", url: "/app/home" },
  { id: "word_of_day", label: "Word of the day", who: "All members.", url: "/app/home" },
  { id: "learn_discount", label: "Learn discount notification (flourish & infinity)", who: "Members on Flourish or Infinity (own or team plan).", url: "/app/learn" },
  { id: "learn_new", label: "New learning material available", who: "All members.", url: "/app/learn" },
  { id: "learn_notify", label: "Learn notifications", who: "Members who tapped Notify me on Learn.", url: "/app/learn" },
  { id: "group_reminder", label: "Group Practice reminder", who: "Members who set a reminder for, or host, a group practice in the next 24 hours.", url: "/app/practice?tab=group" },
  { id: "group_new", label: "New Group Practice opportunity", who: "Members whose plan includes Group Practice.", url: "/app/practice?tab=group" },
  { id: "group_almost", label: "Group Practice usage limit almost exhausted", who: "A quarter or less of today's call time left.", url: "/app/practice?tab=group" },
  { id: "group_reached", label: "Group Practice usage limit reached", who: "No call time left today.", url: "/app/membership" },
  { id: "ai_reached", label: "AI feedback usage limit reached", who: "Used all of today's AI feedback.", url: "/app/membership" },
  { id: "sub_expiring", label: "Subscription expiring in 3 days", who: "Own or team plan ends in the next 3 days.", url: "/app/membership" },
  { id: "sub_expired", label: "Subscription expired", who: "Own or team plan ended in the last 30 days and now on Free.", url: "/app/membership" },
  { id: "announcement", label: "Important platform announcements", who: "All members.", url: "/app/home" },
];
const GROUP_BY_ID = Object.fromEntries(GROUPS.map((g) => [g.id, g]));

const PLAN_FIELDS = {
  plan: 1,
  planExpiresAt: 1,
  teamPlan: 1,
  teamPlanExpiresAt: 1,
  createdAt: 1,
  trialByChoice: 1,
  aiTrialStartedAt: 1,
};

// Practice days per member (only those who practised in the last ~400 days).
async function practiceDaysByUser() {
  const rows = await Recording.aggregate([
    { $match: { createdAt: { $gte: new Date(Date.now() - 400 * DAY) } } },
    { $group: { _id: "$user", days: { $push: "$createdAt" }, last: { $max: "$createdAt" } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r]));
}

async function lastPracticeByUser() {
  const rows = await Recording.aggregate([
    { $group: { _id: "$user", last: { $max: "$createdAt" } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.last]));
}

// The ids of everyone in `groupId` right now.
async function audienceIds(groupId, now = new Date()) {
  switch (groupId) {
    case "word_of_day":
    case "learn_new":
    case "announcement": {
      const users = await User.find({}, { _id: 1 }).lean();
      return users.map((u) => String(u._id));
    }

    case "inactive_24h":
    case "inactive_3d":
    case "inactive_7d":
    case "inactive_10d": {
      const [users, last] = await Promise.all([
        User.find({}, { createdAt: 1 }).lean(),
        lastPracticeByUser(),
      ]);
      const ranges = {
        inactive_24h: [1 * DAY, 3 * DAY],
        inactive_3d: [3 * DAY, 7 * DAY],
        inactive_7d: [7 * DAY, 10 * DAY],
        inactive_10d: [10 * DAY, Infinity],
      };
      const [from, to] = ranges[groupId];
      return users
        .filter((u) => {
          const ref = last.get(String(u._id)) || u.createdAt;
          if (!ref) return false;
          const gap = now - new Date(ref);
          return gap >= from && gap < to;
        })
        .map((u) => String(u._id));
    }

    case "streak_expiring":
    case "streak_lost":
    case "milestone": {
      const [users, practice] = await Promise.all([
        User.find({}, { timeZone: 1 }).lean(),
        practiceDaysByUser(),
      ]);
      const ids = [];
      for (const u of users) {
        const row = practice.get(String(u._id));
        if (!row) continue;
        const status = getStreakStatus(row.days, u.timeZone, now);
        if (groupId === "streak_expiring") {
          if (status.state !== "active" && status.state !== "grace") continue;
          const zone = safeZone(u.timeZone);
          const endOfDay = localDayStart(localDayNumber(now, zone) + 1, zone);
          if (endOfDay - now <= 5 * HOUR && status.current >= 1) ids.push(String(u._id));
        } else if (groupId === "streak_lost") {
          if (status.state === "lost" && status.daysSincePractice <= 7) ids.push(String(u._id));
        } else if (
          (status.state === "done" || status.state === "active") &&
          STREAK_MILESTONES.includes(status.current)
        ) {
          ids.push(String(u._id));
        }
      }
      return ids;
    }

    case "learn_discount": {
      const users = await User.find(
        { $or: [{ plan: { $in: ["flourish", "infinity"] } }, { teamPlan: { $in: ["flourish", "infinity"] } }] },
        PLAN_FIELDS,
      ).lean();
      return users
        .filter((u) => ["flourish", "infinity"].includes(planIdOf(u, now)))
        .map((u) => String(u._id));
    }

    case "learn_notify": {
      const rows = await LearnNotification.find({}, { user: 1, email: 1 }).lean();
      const ids = new Set(rows.filter((r) => r.user).map((r) => String(r.user)));
      const emails = rows.filter((r) => !r.user && r.email).map((r) => String(r.email).toLowerCase());
      if (emails.length) {
        const byEmail = await User.find({ email: { $in: emails } }, { _id: 1 }).lean();
        byEmail.forEach((u) => ids.add(String(u._id)));
      }
      return [...ids];
    }

    case "group_reminder": {
      const planned = await ScheduledPractice.find(
        { status: "scheduled", startsAt: { $gte: now, $lte: new Date(now.getTime() + DAY) } },
        { host: 1, reminders: 1 },
      ).lean();
      const ids = new Set();
      planned.forEach((p) => {
        ids.add(String(p.host));
        (p.reminders || []).forEach((r) => ids.add(String(r)));
      });
      return [...ids];
    }

    case "group_new":
    case "group_almost":
    case "group_reached": {
      const users = await User.find(
        {
          $or: [
            { plan: { $ne: "free" }, planExpiresAt: { $gt: now } },
            { teamPlan: { $ne: null }, teamPlanExpiresAt: { $gt: now } },
          ],
        },
        { ...PLAN_FIELDS, groupMinutes: 1, timeZone: 1 },
      );
      return users
        .filter((u) => {
          if (!hasGroupPractice(u)) return false;
          if (groupId === "group_new") return true;
          const s = summarise(u, now);
          if (s.total === null) return false;
          if (groupId === "group_reached") return s.left <= 0;
          return s.left > 0 && s.left <= s.total * 0.25;
        })
        .map((u) => String(u._id));
    }

    case "ai_reached": {
      const rows = await Recording.aggregate([
        { $match: { analysisStatus: "done", analyzedAt: { $gte: new Date(now - 26 * HOUR) } } },
        { $group: { _id: "$user", times: { $push: "$analyzedAt" } } },
      ]);
      if (!rows.length) return [];
      const users = await User.find(
        { _id: { $in: rows.map((r) => r._id) } },
        { ...PLAN_FIELDS, timeZone: 1 },
      ).lean();
      const timesOf = new Map(rows.map((r) => [String(r._id), r.times]));
      return users
        .filter((u) => {
          const limit = aiDailyLimit(u, now);
          if (limit === null || limit === 0) return false;
          const zone = safeZone(u.timeZone);
          const dayStart = localDayStart(localDayNumber(now, zone), zone);
          const used = (timesOf.get(String(u._id)) || []).filter((t) => new Date(t) >= dayStart).length;
          return used >= limit;
        })
        .map((u) => String(u._id));
    }

    case "sub_expiring": {
      const soon = new Date(now.getTime() + 3 * DAY);
      const users = await User.find(
        {
          $or: [
            { plan: { $ne: "free" }, planExpiresAt: { $gt: now, $lte: soon } },
            { teamPlan: { $ne: null }, teamPlanExpiresAt: { $gt: now, $lte: soon } },
          ],
        },
        { _id: 1 },
      ).lean();
      return users.map((u) => String(u._id));
    }

    case "sub_expired": {
      const since = new Date(now - 30 * DAY);
      const users = await User.find(
        {
          $or: [
            { plan: { $ne: "free" }, planExpiresAt: { $gte: since, $lte: now } },
            { teamPlan: { $ne: null }, teamPlanExpiresAt: { $gte: since, $lte: now } },
          ],
        },
        PLAN_FIELDS,
      ).lean();
      return users.filter((u) => planIdOf(u, now) === "free").map((u) => String(u._id));
    }

    default:
      return [];
  }
}

function firstName(user) {
  const full = String(user?.fullName || "").trim();
  if (full) return full.split(/\s+/)[0];
  return user?.displayUsername || user?.username || "there";
}

// Sends one AdminNotification to everyone in its group now.
async function deliver(doc) {
  const group = GROUP_BY_ID[doc.group];
  const ids = await audienceIds(doc.group);
  let delivered = 0;
  const batch = 50;
  for (let i = 0; i < ids.length; i += batch) {
    const users = await User.find(
      { _id: { $in: ids.slice(i, i + batch) } },
      { fullName: 1, username: 1, displayUsername: 1, pushSubscriptions: 1 },
    );
    await Promise.all(
      users.map(async (user) => {
        const body = doc.message.replace(/\{name\}/g, firstName(user));
        // Round 15 (Sheriff): only what the admin typed. The phone already
        // shows the app name, so no extra "Loquiex" title.
        const payload = {
          kind: "admin",
          title: body,
          body: "",
          url: group?.url || "/app/home",
          action: "Open",
          tag: `admin-${doc._id}`,
        };
        try {
          emitToUser(user._id, "learn:notice", payload);
          if (pushReady()) delivered += await sendPushToUser(user, payload);
        } catch (err) {
          console.error("Admin notification failed for", String(user._id), err.message);
        }
      }),
    );
  }
  return { recipients: ids.length, delivered };
}

async function sendNotification(doc) {
  const claimed = await AdminNotification.findOneAndUpdate(
    { _id: doc._id, status: "scheduled" },
    { $set: { status: "sending" } },
    { returnDocument: "after" },
  );
  if (!claimed) return AdminNotification.findById(doc._id).lean();
  try {
    const { recipients, delivered } = await deliver(claimed);
    return AdminNotification.findByIdAndUpdate(
      claimed._id,
      { $set: { status: "sent", sentAt: new Date(), recipients, delivered } },
      { returnDocument: "after" },
    ).lean();
  } catch (err) {
    console.error("Admin notification failed:", err);
    return AdminNotification.findByIdAndUpdate(
      claimed._id,
      { $set: { status: "failed", error: String(err.message || err).slice(0, 300) } },
      { returnDocument: "after" },
    ).lean();
  }
}

// Sends notifications the admin scheduled, when their time comes.
let timer = null;
function startScheduledNotificationJob() {
  if (timer) return;
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const due = await AdminNotification.find({
        status: "scheduled",
        scheduledFor: { $lte: new Date() },
      }).lean();
      for (const doc of due) await sendNotification(doc);
    } catch (err) {
      console.error("Scheduled admin notifications failed:", err.message);
    } finally {
      running = false;
    }
  };
  timer = setInterval(tick, 60 * 1000);
  timer.unref?.();
}

module.exports = {
  NOTIFICATION_GROUPS: GROUPS,
  audienceIds,
  sendNotification,
  startScheduledNotificationJob,
};
