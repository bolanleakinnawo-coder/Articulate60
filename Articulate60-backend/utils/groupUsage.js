// Group practice minutes, stored per member as { "YYYY-MM-DD": minutes } in
// the member's own time zone, so "today" and "this month" match their clock.
const User = require("../MODELS/User");
const { safeZone, localDayNumber, dayKey } = require("./streak");
const { limitsFor, planIdOf } = require("./plans");

const KEEP_DAYS = 62;

function todayKeyFor(user, now = new Date()) {
  return dayKey(localDayNumber(now, safeZone(user?.timeZone)));
}

function daysOf(user) {
  const map = user?.groupMinutes;
  if (!map) return {};
  const entries = map instanceof Map ? [...map.entries()] : Object.entries(map);
  return Object.fromEntries(entries.map(([d, m]) => [d, Number(m) || 0]));
}

function summarise(user, now = new Date()) {
  const days = daysOf(user);
  const today = todayKeyFor(user, now);
  const month = today.slice(0, 7);
  const usedThisMonth = Object.entries(days)
    .filter(([d]) => d.startsWith(month))
    .reduce((t, [, m]) => t + m, 0);
  // Daily call time (Sheriff, 2026-11-10): `total` and `left` are TODAY's
  // minutes. null = unlimited. Resets at the member's own midnight.
  const total = limitsFor(user).groupMinutesPerDay;
  const usedToday = days[today] || 0;
  return {
    planId: planIdOf(user),
    period: "day",
    total,
    usedToday,
    usedThisMonth,
    left: total === null ? null : Math.max(0, total - usedToday),
    today,
    days,
  };
}

// Adds minutes to today's total. Returns the new summary.
async function addMinutes(userId, timeZone, minutes = 1) {
  const today = dayKey(localDayNumber(new Date(), safeZone(timeZone)));
  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { [`groupMinutes.${today}`]: minutes } },
    { new: true, projection: { groupMinutes: 1, plan: 1, planExpiresAt: 1, timeZone: 1 } },
  );
  return user ? summarise(user) : null;
}

// Drops days older than about two months.
async function pruneOld(user) {
  const keys = Object.keys(daysOf(user)).sort();
  if (keys.length <= KEEP_DAYS) return;
  const unset = Object.fromEntries(
    keys.slice(0, keys.length - KEEP_DAYS).map((d) => [`groupMinutes.${d}`, ""]),
  );
  await User.updateOne({ _id: user._id }, { $unset: unset });
}

module.exports = { summarise, addMinutes, pruneOld, todayKeyFor };
