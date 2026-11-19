const mongoose = require("mongoose");

// A team plan (round 10, Sheriff 2026-11-19). The person who pays is the
// Team Admin. One payment covers up to TEAM_MAX_MEMBERS people, the admin
// included (utils/plans.js). Each member gets the plan's own allowance.
// Set ONLY by services/team.js (payment) and ROUTES/team.js (invites).
const teamSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    // "Create your team": the name the Team Admin gives it (can change later).
    name: { type: String, default: "", maxlength: 60 },
    // Email invitations still waiting to be accepted.
    invites: {
      type: [
        {
          email: { type: String, required: true },
          invitedAt: { type: Date, default: Date.now },
          _id: false,
        },
      ],
      default: [],
    },
    // The admin cancelled: the team keeps its plan until expiresAt.
    cancelledAt: { type: Date, default: null },
    // Base plan every member gets: bloom | flourish | infinity.
    planId: {
      type: String,
      enum: ["bloom", "flourish", "infinity"],
      required: true,
    },
    periodId: { type: String, default: "monthly" },
    startedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    // Admin first. Up to TEAM_MAX_MEMBERS in total.
    members: {
      type: [
        {
          user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
          joinedAt: { type: Date, default: Date.now },
          _id: false,
        },
      ],
      default: [],
    },
    // Invite code (6 letters/numbers) for the invite link /app/team/join/CODE.
    inviteCode: { type: String, required: true, unique: true },
    // Paystack references already applied to this team.
    appliedPaymentRefs: { type: [String], default: [] },
  },
  { timestamps: true },
);

teamSchema.index({ "members.user": 1 });

module.exports = mongoose.model("Team", teamSchema);
