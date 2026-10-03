const crypto = require("crypto");
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const router = express.Router();

function matchesConfiguredUsername(username) {
  const submitted = crypto
    .createHash("sha256")
    .update(username)
    .digest();
  const configured = crypto
    .createHash("sha256")
    .update(process.env.ADMIN_USERNAME)
    .digest();

  return crypto.timingSafeEqual(submitted, configured);
}

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (typeof username !== "string" || typeof password !== "string") {
    return res
      .status(400)
      .json({ message: "Username and password are required." });
  }

  const configuredUsername = process.env.ADMIN_USERNAME;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  if (!configuredUsername || !passwordHash || !process.env.JWT_SECRET) {
    return res.status(503).json({
      message: "Admin sign-in has not been configured on the server.",
    });
  }

  try {
    const usernameMatches = matchesConfiguredUsername(username.trim());
    const passwordMatches = await bcrypt.compare(password, passwordHash);
    if (!usernameMatches || !passwordMatches) {
      return res.status(401).json({ message: "Invalid admin credentials." });
    }

    const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, {
      expiresIn: "8h",
    });
    res.json({ token });
  } catch (error) {
    console.error("Admin login failed:", error);
    res.status(500).json({ message: "Could not sign in to the admin dashboard." });
  }
});

module.exports = router;
