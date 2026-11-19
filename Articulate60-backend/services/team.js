// Team plans (round 10, Sheriff 2026-11-19).
//
// The Team Admin pays once (services/billing.js calls applyTeamPayment after
// Paystack confirms it). Every member, the admin included, gets the team's
// plan on their own account through User.teamPlan / teamPlanExpiresAt, which
// utils/plans.js planIdOf() reads next to their own plan (the better one
// wins). Each member keeps their own AI feedback and call time allowance.
const crypto = require("crypto");
const Team = require("../MODELS/Team");
const User = require("../MODELS/User");
const { TEAM_PLANS, TEAM_MAX_MEMBERS, addMonths, ownPlanIdOf } = require("../utils/plans");

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;

function randomCode() {
  const bytes = crypto.randomBytes(6);
  let code = "";
  for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return code;
}

async function newInviteCode() {
  for (let i = 0; i < 20; i += 1) {
    const code = randomCode();
    if (!(await Team.exists({ inviteCode: code }))) return code;
  }
  throw new Error("Couldn't make an invite code.");
}

function isActive(team, now = new Date()) {
  return Boolean(team?.expiresAt && new Date(team.expiresAt) > now);
}

// Gives every member the team's plan (or takes it away from `removed`).
async function syncMembers(team) {
  const ids = team.members.map((m) => m.user);
  if (!ids.length) return;
  await User.updateMany(
    { _id: { $in: ids } },
    {
      $set: {
        team: team._id,
        teamPlan: team.planId,
        teamPlanStartedAt: team.startedAt,
        teamPlanExpiresAt: team.expiresAt,
      },
    },
  );
}

async function clearMember(userId, teamId) {
  await User.updateOne(
    { _id: userId, team: teamId },
    {
      $set: {
        team: null,
        teamPlan: null,
        teamPlanStartedAt: null,
        teamPlanExpiresAt: null,
      },
    },
  );
}

// Round 11 (Sheriff): joining or starting a team ends the member's own
// individual plan at once, with no credit ("Joining a team" warning).
async function endIndividualPlan(userId, now = new Date()) {
  await User.updateOne(
    { _id: userId, planExpiresAt: { $gt: now } },
    { $set: { planExpiresAt: now, planCancelledAt: now, planEndedForTeamAt: now } },
  );
}

async function hasActiveOwnPlan(userId, now = new Date()) {
  const me = await User.findById(userId, { plan: 1, planExpiresAt: 1 }).lean();
  return ownPlanIdOf(me, now) !== "free";
}

// The team this user belongs to (as admin or member), or null.
function teamOf(userId) {
  return Team.findOne({ "members.user": userId });
}

// Applies a paid team payment once per reference. Paying again for the same
// team plan adds the time on; a different team plan starts today.
async function applyTeamPayment(payment) {
  const ref = payment.reference;
  const base = TEAM_PLANS[payment.planId]?.base;
  if (!base) throw new Error(`Unknown team plan ${payment.planId} on ${ref}`);

  const exists = await User.exists({ _id: payment.user });
  if (!exists) return { accountDeleted: true };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const now = new Date();
    let team = await Team.findOne({ admin: payment.user });
    if (team?.appliedPaymentRefs.includes(ref)) return null;

    if (!team) {
      // Paid while in someone else's team: they now lead their own.
      const other = await teamOf(payment.user);
      if (other && String(other.admin) !== String(payment.user)) {
        await Team.updateOne(
          { _id: other._id },
          { $pull: { members: { user: payment.user } } },
        );
        await clearMember(payment.user, other._id);
      }
      const startsAt = now;
      const expiresAt = addMonths(now, payment.months);
      try {
        team = await Team.create({
          admin: payment.user,
          name: payment.teamName || "",
          planId: base,
          periodId: payment.periodId,
          startedAt: startsAt,
          expiresAt,
          members: [{ user: payment.user, joinedAt: now }],
          inviteCode: await newInviteCode(),
          appliedPaymentRefs: [ref],
        });
      } catch (err) {
        if (err.code === 11000) continue; // made at the same time: retry
        throw err;
      }
      await syncMembers(team);
      if (payment.endsIndividualPlan) await endIndividualPlan(payment.user);
      return { startsAt, expiresAt };
    }

    const extend = isActive(team, now) && team.planId === base;
    const startsAt = extend ? team.startedAt || now : now;
    const expiresAt = addMonths(extend ? team.expiresAt : now, payment.months);
    const updated = await Team.findOneAndUpdate(
      {
        _id: team._id,
        appliedPaymentRefs: { $ne: ref },
        expiresAt: team.expiresAt ?? null,
      },
      {
        $set: {
          planId: base,
          periodId: payment.periodId,
          startedAt: startsAt,
          expiresAt,
          cancelledAt: null,
          ...(payment.teamName ? { name: payment.teamName } : {}),
        },
        $push: { appliedPaymentRefs: ref },
      },
      { returnDocument: "after" },
    );
    if (updated) {
      await syncMembers(updated);
      if (payment.endsIndividualPlan) await endIndividualPlan(payment.user);
      return { startsAt, expiresAt };
    }
  }
  throw new Error(`Could not apply team payment ${ref} (busy).`);
}

// Adds userId to the team with this invite code.
// Returns { team } or { error, message }.
// confirmEndPlan: the member agreed to the "Joining a team" warning.
async function joinTeam(userId, rawCode, { confirmEndPlan = false } = {}) {
  const code = String(rawCode || "").trim().toUpperCase();
  if (!CODE_RE.test(code))
    return { error: 404, message: "That invite link isn't valid." };
  const team = await Team.findOne({ inviteCode: code });
  if (!team) return { error: 404, message: "That invite link isn't valid." };
  if (team.members.some((m) => String(m.user) === String(userId)))
    return { team };
  if (!isActive(team))
    return {
      error: 409,
      message: "This team's plan has ended. Ask your Team Admin to renew it.",
    };
  const current = await teamOf(userId);
  if (current) {
    return {
      error: 409,
      message:
        String(current.admin) === String(userId)
          ? "You're already the Team Admin of a team."
          : "You're already in a team. Leave it first to join this one.",
    };
  }
  const endsPlan = await hasActiveOwnPlan(userId);
  if (endsPlan && !confirmEndPlan) {
    return {
      error: 409,
      code: "ENDS_INDIVIDUAL_PLAN",
      message:
        "Your individual subscription will end immediately when you join this team. Any unused days and allowances will be forfeited, as individual and team allowances cannot be combined.",
    };
  }
  const me = await User.findById(userId, { email: 1 }).lean();
  const updated = await Team.findOneAndUpdate(
    {
      _id: team._id,
      "members.user": { $ne: userId },
      [`members.${TEAM_MAX_MEMBERS - 1}`]: { $exists: false },
    },
    {
      $push: { members: { user: userId, joinedAt: new Date() } },
      // An email invitation to this person is used up.
      ...(me?.email ? { $pull: { invites: { email: me.email.toLowerCase() } } } : {}),
    },
    { returnDocument: "after" },
  );
  if (!updated)
    return { error: 409, message: "This team is full. It has 5 members already." };
  await syncMembers(updated);
  if (endsPlan) await endIndividualPlan(userId);
  return { team: updated };
}

async function removeMember(team, userId) {
  if (String(team.admin) === String(userId)) return null;
  const updated = await Team.findOneAndUpdate(
    { _id: team._id },
    { $pull: { members: { user: userId } } },
    { returnDocument: "after" },
  );
  await clearMember(userId, team._id);
  return updated;
}

// Account deletion: a member leaves. Round 12 (Sheriff): when the Team
// Admin deletes their account the team ends and every member moves to Free
// at once (their own individual plan, if any, is untouched).
async function onAccountDeleted(userId) {
  const team = await teamOf(userId);
  if (!team) return;
  if (String(team.admin) === String(userId)) {
    await User.updateMany(
      { team: team._id },
      {
        $set: {
          team: null,
          teamPlan: null,
          teamPlanStartedAt: null,
          teamPlanExpiresAt: null,
        },
      },
    );
    await Team.deleteOne({ _id: team._id });
  } else {
    await Team.updateOne({ _id: team._id }, { $pull: { members: { user: userId } } });
  }
}

module.exports = {
  CODE_RE,
  isActive,
  teamOf,
  newInviteCode,
  applyTeamPayment,
  joinTeam,
  removeMember,
  onAccountDeleted,
};
