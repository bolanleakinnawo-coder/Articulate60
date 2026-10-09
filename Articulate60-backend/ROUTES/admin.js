const express = require("express");
const User = require("../MODELS/User");

const router = express.Router();

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

module.exports = router;
