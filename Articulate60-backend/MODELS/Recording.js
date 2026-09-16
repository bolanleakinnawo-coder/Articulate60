const mongoose = require("mongoose");

const recordingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    topic: { type: String, required: true },
    category: { type: String, default: "" },
    level: { type: Number, required: true },
    durationSeconds: { type: Number, required: true },
    audioUrl: { type: String, required: true },
    reflection: {
      wentWell: { type: String, default: "" },
      improveNextTime: { type: String, default: "" },
    },
  },
  { timestamps: true }, // gives us createdAt for "Recent Activity" and streak dating
);

module.exports = mongoose.model("Recording", recordingSchema);
