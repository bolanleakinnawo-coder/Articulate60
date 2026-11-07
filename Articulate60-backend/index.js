const dns = require("dns");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

require("dotenv").config();

const http = require("http");
const express = require("express");
const cors = require("cors");
const app = express();
const server = http.createServer(app);
const { initRealtime } = require("./services/realtime");
const { setupPush } = require("./services/push");
const { startReminderJob } = require("./services/reminderJob");

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
connectDB();

// Live in-app updates (Socket.IO) share the same port as the API.
initRealtime(server);
// Phone notifications (Web Push) and the streak reminder job.
if (setupPush()) startReminderJob();

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
