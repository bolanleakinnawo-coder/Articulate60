const { verifyToken } = require("../utils/authToken");

// Protects any route it's attached to. Expects:
//   Authorization: Bearer <token>
// On success, attaches req.userId so downstream routes know who's calling.
// Tokens from before a password reset, or for a deleted account, are refused
// with a `code` the app uses to send the member back to the sign-in page.
module.exports = async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided." });
  }

  try {
    const { userId } = await verifyToken(authHeader.split(" ")[1]);
    req.userId = userId;
    next();
  } catch (err) {
    if (err.code) {
      return res.status(401).json({ message: err.message, code: err.code });
    }
    console.error("Auth check failed:", err);
    return res.status(503).json({ message: "Please try again in a moment." });
  }
};
