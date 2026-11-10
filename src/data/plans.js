// Membership plans, allowances and Paystack checkout.
//
// Prices here are for display only. The server (Articulate60-backend/
// utils/plans.js) sets the amount charged and gives a plan only after
// Paystack confirms the payment. Keep both files in step. The server enforces
// paid access to AI feedback and group practice (plan and monthly minutes),
// and the AI feedback daily caps (aiFeedbackPerDay). The monthly AI feedback
// counts here are not enforced by the server yet.
//
// Allowances: `null` means unlimited, 0 means not included.
//   aiFeedbackPerMonth / aiFeedbackPerDay  AI feedback sessions
//   groupMinutesPerMonth                   group practice minutes

import api from "../api/axios";

export const PLANS = [
  {
    id: "free",
    name: "Loquiex Free",
    tagline: "Start practising on your own.",
    priceNaira: 0,
    // No AI feedback after the 3-day free trial (see AI_TRIAL below).
    limits: {
      aiFeedbackPerMonth: null,
      aiFeedbackPerDay: 0,
      groupMinutesPerMonth: 0,
    },
    features: [
      "3-day free trial of AI feedback (up to 3 a day)",
      "Unlimited personal practice",
      "Your recordings and streaks",
    ],
  },
  {
    id: "bloom",
    name: "Loquiex Bloom",
    tagline: "Build a consistent practice habit.",
    priceNaira: 4900,
    limits: {
      aiFeedbackPerMonth: 150,
      aiFeedbackPerDay: 5,
      groupMinutesPerMonth: 0,
    },
    features: [
      "150 AI feedback sessions/month · up to 5/day",
      "Unlimited personal practice",
      "Earn subscription credits for every qualifying paid referral",
    ],
  },
  {
    id: "flourish",
    name: "Loquiex Flourish",
    tagline: "More room to practise and improve.",
    priceNaira: 8000,
    badge: "More practice",
    limits: {
      aiFeedbackPerMonth: 360,
      aiFeedbackPerDay: 12,
      groupMinutesPerMonth: 2700,
    },
    features: [
      "360 AI feedback sessions/month · up to 12/day",
      "2,700 group practice minutes/month",
      "Unlimited personal practice",
      "Earn subscription credits for every qualifying paid referral",
      "Withdraw eligible referral rewards directly to your bank account",
      "Get discounts on Learn resources designed to help you learn communication and improve your communication skills",
    ],
  },
  {
    id: "infinity",
    name: "Loquiex Infinity",
    tagline: "Practise without set usage limits.",
    priceNaira: 29800,
    limits: {
      aiFeedbackPerMonth: null,
      aiFeedbackPerDay: null,
      groupMinutesPerMonth: null,
    },
    features: [
      "Unlimited AI feedback",
      "Unlimited group practice and participants",
      "Unlimited personal practice",
      "Earn subscription credits for every qualifying paid referral",
      "Withdraw eligible referral rewards directly to your bank account",
      "Get discounts on Learn resources designed to help you learn communication and improve your communication skills",
    ],
  },
];

export const PAID_PLANS = PLANS.filter((p) => p.id !== "free");

// Free members get AI feedback for their first 3 days (up to 3 a day). The
// server enforces this (utils/plans.js); these numbers are for display.
export const AI_TRIAL = { days: 3, perDay: 3 };

// When the free AI trial ends, from the server's subscription, else from the
// sign-up date. null when unknown.
export function aiTrialEndsAt(user = getStoredUser()) {
  const raw = user?.subscription?.aiTrialEndsAt;
  if (raw) return new Date(raw);
  if (!user?.createdAt) return null;
  const created = new Date(user.createdAt);
  if (Number.isNaN(created.getTime())) return null;
  return new Date(created.getTime() + AI_TRIAL.days * 24 * 60 * 60 * 1000);
}

export function isOnAiTrial(user = getStoredUser()) {
  if (getPlanId(user) !== "free") return false;
  const ends = aiTrialEndsAt(user);
  return Boolean(ends && ends > new Date());
}

// Days of the free AI trial left, counting today (0 when over).
export function aiTrialDaysLeft(user = getStoredUser()) {
  if (!isOnAiTrial(user)) return 0;
  const ms = aiTrialEndsAt(user).getTime() - Date.now();
  return Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

// Plan allowances right now: Free gets the trial's AI feedback while it lasts.
export function effectiveLimits(user = getStoredUser()) {
  const plan = getPlan(user);
  if (plan.id === "free" && isOnAiTrial(user)) {
    return { ...plan.limits, aiFeedbackPerDay: AI_TRIAL.perDay };
  }
  return plan.limits;
}

export function canUseAiFeedback(user = getStoredUser()) {
  return getPlanId(user) !== "free" || isOnAiTrial(user);
}

export const BILLING_PERIODS = [
  { id: "monthly", months: 1, label: "Monthly", discount: 0 },
  { id: "quarterly", months: 3, label: "3 months", discount: 5 },
  { id: "half-year", months: 6, label: "6 months", discount: 8 },
  { id: "yearly", months: 12, label: "12 months", discount: 15 },
];

// Monthly prices per currency (display only). The server charges from its
// own table in Articulate60-backend/utils/plans.js and sends it to Manage
// Membership, which uses the server's numbers when it has them.
// USD: Bloom $4. Flourish and Infinity are placeholders until decided.
export const PRICES = {
  NGN: { bloom: 4900, flourish: 8000, infinity: 29800 },
  USD: { bloom: 4, flourish: 7, infinity: 24 },
};

export const CURRENCIES = [
  { id: "NGN", label: "Naira (₦)" },
  { id: "USD", label: "Dollars ($)" },
];

export function formatNaira(amount) {
  return `₦${Math.round(amount).toLocaleString("en-NG")}`;
}

export function formatMoney(amount, currency = "NGN") {
  if (currency === "USD") {
    const whole = Number.isInteger(Math.round(amount * 100) / 100);
    return `$${Number(amount).toLocaleString("en-US", {
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return formatNaira(amount);
}

// Monthly price of a plan in a currency.
export function monthlyPrice(plan, currency = "NGN", prices = PRICES) {
  return (
    prices[currency]?.[plan.id] ?? (currency === "NGN" ? plan.priceNaira : 0)
  );
}

// Total for a plan over a billing period, after its discount.
export function priceFor(
  plan,
  periodId = "monthly",
  currency = "NGN",
  prices = PRICES,
) {
  const period =
    BILLING_PERIODS.find((p) => p.id === periodId) || BILLING_PERIODS[0];
  const total =
    monthlyPrice(plan, currency, prices) *
    period.months *
    (1 - period.discount / 100);
  return Math.round(total * 100) / 100;
}

const GROUP_USAGE_KEY = "loquiex.groupMinutes";
// Old testing keys (plan chosen on this device); cleared on load.
const OLD_DEMO_KEYS = ["loquiex.demoPlan", "loquiex.demoSubscription"];

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
    // Private mode or storage blocked: the cached copy just won't persist.
  }
}

OLD_DEMO_KEYS.forEach((key) => writeStorage(key, null));

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || null;
  } catch {
    return null;
  }
}

function saveStoredUser(patch) {
  const user = getStoredUser();
  if (!user) return;
  localStorage.setItem("user", JSON.stringify({ ...user, ...patch }));
}

// The plan comes from the server only (it is set there after Paystack
// confirms a payment). This copy is just for display; the server checks the
// plan again on every request that needs it.
export function getPlanId(user = getStoredUser()) {
  const id = user?.subscription?.planId || user?.plan;
  if (id === "pro") return "bloom";
  if (!PLANS.some((p) => p.id === id) || id === "free") return "free";
  const expires = user?.subscription?.expiresAt;
  if (expires && new Date(expires) <= new Date()) return "free";
  return id;
}

// Reloads the plan from the server into this tab's saved user.
export async function refreshPlanFromServer() {
  if (!getStoredUser()) return null;
  try {
    const { data } = await api.get("/api/billing/me");
    saveStoredUser({
      plan: data.subscription.planId,
      subscription: data.subscription,
    });
    return data;
  } catch {
    return null; // Offline: keep showing the last known plan.
  }
}

export function getPlan(user) {
  const id = getPlanId(user);
  return PLANS.find((p) => p.id === id) || PLANS[0];
}

export function isPaidPlan(user) {
  return getPlanId(user) !== "free";
}

// Group practice is only on plans with group minutes (Flourish, Infinity).
export function hasGroupPractice(user) {
  return getPlan(user).limits.groupMinutesPerMonth !== 0;
}

// Plans that include group practice, for "included with ..." copy.
export function groupPracticePlanNames() {
  return PLANS.filter((p) => p.limits.groupMinutesPerMonth !== 0).map((p) =>
    p.name.replace(/^Loquiex\s+/, ""),
  );
}

// { planId, periodId, startedAt, expiresAt } from the server, or null on Free.
export function getSubscription(user = getStoredUser()) {
  const planId = getPlanId(user);
  if (planId === "free") return null;
  const sub = user?.subscription || {};
  const period =
    BILLING_PERIODS.find((p) => p.id === sub.periodId) || BILLING_PERIODS[0];
  return {
    planId,
    periodId: period.id,
    startedAt: sub.startedAt || null,
    expiresAt: sub.expiresAt || null,
  };
}

// --- Paystack checkout ------------------------------------------------------
// The app only sends WHICH plan and period; the server sets the price, starts
// the Paystack payment and returns Paystack's secure checkout page.
const PENDING_KEY = "loquiex.pendingPayment";

export async function startCheckout(planId, periodId, currency = "NGN") {
  const { data } = await api.post("/api/billing/checkout", {
    planId,
    periodId,
    currency,
  });
  const url = new URL(data.authorizationUrl);
  if (
    url.protocol !== "https:" ||
    !/(^|\.)paystack\.(co|com)$/.test(url.hostname)
  ) {
    throw new Error("Unexpected payment page.");
  }
  writeStorage(PENDING_KEY, data.reference);
  window.location.assign(url.toString());
}

// A payment started in this browser that hasn't been confirmed yet.
export function pendingPaymentReference() {
  return readStorage(PENDING_KEY);
}

// Asks the server to confirm a payment with Paystack. Returns
// { payment: { status, ... }, subscription }.
export async function verifyPayment(reference) {
  const { data } = await api.post("/api/billing/verify", { reference });
  if (data.payment.status !== "pending") writeStorage(PENDING_KEY, null);
  saveStoredUser({
    plan: data.subscription.planId,
    subscription: data.subscription,
  });
  return data;
}

// Local calendar day, e.g. "2026-11-05" (resets follow the user's clock).
function dayKeyOf(date = new Date()) {
  const d = new Date(date);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function todayKey() {
  return dayKeyOf();
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

// AI feedback used so far this calendar month.
export function aiFeedbackUsedThisMonth(recordings = []) {
  const now = new Date();
  return recordings.filter((r) => {
    if (r.analysisStatus !== "done" || !r.analyzedAt) return false;
    const d = new Date(r.analyzedAt);
    return (
      d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    );
  }).length;
}

// Group practice minutes are counted by the server while a member is in a
// call (GET /api/group/usage). This browser keeps a copy, as
// { days: { "2026-11-05": 12, ... } }, so pages can show usage instantly;
// fetchGroupUsage() refreshes it from the server.
function readGroupLog() {
  try {
    const saved = JSON.parse(readStorage(GROUP_USAGE_KEY) || "{}");
    if (saved.days && typeof saved.days === "object") return saved.days;
    // Older format: { day, minutes } for a single day.
    if (saved.day) return { [saved.day]: Number(saved.minutes) || 0 };
  } catch {
    // Corrupt value: start fresh.
  }
  return {};
}

export function groupMinutesUsedToday() {
  return Number(readGroupLog()[todayKey()]) || 0;
}

export function groupMinutesUsedThisMonth() {
  const prefix = todayKey().slice(0, 7);
  return Object.entries(readGroupLog())
    .filter(([day]) => day.startsWith(prefix))
    .reduce((total, [, minutes]) => total + (Number(minutes) || 0), 0);
}

// Replaces the local copy with the server's day-by-day minutes.
export function applyServerGroupDays(days) {
  if (!days || typeof days !== "object") return;
  writeStorage(GROUP_USAGE_KEY, JSON.stringify({ days }));
}

// Today's AI feedback allowance, counted by the server (Solo tab meter).
// { state: "paid" | "trial" | "locked", planId, limit (null = unlimited),
//   used, left, resetsAt, trialEndsAt, trialDaysLeft }, or null when offline.
export async function fetchAiAllowance() {
  try {
    const { data } = await api.get("/api/practice/ai-allowance");
    return data && data.state ? data : null;
  } catch {
    return null;
  }
}

// Loads this month's group minutes from the server (and the plan the server
// applies). Returns the server summary, or null when offline.
export async function fetchGroupUsage() {
  try {
    const { data } = await api.get("/api/group/usage");
    applyServerGroupDays(data.days);
    return data;
  } catch {
    return null;
  }
}

export function addGroupMinutes(minutes) {
  const days = readGroupLog();
  const key = todayKey();
  days[key] = (Number(days[key]) || 0) + minutes;
  // Keep about two months of history.
  const keep = Object.keys(days).sort().slice(-62);
  const trimmed = Object.fromEntries(keep.map((day) => [day, days[day]]));
  writeStorage(GROUP_USAGE_KEY, JSON.stringify({ days: trimmed }));
  return groupMinutesUsedThisMonth();
}

// What's left right now. `total`/`left` are null when unlimited.
//   aiFeedback: today's room, limited by both the daily cap and what's left
//               of the monthly allowance.
//   groupMinutes: what's left of this month's minutes.
export function getUsage(recordings, user) {
  const plan = getPlan(user);
  const limits = effectiveLimits(user);
  const { aiFeedbackPerDay, aiFeedbackPerMonth, groupMinutesPerMonth } = limits;
  const aiToday = aiFeedbackUsedToday(recordings);
  const aiMonth = aiFeedbackUsedThisMonth(recordings);
  const groupMonth = groupMinutesUsedThisMonth();

  let aiLeft = null;
  if (aiFeedbackPerDay !== null)
    aiLeft = Math.max(0, aiFeedbackPerDay - aiToday);
  if (aiFeedbackPerMonth !== null) {
    const monthLeft = Math.max(0, aiFeedbackPerMonth - aiMonth);
    aiLeft = aiLeft === null ? monthLeft : Math.min(aiLeft, monthLeft);
  }

  return {
    plan,
    limits,
    onAiTrial: plan.id === "free" && isOnAiTrial(user),
    aiTrialDaysLeft: aiTrialDaysLeft(user),
    aiFeedback: {
      total: aiFeedbackPerDay,
      left: aiLeft,
      usedToday: aiToday,
      usedThisMonth: aiMonth,
      monthTotal: aiFeedbackPerMonth,
    },
    groupMinutes: {
      total: groupMinutesPerMonth,
      left:
        groupMinutesPerMonth === null
          ? null
          : Math.max(0, groupMinutesPerMonth - groupMonth),
      usedToday: groupMinutesUsedToday(),
      usedThisMonth: groupMonth,
    },
  };
}
