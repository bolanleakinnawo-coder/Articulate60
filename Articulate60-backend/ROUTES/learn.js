// Learn shop, library and reading progress (signed-in members).
//
//   GET    /api/learn                      -> { offer, currencies, products, library, notify }
//   POST   /api/learn/checkout   { productId, currency } -> { authorizationUrl, reference }
//   POST   /api/learn/verify     { reference }           -> { payment, library }
//   POST   /api/learn/progress   { bookId, page, totalPages } -> { item }
//   GET    /api/learn/books/:bookId/file   the PDF (owners only)
//   POST   /api/learn/notify     { productId }  "Notify me" on
//   DELETE /api/learn/notify/:productId         "Notify me" off
//
// Prices come from utils/learn.js on the server. The launch price is used
// only while the offer is running (LAUNCH_OFFER_ENDS_AT), and books are added
// to the library only after Paystack confirms the payment (services/billing.js,
// the same flow and webhook as memberships).
const crypto = require("crypto");
const express = require("express");
const rateLimit = require("express-rate-limit");
const { GetObjectCommand } = require("@aws-sdk/client-s3");

const authMiddleware = require("../middleware/auth");
const r2 = require("../config/r2");
const User = require("../MODELS/User");
const Payment = require("../MODELS/Payment");
const LibraryItem = require("../MODELS/LibraryItem");
const BookFile = require("../MODELS/BookFile");
const LearnNotification = require("../MODELS/LearnNotification");
const paystack = require("../services/paystack");
const { settlePayment } = require("../services/billing");
const { enabledCurrencies } = require("../utils/plans");
const {
  BOOKS,
  PRODUCTS,
  UPCOMING,
  offerActive,
  offerEndsAt,
  priceMinorFor,
  publicCatalog,
} = require("../utils/learn");

const router = express.Router();
router.use(authMiddleware);

const REFERENCE_RE = /^LQX-[a-f0-9]{24}$/;

const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.userId),
  message: { message: "Too many checkout attempts. Please wait a few minutes." },
});

const progressLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.userId),
  message: { message: "Please slow down a little." },
});

function publicItem(item, files = {}) {
  const book = BOOKS[item.bookId];
  return {
    bookId: item.bookId,
    title: book?.shortTitle || item.bookId,
    productId: item.productId,
    purchasedAt: item.purchasedAt,
    percent: item.percent(),
    lastPage: item.lastPage,
    furthestPage: item.furthestPage,
    totalPages: item.totalPages || files[item.bookId]?.pages || 0,
    lastReadAt: item.lastReadAt,
    completedAt: item.completedAt,
    ready: Boolean(files[item.bookId]),
  };
}

async function libraryFor(userId) {
  const [items, files] = await Promise.all([
    LibraryItem.find({ user: userId }).sort({ lastReadAt: -1, purchasedAt: -1 }),
    BookFile.find({}, { bookId: 1, pages: 1 }).lean(),
  ]);
  const byBook = Object.fromEntries(files.map((f) => [f.bookId, f]));
  return items.map((i) => publicItem(i, byBook));
}

// GET /api/learn — everything the Learn page needs.
router.get("/", async (req, res) => {
  try {
    const now = new Date();
    const currencies = enabledCurrencies();
    const [library, requests] = await Promise.all([
      libraryFor(req.userId),
      LearnNotification.find({ user: req.userId }, { productId: 1 }).lean(),
    ]);
    res.json({
      offer: {
        active: offerActive(now),
        endsAt: offerEndsAt().toISOString(),
        serverNow: now.toISOString(),
      },
      available: paystack.isConfigured(),
      currencies,
      products: publicCatalog(currencies, now),
      library,
      notify: requests.map((r) => r.productId),
    });
  } catch (err) {
    console.error("Learn load failed:", err);
    res.status(500).json({ message: "Couldn't load Learn. Please try again." });
  }
});

// POST /api/learn/checkout
router.post("/checkout", checkoutLimiter, async (req, res) => {
  if (!paystack.isConfigured()) {
    return res.status(503).json({
      code: "PAYMENTS_UNAVAILABLE",
      message: "Payments aren't available right now. Please try again later.",
    });
  }
  const productId = String(req.body?.productId || "");
  const currency = String(req.body?.currency || "NGN").toUpperCase();
  const product = PRODUCTS[productId];
  if (!product) return res.status(400).json({ message: "Choose a book." });
  if (!enabledCurrencies().includes(currency)) {
    return res.status(400).json({ message: "That currency isn't available." });
  }

  try {
    const owned = await LibraryItem.find({ user: req.userId, bookId: { $in: product.books } }, { bookId: 1 }).lean();
    if (owned.length === product.books.length) {
      return res.status(409).json({ code: "OWNED", message: "This is already in your library." });
    }
    const user = await User.findById(req.userId, { email: 1 });
    if (!user) return res.status(404).json({ message: "User not found." });

    const now = new Date();
    const amountMinor = priceMinorFor(productId, currency, now);
    if (!amountMinor) return res.status(400).json({ message: "Choose a book." });

    const reference = `LQX-${crypto.randomBytes(12).toString("hex")}`;
    await Payment.create({
      user: user._id,
      reference,
      mode: paystack.mode(),
      kind: "book",
      productId,
      launchPrice: offerActive(now),
      amountMinor,
      currency,
    });

    const appUrl = (process.env.APP_URL || "").trim().replace(/\/+$/, "");
    const back = appUrl ? `${appUrl}/app/learn` : null;
    const tx = await paystack.initializeTransaction({
      email: user.email,
      amountMinor,
      currency,
      reference,
      callbackUrl: back,
      metadata: {
        userId: String(user._id),
        kind: "book",
        productId,
        currency,
        cancel_action: back || undefined,
      },
    });

    res.status(201).json({
      reference,
      authorizationUrl: tx.authorization_url,
      amount: amountMinor / 100,
      currency,
    });
  } catch (err) {
    console.error("Book checkout failed:", err.message);
    res.status(502).json({ message: "Couldn't start the payment. Please try again." });
  }
});

// POST /api/learn/verify — when the member comes back from Paystack.
router.post("/verify", async (req, res) => {
  const reference = String(req.body?.reference || "");
  if (!REFERENCE_RE.test(reference)) return res.status(400).json({ message: "Unknown payment." });
  try {
    let payment = await Payment.findOne({ reference, user: req.userId, kind: "book" });
    if (!payment) return res.status(404).json({ message: "Unknown payment." });
    if (!(payment.status === "success" && payment.appliedAt)) {
      if (!paystack.isConfigured()) {
        return res.status(503).json({ message: "Payments aren't available right now." });
      }
      payment = await settlePayment(payment);
    }
    res.json({
      payment: {
        reference: payment.reference,
        status: payment.status === "flagged" ? "failed" : payment.status,
        productId: payment.productId,
        amount: payment.amountMinor / 100,
        currency: payment.currency,
        added: Boolean(payment.status === "success" && payment.appliedAt),
      },
      library: await libraryFor(req.userId),
    });
  } catch (err) {
    console.error("Book verify failed:", err.message);
    res.status(502).json({ message: "Couldn't confirm the payment yet. Please try again." });
  }
});

// POST /api/learn/progress — the reader reports the page the member is on.
router.post("/progress", progressLimiter, async (req, res) => {
  const bookId = String(req.body?.bookId || "");
  const page = Math.floor(Number(req.body?.page));
  const reportedTotal = Math.floor(Number(req.body?.totalPages));
  if (!BOOKS[bookId] || !Number.isFinite(page) || page < 1) {
    return res.status(400).json({ message: "Invalid progress." });
  }
  try {
    const item = await LibraryItem.findOne({ user: req.userId, bookId });
    if (!item) return res.status(403).json({ message: "This book isn't in your library." });

    // The page count is worked out from the PDF once and kept on the file.
    const file = await BookFile.findOne({ bookId });
    if (!file) return res.status(409).json({ message: "This book isn't ready yet." });
    if (!file.pages && reportedTotal > 0 && reportedTotal <= 5000) {
      file.pages = reportedTotal;
      await file.save();
    }
    const total = file.pages || item.totalPages;
    if (!total) return res.status(400).json({ message: "Invalid progress." });
    const current = Math.min(page, total);

    item.totalPages = total;
    item.lastPage = current;
    item.furthestPage = Math.max(item.furthestPage || 0, current);
    item.lastReadAt = new Date();
    if (item.furthestPage >= total && !item.completedAt) item.completedAt = new Date();
    await item.save();
    res.json({ item: publicItem(item, { [bookId]: file }) });
  } catch (err) {
    console.error("Progress save failed:", err);
    res.status(500).json({ message: "Couldn't save your progress." });
  }
});

// GET /api/learn/books/:bookId/file — streams the PDF to its owner.
router.get("/books/:bookId/file", async (req, res) => {
  const { bookId } = req.params;
  if (!BOOKS[bookId]) return res.status(404).json({ message: "Book not found." });
  try {
    const owns = await LibraryItem.exists({ user: req.userId, bookId });
    if (!owns) return res.status(403).json({ message: "This book isn't in your library." });
    const file = await BookFile.findOne({ bookId }).lean();
    if (!file) return res.status(409).json({ code: "NOT_READY", message: "This book isn't ready yet." });

    const obj = await r2.send(
      new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: file.r2Key }),
    );
    res.set({
      "Content-Type": "application/pdf",
      "Cache-Control": "private, no-store",
      "Content-Disposition": "inline",
      ...(obj.ContentLength ? { "Content-Length": String(obj.ContentLength) } : {}),
    });
    obj.Body.on("error", (e) => {
      console.error("Book stream failed:", e.message);
      res.destroy(e);
    });
    obj.Body.pipe(res);
  } catch (err) {
    console.error("Book file failed:", err.message);
    if (!res.headersSent) res.status(502).json({ message: "Couldn't open the book. Please try again." });
  }
});

// POST /api/learn/notify — "Notify me" for something coming soon.
router.post("/notify", async (req, res) => {
  const productId = String(req.body?.productId || "");
  const productName = UPCOMING[productId];
  if (!productName) return res.status(400).json({ message: "Choose a valid item." });
  try {
    const user = await User.findById(req.userId, { email: 1, fullName: 1, username: 1 }).lean();
    if (!user) return res.status(404).json({ message: "User not found." });
    await LearnNotification.findOneAndUpdate(
      { email: user.email, productId },
      {
        $set: { user: user._id, name: (user.fullName || user.username || "").slice(0, 80), productName },
        $setOnInsert: { email: user.email, productId },
      },
      { upsert: true },
    );
    res.status(201).json({ productId, on: true });
  } catch (err) {
    console.error("Notify save failed:", err);
    res.status(500).json({ message: "We couldn't save your request. Please try again." });
  }
});

router.delete("/notify/:productId", async (req, res) => {
  try {
    await LearnNotification.deleteOne({ user: req.userId, productId: req.params.productId, notifiedAt: null });
    res.json({ productId: req.params.productId, on: false });
  } catch (err) {
    console.error("Notify delete failed:", err);
    res.status(500).json({ message: "Please try again." });
  }
});

module.exports = router;
