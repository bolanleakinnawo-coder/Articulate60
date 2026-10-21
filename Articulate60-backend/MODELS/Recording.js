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
    isWordOfTheDay: { type: Boolean, default: false },
    level: { type: Number, required: true },
    durationSeconds: { type: Number, required: true },
    audioUrl: { type: String, required: true },
    reflection: {
      wentWell: { type: String, default: "" },
      improveNextTime: { type: String, default: "" },
    },

    // --- AI feedback (filled in by POST /api/practice/recordings/:id/analyze) ---
    transcript: { type: String, default: "" },
    metrics: { type: mongoose.Schema.Types.Mixed, default: null },
    analysis: { type: mongoose.Schema.Types.Mixed, default: null },
    analysisStatus: {
      type: String,
      enum: ["none", "processing", "done", "failed"],
      default: "none",
    },
    analysisError: { type: String, default: "" },
    analyzedAt: { type: Date, default: null },
  },
  { timestamps: true }, // gives us createdAt for "Recent Activity" and streak dating
);

module.exports = mongoose.model("Recording", recordingSchema);
