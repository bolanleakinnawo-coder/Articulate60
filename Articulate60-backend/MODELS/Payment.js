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
    planId: { type: String, required: true },
    periodId: { type: String, required: true },
    months: { type: Number, required: true },
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
  },
  { timestamps: true },
);

module.exports = mongoose.model("Payment", paymentSchema);
