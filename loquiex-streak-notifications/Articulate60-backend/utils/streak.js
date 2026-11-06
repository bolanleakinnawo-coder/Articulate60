// Streaks are counted in each member's own time zone.
//
// A streak counts calendar days (in the member's time zone) with at least
// one completed practice. Several practices on one day still count once.
//
// Grace day: if a member misses a day, they get the whole of the next day
// (00:00 to 23:59 local time) to practise and restore the streak.
//   Mon practised, Tue missed  -> Tue: streak at risk (still "active")
//   Wed 00:00 - 23:59 local    -> grace: "restore" notice with time left
//   Wed practised              -> streak restored (the missed day adds 0)
//   Wed missed too             -> Thu: streak lost
const DEFAULT_TIME_ZONE = process.env.DEFAULT_TIME_ZONE || "Africa/Lagos";
const DAY_MS = 24 * 60 * 60 * 1000;

const formatters = new Map();
function formatterFor(timeZone) {
  if (!formatters.has(timeZone)) {
    formatters.set(
      timeZone,
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    );
  }
  return formatters.get(timeZone);
}

function isValidTimeZone(timeZone) {
  if (!timeZone || typeof timeZone !== "string" || timeZone.length > 64) {
    return false;
  }
  try {
    formatterFor(timeZone);
    return true;
  } catch {
    return false;
  }
}

function safeZone(timeZone) {
  return isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIME_ZONE;
}

// Wall-clock parts of an instant in a time zone.
function zonedParts(date, timeZone) {
  const parts = {};
  for (const { type, value } of formatterFor(safeZone(timeZone)).formatToParts(
    new Date(date),
  )) {
    if (type !== "literal") parts[type] = Number(value);
  }
  return parts; // { year, month, day, hour, minute, second }
}

// Local calendar day as a whole number (days since 1970-01-01).
function localDayNumber(date, timeZone) {
  const p = zonedParts(date, timeZone);
  return Math.floor(Date.UTC(p.year, p.month - 1, p.day) / DAY_MS);
}

function dayKey(dayNumber) {
  return new Date(dayNumber * DAY_MS).toISOString().slice(0, 10);
}

// Offset of the time zone from UTC at an instant, in ms.
function zoneOffset(instant, timeZone) {
  const p = zonedParts(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant / 1000) * 1000;
}

// The UTC instant when a local calendar day starts (00:00 local).
function localDayStart(dayNumber, timeZone) {
  const zone = safeZone(timeZone);
  const wall = dayNumber * DAY_MS;
  let instant = wall - zoneOffset(wall, zone);
  // Second pass settles days where the offset changes (daylight saving).
  instant = wall - zoneOffset(instant, zone);
  return instant;
}

// Walks a run of practice days backwards from `fromDay`, bridging single
// missed days that were restored on the following (grace) day.
function countRun(days, fromDay) {
  let count = 0;
  let cursor = fromDay;
  while (days.has(cursor)) {
    count += 1;
    if (days.has(cursor - 1)) cursor -= 1;
    else if (days.has(cursor - 2)) cursor -= 2; // missed day, restored
    else break;
  }
  return count;
}

function longestRun(days) {
  const ordered = [...days].sort((a, b) => a - b);
  let longest = 0;
  let run = 0;
  for (let i = 0; i < ordered.length; i += 1) {
    const gap = i === 0 ? Infinity : ordered[i] - ordered[i - 1];
    run = gap <= 2 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  return longest;
}

// Full streak picture for one member.
//   state: "new"      no practice yet
//          "done"     practised today
//          "active"   practised yesterday, today still open (at risk)
//          "grace"    missed yesterday, today is the restore day
//          "lost"     missed two days or more
function getStreakStatus(recordings, timeZone, now = new Date()) {
  const zone = safeZone(timeZone);
  const days = new Set(
    recordings.map((r) => localDayNumber(r.createdAt || r, zone)),
  );
  const today = localDayNumber(now, zone);
  const base = {
    timeZone: zone,
    today: dayKey(today),
    current: 0,
    longest: 0,
    needsPracticeToday: !days.has(today),
    state: "new",
    lastPracticeDay: null,
    daysSincePractice: null,
    restoreDeadline: null,
    restoreMsLeft: null,
  };
  if (days.size === 0) return base;

  const lastDay = Math.max(...days);
  const status = {
    ...base,
    longest: longestRun(days),
    lastPracticeDay: dayKey(lastDay),
    daysSincePractice: today - lastDay,
  };

  if (days.has(today)) {
    status.state = "done";
    status.current = countRun(days, today);
  } else if (days.has(today - 1)) {
    status.state = "active";
    status.current = countRun(days, today - 1);
  } else if (days.has(today - 2)) {
    status.state = "grace";
    // The streak they can still save today.
    status.current = countRun(days, today - 2);
    const deadline = localDayStart(today + 1, zone);
    status.restoreDeadline = new Date(deadline).toISOString();
    status.restoreMsLeft = Math.max(0, deadline - now.getTime());
  } else {
    status.state = "lost";
    status.current = 0;
  }
  return status;
}

// Short form used by the leaderboard and practice save.
function calculateStreak(recordings, now = new Date(), timeZone) {
  const s = getStreakStatus(recordings, timeZone, now);
  return {
    current: s.current,
    longest: s.longest,
    needsPracticeToday: s.needsPracticeToday,
  };
}

module.exports = {
  DEFAULT_TIME_ZONE,
  calculateStreak,
  getStreakStatus,
  isValidTimeZone,
  safeZone,
  zonedParts,
  localDayNumber,
  localDayStart,
  dayKey,
};
