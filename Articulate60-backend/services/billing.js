// The ONLY place a member's paid plan is set. A plan is given only after
// Paystack's own API confirms the payment (never on the app's word or on the
// webhook body alone), and only if the amount, currency and mode match what
// the server asked for. Safe to run any number of times for one reference.
const Payment = require("../MODELS/Payment");
const User = require("../MODELS/User");
const paystack = require("./paystack");
const LibraryItem = require("../MODELS/LibraryItem");
const { planIdOf, addMonths } = require("../utils/plans");
const { PRODUCTS } = require("../utils/learn");

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

  const applied =
    payment.kind === "book" ? await addBooksToLibrary(payment) : await applyToUser(payment);
  if (applied?.accountDeleted) {
    console.error(`Payment ${payment.reference} paid after account deletion: refund it in Paystack.`);
    return Payment.findOneAndUpdate(
      { _id: payment._id },
      { $set: { status: "flagged", flagReason: "paid after account was deleted: refund" } },
      { returnDocument: "after" },
    );
  }
  if (!payment.appliedAt) tellMember(payment);
  const duplicate = await findDuplicateOf(payment);
  if (duplicate) {
    console.warn(`Payment ${payment.reference} looks like a duplicate of ${duplicate}: check Admin > Payments.`);
  }
  return Payment.findOneAndUpdate(
    { _id: payment._id },
    {
      $set: {
        appliedAt: payment.appliedAt || new Date(),
        ...(applied?.expiresAt ? { planStartsAt: applied.startsAt, planExpiresAt: applied.expiresAt } : {}),
        ...(duplicate ? { possibleDuplicate: true, duplicateOf: duplicate } : {}),
      },
    },
    { returnDocument: "after" },
  );
}

// Live "your plan is active" / "your book is in your library" in the app,
// if the member has it open (e.g. the webhook landed while they waited).
function tellMember(payment) {
  try {
    const { emitToUser } = require("./realtime");
    emitToUser(String(payment.user), "payment:applied", {
      reference: payment.reference,
      kind: payment.kind || "plan",
      planId: payment.kind === "book" ? null : payment.planId,
      productId: payment.kind === "book" ? payment.productId : null,
    });
  } catch (err) {
    console.error("Payment notice failed:", err.message);
  }
}

// Another successful payment by the same account for the same thing: the
// same book (any time, they already own it) or the same plan within a day.
// The plan time is still added (the money was taken); Admin shows it as a
// possible duplicate so it can be refunded in Paystack.
const DUPLICATE_PLAN_WINDOW_MS = 24 * 60 * 60 * 1000;
async function findDuplicateOf(payment) {
  const query = {
    _id: { $ne: payment._id },
    user: payment.user,
    status: "success",
    refundedAt: null,
  };
  if (payment.kind === "book") {
    const books = PRODUCTS[payment.productId]?.books || [];
    const sameBooks = Object.entries(PRODUCTS)
      .filter(([, p]) => p.books.some((b) => books.includes(b)))
      .map(([id]) => id);
    Object.assign(query, { kind: "book", productId: { $in: sameBooks } });
  } else {
    const at = new Date(payment.createdAt || Date.now()).getTime();
    Object.assign(query, {
      kind: { $ne: "book" },
      planId: payment.planId,
      createdAt: {
        $gte: new Date(at - DUPLICATE_PLAN_WINDOW_MS),
        $lte: new Date(at + DUPLICATE_PLAN_WINDOW_MS),
      },
    });
  }
  const other = await Payment.findOne(query, { reference: 1 }).sort({ createdAt: 1 }).lean();
  return other?.reference || null;
}

// Payments still waiting on Paystack (the member closed the pop-up, lost
// connection, or the webhook didn't arrive). Asks Paystack about each and
// applies the paid ones to the account that STARTED the payment
// (Payment.user), whoever is signed in on this device.
const OPEN_STATUSES = ["pending", "abandoned"];
const LOOK_BACK_MS = 7 * 24 * 60 * 60 * 1000;

async function settleOpen(query, { limit, minGapMs }) {
  const now = Date.now();
  const due = await Payment.find({
    ...query,
    status: { $in: OPEN_STATUSES },
    createdAt: { $gte: new Date(now - LOOK_BACK_MS) },
    $or: [{ lastCheckedAt: null }, { lastCheckedAt: { $lte: new Date(now - minGapMs) } }],
  })
    .sort({ lastCheckedAt: 1, createdAt: -1 })
    .limit(limit);
  const applied = [];
  for (const p of due) {
    await Payment.updateOne({ _id: p._id }, { $set: { lastCheckedAt: new Date() } });
    try {
      const after = await settlePayment(p);
      if (after?.status === "success" && after.appliedAt) applied.push(after);
    } catch (err) {
      if (err.code === "NOT_CONFIGURED") break;
      console.error(`Pending check failed for ${p.reference}:`, err.message);
    }
  }
  return applied;
}

// One member's open payments (app open, Membership, Learn).
function settlePendingFor(userId) {
  if (!paystack.isConfigured()) return Promise.resolve([]);
  return settleOpen({ user: userId }, { limit: 5, minGapMs: 20 * 1000 });
}

// Everyone's open payments, every few minutes, so a payment is applied even
// if the webhook never arrives and the member doesn't open the app.
let sweepTimer = null;
function startPendingPaymentSweep(intervalMs = 5 * 60 * 1000) {
  if (sweepTimer) return;
  const run = async () => {
    if (!paystack.isConfigured()) return;
    try {
      const applied = await settleOpen({}, { limit: 40, minGapMs: 4 * 60 * 1000 });
      if (applied.length) console.log(`Pending sweep applied ${applied.length} payment(s).`);
    } catch (err) {
      console.error("Pending sweep failed:", err.message);
    }
  };
  sweepTimer = setInterval(run, intervalMs);
  sweepTimer.unref?.();
  setTimeout(run, 30 * 1000).unref?.();
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
    // The member deleted their account before this payment came through.
    if (!user) return { accountDeleted: true };
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
          planCancelledAt: null,
        },
        $push: { appliedPaymentRefs: ref },
      },
    );
    if (result.modifiedCount === 1) return { startsAt, expiresAt };
  }
  throw new Error(`Could not apply payment ${ref} (busy).`);
}

// Puts every book the payment covers into the member's library (a bundle
// gives both playbooks). Books they already own keep their reading progress.
async function addBooksToLibrary(payment) {
  const exists = await User.exists({ _id: payment.user });
  if (!exists) return { accountDeleted: true };
  const product = PRODUCTS[payment.productId];
  if (!product) throw new Error(`Unknown product ${payment.productId} on ${payment.reference}`);
  await Promise.all(
    product.books.map((bookId) =>
      LibraryItem.updateOne(
        { user: payment.user, bookId },
        {
          $setOnInsert: {
            productId: payment.productId,
            paymentRef: payment.reference,
            purchasedAt: new Date(),
          },
        },
        { upsert: true },
      ).catch((err) => {
        if (err.code !== 11000) throw err; // a parallel settle already added it
      }),
    ),
  );
  return { books: product.books };
}

module.exports = { settlePayment, settlePendingFor, startPendingPaymentSweep };
