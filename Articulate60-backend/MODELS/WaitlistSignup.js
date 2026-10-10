const mongoose = require("mongoose");

const waitlistSignupSchema = new mongoose.Schema(
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
  },
  { timestamps: true },
);

waitlistSignupSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model("WaitlistSignup", waitlistSignupSchema);
