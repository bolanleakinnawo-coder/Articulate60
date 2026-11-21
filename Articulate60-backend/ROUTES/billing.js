// Membership payments with Paystack.
//
//   POST /api/billing/checkout   { planId, periodId, currency, popup }
//                                -> { accessCode, authorizationUrl, reference }
//   GET  /api/billing/quote?planId&periodId&currency
//                                -> { kind, total, credit, amount, daysLeft, ... }
//   POST /api/billing/verify     { reference }         -> { status, subscription }
//   POST /api/billing/sync                             -> { applied, subscription }
//   GET  /api/billing/me                               -> { subscription, payments }
//   POST /api/billing/cancel                           -> { subscription }
//   POST /api/billing/resume                           -> { subscription }
//   POST /api/billing/paystack/webhook  (Paystack only; signed, raw body)
//
// The app only ever says WHICH plan and period it wants. The price comes from
// utils/plans.js, the reference is made here, and a plan is given only after
// Paystack's API confirms the payment (services/billing.js).
const crypto = require("crypto");
const express = require("express");
const rateLimit = require("express-rate-limit");

const authMiddleware = require("../middleware/auth");
const User = require("../MODELS/User");
const Payment = require("../MODELS/Payment");
const paystack = require("../services/paystack");
const { settlePayment, settlePendingFor } = require("../services/billing");
const { returnUrlFor } = require("../utils/returnUrl");
const { teamOf } = require("../services/team");
const {
  BILLING_PERIODS,
  PURCHASABLE_PLAN_IDS,
  TEAM_PLANS,
  PRICES,
  enabledCurrencies,
  subscriptionOf,
  checkoutQuote,
} = require("../utils/plans");
const { trialStarted } = require("../services/autoEmails");

const router = express.Router();

const REFERENCE_RE = /^LQX-[a-f0-9]{24}$/;

const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.userId),
  message: {
    message: "Too many checkout attempts. Please wait a few minutes.",
  },
});

const verifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.userId),
  message: { message: "Too many checks. Please wait a moment." },
});

function notConfigured(res) {
  return res.status(503).json({
    code: "PAYMENTS_UNAVAILABLE",
    message: "Payments aren't available right now. Please try again later.",
  });
}

async function subscriptionFor(userId) {
  const user = await User.findById(userId, {
    plan: 1,
    planExpiresAt: 1,
    planStartedAt: 1,
    planPeriodId: 1,
    planCancelledAt: 1,
    team: 1,
    teamPlan: 1,
    teamPlanStartedAt: 1,
    teamPlanExpiresAt: 1,
    createdAt: 1,
    trialByChoice: 1,
    aiTrialStartedAt: 1,
  });
  return user ? subscriptionOf(user) : null;
}

function publicPayment(p) {
  return {
    reference: p.reference,
    status: p.status === "flagged" ? "failed" : p.status,
    planId: p.planId,
    periodId: p.periodId,
    amount: p.amountMinor / 100,
    credit: (p.creditMinor || 0) / 100,
    currency: p.currency,
    paidAt: p.paidAt,
    planExpiresAt: p.planExpiresAt,
    createdAt: p.createdAt,
  };
}

const QUOTE_FIELDS = { plan: 1, planExpiresAt: 1, planPeriodId: 1, email: 1 };

// Words for the app (amounts in whole naira / dollars).
function publicQuote(q, currency) {
  return {
    kind: q.kind,
    currency,
    total: q.totalMinor / 100,
    credit: q.creditMinor / 100,
    amount: q.amountMinor / 100,
    daysLeft: q.daysLeft,
    fromPlanId: q.fromPlanId,
    fromExpiresAt: q.fromExpiresAt,
    tooMuchCredit: q.tooMuchCredit,
  };
}

// The "Joining a team" warning (Sheriff's words, round 11). The app shows it
// before this is ever sent; this is the server's own check.
const ENDS_INDIVIDUAL_PLAN = {
  code: "ENDS_INDIVIDUAL_PLAN",
  message:
    "Your individual subscription will end immediately when you join this team. Any unused days and allowances will be forfeited, as individual and team allowances cannot be combined.",
};

function downgradeMessage(q) {
  const date = new Date(q.fromExpiresAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `You can move to a lower plan when your current plan ends on ${date}.`;
}

// GET /api/billing/quote — what the member would pay, including any upgrade
// credit, so the app can show it before Paystack opens.
router.get("/quote", authMiddleware, async (req, res) => {
  const planId = String(req.query?.planId || "");
  const periodId = String(req.query?.periodId || "monthly");
  const currency = String(req.query?.currency || "NGN").toUpperCase();
  if (!PURCHASABLE_PLAN_IDS.includes(planId) || !BILLING_PERIODS[periodId]) {
    return res.status(400).json({ message: "Choose a plan and billing period." });
  }
  if (!enabledCurrencies().includes(currency)) {
    return res.status(400).json({ message: "That currency isn't available." });
  }
  try {
    const user = await User.findById(req.userId, QUOTE_FIELDS);
    if (!user) return res.status(404).json({ message: "User not found." });
    const q = checkoutQuote(user, planId, periodId, currency);
    if (!q) return res.status(400).json({ message: "Choose a plan and billing period." });
    res.json({ quote: publicQuote(q, currency) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Couldn't work out the price. Please try again." });
  }
});

// POST /api/billing/checkout
router.post("/checkout", authMiddleware, checkoutLimiter, async (req, res) => {
  if (!paystack.isConfigured()) return notConfigured(res);

  const planId = String(req.body?.planId || "");
  const periodId = String(req.body?.periodId || "");
  const currency = String(req.body?.currency || "NGN").toUpperCase();
  if (!PURCHASABLE_PLAN_IDS.includes(planId) || !BILLING_PERIODS[periodId]) {
    return res
      .status(400)
      .json({ message: "Choose a plan and billing period." });
  }
  if (!enabledCurrencies().includes(currency)) {
    return res.status(400).json({ message: "That currency isn't available." });
  }
  try {
    const user = await User.findById(req.userId, QUOTE_FIELDS);
    if (!user) return res.status(404).json({ message: "User not found." });
    // Round 11: the price, less any upgrade credit, worked out here only.
    const quote = checkoutQuote(user, planId, periodId, currency);
    if (!quote)
      return res.status(400).json({ message: "Choose a plan and billing period." });
    if (quote.kind === "downgrade") {
      return res.status(409).json({ code: "DOWNGRADE_LATER", message: downgradeMessage(quote) });
    }
    if (quote.tooMuchCredit) {
      return res.status(409).json({
        code: "CREDIT_TOO_LARGE",
        message:
          "Your unused days are worth more than this. Choose a longer billing period.",
      });
    }
    const endsIndividualPlan = Boolean(TEAM_PLANS[planId] && quote.fromPlanId);
    if (endsIndividualPlan && req.body?.endIndividualPlan !== true) {
      return res.status(409).json(ENDS_INDIVIDUAL_PLAN);
    }
    const amountMinor = quote.amountMinor;
    // Team plans: a member of someone else's team leaves it before starting
    // their own team.
    if (TEAM_PLANS[planId]) {
      const current = await teamOf(user._id);
      if (current && String(current.admin) !== String(user._id)) {
        return res.status(409).json({
          message:
            "You're in someone else's team. Leave it first to start your own team.",
        });
      }
    }

    const reference = `LQX-${crypto.randomBytes(12).toString("hex")}`;
    const payment = await Payment.create({
      user: user._id,
      reference,
      mode: paystack.mode(),
      planId,
      periodId,
      months: BILLING_PERIODS[periodId].months,
      amountMinor,
      currency,
      fullAmountMinor: quote.totalMinor,
      creditMinor: quote.creditMinor,
      creditDays: quote.kind === "upgrade" ? quote.daysLeft : 0,
      upgradeFromPlanId: quote.kind === "upgrade" ? quote.fromPlanId : null,
      upgradeFromExpiresAt: quote.kind === "upgrade" ? quote.fromExpiresAt : null,
      endsIndividualPlan,
      teamName: TEAM_PLANS[planId]
        ? String(req.body?.teamName || "").trim().slice(0, 60)
        : "",
    });

    // Pop-up checkout (the normal way) needs no return address. The back-up
    // full-page checkout returns to the site the member is on.
    const popup = req.body?.popup !== false;
    const back = popup ? null : returnUrlFor(req, "/app/membership");
    const tx = await paystack.initializeTransaction({
      email: user.email,
      amountMinor,
      currency,
      reference,
      callbackUrl: back,
      metadata: {
        userId: String(user._id),
        kind: "plan",
        planId,
        periodId,
        currency,
        cancel_action: back || undefined,
      },
    });

    res.status(201).json({
      reference: payment.reference,
      accessCode: tx.access_code,
      authorizationUrl: tx.authorization_url,
      amount: amountMinor / 100,
      credit: quote.creditMinor / 100,
      currency,
      mode: payment.mode,
    });
  } catch (err) {
    console.error("Checkout failed:", err.message);
    if (err.code === "NOT_CONFIGURED") return notConfigured(res);
    res
      .status(502)
      .json({ message: "Couldn't start the payment. Please try again." });
  }
});

// POST /api/billing/verify — called when the member returns from Paystack.
// Only the member who started the payment can check it.
router.post("/verify", authMiddleware, verifyLimiter, async (req, res) => {
  const reference = String(req.body?.reference || "");
  if (!REFERENCE_RE.test(reference)) {
    return res.status(400).json({ message: "Unknown payment." });
  }
  try {
    let payment = await Payment.findOne({ reference, user: req.userId });
    if (!payment) return res.status(404).json({ message: "Unknown payment." });

    if (!(payment.status === "success" && payment.appliedAt)) {
      if (!paystack.isConfigured()) return notConfigured(res);
      payment = await settlePayment(payment);
    }

    res.json({
      payment: publicPayment(payment),
      subscription: await subscriptionFor(req.userId),
    });
  } catch (err) {
    console.error("Verify failed:", err.message);
    res
      .status(502)
      .json({ message: "Couldn't confirm the payment yet. Please try again." });
  }
});

// POST /api/billing/sync — run when the app opens (and on Membership/Learn).
// Checks this member's unconfirmed payments with Paystack and applies the
// paid ones, so a payment always lands even if the pop-up was closed, the
// phone lost signal, or the webhook didn't arrive.
router.post("/sync", authMiddleware, verifyLimiter, async (req, res) => {
  try {
    const applied = await settlePendingFor(req.userId);
    res.json({
      applied: applied.map((p) => ({
        reference: p.reference,
        kind: p.kind,
        planId: p.kind === "book" ? null : p.planId,
        productId: p.kind === "book" ? p.productId : null,
        amount: p.amountMinor / 100,
        currency: p.currency,
        planExpiresAt: p.planExpiresAt,
      })),
      subscription: await subscriptionFor(req.userId),
    });
  } catch (err) {
    console.error("Payment sync failed:", err.message);
    res.status(502).json({ message: "Couldn't check your payments right now." });
  }
});

// GET /api/billing/me — current plan and recent payments.
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const [subscription, payments] = await Promise.all([
      subscriptionFor(req.userId),
      Payment.find({ user: req.userId, status: { $ne: "pending" }, kind: { $ne: "book" } })
        .sort({ createdAt: -1 })
        .limit(12),
    ]);
    if (!subscription)
      return res.status(404).json({ message: "User not found." });
    res.json({
      subscription,
      payments: payments.map(publicPayment),
      mode: paystack.mode(),
      available: paystack.isConfigured(),
      currencies: enabledCurrencies(),
      prices: Object.fromEntries(
        enabledCurrencies().map((c) => [c, PRICES[c]]),
      ),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Couldn't load your membership." });
  }
});

// POST /api/billing/start-trial — round 14 (Sheriff): the 3-day free trial
// is no longer automatic. A new free member starts it themselves, once.
router.post("/start-trial", authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const result = await User.updateOne(
      { _id: req.userId, trialByChoice: true, aiTrialStartedAt: { $exists: false } },
      { $set: { aiTrialStartedAt: now } },
    );
    const subscription = await subscriptionFor(req.userId);
    if (!subscription) return res.status(404).json({ message: "User not found." });
    if (result.modifiedCount && subscription.planId === "free") {
      trialStarted(req.userId, subscription.aiTrialEndsAt).catch(() => {});
    }
    res.json({ subscription });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Couldn't start your free trial. Please try again." });
  }
});

// POST /api/billing/cancel — the member cancels their plan. Plans are prepaid
// and never renew on their own, so nothing is refunded or charged: they keep
// everything they paid for until planExpiresAt, then move to Free.
router.post("/cancel", authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    await User.updateOne(
      { _id: req.userId, planExpiresAt: { $gt: now }, planCancelledAt: null },
      { $set: { planCancelledAt: now } },
    );
    const subscription = await subscriptionFor(req.userId);
    if (!subscription) return res.status(404).json({ message: "User not found." });
    res.json({ subscription });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Couldn't cancel your plan. Please try again." });
  }
});

// POST /api/billing/resume — undo a cancel while the plan is still active.
router.post("/resume", authMiddleware, async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.userId, planExpiresAt: { $gt: new Date() } },
      { $set: { planCancelledAt: null } },
    );
    const subscription = await subscriptionFor(req.userId);
    if (!subscription) return res.status(404).json({ message: "User not found." });
    res.json({ subscription });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Couldn't update your plan. Please try again." });
  }
});

// POST /api/billing/paystack/webhook — mounted in index.js with a RAW body
// parser (the signature is over the exact bytes Paystack sent).
async function paystackWebhook(req, res) {
  if (!paystack.isValidSignature(req.body, req.get("x-paystack-signature"))) {
    return res.status(401).end();
  }
  let event;
  try {
    event = JSON.parse(req.body.toString("utf8"));
  } catch {
    return res.status(400).end();
  }

  if (event?.event !== "charge.success") return res.sendStatus(200);

  const reference = String(event.data?.reference || "");
  if (!REFERENCE_RE.test(reference)) return res.sendStatus(200); // not ours

  try {
    const payment = await Payment.findOne({ reference });
    if (!payment) {
      console.error("Webhook for unknown reference", reference);
      return res.sendStatus(200);
    }
    // Re-checks with Paystack's API before giving the plan.
    await settlePayment(payment);
    res.sendStatus(200);
  } catch (err) {
    // A non-200 makes Paystack retry later; settling is safe to repeat.
    console.error("Webhook failed:", err.message);
    res.sendStatus(500);
  }
}

module.exports = router;
module.exports.paystackWebhook = paystackWebhook;
