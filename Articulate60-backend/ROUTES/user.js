const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../MODELS/User"); // adjust path/casing to match your actual folder

const router = express.Router();

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
const PHONE_REGEX = /^\+?[0-9]{10,15}$/;

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// ---------- SIGNUP ----------
router.post("/signup", async (req, res) => {
  try {
    const {
      fullName,
      username,
      email,
      phoneNumber,
      password,
      confirmPassword,
      role,
      roleOther,
      improvements,
      improvementOther,
      practiceFrequency,
    } = req.body;

    const errors = {};

    if (!fullName || fullName.trim().length < 2) {
      errors.fullName = "Full name must be at least 2 characters.";
    }

    if (!username || !USERNAME_REGEX.test(username.trim())) {
      errors.username =
        "Username must be 3–20 characters (letters, numbers, underscores only).";
    }

    if (!email || !EMAIL_REGEX.test(email.trim())) {
      errors.email = "Please enter a valid email address.";
    }

    if (!phoneNumber || !PHONE_REGEX.test(phoneNumber.trim())) {
      errors.phoneNumber = "Please enter a valid phone number.";
    }

    if (
      !password ||
      password.length < 8 ||
      !/[a-zA-Z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      errors.password =
        "Password must be at least 8 characters and include a letter and a number.";
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    if (!role) {
      errors.role = "Please select a role.";
    } else if (role === "Other" && !roleOther?.trim()) {
      errors.roleOther = "Please tell us more.";
    }

    if (!Array.isArray(improvements) || improvements.length === 0) {
      errors.improvements = "Please select at least one improvement area.";
    } else if (improvements.includes("Other") && !improvementOther?.trim()) {
      errors.improvementOther = "Please tell us more.";
    }

    if (!practiceFrequency) {
      errors.practiceFrequency = "Please select a practice frequency.";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: "Validation failed.", errors });
    }

    const existingEmail = await User.findOne({
      email: email.trim().toLowerCase(),
    });
    if (existingEmail) {
      return res
        .status(409)
        .json({ message: "An account with this email already exists." });
    }

    const existingUsername = await User.findOne({ username: username.trim() });
    if (existingUsername) {
      return res
        .status(409)
        .json({ message: "This username is already taken." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      fullName: fullName.trim(),
      username: username.trim(),
      email: email.trim().toLowerCase(),
      phoneNumber: phoneNumber.trim(),
      password: hashedPassword,
      role,
      roleOther: role === "Other" ? roleOther.trim() : "",
      improvements,
      improvementOther: improvements.includes("Other")
        ? improvementOther.trim()
        : "",
      practiceFrequency,
    });

    const token = generateToken(newUser._id);

    res.status(201).json({
      message: "Account created successfully!",
      token,
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        username: newUser.username,
        email: newUser.email,
      },
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Something went wrong. Please try again." });
  }
});

// ---------- LOGIN ----------
router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier = email or username

    if (!identifier || !password) {
      return res
        .status(400)
        .json({ message: "Email/username and password are required." });
    }

    const user = await User.findOne({
      $or: [
        { email: identifier.trim().toLowerCase() },
        { username: identifier.trim() },
      ],
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      message: "Login successful!",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Something went wrong. Please try again." });
  }
});

module.exports = router;
