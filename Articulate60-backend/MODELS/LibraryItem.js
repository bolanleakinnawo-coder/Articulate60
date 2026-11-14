const mongoose = require("mongoose");

// One row per book a member owns. Created only by services/billing.js after
// Paystack confirms the payment. Reading progress lives here so it follows
// the member to any device.
const libraryItemSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    bookId: { type: String, required: true },
    // The product that was bought (a book, or the bundle that included it).
    productId: { type: String, required: true },
    paymentRef: { type: String, required: true },
    purchasedAt: { type: Date, default: Date.now },
    // Furthest page reached and the page they were last on.
    furthestPage: { type: Number, default: 0 },
    lastPage: { type: Number, default: 0 },
    totalPages: { type: Number, default: 0 },
    lastReadAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

libraryItemSchema.index({ user: 1, bookId: 1 }, { unique: true });

libraryItemSchema.methods.percent = function percent() {
  if (!this.totalPages) return 0;
  return Math.min(100, Math.round((this.furthestPage / this.totalPages) * 100));
};

module.exports = mongoose.model("LibraryItem", libraryItemSchema);
