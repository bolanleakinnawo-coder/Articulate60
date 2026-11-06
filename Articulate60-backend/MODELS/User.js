const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
      match: [
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores.",
      ],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email address."],
    },
    marketingOptIn: {
      type: Boolean,
      default: false,
    },
    marketingOptInAt: {
      type: Date,
      default: null,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    role: {
      type: String,
      required: true,
    },
    roleOther: {
      type: String,
      default: "",
    },
    improvements: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) => arr.length > 0,
        message: "At least one improvement must be selected.",
      },
    },
    improvementOther: {
      type: String,
      default: "",
    },
    practiceFrequency: {
      type: String,
      required: true,
    },
    profileImageUrl: {
      type: String,
      default: "",
    },
    // --- Streak tracking (used by /api/practice/complete) ---
    currentStreak: {
      type: Number,
      default: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
    lastPracticeDate: {
      type: Date,
      default: null,
    },
    plan: { type: String, enum: ["free", "pro"], default: "free" },

    // --- Streak notifications ---
    // IANA time zone from the member's device (e.g. "Africa/Lagos"). Streak
    // days, the grace day and reminder times are all worked out in it.
    timeZone: { type: String, default: "" },
    // Mirrors the switches on Profile > Notifications.
    notificationPrefs: {
      streakPopups: { type: Boolean, default: true },
      practiceNudges: { type: Boolean, default: true },
    },
    // Web Push subscriptions, one per device/browser that allowed them.
    pushSubscriptions: {
      type: [
        {
          _id: false,
          endpoint: { type: String, required: true },
          keys: {
            p256dh: { type: String, required: true },
            auth: { type: String, required: true },
          },
          userAgent: { type: String, default: "" },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    // Last local day (YYYY-MM-DD) each reminder was sent, so none repeats.
    reminderLog: { type: Map, of: String, default: {} },
  },
  { timestamps: true },
);

userSchema.index({ "pushSubscriptions.endpoint": 1 });

module.exports = mongoose.model("User", userSchema);
