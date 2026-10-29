// Pop-up notifications: preferences and the tailored streak message.
// Preferences live in this browser; push notifications would need the server.

const PREFS_KEY = "loquiex.notificationPrefs";
const SEEN_KEY = "loquiex.popupSeen";

const DEFAULT_PREFS = { streakPopups: true, practiceNudges: true };

export function getNotificationPrefs() {
  try {
    return {
      ...DEFAULT_PREFS,
      ...JSON.parse(localStorage.getItem(PREFS_KEY) || "{}"),
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function setNotificationPrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Storage blocked: the change lasts until the page reloads.
  }
}

// One pop-up per message per day, so it never nags.
export function wasSeenToday(id) {
  try {
    const seen = JSON.parse(localStorage.getItem(SEEN_KEY) || "{}");
    return seen[id] === new Date().toDateString();
  } catch {
    return false;
  }
}

export function markSeenToday(id) {
  try {
    const seen = JSON.parse(localStorage.getItem(SEEN_KEY) || "{}");
    seen[id] = new Date().toDateString();
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {
    // ignore
  }
}

const MILESTONES = [3, 7, 14, 21, 30, 50, 100, 150, 200, 365];

// A short line matched to what the person said they want to improve at
// sign-up (user.improvements).
const FOCUS_LINES = {
  "Speaking confidently":
    "Every practice makes speaking up feel a little easier.",
  "Organising my thoughts":
    "Today, try saying your main point first, then one reason.",
  "Expressing my ideas clearly":
    "Today, aim for one idea said simply and clearly.",
  "Speaking fluently without getting stuck":
    "If you stumble today, keep going. That's how fluency grows.",
  "Holding better conversations":
    "Try an Everyday Conversations topic and talk like you would to a friend.",
  "Speaking in professional/work settings":
    "A Workplace & Interview topic is a great warm-up for your day.",
  "Public speaking":
    "Try The Speaking Stage and leave your audience with one clear message.",
  "Vocabulary and finding the right words":
    "Try today's Word of the Day in your practice.",
  Grammar: "Your AI feedback will point out any grammar slips to work on.",
  "Speaking without fillers": "Today, try a short pause instead of “um”.",
};

function focusLine(user) {
  const goals = (user?.improvements || []).filter((g) => FOCUS_LINES[g]);
  if (!goals.length) return "";
  // Rotate through their goals, one per day.
  const day = Math.floor(Date.now() / 86400000);
  return FOCUS_LINES[goals[day % goals.length]];
}

// Works out which pop-up (if any) fits this person right now.
export function buildStreakNotification({ streak, user, prefs }) {
  if (!streak) return null;
  const { current = 0, longest = 0, needsPracticeToday = true } = streak;
  const name = user?.username
    ? user.username.charAt(0).toUpperCase() + user.username.slice(1)
    : "";
  const focus = prefs.practiceNudges ? focusLine(user) : "";

  if (current === 0 && longest === 0) {
    if (!prefs.practiceNudges && !prefs.streakPopups) return null;
    return {
      id: "first-streak",
      title: "Your first streak starts here.",
      body: "One practice today. One step towards expressing yourself with confidence.",
      focus,
      action: "Start my streak",
    };
  }

  if (!prefs.streakPopups) return null;

  if (current === 0) {
    return {
      id: "fresh-start",
      title: name
        ? `Ready for a fresh start, ${name}?`
        : "Ready for a fresh start?",
      body: `Your best streak was ${longest} day${longest === 1 ? "" : "s"}. One practice today starts a new one.`,
      focus,
      action: "Start a new streak",
    };
  }

  if (needsPracticeToday) {
    const next = current + 1;
    return {
      id: `keep-${current}`,
      title: `Keep your ${current}-day streak alive.`,
      body: MILESTONES.includes(next)
        ? `Practise today to reach ${next} days in a row.`
        : "You haven't practised yet today. One quick practice keeps it going.",
      focus,
      action: "Keep my streak",
    };
  }

  if (MILESTONES.includes(current)) {
    return {
      id: `milestone-${current}`,
      title: `${current} days strong!`,
      body: `You've practised ${current} days in a row. That's how confident speakers are made.`,
      focus: "",
      action: "Keep going",
      celebrate: true,
    };
  }

  return null;
}
