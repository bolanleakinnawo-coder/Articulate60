// Streak notifications: preferences and the tailored in-app streak card.
// Preferences are kept on this device and copied to the server, which uses
// them for phone (push) reminders too. Wording matches the server's push
// text in Articulate60-backend/services/streakNotices.js.
import api from "../api/axios";

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
  syncNotificationPrefs(prefs);
}

// Copies the switches to the server so phone reminders follow them too.
export function syncNotificationPrefs(prefs = getNotificationPrefs()) {
  return api
    .put("/api/push/prefs", {
      streakPopups: !!prefs.streakPopups,
      practiceNudges: !!prefs.practiceNudges,
    })
    .catch(() => {});
}

// "18h 24m", "45m"
export function formatTimeLeft(ms) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
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

function plural(n, word) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

// Older servers only send { current, longest, needsPracticeToday }.
function streakState(streak) {
  if (streak.state) return streak.state;
  const { current = 0, longest = 0, needsPracticeToday = true } = streak;
  if (current === 0) return longest === 0 ? "new" : "lost";
  return needsPracticeToday ? "active" : "done";
}

// Works out which streak card (if any) fits this person right now.
//   first     just registered, no practice yet
//   keep      streak going, not practised today
//   restore   missed yesterday; today is the 24h grace day (local time)
//   comeback  lost their streak or hasn't practised for a while
//   milestone practised today and hit 3, 7, 14, 21, 30... days
// layout "streak" is the left-aligned SPEAKING STREAK card; "center" is the
// centred card with an icon on top.
export function buildStreakNotification({ streak, user, prefs }) {
  if (!streak) return null;
  const state = streakState(streak);
  const n = streak.current || 0;
  const focus = prefs.practiceNudges ? focusLine(user) : "";

  if (state === "new") {
    if (!prefs.practiceNudges && !prefs.streakPopups) return null;
    return {
      id: "first-streak",
      layout: "center",
      icon: "flame",
      title: "Your first streak starts here.",
      body: "One practice today. One step towards expressing yourself with confidence.",
      focus,
      action: "Start my streak",
    };
  }

  if (!prefs.streakPopups) return null;

  if (state === "active" && n > 0) {
    return {
      id: `keep-${n}`,
      layout: "streak",
      eyebrow: "Speaking streak",
      headline: plural(n, "day"),
      subline: "You've been showing up.",
      title: "Let's keep it going.",
      body: `You've made time to practise for ${plural(n, "day")}. Complete today's practice to keep your streak alive.`,
      focus,
      action: "Practise today",
    };
  }

  if (state === "grace" && n > 0) {
    return {
      id: `restore-${streak.today || new Date().toDateString()}`,
      layout: "streak",
      eyebrow: "Speaking streak",
      headline: `${n}-day streak`,
      restoreDeadline: streak.restoreDeadline,
      title: "You can still save your streak.",
      body: `Life happens. You still have today to restore your ${n}-day streak. Come back and pick up where you left off.`,
      focus,
      action: "Restore my streak",
    };
  }

  if (state === "lost") {
    return {
      id: "comeback",
      layout: "center",
      icon: "trend",
      eyebrow: "Your progress, in practice",
      title: "You're building a skill that stays with you.",
      body: "Give yourself another opportunity to practise expressing your thoughts clearly.",
      focus,
      action: "Practise today",
    };
  }

  if (state === "done" && MILESTONES.includes(n)) {
    return {
      id: `milestone-${n}`,
      layout: "center",
      icon: "flame",
      celebrate: true,
      title: `${n} days strong!`,
      body: `You've practised ${n} days in a row. That's how confident speakers are made.`,
      focus: "",
      action: "Keep going",
    };
  }

  return null;
}
