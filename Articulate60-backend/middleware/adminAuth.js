const crypto = require("crypto");

// Protects the admin panel's API (win approvals, subscriber and waitlist
// emails). The admin panel sends the key in the X-Admin-Key header.
// Set ADMIN_API_KEY on the server to a long random string (32+ characters).
// If it isn't set, admin routes stay closed.
module.exports = function adminAuth(req, res, next) {
  const expected = (process.env.ADMIN_API_KEY || "").trim();
  if (expected.length < 24) {
    return res.status(503).json({ message: "Admin access is not set up." });
  }
  const given = String(req.get("x-admin-key") || "");
  const a = crypto.createHash("sha256").update(given).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  if (!given || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ code: "ADMIN_KEY", message: "Admin key required." });
  }
  next();
};
