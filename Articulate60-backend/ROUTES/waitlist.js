const express = require("express");
const WaitlistSignup = require("../MODELS/WaitlistSignup");

const router = express.Router();

router.post("/", async (req, res) => {
  const { name, email } = req.body || {};
  const normalizedName = typeof name === "string" ? name.trim() : "";
  const normalizedEmail = typeof email === "string" ? email.trim() : "";

  if (normalizedName.length < 2 || normalizedName.length > 80) {
    return res
      .status(400)
      .json({ message: "Your name must be between 2 and 80 characters." });
  }
  if (
    normalizedEmail.length > 254 ||
    !/^\S+@\S+\.\S+$/.test(normalizedEmail)
  ) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }

  try {
    const signup = await WaitlistSignup.create({
      name: normalizedName,
      email: normalizedEmail.toLowerCase(),
    });

    res.status(201).json({ id: signup._id, message: "You're on the waitlist." });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ message: "This email is already on the waitlist." });
    }

    console.error("Failed to save waitlist signup:", error);
    res.status(500).json({ message: "Could not join the waitlist." });
  }
});

module.exports = router;
