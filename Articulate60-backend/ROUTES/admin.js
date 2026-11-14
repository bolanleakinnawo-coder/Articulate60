const express = require("express");
const User = require("../MODELS/User");
const WaitlistSignup = require("../MODELS/WaitlistSignup");
const LearnNotification = require("../MODELS/LearnNotification");
const crypto = require("crypto");
const multer = require("multer");
const { PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const r2 = require("../config/r2");
const BookFile = require("../MODELS/BookFile");
const LibraryItem = require("../MODELS/LibraryItem");
const Payment = require("../MODELS/Payment");
const { BOOKS, BOOK_IDS, UPCOMING, PRODUCTS } = require("../utils/learn");
const { pushReady, sendPushToUser } = require("../services/push");
const { emitToUser } = require("../services/realtime");

const bookUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 60 * 1024 * 1024 },
});

const router = express.Router();

// Every admin route needs the admin key (see middleware/adminAuth.js).
router.use(require("../middleware/adminAuth"));

router.get("/subscribers", async (_req, res) => {
  try {
    const subscribers = await User.find({ marketingOptIn: true })
      .select("username email marketingOptInAt createdAt")
      .sort({ marketingOptInAt: -1, createdAt: -1 })
      .lean();

    res.json(subscribers);
  } catch (error) {
    console.error("Failed to fetch email subscribers:", error);
    res.status(500).json({ message: "Could not load email subscribers." });
  }
});

router.get("/waitlist", async (_req, res) => {
  try {
    const signups = await WaitlistSignup.find()
      .select("name email createdAt")
      .sort({ createdAt: -1 })
      .lean();

    res.json(signups);
  } catch (error) {
    console.error("Failed to fetch waitlist signups:", error);
    res.status(500).json({ message: "Could not load waitlist signups." });
  }
});

router.get("/learn-notifications", async (_req, res) => {
  try {
    const notifications = await LearnNotification.find()
      .select("name email productId productName createdAt notifiedAt")
      .sort({ createdAt: -1 })
      .lean();

    res.json(notifications);
  } catch (error) {
    console.error("Failed to fetch learning product notifications:", error);
    res
      .status(500)
      .json({ message: "Could not load learning product notifications." });
  }
});

// ---------- Learn: books, sales and launch announcements ----------

// GET /api/admin/learn — book files, copies sold and Notify me counts.
router.get("/learn", async (_req, res) => {
  try {
    const [files, owners, sales, requests] = await Promise.all([
      BookFile.find().lean(),
      LibraryItem.aggregate([{ $group: { _id: "$bookId", count: { $sum: 1 } } }]),
      Payment.aggregate([
        { $match: { kind: "book", status: "success" } },
        { $group: { _id: { productId: "$productId", currency: "$currency" }, count: { $sum: 1 }, amountMinor: { $sum: "$amountMinor" } } },
      ]),
      LearnNotification.aggregate([
        {
          $group: {
            _id: "$productId",
            total: { $sum: 1 },
            waiting: { $sum: { $cond: [{ $eq: ["$notifiedAt", null] }, 1, 0] } },
          },
        },
      ]),
    ]);
    const fileOf = Object.fromEntries(files.map((f) => [f.bookId, f]));
    const ownersOf = Object.fromEntries(owners.map((o) => [o._id, o.count]));
    res.json({
      books: BOOK_IDS.map((id) => ({
        id,
        title: BOOKS[id].title,
        owners: ownersOf[id] || 0,
        file: fileOf[id]
          ? { size: fileOf[id].size, pages: fileOf[id].pages, name: fileOf[id].originalName, uploadedAt: fileOf[id].updatedAt }
          : null,
      })),
      sales: sales.map((s) => ({
        productId: s._id.productId,
        title: PRODUCTS[s._id.productId]?.title || s._id.productId,
        currency: s._id.currency,
        count: s.count,
        amount: s.amountMinor / 100,
      })),
      upcoming: Object.entries(UPCOMING).map(([id, title]) => {
        const r = requests.find((x) => x._id === id);
        return { id, title, total: r?.total || 0, waiting: r?.waiting || 0 };
      }),
    });
  } catch (error) {
    console.error("Admin learn load failed:", error);
    res.status(500).json({ message: "Could not load Learn details." });
  }
});

// POST /api/admin/learn/books/:bookId/file — upload (or replace) a book PDF.
// Members who already own the book are told it's ready to read.
router.post("/learn/books/:bookId/file", (req, res) => {
  const { bookId } = req.params;
  if (!BOOKS[bookId]) return res.status(404).json({ message: "Unknown book." });
  bookUpload.single("file")(req, res, async (error) => {
    if (error) {
      const tooBig = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE";
      return res.status(tooBig ? 413 : 400).json({ message: tooBig ? "The PDF must be smaller than 60 MB." : "Could not read the file." });
    }
    const file = req.file;
    if (!file || file.buffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
      return res.status(400).json({ message: "Choose a PDF file." });
    }
    try {
      const key = `private-books/${bookId}-${crypto.randomBytes(16).toString("hex")}.pdf`;
      await r2.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: key,
          Body: file.buffer,
          ContentType: "application/pdf",
        }),
      );
      const previous = await BookFile.findOne({ bookId }).lean();
      await BookFile.updateOne(
        { bookId },
        { $set: { r2Key: key, size: file.size, pages: 0, originalName: (file.originalname || "").slice(0, 200) } },
        { upsert: true },
      );
      if (previous?.r2Key) {
        r2.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: previous.r2Key })).catch(() => {});
        // A new file may have a different page count: progress is recounted
        // the next time each member opens it.
        await LibraryItem.updateMany({ bookId }, { $set: { totalPages: 0 } });
      } else {
        notifyOwnersBookReady(bookId).catch((e) => console.error("Book ready notice failed:", e.message));
      }
      res.status(201).json({ bookId, size: file.size });
    } catch (err) {
      console.error("Book upload failed:", err.message);
      res.status(502).json({ message: "Could not save the book. Check the R2 settings and try again." });
    }
  });
});

async function notifyOwnersBookReady(bookId) {
  const title = BOOKS[bookId].shortTitle;
  const owners = await LibraryItem.find({ bookId }, { user: 1 }).lean();
  for (const { user: userId } of owners) {
    const payload = {
      kind: "learn",
      title: "Your book is ready",
      body: `${title} is in your library. Start reading.`,
      url: `/app/learn/read/${bookId}`,
      action: "Start reading",
      tag: `learn-ready-${bookId}`,
    };
    emitToUser(userId, "learn:notice", payload);
    if (pushReady()) {
      const user = await User.findById(userId, { pushSubscriptions: 1 });
      if (user) await sendPushToUser(user, payload);
    }
  }
}

// POST /api/admin/learn/announce/:productId — it's out: tell everyone who
// tapped Notify me (phone notification + in-app), once each.
router.post("/learn/announce/:productId", async (req, res) => {
  const { productId } = req.params;
  const title = UPCOMING[productId];
  if (!title) return res.status(404).json({ message: "Unknown item." });
  try {
    const waiting = await LearnNotification.find({ productId, notifiedAt: null }).lean();
    let phones = 0;
    const payload = {
      kind: "learn",
      title: `${title} is here`,
      body: "You asked us to let you know. It's ready for you on Learn.",
      url: "/app/learn",
      action: "Open Learn",
      tag: `learn-launch-${productId}`,
    };
    for (const request of waiting) {
      let user = null;
      if (request.user) user = await User.findById(request.user, { pushSubscriptions: 1 });
      if (!user) user = await User.findOne({ email: request.email }, { pushSubscriptions: 1 });
      if (user) {
        emitToUser(user._id, "learn:notice", payload);
        if (pushReady()) phones += await sendPushToUser(user, payload);
      }
      await LearnNotification.updateOne({ _id: request._id }, { $set: { notifiedAt: new Date() } });
    }
    res.json({ notified: waiting.length, phones });
  } catch (error) {
    console.error("Announce failed:", error);
    res.status(500).json({ message: "Could not send the announcement." });
  }
});

module.exports = router;
