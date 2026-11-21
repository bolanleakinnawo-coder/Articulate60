// Round 14 (Sheriff): automatic emails, sent through Resend (or Brevo) with
// the settings in services/email.js. Each one can be switched off and its
// subject and text edited in Admin > Emails. The text below is only the
// starting text until the admin saves their own.
//
// Words in curly brackets are filled in for each member:
//   {name}      the member's first name
//   {plan}      the plan, e.g. "Loquiex Bloom"
//   {amount}    the amount paid, e.g. "₦6,800"
//   {reference} the payment reference
//   {date}      the payment date, or the date the plan or trial ends
//   {item}      what was bought
//
// When each one is sent:
//   welcome          straight after sign-up
//   trial_started    when the member starts the 3-day free trial
//   trial_ending     24 hours before the free trial ends
//   trial_ended      when the free trial has ended
//   sub_confirmed    a plan payment went through
//   payment_success  any payment went through (receipt details)
//   payment_failed   Paystack reports a payment failed
//   sub_expiring     3 days before the plan ends
//   sub_expired      the plan has ended
const User = require("../MODELS/User");
const EmailTemplate = require("../MODELS/EmailTemplate");
const { sendEmail, adminTextEmail, isConfigured } = require("./email");
const { aiTrialEndsAt, planIdOf, PLAN_LIMITS } = require("../utils/plans");

const DEFAULTS = {
  welcome: {
    label: "Welcome",
    when: "Immediately after registration",
    subject: "Welcome to Loquiex, {name}",
    body:
      "Hi {name},\n\nWelcome to Loquiex. Your account is ready.\n\nStart your 3-day free trial or choose a plan, then take your first speaking practice today.",
    button: { label: "Open Loquiex", path: "/app/home" },
  },
  trial_started: {
    label: "3-day free trial confirmation",
    when: "When they activate the trial",
    subject: "Your 3-day free trial has started",
    body:
      "Hi {name},\n\nYour 3-day free trial is on. You get AI feedback on your practices until {date}.\n\nMake the most of it: practise every day and see exactly how you communicate.",
    button: { label: "Start practising", path: "/app/practice" },
  },
  trial_ending: {
    label: "Trial ending soon",
    when: "24 hours before the trial ends",
    subject: "Your free trial ends tomorrow",
    body:
      "Hi {name},\n\nYour free trial ends on {date}. Choose a plan to keep your AI feedback going.",
    button: { label: "Choose a plan", path: "/app/membership" },
  },
  trial_ended: {
    label: "Trial ended",
    when: "When the trial has ended",
    subject: "Your free trial has ended",
    body:
      "Hi {name},\n\nYour 3-day free trial has ended. You can keep practising, and a plan brings back your AI feedback.",
    button: { label: "Choose a plan", path: "/app/membership" },
  },
  sub_confirmed: {
    label: "Subscription confirmation",
    when: "When a plan payment goes through",
    subject: "You're on {plan}",
    body:
      "Hi {name},\n\nYour {plan} subscription is active until {date}. Enjoy your practice.",
    button: { label: "Open Loquiex", path: "/app/home" },
  },
  payment_success: {
    label: "Payment successful",
    when: "When any payment goes through (with receipt details)",
    subject: "Payment received: {item}",
    body:
      "Hi {name},\n\nThank you. We received your payment.\n\nItem: {item}\nAmount: {amount}\nReference: {reference}\nDate: {date}",
    button: null,
  },
  payment_failed: {
    label: "Payment failed",
    when: "When a payment fails",
    subject: "Your payment didn't go through",
    body:
      "Hi {name},\n\nYour payment for {item} ({amount}) didn't go through, and you haven't been charged for it. Please try again.",
    button: { label: "Try again", path: "/app/membership" },
  },
  sub_expiring: {
    label: "Subscription expiry reminder",
    when: "3 days before the plan ends",
    subject: "Your {plan} ends in 3 days",
    body:
      "Hi {name},\n\nYour {plan} subscription ends on {date}. Renew to keep everything in your plan.",
    button: { label: "Renew", path: "/app/membership" },
  },
  sub_expired: {
    label: "Subscription expired",
    when: "When the plan has ended",
    subject: "Your {plan} has ended",
    body:
      "Hi {name},\n\nYour {plan} subscription ended on {date}, and your account is now on Loquiex Free. Renew any time to get everything back.",
    button: { label: "Renew", path: "/app/membership" },
  },
};

const KEYS = Object.keys(DEFAULTS);

function appUrl() {
  return (process.env.APP_URL || "").trim().replace(/\/+$/, "");
}

function firstName(user) {
  const full = String(user?.fullName || "").trim();
  if (full) return full.split(/\s+/)[0];
  return user?.displayUsername || user?.username || "there";
}

function formatDate(d) {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lagos",
  });
}

function planName(planId) {
  const name = PLAN_LIMITS[planId]?.name;
  return name ? `Loquiex ${name.replace(/^Loquiex\s+/, "")}` : "your plan";
}

function fill(text, values) {
  return String(text || "").replace(/\{(\w+)\}/g, (match, word) =>
    values[word] !== undefined && values[word] !== null ? String(values[word]) : match,
  );
}

// Every email with the admin's saved text (or the starting text).
async function listTemplates() {
  const rows = await EmailTemplate.find({ key: { $in: KEYS } }).lean();
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
  return KEYS.map((key) => {
    const d = DEFAULTS[key];
    const row = byKey[key];
    return {
      key,
      label: d.label,
      when: d.when,
      subject: row?.subject || d.subject,
      body: row?.body || d.body,
      enabled: row ? row.enabled !== false : true,
      sentCount: row?.sentCount || 0,
      lastSentAt: row?.lastSentAt || null,
    };
  });
}

async function saveTemplate(key, { subject, body, enabled }) {
  if (!DEFAULTS[key]) return null;
  const set = {};
  if (typeof subject === "string") set.subject = subject.trim().slice(0, 200);
  if (typeof body === "string") set.body = body.trim().slice(0, 5000);
  if (typeof enabled === "boolean") set.enabled = enabled;
  await EmailTemplate.updateOne({ key }, { $set: set }, { upsert: true });
  return (await listTemplates()).find((t) => t.key === key);
}

// Sends email `key` to a member, once per `onceKey` (defaults to the key).
// Returns true when it was sent.
async function sendAutoEmail(key, userOrId, values = {}, { onceKey } = {}) {
  const d = DEFAULTS[key];
  if (!d || !isConfigured()) return false;
  const row = await EmailTemplate.findOne({ key }).lean();
  if (row && row.enabled === false) return false;

  const user =
    userOrId && typeof userOrId === "object" && userOrId.email
      ? userOrId
      : await User.findById(userOrId, {
          fullName: 1,
          username: 1,
          displayUsername: 1,
          email: 1,
          emailLog: 1,
        }).lean();
  if (!user?.email) return false;

  const logKey = onceKey || key;
  // Claim it first, so two runs never send the same email twice.
  const claimed = await User.updateOne(
    { _id: user._id, [`emailLog.${logKey}`]: { $exists: false } },
    { $set: { [`emailLog.${logKey}`]: new Date() } },
  );
  if (!claimed.modifiedCount) return false;

  const all = { name: firstName(user), ...values };
  const base = appUrl();
  const mail = adminTextEmail({
    subject: fill(row?.subject || d.subject, all),
    body: fill(row?.body || d.body, all),
    button: d.button && base ? { label: d.button.label, url: `${base}${d.button.path}` } : null,
  });
  try {
    const sent = await sendEmail({ to: user.email, ...mail });
    if (sent) {
      await EmailTemplate.updateOne(
        { key },
        { $inc: { sentCount: 1 }, $set: { lastSentAt: new Date() } },
        { upsert: true },
      );
    }
    return sent;
  } catch (err) {
    // Let a later run try again.
    await User.updateOne({ _id: user._id }, { $unset: { [`emailLog.${logKey}`]: "" } });
    console.error(`Email ${key} failed:`, err.message);
    return false;
  }
}

// ---- Payment emails (called from services/billing.js) ---------------------
function moneyOf(payment) {
  const amount = (payment.amountMinor || 0) / 100;
  const symbol = payment.currency === "USD" ? "$" : "₦";
  return `${symbol}${amount.toLocaleString("en-NG", {
    minimumFractionDigits: payment.currency === "USD" ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

function itemOf(payment) {
  if (payment.kind === "book") {
    const { PRODUCTS } = require("../utils/learn");
    return PRODUCTS[payment.productId]?.title || "Learn";
  }
  const months = payment.months === 1 ? "1 month" : `${payment.months || 1} months`;
  const base = String(payment.planId || "").replace(/-team$/, "");
  const team = String(payment.planId || "").endsWith("-team") ? " Team" : "";
  return `${planName(base)}${team} · ${months}`;
}

async function paymentSucceeded(payment) {
  const values = {
    item: itemOf(payment),
    amount: moneyOf(payment),
    reference: payment.reference,
    date: formatDate(payment.paidAt || new Date()),
  };
  await sendAutoEmail("payment_success", payment.user, values, {
    onceKey: `payment_success:${payment.reference}`,
  });
  if (payment.kind !== "book") {
    const user = await User.findById(payment.user, {
      plan: 1,
      planExpiresAt: 1,
      teamPlan: 1,
      teamPlanExpiresAt: 1,
    }).lean();
    const base = String(payment.planId || "").replace(/-team$/, "");
    const team = String(payment.planId || "").endsWith("-team");
    const ends = team ? user?.teamPlanExpiresAt : user?.planExpiresAt;
    await sendAutoEmail(
      "sub_confirmed",
      payment.user,
      { plan: `${planName(base)}${team ? " Team" : ""}`, date: formatDate(ends) },
      { onceKey: `sub_confirmed:${payment.reference}` },
    );
  }
}

async function trialStarted(userId, endsAt) {
  return sendAutoEmail("trial_started", userId, { date: formatDate(endsAt) });
}

async function paymentFailed(payment) {
  await sendAutoEmail(
    "payment_failed",
    payment.user,
    { item: itemOf(payment), amount: moneyOf(payment), reference: payment.reference },
    { onceKey: `payment_failed:${payment.reference}` },
  );
}

// ---- Timed emails (trial and plan end dates) ------------------------------
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

async function runTimedEmails(now = new Date()) {
  if (!isConfigured()) return { sent: 0 };
  let sent = 0;
  const fields = {
    fullName: 1,
    username: 1,
    displayUsername: 1,
    email: 1,
    emailLog: 1,
    plan: 1,
    planExpiresAt: 1,
    teamPlan: 1,
    teamPlanExpiresAt: 1,
    createdAt: 1,
    trialByChoice: 1,
    aiTrialStartedAt: 1,
  };

  // Free trials ending within 24 hours, or ended in the last 2 days.
  const trialUsers = await User.find(
    {
      $or: [
        { aiTrialStartedAt: { $gte: new Date(now - 6 * DAY) } },
        { trialByChoice: { $exists: false }, createdAt: { $gte: new Date(now - 6 * DAY) } },
      ],
    },
    fields,
  ).lean();
  for (const user of trialUsers) {
    if (planIdOf(user, now) !== "free") continue;
    const ends = aiTrialEndsAt(user);
    if (!ends) continue;
    const left = ends - now;
    const stamp = ends.toISOString().slice(0, 10);
    if (left > 0 && left <= DAY) {
      if (await sendAutoEmail("trial_ending", user, { date: formatDate(ends) }, { onceKey: `trial_ending:${stamp}` })) sent += 1;
    } else if (left <= 0 && left > -2 * DAY) {
      if (await sendAutoEmail("trial_ended", user, { date: formatDate(ends) }, { onceKey: `trial_ended:${stamp}` })) sent += 1;
    }
  }

  // Individual plans ending within 3 days, or ended in the last 2 days.
  const planUsers = await User.find(
    {
      plan: { $ne: "free" },
      planExpiresAt: { $gte: new Date(now - 2 * DAY), $lte: new Date(now.getTime() + 3 * DAY) },
    },
    fields,
  ).lean();
  for (const user of planUsers) {
    const ends = new Date(user.planExpiresAt);
    const stamp = ends.toISOString().slice(0, 10);
    const values = { plan: planName(user.plan === "pro" ? "bloom" : user.plan), date: formatDate(ends) };
    if (ends > now) {
      if (await sendAutoEmail("sub_expiring", user, values, { onceKey: `sub_expiring:${stamp}` })) sent += 1;
    } else if (await sendAutoEmail("sub_expired", user, values, { onceKey: `sub_expired:${stamp}` })) {
      sent += 1;
    }
  }
  return { sent };
}

let timer = null;
function startAutoEmailJob() {
  if (timer) return;
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runTimedEmails();
    } catch (err) {
      console.error("Automatic emails failed:", err.message);
    } finally {
      running = false;
    }
  };
  timer = setInterval(tick, 30 * 60 * 1000);
  timer.unref?.();
  setTimeout(tick, 60 * 1000).unref?.();
}

module.exports = {
  EMAIL_KEYS: KEYS,
  EMAIL_DEFAULTS: DEFAULTS,
  listTemplates,
  saveTemplate,
  sendAutoEmail,
  paymentSucceeded,
  paymentFailed,
  trialStarted,
  runTimedEmails,
  startAutoEmailJob,
};
