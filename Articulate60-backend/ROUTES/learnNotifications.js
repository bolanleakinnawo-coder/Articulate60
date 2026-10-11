const express = require("express");
const LearnNotification = require("../MODELS/LearnNotification");

const router = express.Router();

const PRODUCTS = {
  "communication-audit": "Communication Audit With Azimah",
  "speak-with-ease": "Speak With Ease Bundle",
  "what-do-i-say": "What Do I Say?",
  "what-do-i-do": "What Do I Do?",
};

router.post("/", async (req, res) => {
  const { name, email, productId } = req.body || {};
  const normalizedName = typeof name === "string" ? name.trim() : "";
  const normalizedEmail = typeof email === "string" ? email.trim() : "";
  const productName = PRODUCTS[productId];

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
  if (!productName) {
    return res.status(400).json({ message: "Choose a valid learning product." });
  }

  try {
    const notification = await LearnNotification.create({
      name: normalizedName,
      email: normalizedEmail.toLowerCase(),
      productId,
      productName,
    });

    res.status(201).json({
      id: notification._id,
      message: "You're on the notification list.",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "This email is already on the notification list for this product.",
      });
    }

    console.error("Failed to save learning product notification:", error);
    res.status(500).json({ message: "Could not save your notification request." });
  }
});

module.exports = router;
