// Round 14 (Sheriff): notifications the admin sends by hand from
// Admin > Notifications. Nothing is sent automatically: each one is sent
// when the admin presses Send, or at the time the admin scheduled.
const mongoose = require("mongoose");

const adminNotificationSchema = new mongoose.Schema(
  {
    group: { type: String, required: true },
    message: { type: String, required: true, maxlength: 500 },
    status: {
      type: String,
      enum: ["scheduled", "sending", "sent", "cancelled", "failed"],
      default: "scheduled",
      index: true,
    },
    scheduledFor: { type: Date, default: null, index: true },
    sentAt: { type: Date, default: null },
    // Members in the group when it was sent.
    recipients: { type: Number, default: 0 },
    // Phones/browsers the notification reached.
    delivered: { type: Number, default: 0 },
    error: { type: String, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("AdminNotification", adminNotificationSchema);
