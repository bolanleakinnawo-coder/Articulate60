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

// ---------- Payments: recent payments, duplicates, check by reference ----------

const { settlePayment } = require("../services/billing");
const paystackApi = require("../services/paystack");
const { addMonths } = require("../utils/plans");
const PLAN_NAMES = { bloom: "Bloom", flourish: "Flourish", infinity: "Infinity" };

function itemName(p) {
  if (p.kind === "book") return PRODUCTS[p.productId]?.title || p.productId;
  const months = p.months === 1 ? "1 month" : `${p.months} months`;
  return `${PLAN_NAMES[p.planId] || p.planId} · ${months}`;
}

function adminPayment(p) {
  const u = p.user && typeof p.user === "object" ? p.user : null;
  return {
    reference: p.reference,
    kind: p.kind || "plan",
    item: itemName(p),
    amount: p.amountMinor / 100,
    currency: p.currency,
    status: p.status,
    flagReason: p.flagReason || "",
    mode: p.mode,
    possibleDuplicate: Boolean(p.possibleDuplicate),
    duplicateOf: p.duplicateOf || "",
    refundedAt: p.refundedAt,
    createdAt: p.createdAt,
    paidAt: p.paidAt,
    appliedAt: p.appliedAt,
    user: u ? { username: u.username, email: u.email, name: u.fullName } : null,
  };
}

const PAYMENT_USER_FIELDS = "username email fullName";

// GET /api/admin/payments?filter=all|duplicates|pending|problems
router.get("/payments", async (req, res) => {
  const filter = String(req.query.filter || "all");
  const query = {
    duplicates: { possibleDuplicate: true },
    pending: { status: { $in: ["pending", "abandoned"] } },
    problems: { status: "flagged" },
  }[filter] || {};
  try {
    const [payments, counts] = await Promise.all([
      Payment.find(query).sort({ createdAt: -1 }).limit(200).populate("user", PAYMENT_USER_FIELDS).lean(),
      Payment.aggregate([
        {
          $group: {
            _id: null,
            paid: { $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] } },
            pending: { $sum: { $cond: [{ $in: ["$status", ["pending", "abandoned"]] }, 1, 0] } },
            duplicates: {
              $sum: { $cond: [{ $and: ["$possibleDuplicate", { $eq: ["$refundedAt", null] }] }, 1, 0] },
            },
            problems: { $sum: { $cond: [{ $eq: ["$status", "flagged"] }, 1, 0] } },
          },
        },
      ]),
    ]);
    const c = counts[0] || {};
    res.json({
      payments: payments.map(adminPayment),
      counts: { paid: c.paid || 0, pending: c.pending || 0, duplicates: c.duplicates || 0, problems: c.problems || 0 },
      mode: paystackApi.mode(),
    });
  } catch (error) {
    console.error("Admin payments failed:", error);
    res.status(500).json({ message: "Could not load payments." });
  }
});

// POST /api/admin/payments/check { reference } — asks Paystack about one
// payment now and, if it was paid, gives it to the account that started it.
router.post("/payments/check", async (req, res) => {
  const reference = String(req.body?.reference || "").trim();
  if (!reference) return res.status(400).json({ message: "Enter a payment reference." });
  try {
    let payment = await Payment.findOne({ reference });
    if (!payment) return res.status(404).json({ message: "No Loquiex payment has that reference." });
    if (!paystackApi.isConfigured()) {
      return res.status(503).json({ message: "PAYSTACK_SECRET_KEY isn't set on the server." });
    }
    payment = await settlePayment(payment);
    const full = await Payment.findById(payment._id).populate("user", PAYMENT_USER_FIELDS).lean();
    res.json({ payment: adminPayment(full) });
  } catch (error) {
    console.error("Admin payment check failed:", error.message);
    res.status(502).json({ message: `Paystack didn't answer: ${error.message}` });
  }
});

// POST /api/admin/payments/:reference/refunded — after refunding in Paystack.
// Takes back what the payment gave: plan time for a plan, the book for a
// book (only if this payment is the one that added it).
router.post("/payments/:reference/refunded", async (req, res) => {
  try {
    const payment = await Payment.findOne({ reference: req.params.reference });
    if (!payment) return res.status(404).json({ message: "Unknown payment." });
    if (payment.refundedAt) return res.json({ payment: adminPayment(payment.toObject()) });
    if (payment.status !== "success") {
      return res.status(409).json({ message: "Only paid payments can be marked as refunded." });
    }

    if (payment.appliedAt && payment.kind === "book") {
      await LibraryItem.deleteMany({ user: payment.user, paymentRef: payment.reference });
    } else if (payment.appliedAt) {
      const user = await User.findById(payment.user, { plan: 1, planExpiresAt: 1, appliedPaymentRefs: 1 });
      if (user?.plan === payment.planId && user.planExpiresAt && user.appliedPaymentRefs?.includes(payment.reference)) {
        const now = new Date();
        let expires = addMonths(user.planExpiresAt, -payment.months);
        if (expires < now) expires = now;
        await User.updateOne({ _id: user._id }, { $set: { planExpiresAt: expires } });
      }
    }
    payment.refundedAt = new Date();
    await payment.save();
    const full = await Payment.findById(payment._id).populate("user", PAYMENT_USER_FIELDS).lean();
    res.json({ payment: adminPayment(full) });
  } catch (error) {
    console.error("Mark refunded failed:", error);
    res.status(500).json({ message: "Could not update the payment." });
  }
});

// ======================================================================
// Round 14 (Sheriff): dashboard sections, notifications, emails, e-books.
// ======================================================================
const Recording = require("../MODELS/Recording");
const ScheduledPractice = require("../MODELS/ScheduledPractice");
const GroupSession = require("../MODELS/GroupSession");
const Team = require("../MODELS/Team");
const AdminNotification = require("../MODELS/AdminNotification");
const { getStreakStatus } = require("../utils/streak");
const {
  NOTIFICATION_GROUPS,
  audienceIds,
  sendNotification,
} = require("../services/adminNotifications");
const { listTemplates, saveTemplate, EMAIL_KEYS } = require("../services/autoEmails");
const { isConfigured: emailConfigured } = require("../services/email");

const DAY_MS = 24 * 60 * 60 * 1000;
const LAGOS_OFFSET_MS = 60 * 60 * 1000; // WAT is UTC+1 all year

// "2026-11" -> { start, end, key } in Lagos time. Defaults to this month.
function monthRange(value) {
  const now = new Date(Date.now() + LAGOS_OFFSET_MS);
  let y = now.getUTCFullYear();
  let m = now.getUTCMonth();
  const match = /^(\d{4})-(\d{2})$/.exec(String(value || ""));
  if (match) {
    y = Number(match[1]);
    m = Math.min(11, Math.max(0, Number(match[2]) - 1));
  }
  const start = new Date(Date.UTC(y, m, 1) - LAGOS_OFFSET_MS);
  const end = new Date(Date.UTC(y, m + 1, 1) - LAGOS_OFFSET_MS);
  return { start, end, key: `${y}-${String(m + 1).padStart(2, "0")}` };
}

function byCurrency(rows) {
  return rows
    .map((r) => ({ currency: r._id, amount: (r.amountMinor || 0) / 100, count: r.count }))
    .sort((a, b) => (a.currency === "NGN" ? -1 : b.currency === "NGN" ? 1 : 0));
}

const PAID_MATCH = { status: "success", refundedAt: null };

// GET /api/admin/dashboard?month=YYYY-MM — every number on the dashboard
// sections, worked out from the live database.
router.get("/dashboard", async (req, res) => {
  try {
    const now = new Date();
    const { start, end, key } = monthRange(req.query.month);
    const inMonth = { $gte: start, $lt: end };
    const weekAgo = new Date(now - 7 * DAY_MS);
    const paidNow = {
      $or: [
        { plan: { $ne: "free" }, planExpiresAt: { $gt: now } },
        { teamPlan: { $ne: null }, teamPlanExpiresAt: { $gt: now } },
      ],
    };

    const [
      totalMembers,
      activeIds,
      payingMembers,
      newThisWeek,
      newInMonth,
      revenueMonth,
      revenueAll,
      practicesMonth,
      practicesAll,
      featureRows,
      practiceRows,
      users,
      bookMonth,
      bookAll,
      bookPopular,
      sessionsMonth,
      plannedMonth,
      planCounts,
      activeTeams,
      planRevenueMonth,
      planPaymentsMonth,
      cancellations,
      failedPayments,
    ] = await Promise.all([
      User.countDocuments(),
      Recording.distinct("user", { createdAt: { $gte: new Date(now - 30 * DAY_MS) } }),
      User.countDocuments(paidNow),
      User.countDocuments({ createdAt: { $gte: weekAgo } }),
      User.countDocuments({ createdAt: inMonth }),
      Payment.aggregate([
        { $match: { ...PAID_MATCH, paidAt: inMonth } },
        { $group: { _id: "$currency", amountMinor: { $sum: "$amountMinor" }, count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: PAID_MATCH },
        { $group: { _id: "$currency", amountMinor: { $sum: "$amountMinor" }, count: { $sum: 1 } } },
      ]),
      Recording.countDocuments({ createdAt: inMonth }),
      Recording.countDocuments(),
      Recording.aggregate([
        { $match: { createdAt: inMonth } },
        { $group: { _id: { feature: "$feature", wotd: "$isWordOfTheDay" }, count: { $sum: 1 } } },
      ]),
      Recording.aggregate([
        { $match: { createdAt: { $gte: new Date(now - 400 * DAY_MS) } } },
        { $group: { _id: "$user", days: { $push: "$createdAt" }, last: { $max: "$createdAt" } } },
      ]),
      User.find({}, { createdAt: 1, timeZone: 1, groupMinutes: 1 }).lean(),
      Payment.aggregate([
        { $match: { ...PAID_MATCH, kind: "book", paidAt: inMonth } },
        { $group: { _id: "$currency", amountMinor: { $sum: "$amountMinor" }, count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: { ...PAID_MATCH, kind: "book" } },
        { $group: { _id: "$currency", amountMinor: { $sum: "$amountMinor" }, count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: { ...PAID_MATCH, kind: "book" } },
        { $group: { _id: "$productId", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      GroupSession.find({ startedAt: inMonth }, { participants: 1, startedAt: 1, endedAt: 1, team: 1 }).lean(),
      ScheduledPractice.countDocuments({ createdAt: inMonth }),
      User.aggregate([
        { $match: { plan: { $ne: "free" }, planExpiresAt: { $gt: now } } },
        { $group: { _id: "$plan", count: { $sum: 1 } } },
      ]),
      Team.countDocuments({ expiresAt: { $gt: now } }),
      Payment.aggregate([
        { $match: { ...PAID_MATCH, kind: { $ne: "book" }, paidAt: inMonth } },
        { $group: { _id: "$currency", amountMinor: { $sum: "$amountMinor" }, count: { $sum: 1 } } },
      ]),
      Payment.find({ ...PAID_MATCH, kind: { $ne: "book" }, paidAt: inMonth }, { user: 1, paidAt: 1 }).lean(),
      User.countDocuments({ planCancelledAt: inMonth }),
      Payment.countDocuments({ status: { $in: ["failed", "abandoned"] }, createdAt: inMonth }),
    ]);

    // Renewals: plan payments this month by members who had paid for a
    // plan before.
    let renewals = 0;
    if (planPaymentsMonth.length) {
      const earlier = await Payment.aggregate([
        {
          $match: {
            status: "success",
            kind: { $ne: "book" },
            user: { $in: planPaymentsMonth.map((p) => p.user) },
          },
        },
        { $group: { _id: "$user", first: { $min: "$paidAt" } } },
      ]);
      const firstOf = new Map(earlier.map((e) => [String(e._id), e.first]));
      renewals = planPaymentsMonth.filter((p) => {
        const first = firstOf.get(String(p.user));
        return first && new Date(first) < new Date(p.paidAt);
      }).length;
    }

    // Practice features.
    const FEATURE_NAMES = { jar: "Spin the Jar", yap: "Yap Mode", research: "Research Mode" };
    const featureTotals = {};
    for (const r of featureRows) {
      const name = r._id.wotd
        ? "Word of the day"
        : FEATURE_NAMES[r._id.feature] || "Other";
      featureTotals[name] = (featureTotals[name] || 0) + r.count;
    }
    const features = Object.entries(featureTotals)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Streaks and inactivity.
    const practiceOf = new Map(practiceRows.map((r) => [String(r._id), r]));
    const lastAll = await Recording.aggregate([{ $group: { _id: "$user", last: { $max: "$createdAt" } } }]);
    const lastOf = new Map(lastAll.map((r) => [String(r._id), r.last]));
    let onStreak = 0;
    let longestCurrent = 0;
    let streakTotal = 0;
    const inactive = { d3: 0, d7: 0, d10: 0, never: 0 };
    for (const u of users) {
      const row = practiceOf.get(String(u._id));
      if (row) {
        const st = getStreakStatus(row.days, u.timeZone, now);
        if (st.current >= 1 && st.state !== "lost") {
          onStreak += 1;
          streakTotal += st.current;
          longestCurrent = Math.max(longestCurrent, st.current);
        }
      }
      const last = lastOf.get(String(u._id));
      if (!last) inactive.never += 1;
      const gap = now - new Date(last || u.createdAt);
      if (gap >= 3 * DAY_MS) inactive.d3 += 1;
      if (gap >= 7 * DAY_MS) inactive.d7 += 1;
      if (gap >= 10 * DAY_MS) inactive.d10 += 1;
    }

    // Group practice minutes in the month (members' own days).
    let groupMinutes = 0;
    let groupUsers = 0;
    for (const u of users) {
      const days = u.groupMinutes instanceof Map ? Object.fromEntries(u.groupMinutes) : u.groupMinutes || {};
      const m = Object.entries(days)
        .filter(([d]) => d.startsWith(key))
        .reduce((t, [, v]) => t + (Number(v) || 0), 0);
      if (m > 0) {
        groupMinutes += m;
        groupUsers += 1;
      }
    }
    const participantSet = new Set();
    let sessionMinutes = 0;
    for (const s of sessionsMonth) {
      (s.participants || []).forEach((p) => participantSet.add(String(p)));
      if (s.endedAt) sessionMinutes += (new Date(s.endedAt) - new Date(s.startedAt)) / 60000;
    }

    const planNames = { bloom: "Bloom", pro: "Bloom", flourish: "Flourish", infinity: "Infinity" };
    const activeByPlan = {};
    for (const p of planCounts) {
      const name = planNames[p._id] || p._id;
      activeByPlan[name] = (activeByPlan[name] || 0) + p.count;
    }

    res.json({
      month: key,
      overview: {
        totalMembers,
        activeMembers: activeIds.length,
        payingMembers,
        newThisWeek,
        newInMonth,
        revenueMonth: byCurrency(revenueMonth),
        revenueAll: byCurrency(revenueAll),
      },
      practice: {
        completedMonth: practicesMonth,
        completedAll: practicesAll,
        features,
        onStreak,
        longestCurrent,
        averageStreak: onStreak ? Math.round((streakTotal / onStreak) * 10) / 10 : 0,
        inactive,
      },
      learn: {
        purchasesMonth: byCurrency(bookMonth),
        purchasesAll: byCurrency(bookAll),
        popular: bookPopular.map((b) => ({
          id: b._id,
          title: PRODUCTS[b._id]?.title || b._id,
          count: b.count,
        })),
      },
      group: {
        sessions: sessionsMonth.length,
        teamSessions: sessionsMonth.filter((s) => s.team).length,
        participants: participantSet.size,
        averageMinutes: sessionsMonth.length ? Math.round(sessionMinutes / sessionsMonth.length) : 0,
        minutesUsed: groupMinutes,
        membersUsed: groupUsers,
        planned: plannedMonth,
      },
      subscriptions: {
        activeByPlan,
        activeIndividual: Object.values(activeByPlan).reduce((t, n) => t + n, 0),
        activeTeams,
        revenueMonth: byCurrency(planRevenueMonth),
        renewals,
        newSubscriptions: planPaymentsMonth.length - renewals,
        cancellations,
        failedPayments,
      },
    });
  } catch (error) {
    console.error("Admin dashboard failed:", error);
    res.status(500).json({ message: "Could not load the dashboard." });
  }
});

// ---------- Notifications (sent by the admin only) ----------

function publicNotice(n) {
  const group = NOTIFICATION_GROUPS.find((g) => g.id === n.group);
  return {
    id: String(n._id),
    group: n.group,
    groupLabel: group?.label || n.group,
    message: n.message,
    status: n.status,
    scheduledFor: n.scheduledFor,
    sentAt: n.sentAt,
    recipients: n.recipients || 0,
    delivered: n.delivered || 0,
    createdAt: n.createdAt,
    error: n.error || "",
  };
}

// GET /api/admin/notifications — groups and recent notifications.
router.get("/notifications", async (_req, res) => {
  try {
    const list = await AdminNotification.find().sort({ createdAt: -1 }).limit(100).lean();
    res.json({
      groups: NOTIFICATION_GROUPS.map(({ id, label, who }) => ({ id, label, who })),
      notifications: list.map(publicNotice),
      phonesReady: pushReady(),
    });
  } catch (error) {
    console.error("Admin notifications failed:", error);
    res.status(500).json({ message: "Could not load notifications." });
  }
});

// GET /api/admin/notifications/count?group=… — how many members fit now.
router.get("/notifications/count", async (req, res) => {
  const group = String(req.query.group || "");
  if (!NOTIFICATION_GROUPS.some((g) => g.id === group)) {
    return res.status(400).json({ message: "Choose a group." });
  }
  try {
    const ids = await audienceIds(group);
    res.json({ group, count: ids.length });
  } catch (error) {
    console.error("Audience count failed:", error);
    res.status(500).json({ message: "Could not count members." });
  }
});

// POST /api/admin/notifications { group, message, scheduledFor? }
// Sends now, or at scheduledFor.
router.post("/notifications", async (req, res) => {
  const group = String(req.body?.group || "");
  const message = String(req.body?.message || "").trim();
  if (!NOTIFICATION_GROUPS.some((g) => g.id === group)) {
    return res.status(400).json({ message: "Choose a group." });
  }
  if (!message) return res.status(400).json({ message: "Type the message." });
  if (message.length > 500) return res.status(400).json({ message: "Keep the message under 500 characters." });
  let scheduledFor = null;
  if (req.body?.scheduledFor) {
    scheduledFor = new Date(req.body.scheduledFor);
    if (Number.isNaN(scheduledFor.getTime())) {
      return res.status(400).json({ message: "Choose a valid date and time." });
    }
    if (scheduledFor <= new Date()) {
      return res.status(400).json({ message: "Choose a time in the future." });
    }
  }
  try {
    const doc = await AdminNotification.create({ group, message, scheduledFor, status: "scheduled" });
    if (scheduledFor) return res.status(201).json({ notification: publicNotice(doc.toObject()) });
    const sent = await sendNotification(doc);
    res.status(201).json({ notification: publicNotice(sent) });
  } catch (error) {
    console.error("Send notification failed:", error);
    res.status(500).json({ message: "Could not send the notification." });
  }
});

// POST /api/admin/notifications/:id/cancel — a scheduled one not sent yet.
router.post("/notifications/:id/cancel", async (req, res) => {
  try {
    const doc = await AdminNotification.findOneAndUpdate(
      { _id: req.params.id, status: "scheduled" },
      { $set: { status: "cancelled" } },
      { returnDocument: "after" },
    ).lean();
    if (!doc) return res.status(409).json({ message: "This notification can't be cancelled." });
    res.json({ notification: publicNotice(doc) });
  } catch (error) {
    console.error("Cancel notification failed:", error);
    res.status(500).json({ message: "Could not cancel the notification." });
  }
});

// ---------- Automatic emails ----------

router.get("/emails", async (_req, res) => {
  try {
    res.json({ emails: await listTemplates(), configured: emailConfigured() });
  } catch (error) {
    console.error("Admin emails failed:", error);
    res.status(500).json({ message: "Could not load the emails." });
  }
});

// PUT /api/admin/emails/:key { subject?, body?, enabled? }
router.put("/emails/:key", async (req, res) => {
  if (!EMAIL_KEYS.includes(req.params.key)) return res.status(404).json({ message: "Unknown email." });
  const { subject, body, enabled } = req.body || {};
  if (typeof subject === "string" && !subject.trim()) {
    return res.status(400).json({ message: "The subject can't be empty." });
  }
  if (typeof body === "string" && !body.trim()) {
    return res.status(400).json({ message: "The text can't be empty." });
  }
  try {
    const email = await saveTemplate(req.params.key, { subject, body, enabled });
    res.json({ email });
  } catch (error) {
    console.error("Save email failed:", error);
    res.status(500).json({ message: "Could not save the email." });
  }
});

// ---------- E-books: delete an uploaded PDF ----------

// DELETE /api/admin/learn/books/:bookId/file — removes the PDF. Members who
// own the book keep it in their library and can read it again once a new
// file is uploaded.
router.delete("/learn/books/:bookId/file", async (req, res) => {
  const { bookId } = req.params;
  if (!BOOKS[bookId]) return res.status(404).json({ message: "Unknown book." });
  try {
    const previous = await BookFile.findOneAndDelete({ bookId }).lean();
    if (!previous) return res.status(404).json({ message: "No file has been uploaded for this book." });
    if (previous.r2Key) {
      r2.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: previous.r2Key })).catch(() => {});
    }
    await LibraryItem.updateMany({ bookId }, { $set: { totalPages: 0 } });
    res.json({ bookId, deleted: true });
  } catch (error) {
    console.error("Book delete failed:", error);
    res.status(500).json({ message: "Could not delete the book file." });
  }
});

module.exports = router;
