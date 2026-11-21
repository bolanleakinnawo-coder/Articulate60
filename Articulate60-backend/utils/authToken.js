// Sign-in tokens (JWT) for the REST API and Socket.IO.
//
// Each token carries the member's id and their tokenVersion. When the
// password is reset or changed, tokenVersion goes up, so every older token
// stops working: the member is signed out on all devices. A deleted account
// has no user row, so its tokens stop working too.
const jwt = require("jsonwebtoken");
const User = require("../MODELS/User");

// Round 14: a sign-in never runs out. Members stay signed in until they
// log out themselves (or the password is changed/reset, or the account is
// deleted, which still sign out every device through tokenVersion).
// Older sign-ins made with a 30-day end date keep working too, and are
// swapped once for one without an end date (see middleware/auth.js).
function signToken(user) {
  return jwt.sign(
    { id: String(user._id), tv: user.tokenVersion || 0 },
    process.env.JWT_SECRET,
  );
}

class SessionError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

// Checks the token and that it still belongs to a live session.
// Returns { userId, user } where user is a lean { _id, tokenVersion } row
// (or the full document when `full` is true).
async function verifyToken(token, { full = false } = {}) {
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
  } catch {
    throw new SessionError("Invalid or expired session.", "SESSION_EXPIRED");
  }
  const userId = decoded.userId || decoded.id;
  if (!userId) throw new SessionError("Invalid token payload.", "SESSION_EXPIRED");

  const user = full
    ? await User.findById(userId)
    : await User.findById(userId).select("tokenVersion").lean();
  if (!user) {
    throw new SessionError("This account no longer exists.", "ACCOUNT_GONE");
  }
  // Tokens made before tokenVersion existed carry no "tv": treat as 0.
  if ((decoded.tv || 0) !== (user.tokenVersion || 0)) {
    throw new SessionError(
      "Your password was changed. Please sign in again.",
      "SESSION_REVOKED",
    );
  }
  return {
    userId: String(userId),
    user,
    // An older sign-in with an end date is swapped for one without.
    shouldRenew: Boolean(decoded.exp),
  };
}

module.exports = { signToken, verifyToken, SessionError };
