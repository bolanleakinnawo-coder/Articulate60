// Round 14 (Sheriff): one row per group practice call, written when the call
// ends, for Admin > Group Practice. Calls before round 14 aren't counted.
const mongoose = require("mongoose");

const groupSessionSchema = new mongoose.Schema(
  {
    roomId: { type: String, default: "" },
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    mode: { type: String, default: "guided" },
    private: { type: Boolean, default: false },
    team: { type: Boolean, default: false },
    planned: { type: Boolean, default: false },
    startedAt: { type: Date, required: true, index: true },
    endedAt: { type: Date, default: null },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    peakMembers: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("GroupSession", groupSessionSchema);
