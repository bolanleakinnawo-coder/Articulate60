// Round 14 (Sheriff): the automatic emails, edited in Admin > Emails.
// One row per email (key). Missing rows use the defaults in
// services/autoEmails.js until the admin saves a change.
const mongoose = require("mongoose");

const emailTemplateSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    subject: { type: String, default: "", maxlength: 200 },
    body: { type: String, default: "", maxlength: 5000 },
    enabled: { type: Boolean, default: true },
    sentCount: { type: Number, default: 0 },
    lastSentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("EmailTemplate", emailTemplateSchema);
