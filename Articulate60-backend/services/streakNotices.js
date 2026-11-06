// The four streak notifications, matched to a member's streak status.
// The same wording is used for phone (push) notifications here and for the
// in-app cards in src/data/notifications.js on the frontend.
//
//   keep      has a streak going, hasn't practised today
//   restore   missed yesterday, today is the 24h grace day (local time)
//   comeback  lost their streak, or hasn't practised for a while
//   first     just registered, no practice yet

function plural(n, word) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function formatTimeLeft(ms) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

// Which notice fits this status, respecting the member's switches.
// Streak pop-ups covers keep / restore / comeback; the first-streak welcome
// shows if either switch is on (same rule as the in-app pop-up).
function noticeKindFor(status, prefs = {}) {
  const streakOn = prefs.streakPopups !== false;
  const nudgesOn = prefs.practiceNudges !== false;
  switch (status.state) {
    case "new":
      return streakOn || nudgesOn ? "first" : null;
    case "active":
      return streakOn && status.current > 0 ? "keep" : null;
    case "grace":
      return streakOn && status.current > 0 ? "restore" : null;
    case "lost":
      return streakOn ? "comeback" : null;
    default:
      return null;
  }
}

// Short text for a phone notification.
function pushPayloadFor(kind, status) {
  const n = status.current;
  const url = "/app/practice";
  switch (kind) {
    case "keep":
      return {
        title: `${plural(n, "day")} of showing up. Let's keep it going.`,
        body: "Complete today's practice to keep your streak alive.",
        action: "Practise today",
        url,
      };
    case "restore":
      return {
        title: "You can still save your streak.",
        body: `Life happens. You have ${formatTimeLeft(status.restoreMsLeft)} left today to restore your ${n}-day streak.`,
        action: "Restore my streak",
        url,
      };
    case "comeback":
      return {
        title: "You're building a skill that stays with you.",
        body: "Give yourself another opportunity to practise expressing your thoughts clearly.",
        action: "Practise today",
        url,
      };
    case "first":
      return {
        title: "Your first streak starts here.",
        body: "One practice today. One step towards expressing yourself with confidence.",
        action: "Start my streak",
        url,
      };
    default:
      return null;
  }
}

module.exports = { noticeKindFor, pushPayloadFor, formatTimeLeft };
