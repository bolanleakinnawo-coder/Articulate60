// The ONLY place a member's paid plan is set. A plan is given only after
// Paystack's own API confirms the payment (never on the app's word or on the
// webhook body alone), and only if the amount, currency and mode match what
// the server asked for. Safe to run any number of times for one reference.
const Payment = require("../MODELS/Payment");
const User = require("../MODELS/User");
const paystack = require("./paystack");
const { planIdOf, addMonths } = require("../utils/plans");

const FAILED = { failed: "failed", abandoned: "abandoned", reversed: "failed" };

// Asks Paystack about `payment` and applies it if paid.
// Returns the Payment as it now stands.
async function settlePayment(payment) {
  if (payment.status === "success" && payment.appliedAt) return payment;
  if (payment.status === "flagged") return payment;

  const tx = await paystack.verifyTransaction(payment.reference);

  if (tx.status !== "success") {
    const next = FAILED[tx.status];
    if (next && payment.status === "pending") {
      return Payment.findOneAndUpdate(
        { _id: payment._id, status: "pending" },
        { $set: { status: next } },
        { returnDocument: "after" },
      ).then((p) => p || Payment.findById(payment._id));
    }
    return payment; // still in progress ("ongoing", "pending", ...)
  }

  const problem = mismatch(payment, tx);
  if (problem) {
    console.error(`Payment ${payment.reference} flagged: ${problem}`);
    return Payment.findOneAndUpdate(
      { _id: payment._id, status: { $ne: "success" } },
      { $set: { status: "flagged", flagReason: problem } },
      { returnDocument: "after" },
    ).then((p) => p || Payment.findById(payment._id));
  }

  await Payment.updateOne(
    { _id: payment._id, status: { $in: ["pending", "failed", "abandoned"] } },
    {
      $set: {
        status: "success",
        paystackId: tx.id ?? null,
        channel: tx.channel || "",
        paidAt: tx.paid_at ? new Date(tx.paid_at) : new Date(),
      },
    },
  );

  const applied = await applyToUser(payment);
  return Payment.findOneAndUpdate(
    { _id: payment._id },
    {
      $set: {
        appliedAt: payment.appliedAt || new Date(),
        ...(applied ? { planStartsAt: applied.startsAt, planExpiresAt: applied.expiresAt } : {}),
      },
    },
    { returnDocument: "after" },
  );
}

function mismatch(payment, tx) {
  if (tx.reference !== payment.reference) return "reference";
  if (Number(tx.amount) !== payment.amountMinor) return `amount ${tx.amount} != ${payment.amountMinor}`;
  if (String(tx.currency).toUpperCase() !== payment.currency) return `currency ${tx.currency}`;
  if (tx.domain && tx.domain !== payment.mode) return `mode ${tx.domain} != ${payment.mode}`;
  return null;
}

// Gives the plan to the member once per reference. Paying again for the plan
// you already have adds the time on; a different plan starts today.
// Optimistic update: retries if another payment changed the plan meanwhile.
async function applyToUser(payment) {
  const ref = payment.reference;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const user = await User.findById(payment.user, {
      plan: 1,
      planExpiresAt: 1,
      planStartedAt: 1,
      planPeriodId: 1,
      appliedPaymentRefs: 1,
    });
    if (!user) throw new Error(`User for payment ${ref} not found.`);
    if (user.appliedPaymentRefs?.includes(ref)) return null;

    const now = new Date();
    const current = planIdOf(user, now);
    const extend = current === payment.planId;
    const startsAt = extend ? user.planStartedAt || now : now;
    const expiresAt = addMonths(extend ? user.planExpiresAt : now, payment.months);

    const result = await User.updateOne(
      {
        _id: user._id,
        appliedPaymentRefs: { $ne: ref },
        planExpiresAt: user.planExpiresAt ?? null,
      },
      {
        $set: {
          plan: payment.planId,
          planStartedAt: startsAt,
          planExpiresAt: expiresAt,
          planPeriodId: payment.periodId,
        },
        $push: { appliedPaymentRefs: ref },
      },
    );
    if (result.modifiedCount === 1) return { startsAt, expiresAt };
  }
  throw new Error(`Could not apply payment ${ref} (busy).`);
}

module.exports = { settlePayment };
