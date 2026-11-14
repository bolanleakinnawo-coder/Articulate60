const mongoose = require("mongoose");

// The PDF for each book, uploaded from the admin panel to R2. The key has a
// random part and is never sent to the app: members only ever read a book
// through GET /api/learn/books/:bookId/file, which checks they own it.
const bookFileSchema = new mongoose.Schema(
  {
    bookId: { type: String, required: true, unique: true },
    r2Key: { type: String, required: true },
    size: { type: Number, default: 0 },
    // Filled in by the reader the first time the book is opened.
    pages: { type: Number, default: 0 },
    originalName: { type: String, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("BookFile", bookFileSchema);
