const jwt = require("jsonwebtoken");

module.exports = function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Admin sign-in required." });
  }

  try {
    const token = authHeader.slice("Bearer ".length);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Admin access required." });
    }

    next();
  } catch {
    return res.status(401).json({ message: "Admin session is invalid or expired." });
  }
};
