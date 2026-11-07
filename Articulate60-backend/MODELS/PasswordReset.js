const mongoose = require("mongoose");

// One row per "Forgot password" email. Only a SHA-256 hash of the link's
// token is stored, so a database leak can't be used to reset passwords.
// MongoDB deletes rows on its own once expiresAt has passed (TTL index).
const passwordResetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
    requestedIp: { type: String, default: "" },
  },
  { timestamps: true },
);

passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("PasswordReset", passwordResetSchema);
