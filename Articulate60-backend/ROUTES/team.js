// Team plans (round 10).
//
//   GET  /api/team/me                -> { team } (null when not in a team)
//   GET  /api/team/invite/:code      -> what the invite is for
//   POST /api/team/join   { code, endIndividualPlan }   -> { team }
//                         409 ENDS_INDIVIDUAL_PLAN until the member agrees.
//   POST /api/team/leave             -> { team: null }  (members, not the admin)
//   POST /api/team/remove { userId } -> { team }        (Team Admin only)
//   POST /api/team/code              -> { team }        (Team Admin: new invite link; the old one stops working)
//   POST /api/team/invite-emails { emails } -> { team, sent } (Team Admin)
//   POST /api/team/revoke-invite { email }  -> { team }       (Team Admin)
//   POST /api/team/name   { name }   -> { team }        (Team Admin)
//   POST /api/team/cancel | /resume  -> { team }        (Team Admin)
//
// Privacy: nothing here returns a member's recordings, transcripts or AI
// feedback. The Team Admin only sees names, photos, role and join dates.
const express = require("express");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");

const authMiddleware = require("../middleware/auth");
const Team = require("../MODELS/Team");
const User = require("../MODELS/User");
const {
  CODE_RE,
  isActive,
  teamOf,
  newInviteCode,
  joinTeam,
  removeMember,
} = require("../services/team");
const { TEAM_MAX_MEMBERS, PLAN_LIMITS, PRICES } = require("../utils/plans");
const { verifyToken } = require("../utils/authToken");
const { sendEmail, isConfigured: emailReady, teamInviteEmail } = require("../services/email");
const { returnUrlFor } = require("../utils/returnUrl");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Signed-in viewer if there is a valid token, else null (invite page is
// public so new people can see it before signing up).
async function optionalUserId(req) {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Bearer ")) return null;
  try {
    const { userId } = await verifyToken(h.split(" ")[1]);
    return userId;
  } catch {
    return null;
  }
}

const router = express.Router();

// Invite codes can't be guessed by trying many in a row.
const inviteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.userId),
  message: { message: "Too many tries. Please wait a few minutes." },
});

async function publicTeam(team, viewerId) {
  if (!team) return null;
  const isAdmin = String(team.admin) === String(viewerId);
  const users = await User.find(
    { _id: { $in: team.members.map((m) => m.user) } },
    { fullName: 1, username: 1, profileImageUrl: 1 },
  ).lean();
  const byId = new Map(users.map((u) => [String(u._id), u]));
  let liveRoom = null;
  try {
    liveRoom = require("../services/groupRooms").teamLiveRoom(team._id, viewerId);
  } catch {
    liveRoom = null;
  }
  const teamPlanId = `${team.planId}-team`;
  return {
    id: String(team._id),
    name: team.name || "",
    priceNaira: PRICES.NGN[teamPlanId] || null,
    priceUsd: PRICES.USD[teamPlanId] || null,
    periodId: team.periodId || "monthly",
    cancelledAt: team.cancelledAt || null,
    // Only the admin sees who has been invited by email.
    invites: isAdmin ? team.invites.map((i) => ({ email: i.email, invitedAt: i.invitedAt })) : [],
    invitesPending: team.invites.length,
    liveRoom,
    role: isAdmin ? "admin" : "member",
    planId: `${team.planId}-team`,
    basePlanId: team.planId,
    planName: `${PLAN_LIMITS[team.planId]?.name || "Loquiex"} Team`,
    active: isActive(team),
    startedAt: team.startedAt,
    expiresAt: team.expiresAt,
    maxMembers: TEAM_MAX_MEMBERS,
    // Only the admin sees the invite code.
    inviteCode: isAdmin ? team.inviteCode : null,
    members: team.members.map((m) => {
      const u = byId.get(String(m.user)) || {};
      return {
        id: String(m.user),
        name: u.fullName || u.username || "Loquiex member",
        username: u.username || "",
        photoUrl: u.profileImageUrl || "",
        isAdmin: String(m.user) === String(team.admin),
        isYou: String(m.user) === String(viewerId),
        joinedAt: m.joinedAt,
      };
    }),
  };
}

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const team = await teamOf(req.userId);
    res.json({ team: await publicTeam(team, req.userId) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Couldn't load your team." });
  }
});

const publicInviteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many tries. Please wait a few minutes." },
});

router.get("/invite/:code", publicInviteLimiter, async (req, res) => {
  try {
    const code = String(req.params.code || "").trim().toUpperCase();
    const team = CODE_RE.test(code) ? await Team.findOne({ inviteCode: code }) : null;
    if (!team) return res.status(404).json({ message: "That invite link isn't valid." });
    const admin = await User.findById(team.admin, { fullName: 1, username: 1 }).lean();
    const viewerId = await optionalUserId(req);
    const current = viewerId ? await teamOf(viewerId) : null;
    res.json({
      signedIn: Boolean(viewerId),
      teamName: team.name || "",
      planShortName: `${(PLAN_LIMITS[team.planId]?.name || "Loquiex").replace(/^Loquiex\s+/, "")} Team`,
      adminName: admin?.fullName || admin?.username || "Your Team Admin",
      planName: `${PLAN_LIMITS[team.planId]?.name || "Loquiex"} Team`,
      active: isActive(team),
      membersCount: team.members.length,
      maxMembers: TEAM_MAX_MEMBERS,
      alreadyMember: Boolean(current && String(current._id) === String(team._id)),
      inOtherTeam: Boolean(current && String(current._id) !== String(team._id)),
      // Round 11: name the other team, so the member knows which one it is.
      otherTeamName:
        current && String(current._id) !== String(team._id) ? current.name || "" : "",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Couldn't open this invite." });
  }
});

router.post("/join", authMiddleware, inviteLimiter, async (req, res) => {
  try {
    const result = await joinTeam(req.userId, req.body?.code, {
      confirmEndPlan: req.body?.endIndividualPlan === true,
    });
    if (result.error)
      return res
        .status(result.error)
        .json({ message: result.message, ...(result.code ? { code: result.code } : {}) });
    res.json({ team: await publicTeam(result.team, req.userId) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Couldn't join the team. Please try again." });
  }
});

router.post("/leave", authMiddleware, async (req, res) => {
  try {
    const team = await teamOf(req.userId);
    if (!team) return res.json({ team: null });
    if (String(team.admin) === String(req.userId))
      return res.status(400).json({ message: "The Team Admin can't leave the team." });
    await removeMember(team, req.userId);
    res.json({ team: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Couldn't leave the team. Please try again." });
  }
});

router.post("/remove", authMiddleware, async (req, res) => {
  try {
    const userId = String(req.body?.userId || "");
    if (!mongoose.isValidObjectId(userId))
      return res.status(400).json({ message: "Choose a member to remove." });
    const team = await Team.findOne({ admin: req.userId });
    if (!team) return res.status(403).json({ message: "Only the Team Admin can remove members." });
    if (userId === String(req.userId))
      return res.status(400).json({ message: "You can't remove yourself." });
    const updated = await removeMember(team, userId);
    res.json({ team: await publicTeam(updated || team, req.userId) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Couldn't remove this member. Please try again." });
  }
});

// Email invitations. Only as many as there are free places.
router.post("/invite-emails", authMiddleware, async (req, res) => {
  try {
    const team = await Team.findOne({ admin: req.userId });
    if (!team) return res.status(403).json({ message: "Only the Team Admin can invite members." });
    if (!isActive(team))
      return res.status(409).json({ message: "Renew your team plan to invite members." });
    const raw = Array.isArray(req.body?.emails) ? req.body.emails : [];
    const emails = [...new Set(raw.map((e) => String(e || "").trim().toLowerCase()).filter(Boolean))];
    if (!emails.length) return res.status(400).json({ message: "Enter at least one email address." });
    const bad = emails.find((e) => !EMAIL_RE.test(e) || e.length > 200);
    if (bad) return res.status(400).json({ message: `"${bad}" isn't a valid email address.` });

    const memberUsers = await User.find(
      { _id: { $in: team.members.map((m) => m.user) } },
      { email: 1 },
    ).lean();
    const memberEmails = new Set(memberUsers.map((u) => String(u.email || "").toLowerCase()));
    const pending = new Set(team.invites.map((i) => i.email));
    const fresh = emails.filter((e) => !memberEmails.has(e) && !pending.has(e));
    const free = TEAM_MAX_MEMBERS - team.members.length - team.invites.length;
    if (fresh.length > free) {
      return res.status(409).json({
        message:
          free > 0
            ? `You can invite ${free} more ${free === 1 ? "person" : "people"}.`
            : "Every place in your team is taken or invited.",
      });
    }
    if (!emailReady())
      return res.status(503).json({
        message: "Email invitations aren't available right now. Copy the invitation link instead.",
      });

    const admin = await User.findById(req.userId, { fullName: 1, username: 1 }).lean();
    const url = returnUrlFor(req, `/team/join/${team.inviteCode}`);
    const planName = `${PLAN_LIMITS[team.planId]?.name || "Loquiex"} Team`;
    let sent = 0;
    for (const email of fresh) {
      try {
        await sendEmail({
          to: email,
          ...teamInviteEmail({
            adminName: admin?.fullName || admin?.username,
            teamName: team.name,
            planName,
            url,
          }),
        });
        sent += 1;
        await Team.updateOne(
          { _id: team._id, "invites.email": { $ne: email } },
          { $push: { invites: { email, invitedAt: new Date() } } },
        );
      } catch (err) {
        console.error("Team invite email failed:", err.message);
      }
    }
    const updated = await Team.findById(team._id);
    if (!sent && fresh.length)
      return res.status(502).json({
        message: "Couldn't send the invitations. Please try again.",
        team: await publicTeam(updated, req.userId),
      });
    res.json({ sent, team: await publicTeam(updated, req.userId) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Couldn't send the invitations. Please try again." });
  }
});

router.post("/revoke-invite", authMiddleware, async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const team = await Team.findOneAndUpdate(
      { admin: req.userId },
      { $pull: { invites: { email } } },
      { returnDocument: "after" },
    );
    if (!team) return res.status(403).json({ message: "Only the Team Admin can do this." });
    res.json({ team: await publicTeam(team, req.userId) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Couldn't cancel the invitation." });
  }
});

router.post("/name", authMiddleware, async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim().slice(0, 60);
    if (!name) return res.status(400).json({ message: "Give your team a name." });
    const team = await Team.findOneAndUpdate(
      { admin: req.userId },
      { $set: { name } },
      { returnDocument: "after" },
    );
    if (!team) return res.status(403).json({ message: "Only the Team Admin can do this." });
    res.json({ team: await publicTeam(team, req.userId) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Couldn't rename the team." });
  }
});

// Team plans are prepaid and never renew on their own: cancelling only
// records the choice. Everyone keeps the plan until it ends.
router.post("/cancel", authMiddleware, async (req, res) => {
  try {
    const team = await Team.findOneAndUpdate(
      { admin: req.userId, expiresAt: { $gt: new Date() } },
      { $set: { cancelledAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!team) return res.status(403).json({ message: "Only the Team Admin can do this." });
    res.json({ team: await publicTeam(team, req.userId) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Couldn't cancel the team plan." });
  }
});

router.post("/resume", authMiddleware, async (req, res) => {
  try {
    const team = await Team.findOneAndUpdate(
      { admin: req.userId },
      { $set: { cancelledAt: null } },
      { returnDocument: "after" },
    );
    if (!team) return res.status(403).json({ message: "Only the Team Admin can do this." });
    res.json({ team: await publicTeam(team, req.userId) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Couldn't update the team plan." });
  }
});

router.post("/code", authMiddleware, async (req, res) => {
  try {
    const team = await Team.findOneAndUpdate(
      { admin: req.userId },
      { $set: { inviteCode: await newInviteCode() } },
      { returnDocument: "after" },
    );
    if (!team) return res.status(403).json({ message: "Only the Team Admin can do this." });
    res.json({ team: await publicTeam(team, req.userId) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Couldn't make a new invite link." });
  }
});

module.exports = router;
