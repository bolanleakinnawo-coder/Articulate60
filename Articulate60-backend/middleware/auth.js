const jwt = require("jsonwebtoken");

// Protects any route it's attached to. Expects:
//   Authorization: Bearer <token>
// On success, attaches req.userId so downstream routes know who's calling.
module.exports = function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Support either { userId } or { id } depending on how your login signs it.
    req.userId = decoded.userId || decoded.id;

    if (!req.userId) {
      return res.status(401).json({ message: "Invalid token payload." });
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};