const dns = require("dns");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

require("dotenv").config();

// Settings the server cannot work without. Missing any of these on Render
// would break sign-in for everyone, so stop with a clear message instead.
const REQUIRED_ENV = ["MONGO_URL", "JWT_SECRET"];
const missingEnv = REQUIRED_ENV.filter((name) => !(process.env[name] || "").trim());
if (missingEnv.length) {
  console.error(`Missing required environment variables: ${missingEnv.join(", ")}`);
  process.exit(1);
}
// Not fatal, but these features stay off until they are set.
[
  ["R2_BUCKET_NAME", "saving recordings and profile photos"],
  ["R2_PUBLIC_URL", "saving recordings and profile photos"],
  ["DEEPGRAM_API_KEY", "AI feedback"],
  ["GEMINI_API_KEY", "AI feedback"],
  ["APP_URL", "password reset links and Paystack return"],
  ["PAYSTACK_SECRET_KEY", "payments"],
].forEach(([name, feature]) => {
  if (!(process.env[name] || "").trim()) console.warn(`${name} is not set: ${feature} will not work.`);
});

// Log anything unexpected instead of failing silently. An uncaught exception
// leaves the app in an unknown state, so exit and let Render restart it.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception, restarting:", err);
  process.exit(1);
});

const http = require("http");
const express = require("express");
const cors = require("cors");
const app = express();
const server = http.createServer(app);
const { initRealtime } = require("./services/realtime");
const { setupPush } = require("./services/push");
const { startReminderJob } = require("./services/reminderJob");
const {
  startScheduledPracticeJob,
} = require("./services/scheduledPractice");

const connectDB = require("./DB_CONFIG/db");
const userRoutes = require("./ROUTES/user");
const wordOfTheDayRoute = require("./ROUTES/wordOfTheDay");

const port = process.env.PORT || 3001;

// CORS must run before routes so browser preflight (OPTIONS) requests for
// authenticated uploads and streak requests receive the required headers.
// Render puts one proxy in front of the app; needed for per-IP rate limits.
app.set("trust proxy", 1);
app.use(cors());

// Paystack webhook needs the exact raw bytes to check its signature, so it is
// mounted BEFORE express.json().
app.post(
  "/api/billing/paystack/webhook",
  express.raw({ type: "*/*", limit: "1mb" }),
  require("./ROUTES/billing").paystackWebhook,
);

app.use(express.json());

// Health check for Render and uptime monitors (UptimeRobot, etc.).
app.get("/health", (_req, res) => {
  const mongoose = require("mongoose");
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({ ok: dbUp });
});

app.use("/user", userRoutes);
app.use("/api/admin", require("./ROUTES/admin"));
app.use("/api/waitlist", require("./ROUTES/waitlist"));
app.use("/api/learn-notifications", require("./ROUTES/learnNotifications"));
app.use(wordOfTheDayRoute);
app.use("/api/practice", require("./ROUTES/practice"));
app.use("/api/testimonials", require("./ROUTES/testimonials"));
app.use("/api/push", require("./ROUTES/push"));
app.use("/api/group", require("./ROUTES/group"));
app.use("/api/billing", require("./ROUTES/billing"));
connectDB().then(() => {
  // Moves older mixed-case usernames to lowercase (fast indexed sign-in).
  require("./utils/usernames").lowercaseLegacyUsernames();
});

// Live in-app updates (Socket.IO) share the same port as the API.
initRealtime(server);
// Phone notifications (Web Push) and the streak reminder job.
if (setupPush()) startReminderJob();
// Reminders for planned group practices (in-app always, phone when push is on).
startScheduledPracticeJob();

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Bad JSON or anything a route didn't catch: answer cleanly, never crash.
app.use((err, _req, res, _next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid request." });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ message: "Request is too large." });
  }
  console.error("Unhandled route error:", err);
  if (res.headersSent) return;
  res.status(500).json({ message: "Something went wrong. Please try again." });
});
