// Membership payments with Paystack.
//
//   POST /api/billing/checkout   { planId, periodId, currency }  -> { authorizationUrl, reference }
//   POST /api/billing/verify     { reference }         -> { status, subscription }
//   GET  /api/billing/me                               -> { subscription, payments }
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
const { settlePayment } = require("../services/billing");
const {
  BILLING_PERIODS,
  PAID_PLAN_IDS,
  PRICES,
  enabledCurrencies,
  priceMinorFor,
  subscriptionOf,
} = require("../utils/plans");

const router = express.Router();

const REFERENCE_RE = /^LQX-[a-f0-9]{24}$/;

const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.userId),
  message: { message: "Too many checkout attempts. Please wait a few minutes." },
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
    currency: p.currency,
    paidAt: p.paidAt,
    planExpiresAt: p.planExpiresAt,
    createdAt: p.createdAt,
  };
}

// POST /api/billing/checkout
router.post("/checkout", authMiddleware, checkoutLimiter, async (req, res) => {
  if (!paystack.isConfigured()) return notConfigured(res);

  const planId = String(req.body?.planId || "");
  const periodId = String(req.body?.periodId || "");
  const currency = String(req.body?.currency || "NGN").toUpperCase();
  if (!PAID_PLAN_IDS.includes(planId) || !BILLING_PERIODS[periodId]) {
    return res.status(400).json({ message: "Choose a plan and billing period." });
  }
  if (!enabledCurrencies().includes(currency)) {
    return res.status(400).json({ message: "That currency isn't available." });
  }
  const amountMinor = priceMinorFor(planId, periodId, currency);
  if (!amountMinor) return res.status(400).json({ message: "Choose a plan and billing period." });

  try {
    const user = await User.findById(req.userId, { email: 1 });
    if (!user) return res.status(404).json({ message: "User not found." });

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
    });

    const appUrl = (process.env.APP_URL || "").trim().replace(/\/+$/, "");
    const tx = await paystack.initializeTransaction({
      email: user.email,
      amountMinor,
      currency,
      reference,
      callbackUrl: appUrl ? `${appUrl}/app/membership` : null,
      metadata: {
        userId: String(user._id),
        planId,
        periodId,
        currency,
        cancel_action: appUrl ? `${appUrl}/app/membership` : undefined,
      },
    });

    res.status(201).json({
      reference: payment.reference,
      authorizationUrl: tx.authorization_url,
      amount: amountMinor / 100,
      currency,
      mode: payment.mode,
    });
  } catch (err) {
    console.error("Checkout failed:", err.message);
    if (err.code === "NOT_CONFIGURED") return notConfigured(res);
    res.status(502).json({ message: "Couldn't start the payment. Please try again." });
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
    res.status(502).json({ message: "Couldn't confirm the payment yet. Please try again." });
  }
});

// GET /api/billing/me — current plan and recent payments.
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const [subscription, payments] = await Promise.all([
      subscriptionFor(req.userId),
      Payment.find({ user: req.userId, status: { $ne: "pending" } })
        .sort({ createdAt: -1 })
        .limit(12),
    ]);
    if (!subscription) return res.status(404).json({ message: "User not found." });
    res.json({
      subscription,
      payments: payments.map(publicPayment),
      mode: paystack.mode(),
      available: paystack.isConfigured(),
      currencies: enabledCurrencies(),
      prices: Object.fromEntries(enabledCurrencies().map((c) => [c, PRICES[c]])),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Couldn't load your membership." });
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
