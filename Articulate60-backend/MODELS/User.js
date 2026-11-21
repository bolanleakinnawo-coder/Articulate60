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
    // The username exactly as the member typed it (capital letters kept),
    // for showing. `username` stays lowercase for sign-in and uniqueness.
    displayUsername: {
      type: String,
      trim: true,
      default: "",
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
    // Goes up by one whenever the password is reset or changed. Every sign-in
    // token carries the number it was made with, so raising it signs the
    // member out on every device (see utils/authToken.js).
    tokenVersion: { type: Number, default: 0 },
    passwordChangedAt: { type: Date, default: null },
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
    // "pro" is the old paid value (shown as Bloom). See utils/plans.js.
    // Never set this from a request body: only billing sets it.
    plan: {
      type: String,
      enum: ["free", "pro", "bloom", "flourish", "infinity"],
      default: "free",
    },
    // --- Paid membership (set ONLY by services/billing.js after Paystack
    // confirms a payment). The plan counts only while planExpiresAt is in
    // the future; see utils/plans.js planIdOf().
    planExpiresAt: { type: Date, default: null },
    planStartedAt: { type: Date, default: null },
    planPeriodId: { type: String, default: null },
    // Set when the member cancels. Plans never renew on their own, so this
    // only records the choice: they keep the plan until planExpiresAt.
    // Cleared by the next successful payment.
    planCancelledAt: { type: Date, default: null },
    // Round 11: when the individual plan was ended because the member joined
    // or started a team (no credit, as the "Joining a team" warning says).
    planEndedForTeamAt: { type: Date, default: null },
    // Round 14 (Sheriff): the 3-day free trial is no longer automatic. New
    // accounts get trialByChoice: true and start the trial themselves
    // (aiTrialStartedAt). Accounts made before round 14 have neither field,
    // and their trial ran from the sign-up date as before.
    trialByChoice: { type: Boolean },
    aiTrialStartedAt: { type: Date },
    // --- Team plan (set ONLY by services/team.js). A member of a team gets
    // the team's plan while teamPlanExpiresAt is in the future. The Team
    // Admin is a member too. See MODELS/Team.js and utils/plans.js planIdOf().
    team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", default: null },
    teamPlan: {
      type: String,
      enum: [null, "bloom", "flourish", "infinity"],
      default: null,
    },
    teamPlanStartedAt: { type: Date, default: null },
    teamPlanExpiresAt: { type: Date, default: null },
    // Paystack references already applied, so a payment is never counted twice.
    appliedPaymentRefs: { type: [String], default: [] },
    // Group practice minutes per local day, e.g. { "2026-11-05": 34 }.
    groupMinutes: { type: Map, of: Number, default: {} },

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
    // Round 14: automatic emails already sent (key -> when), so none repeats.
    emailLog: { type: Map, of: Date, default: {} },
  },
  { timestamps: true },
);

userSchema.index({ "pushSubscriptions.endpoint": 1 });

module.exports = mongoose.model("User", userSchema);
