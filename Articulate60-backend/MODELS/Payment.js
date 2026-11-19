const mongoose = require("mongoose");

// One row per checkout started. The amount is fixed by the server when the
// checkout starts and compared with what Paystack says was paid.
const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reference: { type: String, required: true, unique: true },
    provider: { type: String, default: "paystack" },
    mode: { type: String, enum: ["test", "live"], required: true },
    // "plan" = membership, "book" = a Learn book or bundle (productId).
    kind: { type: String, enum: ["plan", "book"], default: "plan" },
    productId: { type: String, default: null },
    // Team plans (round 10): the name given on "Create your team".
    teamName: { type: String, default: "" },
    // Round 11 upgrade credit: the full price, the credit for unused days on
    // the plan being replaced, and that plan as it was at checkout. The
    // amount charged (amountMinor) = fullAmountMinor - creditMinor.
    fullAmountMinor: { type: Number, default: null },
    creditMinor: { type: Number, default: 0 },
    creditDays: { type: Number, default: 0 },
    upgradeFromPlanId: { type: String, default: null },
    upgradeFromExpiresAt: { type: Date, default: null },
    // Round 11 team plans: the payer agreed to the "Joining a team" warning,
    // so their individual plan ends when this payment is applied.
    endsIndividualPlan: { type: Boolean, default: false },
    // True when the launch price was charged.
    launchPrice: { type: Boolean, default: false },
    planId: { type: String, required: function () { return this.kind !== "book"; } },
    periodId: { type: String, required: function () { return this.kind !== "book"; } },
    months: { type: Number, required: function () { return this.kind !== "book"; } },
    // Smallest unit of the currency: kobo for NGN, cents for USD.
    amountMinor: { type: Number, required: true },
    currency: { type: String, enum: ["NGN", "USD"], required: true },
    // pending -> success | failed | abandoned. "flagged" = Paystack reported
    // success but the amount, currency or mode didn't match (never applied).
    status: {
      type: String,
      enum: ["pending", "success", "failed", "abandoned", "flagged"],
      default: "pending",
      index: true,
    },
    flagReason: { type: String, default: "" },
    paystackId: { type: Number, default: null },
    channel: { type: String, default: "" },
    paidAt: { type: Date, default: null },
    // Set once the plan has been given to the member.
    appliedAt: { type: Date, default: null },
    planStartsAt: { type: Date, default: null },
    planExpiresAt: { type: Date, default: null },
    // Last time the server asked Paystack about this payment (pending sweep).
    lastCheckedAt: { type: Date, default: null },
    // A second successful payment for the same plan or book by the same
    // account soon after another one. Shown in Admin so it can be refunded.
    possibleDuplicate: { type: Boolean, default: false },
    duplicateOf: { type: String, default: "" },
    // Set by Admin after refunding the payment in Paystack.
    refundedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Finding a member's unconfirmed payments quickly (app-open check).
paymentSchema.index({ user: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Payment", paymentSchema);
