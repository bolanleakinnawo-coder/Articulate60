const mongoose = require("mongoose");

const wordSchema = new mongoose.Schema({
  word: { type: String, required: true, unique: true },
  meaning: { type: String, required: true },
  order: { type: Number, required: true }, // fixed position for day-rotation (0, 1, 2, ...)
});

module.exports = mongoose.model("Word", wordSchema);
