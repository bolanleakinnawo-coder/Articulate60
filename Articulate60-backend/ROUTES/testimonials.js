const express = require("express");
const mongoose = require("mongoose");
const Testimonial = require("../MODELS/Testimonial");
const authMiddleware = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const testimonials = await Testimonial.find({ status: "approved" })
      .select("quote displayName createdAt")
      .sort({ reviewedAt: -1, createdAt: -1 })
      .limit(12)
      .lean();

    res.json(testimonials);
  } catch (error) {
    console.error("Failed to fetch approved testimonials:", error);
    res.status(500).json({ message: "Could not load testimonials." });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  const { quote, displayName } = req.body;
  if (
    typeof quote !== "string" ||
    quote.trim().length === 0 ||
    quote.trim().length > 1000
  ) {
    return res.status(400).json({
      message: "Your win must contain text and be no longer than 1,000 characters.",
    });
  }
  if (
    typeof displayName !== "string" ||
    displayName.trim().length < 2 ||
    displayName.trim().length > 40
  ) {
    return res
      .status(400)
      .json({ message: "Your display name must be between 2 and 40 characters." });
  }
  try {
    const testimonial = await Testimonial.create({
      user: req.userId,
      displayName: displayName.trim(),
      quote: quote.trim(),
    });

    res.status(201).json(testimonial);
  } catch (error) {
    console.error("Failed to save testimonial:", error);
    res.status(500).json({ message: "Could not submit your win." });
  }
});

router.get("/admin", adminAuth, async (req, res) => {
  const allowedStatuses = ["pending", "approved", "rejected"];
  const status = req.query.status || "pending";
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid testimonial status." });
  }

  try {
    const testimonials = await Testimonial.find({ status })
      .select("quote displayName status createdAt reviewedAt")
      .sort({ createdAt: 1 })
      .lean();

    res.json(testimonials);
  } catch (error) {
    console.error("Failed to fetch testimonials for review:", error);
    res.status(500).json({ message: "Could not load testimonials for review." });
  }
});

router.patch(
  "/admin/:id",
  adminAuth,
  async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid testimonial ID." });
    }
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Choose approve or reject." });
    }

    try {
      const testimonial = await Testimonial.findOneAndUpdate(
        { _id: id, status: "pending" },
        { status, reviewedAt: new Date() },
        { new: true, runValidators: true },
      )
        .select("quote displayName status createdAt reviewedAt")
        .lean();

      if (!testimonial) {
        const existingTestimonial = await Testimonial.exists({ _id: id });
        return res.status(existingTestimonial ? 409 : 404).json({
          message: existingTestimonial
            ? "This win has already been reviewed."
            : "Testimonial not found.",
        });
      }

      res.json(testimonial);
    } catch (error) {
      console.error("Failed to review testimonial:", error);
      res.status(500).json({ message: "Could not update testimonial status." });
    }
  },
);

module.exports = router;
