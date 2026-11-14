const mongoose = require("mongoose");

// "Notify me" requests for Learn items that aren't out yet. Members tap the
// bell in the app (signed in), so the request is tied to their account; the
// admin panel's "Announce launch" sends them a phone + in-app notification.
const learnNotificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    name: { type: String, trim: true, maxlength: 80, default: "" },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: [/^\S+@\S+\.\S+$/, "Invalid email address."],
    },
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    // Set when the launch notification was sent.
    notifiedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

learnNotificationSchema.index({ email: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model("LearnNotification", learnNotificationSchema);
