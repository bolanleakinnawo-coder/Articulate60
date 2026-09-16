const DAY_MS = 24 * 60 * 60 * 1000;

function dayStart(date) {
  const day = new Date(date);
  day.setUTCHours(0, 0, 0, 0);
  return day.getTime();
}

// A streak counts unique calendar days with a completed practice session.
// Multiple recordings on the same day still count as one day.
function calculateStreak(recordings, now = new Date()) {
  const practiceDays = new Set(
    recordings.map((recording) => dayStart(recording.createdAt)),
  );
  if (practiceDays.size === 0) {
    return { current: 0, longest: 0, needsPracticeToday: true };
  }

  const today = dayStart(now);
  let cursor = practiceDays.has(today) ? today : today - DAY_MS;
  let current = 0;

  while (practiceDays.has(cursor)) {
    current += 1;
    cursor -= DAY_MS;
  }

  if (!practiceDays.has(today) && !practiceDays.has(today - DAY_MS)) {
    current = 0;
  }

  const orderedDays = [...practiceDays].sort((a, b) => a - b);
  let longest = 1;
  let run = 1;
  for (let index = 1; index < orderedDays.length; index += 1) {
    run = orderedDays[index] === orderedDays[index - 1] + DAY_MS ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  return {
    current,
    longest,
    needsPracticeToday: !practiceDays.has(today),
  };
}

module.exports = { calculateStreak };
