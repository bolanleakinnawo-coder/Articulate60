const mongoose = require("mongoose");

const learnNotificationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: [/^\S+@\S+\.\S+$/, "Invalid email address."],
    },
    productId: {
      type: String,
      required: true,
      enum: [
        "communication-audit",
        "speak-with-ease",
        "what-do-i-say",
        "what-do-i-do",
      ],
    },
    productName: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

learnNotificationSchema.index(
  { email: 1, productId: 1 },
  { unique: true },
);

module.exports = mongoose.model("LearnNotification", learnNotificationSchema);
