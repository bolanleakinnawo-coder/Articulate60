// Usernames are saved in lowercase (see ROUTES/user.js), so sign-in can use
// the unique index on `username` instead of a slow case-insensitive search.
const User = require("../MODELS/User");

const normalizeUsername = (value) => String(value || "").trim().toLowerCase();

// Values to look up for what a member typed: the lowercase form (all new
// accounts) plus the exact text (any older account that couldn't be
// lowercased because the lowercase name was already taken).
function usernameQuery(value) {
  const typed = String(value || "").trim();
  const lower = typed.toLowerCase();
  return typed === lower ? lower : { $in: [lower, typed] };
}

// One-off tidy-up run at start-up: lowercases older usernames that were
// saved with capital letters. Skips any whose lowercase form is taken.
async function lowercaseLegacyUsernames() {
  try {
    const legacy = await User.find({ username: /[A-Z]/ }).select("username").lean();
    let fixed = 0;
    for (const user of legacy) {
      const lower = user.username.toLowerCase();
      const taken = await User.exists({ username: lower, _id: { $ne: user._id } });
      if (taken) {
        console.error(`Username "${user.username}" kept as is: "${lower}" is taken.`);
        continue;
      }
      await User.updateOne({ _id: user._id }, { $set: { username: lower } });
      fixed += 1;
    }
    if (fixed) console.log(`Lowercased ${fixed} older username(s).`);
  } catch (err) {
    console.error("Username tidy-up failed:", err.message);
  }
}

module.exports = { normalizeUsername, usernameQuery, lowercaseLegacyUsernames };
