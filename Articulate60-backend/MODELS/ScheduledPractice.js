// A group practice a host has planned for later. When the host starts it,
// a live room opens with these settings and the same invite code.
const mongoose = require("mongoose");

const scheduledPracticeSchema = new mongoose.Schema(
  {
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    hostName: { type: String, default: "" },
    // "host" = the host's own topic, "guided" = a Loquiex category + prompt.
    mode: { type: String, enum: ["host", "guided"], default: "guided" },
    topic: { type: String, default: "", maxlength: 200 },
    categoryId: { type: String, default: "", maxlength: 60 },
    categoryTitle: { type: String, default: "", maxlength: 80 },
    prompt: { type: String, default: "", maxlength: 500 },
    private: { type: Boolean, default: false },
    max: { type: Number, default: 4, min: 2, max: 6 },
    code: { type: String, required: true, index: true },
    startsAt: { type: Date, required: true, index: true },
    // Members who asked to be reminded (the host is always reminded).
    reminders: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    reminderSentAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["scheduled", "started", "cancelled"],
      default: "scheduled",
      index: true,
    },
    roomId: { type: String, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ScheduledPractice", scheduledPracticeSchema);
