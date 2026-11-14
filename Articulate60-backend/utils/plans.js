// Plans, prices and allowances the SERVER enforces. The app (src/data/plans.js)
// only displays these; every price charged and every plan granted comes from
// here. Keep the two files in step.
//
//   groupMinutesPerDay:    the call time members get EACH DAY (their own
//                          calendar day, resets at their midnight).
//                          null = unlimited, 0 = not included.
//   groupMinutesPerMonth:  kept only as "is group practice included" (0 = no);
//                          the monthly cap is no longer enforced (Sheriff,
//                          2026-11-10: daily limits only).
//   unlimitedSeats:        may host a call with "Unlimited" seats.
const PLAN_LIMITS = {
  free: { name: "Loquiex Free", groupMinutesPerMonth: 0, groupMinutesPerDay: 0 },
  bloom: { name: "Loquiex Bloom", groupMinutesPerMonth: 0, groupMinutesPerDay: 0 },
  flourish: {
    name: "Loquiex Flourish",
    groupMinutesPerMonth: 2700,
    groupMinutesPerDay: 90,
  },
  infinity: {
    name: "Loquiex Infinity",
    groupMinutesPerMonth: null,
    groupMinutesPerDay: null,
    unlimitedSeats: true,
  },
};

// ---- PRICES: monthly price per plan, per currency, before any billing-period
// discount. This is the ONE place to change what members are charged (the
// app's src/data/plans.js PRICES only displays them; keep both in step).
// USD: Bloom is $4/month (Sheriff). Flourish and Infinity are PLACEHOLDERS
// (same ratio to Bloom as in naira) until their dollar prices are decided.
const PRICES = {
  NGN: { bloom: 4900, flourish: 8000, infinity: 29800 },
  USD: {
    bloom: 4,
    flourish: 7 /* placeholder */,
    infinity: 24 /* placeholder */,
  },
};

const PLAN_IDS = Object.keys(PLAN_LIMITS);
const PAID_PLAN_IDS = Object.keys(PRICES.NGN);

// Currencies members can pay in. NGN always; USD only once Paystack has
// enabled USD on the account and PAYSTACK_USD_ENABLED=true is set.
function enabledCurrencies() {
  return process.env.PAYSTACK_USD_ENABLED === "true" ? ["NGN", "USD"] : ["NGN"];
}

const BILLING_PERIODS = {
  monthly: { months: 1, discount: 0, label: "Monthly" },
  quarterly: { months: 3, discount: 5, label: "3 months" },
  "half-year": { months: 6, discount: 8, label: "6 months" },
  yearly: { months: 12, discount: 15, label: "12 months" },
};

// Amount to charge in the currency's smallest unit (kobo / cents, which is
// what Paystack expects), or null for an unknown plan, period or currency.
function priceMinorFor(planId, periodId, currency = "NGN") {
  const monthly = PRICES[currency]?.[planId];
  const period = BILLING_PERIODS[periodId];
  if (!monthly || !period) return null;
  return Math.round(
    monthly * period.months * (1 - period.discount / 100) * 100,
  );
}

// The plan a member actually has right now. A paid plan only counts while a
// verified payment covers it (planExpiresAt in the future). Plans saved
// without a payment (the old testing switch, or old "pro" accounts) count as
// Free. Every projection that reads `plan` must also read `planExpiresAt`.
function planIdOf(user, now = new Date()) {
  const id = user?.plan === "pro" ? "bloom" : user?.plan;
  if (!PLAN_LIMITS[id] || id === "free") return "free";
  const expires = user?.planExpiresAt ? new Date(user.planExpiresAt) : null;
  if (!expires || !(expires > now)) return "free";
  return id;
}

function limitsFor(user) {
  return PLAN_LIMITS[planIdOf(user)];
}

function hasGroupPractice(user) {
  return limitsFor(user).groupMinutesPerMonth !== 0;
}

function isPaid(user) {
  return planIdOf(user) !== "free";
}

// ---- FREE TRIAL of AI feedback (Sheriff, 2026-11-06) ----------------------
// Free has NO AI feedback, except a trial for the first 3 days after sign-up
// (up to AI_TRIAL_PER_DAY a day). Bloom: AI feedback, no group practice.
// Flourish and Infinity: AI feedback and group practice.
const AI_TRIAL_DAYS = 3;
const AI_TRIAL_PER_DAY = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

// When this member's free AI trial ends (null if the sign-up date is unknown).
function aiTrialEndsAt(user) {
  const created = user?.createdAt ? new Date(user.createdAt) : null;
  if (!created || Number.isNaN(created.getTime())) return null;
  return new Date(created.getTime() + AI_TRIAL_DAYS * DAY_MS);
}

function isOnAiTrial(user, now = new Date()) {
  if (isPaid(user)) return false;
  const ends = aiTrialEndsAt(user);
  return Boolean(ends && ends > now);
}

function canUseAiFeedback(user, now = new Date()) {
  return isPaid(user) || isOnAiTrial(user, now);
}

// ---- AI FEEDBACK PER DAY (Sheriff, 2026-11-05) ----------------------------
// Each member's own calendar day. null = unlimited. Keep in step with
// aiFeedbackPerDay in src/data/plans.js.
const AI_FEEDBACK_PER_DAY = { free: 0, bloom: 5, flourish: 12, infinity: null };

// How many AI feedback sessions this member may have today:
// a paid plan's daily cap, the trial's AI_TRIAL_PER_DAY, or 0.
function aiDailyLimit(user, now = new Date()) {
  const planId = planIdOf(user, now);
  if (planId !== "free") return AI_FEEDBACK_PER_DAY[planId] ?? null;
  return isOnAiTrial(user, now) ? AI_TRIAL_PER_DAY : 0;
}

// What the app shows on Manage Membership.
function subscriptionOf(user, now = new Date()) {
  const planId = planIdOf(user, now);
  if (planId === "free") {
    const trialEnds = aiTrialEndsAt(user);
    return {
      planId,
      periodId: null,
      startedAt: null,
      expiresAt: null,
      aiTrialEndsAt: trialEnds,
      onAiTrial: isOnAiTrial(user, now),
    };
  }
  return {
    planId,
    periodId: BILLING_PERIODS[user.planPeriodId]
      ? user.planPeriodId
      : "monthly",
    startedAt: user.planStartedAt || null,
    expiresAt: user.planExpiresAt,
    cancelledAt: user.planCancelledAt || null,
  };
}

// Calendar months, clamped so 31 Jan + 1 month = 28/29 Feb.
function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d;
}

// Fields to read whenever plan access is checked.
const PLAN_FIELDS = { plan: 1, planExpiresAt: 1, createdAt: 1 };

module.exports = {
  PLAN_LIMITS,
  PLAN_IDS,
  PAID_PLAN_IDS,
  BILLING_PERIODS,
  PLAN_FIELDS,
  PRICES,
  enabledCurrencies,
  priceMinorFor,
  planIdOf,
  limitsFor,
  hasGroupPractice,
  isPaid,
  AI_TRIAL_DAYS,
  AI_TRIAL_PER_DAY,
  aiTrialEndsAt,
  isOnAiTrial,
  canUseAiFeedback,
  AI_FEEDBACK_PER_DAY,
  aiDailyLimit,
  subscriptionOf,
  addMonths,
};
