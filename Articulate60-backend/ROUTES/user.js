const express = require("express");
const bcrypt = require("bcrypt");
const multer = require("multer");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { randomUUID, randomBytes, createHash } = require("crypto");
const User = require("../MODELS/User"); // adjust path/casing to match your actual folder
const r2 = require("../config/r2");
const rateLimit = require("express-rate-limit");
const { planIdOf, subscriptionOf } = require("../utils/plans");
const PasswordReset = require("../MODELS/PasswordReset");
const { signToken, verifyToken } = require("../utils/authToken");
const { disconnectUser } = require("../services/realtime");
const { deleteAccount } = require("../services/accountDeletion");
const {
  sendEmail,
  passwordResetEmail,
  passwordChangedEmail,
  accountDeletedEmail,
} = require("../services/email");

const router = express.Router();

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
const normalizeUsername = (username) => username.trim().toLowerCase();
const usernameLookup = (username) =>
  new RegExp(`^${username.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
const PHONE_REGEX = /^\+?[0-9]{10,15}$/;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});
const handleProfilePhotoUpload = (req, res, next) => {
  upload.single("profilePhoto")(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res
        .status(413)
        .json({ message: "Profile photos must be smaller than 5 MB." });
    }

    console.error("Failed to receive profile photo:", error);
    return res.status(400).json({ message: "Could not process the profile photo." });
  });
};
const PROFILE_IMAGE_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Slows down password guessing: 10 tries per 15 minutes per IP + account.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) =>
    `${rateLimit.ipKeyGenerator(req.ip)}|${String(req.body?.identifier || "").trim().toLowerCase()}`,
  message: { message: "Too many sign-in attempts. Please wait 15 minutes and try again." },
});

const generateToken = (user) => signToken(user);

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token)
      return res.status(401).json({ message: "Authentication required." });

    const { user } = await verifyToken(token, { full: true });
    req.user = user;
    next();
  } catch (err) {
    if (err.code) {
      return res.status(401).json({ message: err.message, code: err.code });
    }
    console.error("Auth check failed:", err);
    res.status(503).json({ message: "Please try again in a moment." });
  }
};

const isStrongPassword = (password) =>
  typeof password === "string" &&
  password.length >= 8 &&
  password.length <= 128 &&
  /[a-zA-Z]/.test(password) &&
  /[0-9]/.test(password);

const appUrl = () => (process.env.APP_URL || "").trim().replace(/\/+$/, "");
const hashToken = (token) => createHash("sha256").update(token).digest("hex");
const RESET_MINUTES = 30;
const RESET_TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const clientIp = (req) => rateLimit.ipKeyGenerator(req.ip || "");

// Forgot password: 5 requests per 15 minutes per IP, and 3 per hour for one
// email/username, so nobody can flood someone's inbox.
const forgotIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => clientIp(req),
  message: { message: "Too many reset requests. Please wait 15 minutes and try again." },
});
const forgotAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    `forgot|${String(req.body?.identifier || req.body?.email || "").trim().toLowerCase()}`,
  message: { message: "Too many reset requests. Please wait an hour and try again." },
});
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => clientIp(req),
  message: { message: "Too many attempts. Please wait 15 minutes and try again." },
});
const deleteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `delete|${clientIp(req)}`,
  message: { message: "Too many attempts. Please wait 15 minutes and try again." },
});

// ---------- SIGNUP ----------
router.post("/signup", handleProfilePhotoUpload, async (req, res) => {
  try {
    const {
      fullName,
      username,
      email,
      marketingOptIn,
      phoneNumber,
      password,
      confirmPassword,
      role,
      roleOther,
      improvements,
      improvementOther,
      practiceFrequency,
    } = req.body;
    const selectedImprovements =
      typeof improvements === "string" ? JSON.parse(improvements) : improvements;

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

    if (!Array.isArray(selectedImprovements) || selectedImprovements.length === 0) {
      errors.improvements = "Please select at least one improvement area.";
    } else if (selectedImprovements.includes("Other") && !improvementOther?.trim()) {
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

    const normalizedUsername = normalizeUsername(username);
    const existingUsername = await User.findOne({
      username: usernameLookup(username),
    });
    if (existingUsername) {
      return res
        .status(409)
        .json({ message: "This username is already taken." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    let profileImageUrl = "";

    if (req.file) {
      if (!req.file.mimetype.startsWith("image/")) {
        return res.status(400).json({ message: "Profile photo must be an image." });
      }

      const extension = req.file.mimetype.split("/")[1] || "jpg";
      const key = `profiles/${randomUUID()}.${extension}`;
      await r2.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: key,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        }),
      );
      profileImageUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    }

    const newUser = await User.create({
      fullName: fullName.trim(),
      username: normalizedUsername,
      email: email.trim().toLowerCase(),
      phoneNumber: phoneNumber.trim(),
      password: hashedPassword,
      role,
      roleOther: role === "Other" ? roleOther.trim() : "",
      improvements: selectedImprovements,
      improvementOther: selectedImprovements.includes("Other")
        ? improvementOther.trim()
        : "",
      practiceFrequency,
      profileImageUrl,
      marketingOptIn: marketingOptIn === "true",
      marketingOptInAt:
        marketingOptIn === "true" ? new Date() : null,
    });

    const token = generateToken(newUser);

    res.status(201).json({
      message: "Account created successfully!",
      token,
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        username: newUser.username,
        email: newUser.email,
        profileImageUrl: newUser.profileImageUrl,
        createdAt: newUser.createdAt,
        plan: planIdOf(newUser),
        subscription: subscriptionOf(newUser),
        improvements: newUser.improvements,
        practiceFrequency: newUser.practiceFrequency,
      },
    });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      const duplicateField = Object.keys(err.keyPattern || {})[0];
      const message =
        duplicateField === "email"
          ? "An account with this email already exists."
          : duplicateField === "username"
            ? "This username is already taken."
            : "An account with these details already exists.";
      return res.status(409).json({ message });
    }
    if (err.name === "ValidationError") {
      const validationMessage = Object.values(err.errors)
        .map((validationError) => validationError.message)
        .join(" ");
      return res.status(400).json({ message: validationMessage });
    }
    res
      .status(500)
      .json({ message: "Something went wrong. Please try again." });
  }
});

// ---------- LOGIN ----------
router.post("/login", loginLimiter, async (req, res) => {
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
        { username: usernameLookup(identifier) },
      ],
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = generateToken(user);

    res.status(200).json({
      message: "Login successful!",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        profileImageUrl: user.profileImageUrl,
        createdAt: user.createdAt,
        plan: planIdOf(user),
        subscription: subscriptionOf(user),
        improvements: user.improvements,
        practiceFrequency: user.practiceFrequency,
      },
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Something went wrong. Please try again." });
  }
});

// ---------- UPDATE PROFILE ----------
router.put(
  "/profile",
  authenticate,
  upload.single("profilePhoto"),
  async (req, res) => {
    try {
      const {
        fullName,
        username,
        email,
        newPassword,
        confirmPassword,
        removeProfilePhoto,
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
      if (newPassword || confirmPassword) {
        if (
          !newPassword ||
          newPassword.length < 8 ||
          !/[a-zA-Z]/.test(newPassword) ||
          !/[0-9]/.test(newPassword)
        ) {
          errors.newPassword =
            "New password must be at least 8 characters and include a letter and a number.";
        } else if (newPassword !== confirmPassword) {
          errors.confirmPassword = "Passwords do not match.";
        }
      }
      if (Object.keys(errors).length) {
        return res.status(400).json({ message: "Validation failed.", errors });
      }

      if (req.file && !PROFILE_IMAGE_EXTENSIONS[req.file.mimetype]) {
        return res.status(400).json({
          message: "Profile photo must be a JPEG, PNG, or WebP image.",
        });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const normalizedUsername = normalizeUsername(username);
      const existingUser = await User.findOne({
        $or: [
          { email: normalizedEmail },
          { username: usernameLookup(username) },
        ],
        _id: { $ne: req.user._id },
      });
      if (existingUser) {
        return res
          .status(409)
          .json({ message: "That email or username is already in use." });
      }

      req.user.fullName = fullName.trim();
      req.user.username = normalizedUsername;
      req.user.email = normalizedEmail;
      if (req.file) {
        const extension = PROFILE_IMAGE_EXTENSIONS[req.file.mimetype];
        const key = `profiles/${randomUUID()}.${extension}`;
        await r2.send(
          new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
          }),
        );
        req.user.profileImageUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
      } else if (removeProfilePhoto === "true") {
        req.user.profileImageUrl = "";
      }
      if (newPassword) {
        req.user.password = await bcrypt.hash(newPassword, 10);
        // Signs out every other device; this one gets a fresh token below.
        req.user.tokenVersion = (req.user.tokenVersion || 0) + 1;
        req.user.passwordChangedAt = new Date();
      }
      await req.user.save();
      if (newPassword) {
        disconnectUser(String(req.user._id), "session:revoked", {});
        PasswordReset.deleteMany({ user: req.user._id }).catch(() => {});
        const mail = passwordChangedEmail({ name: req.user.fullName, appUrl: appUrl() });
        sendEmail({ to: req.user.email, ...mail }).catch((e) =>
          console.error("Password-changed email failed:", e.message),
        );
      }

      res.json({
        message: "Profile updated successfully.",
        ...(newPassword ? { token: generateToken(req.user) } : {}),
        user: {
          id: req.user._id,
          fullName: req.user.fullName,
          username: req.user.username,
          email: req.user.email,
          profileImageUrl: req.user.profileImageUrl,
          createdAt: req.user.createdAt,
          plan: planIdOf(req.user),
          subscription: subscriptionOf(req.user),
          improvements: req.user.improvements,
          practiceFrequency: req.user.practiceFrequency,
        },
      });
    } catch (err) {
      console.error(err);
      if (err.code === 11000 && err.keyPattern?.username) {
        return res.status(409).json({ message: "This username is already taken." });
      }
      res
        .status(500)
        .json({ message: "Something went wrong updating your profile." });
    }
  },
);

// ---------- FORGOT PASSWORD ----------
// Always answers the same way, whether or not the account exists, and does
// the lookup and email after replying, so nobody can use it to find out
// which emails have Loquiex accounts.
const FORGOT_REPLY = {
  message:
    "If an account matches what you entered, we've sent a link to reset your password. It expires in 30 minutes.",
};

async function sendResetLink(identifier, ip) {
  const value = identifier.trim();
  const user = await User.findOne(
    EMAIL_REGEX.test(value)
      ? { email: value.toLowerCase() }
      : { username: usernameLookup(value) },
  ).select("fullName email");
  if (!user) return;

  const base = appUrl();
  if (!base) {
    console.error("Forgot password: APP_URL is not set, so no link can be made.");
    return;
  }

  // Only the newest link works.
  await PasswordReset.deleteMany({ user: user._id, usedAt: null });
  const token = randomBytes(32).toString("base64url");
  await PasswordReset.create({
    user: user._id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + RESET_MINUTES * 60 * 1000),
    requestedIp: ip,
  });

  const url = `${base}/reset-password?token=${token}`;
  const mail = passwordResetEmail({ name: user.fullName, url, minutes: RESET_MINUTES });
  await sendEmail({ to: user.email, ...mail });
}

router.post("/forgot-password", forgotIpLimiter, forgotAccountLimiter, (req, res) => {
  const identifier = String(req.body?.identifier || req.body?.email || "");
  if (!identifier.trim() || identifier.length > 254) {
    return res
      .status(400)
      .json({ message: "Please enter your email address or username." });
  }
  res.json(FORGOT_REPLY);
  sendResetLink(identifier, req.ip || "").catch((err) =>
    console.error("Forgot password failed:", err.message),
  );
});

async function findLiveReset(token) {
  if (!RESET_TOKEN_RE.test(String(token || ""))) return null;
  return PasswordReset.findOne({
    tokenHash: hashToken(token),
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });
}

// Lets the reset page say "this link has expired" before the member types.
router.post("/reset-password/check", resetLimiter, async (req, res) => {
  try {
    const reset = await findLiveReset(req.body?.token);
    res.json({ valid: Boolean(reset) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

// ---------- RESET PASSWORD ----------
router.post("/reset-password", resetLimiter, async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body || {};
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        message: "Password must be 8–128 characters and include a letter and a number.",
      });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }

    const expired = {
      message: "This reset link has expired or was already used. Please ask for a new one.",
      code: "RESET_LINK_INVALID",
    };
    if (!RESET_TOKEN_RE.test(String(token || ""))) return res.status(400).json(expired);

    // Marks the link used in the same step that finds it, so it can't be
    // used twice even if two requests arrive together.
    const reset = await PasswordReset.findOneAndUpdate(
      { tokenHash: hashToken(token), usedAt: null, expiresAt: { $gt: new Date() } },
      { $set: { usedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!reset) return res.status(400).json(expired);

    const user = await User.findById(reset.user);
    if (!user) return res.status(400).json(expired);

    user.password = await bcrypt.hash(password, 10);
    user.tokenVersion = (user.tokenVersion || 0) + 1; // signs out every device
    user.passwordChangedAt = new Date();
    await user.save();
    await PasswordReset.deleteMany({ user: user._id, _id: { $ne: reset._id } });
    disconnectUser(String(user._id), "session:revoked", {});

    const mail = passwordChangedEmail({ name: user.fullName, appUrl: appUrl() });
    sendEmail({ to: user.email, ...mail }).catch((e) =>
      console.error("Password-changed email failed:", e.message),
    );

    res.json({ message: "Your password has been reset. You can sign in now." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

// ---------- DELETE ACCOUNT ----------
// Needs the current password, and the word DELETE typed by the member.
router.delete("/account", deleteLimiter, authenticate, async (req, res) => {
  try {
    const { password, confirmText } = req.body || {};
    if (String(confirmText || "").trim() !== "DELETE") {
      return res.status(400).json({ message: "Type DELETE to confirm." });
    }
    if (!password || !(await bcrypt.compare(String(password), req.user.password))) {
      return res.status(401).json({
        message: "That password isn't right.",
        code: "WRONG_PASSWORD",
      });
    }

    const { fullName, email } = req.user;
    await deleteAccount(req.user);

    const mail = accountDeletedEmail({ name: fullName });
    sendEmail({ to: email, ...mail }).catch((e) =>
      console.error("Account-deleted email failed:", e.message),
    );

    res.json({ message: "Your account has been deleted." });
  } catch (err) {
    console.error("Account deletion failed:", err);
    res
      .status(500)
      .json({ message: "We couldn't delete your account just now. Please try again." });
  }
});

module.exports = router;
