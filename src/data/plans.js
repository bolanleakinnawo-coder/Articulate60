// Membership plans, daily allowances and the demo checkout.
//
// TESTING NOTE: payments are not live yet. "Demo pay" only remembers the chosen
// plan in this browser (localStorage) so the paid screens can be tried. The
// server still only knows "free" / "pro" and does not enforce these limits.
// Prices, allowances and plan copy are placeholders until the plan and fees
// are final.

export const PLANS = [
  {
    id: "free",
    name: "Loquiex Free",
    tagline: "Start practising on your own.",
    price: "Free",
    limits: { aiFeedbackPerDay: 3, groupMinutesPerDay: 0 },
    features: [
      "Unlimited solo practice",
      "Spin the Jar, categories and Yap Mode",
      "Your recordings and streaks",
    ],
    offer: "Try the AI analyser free while we're testing",
  },
  {
    id: "bloom",
    name: "Loquiex Bloom",
    tagline: "Feedback every day, plus group practice.",
    price: "Coming soon",
    limits: { aiFeedbackPerDay: 10, groupMinutesPerDay: 60 },
    features: [
      "10 AI feedback sessions a day",
      "60 minutes of group practice a day",
      "Saved feedback on every recording",
    ],
    offer: "Includes the Loquiex e-book",
    recommended: true,
  },
  {
    id: "flourish",
    name: "Loquiex Flourish",
    tagline: "For people who practise a lot.",
    price: "Coming soon",
    limits: { aiFeedbackPerDay: 20, groupMinutesPerDay: 120 },
    features: [
      "20 AI feedback sessions a day",
      "120 minutes of group practice a day",
      "Saved feedback on every recording",
    ],
    offer: "Includes the Loquiex e-book",
  },
];

const DEMO_PLAN_KEY = "loquiex.demoPlan";
const GROUP_USAGE_KEY = "loquiex.groupMinutes";

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Private mode or storage blocked: the demo plan just won't persist.
  }
}

export function getStoredUser() {
  try {
    return JSON.parse(sessionStorage.getItem("user")) || null;
  } catch {
    return null;
  }
}

export function getPlanId(user = getStoredUser()) {
  const demo = readStorage(DEMO_PLAN_KEY);
  if (demo && PLANS.some((p) => p.id === demo)) return demo;
  return user?.plan === "pro" ? "bloom" : "free";
}

export function getPlan(user) {
  const id = getPlanId(user);
  return PLANS.find((p) => p.id === id) || PLANS[0];
}

export function isPaidPlan(user) {
  return getPlanId(user) !== "free";
}

// Demo checkout: remembers the plan locally. Replace with the real payment
// flow (and a server-side plan update) when payments go live.
export function demoSubscribe(planId) {
  writeStorage(DEMO_PLAN_KEY, planId === "free" ? null : planId);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// AI feedback used today, worked out from the saved recordings.
export function aiFeedbackUsedToday(recordings = []) {
  const today = new Date().toDateString();
  return recordings.filter(
    (r) =>
      r.analysisStatus === "done" &&
      r.analyzedAt &&
      new Date(r.analyzedAt).toDateString() === today,
  ).length;
}

// Group practice minutes are tracked in this browser for now (no live group
// calls on the server yet).
export function groupMinutesUsedToday() {
  try {
    const saved = JSON.parse(readStorage(GROUP_USAGE_KEY) || "{}");
    return saved.day === todayKey() ? Number(saved.minutes) || 0 : 0;
  } catch {
    return 0;
  }
}

export function addGroupMinutes(minutes) {
  const used = groupMinutesUsedToday() + minutes;
  writeStorage(
    GROUP_USAGE_KEY,
    JSON.stringify({ day: todayKey(), minutes: used }),
  );
  return used;
}

export function getUsage(recordings, user) {
  const plan = getPlan(user);
  const aiUsed = aiFeedbackUsedToday(recordings);
  const groupUsed = groupMinutesUsedToday();
  return {
    plan,
    aiFeedback: {
      total: plan.limits.aiFeedbackPerDay,
      left: Math.max(0, plan.limits.aiFeedbackPerDay - aiUsed),
    },
    groupMinutes: {
      total: plan.limits.groupMinutesPerDay,
      left: Math.max(0, plan.limits.groupMinutesPerDay - groupUsed),
    },
  };
}
