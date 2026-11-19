import api from "../api/axios";

// Team plans (round 10). The server decides everything; see
// Articulate60-backend/ROUTES/team.js.
export async function getMyTeam() {
  const { data } = await api.get("/api/team/me");
  return data.team;
}

export async function getInvite(code) {
  const { data } = await api.get(`/api/team/invite/${encodeURIComponent(code)}`);
  return data;
}

// endIndividualPlan: the member agreed to the "Joining a team" warning
// (round 11). Without it, the server answers 409 ENDS_INDIVIDUAL_PLAN when
// they still have an individual plan.
export async function joinTeam(code, { endIndividualPlan = false } = {}) {
  const { data } = await api.post("/api/team/join", { code, endIndividualPlan });
  return data.team;
}

export async function leaveTeam() {
  await api.post("/api/team/leave");
  return null;
}

export async function removeTeamMember(userId) {
  const { data } = await api.post("/api/team/remove", { userId });
  return data.team;
}

export async function newInviteLink() {
  const { data } = await api.post("/api/team/code");
  return data.team;
}

export function inviteUrl(code) {
  return `${window.location.origin}/team/join/${code}`;
}

export async function inviteByEmail(emails) {
  const { data } = await api.post("/api/team/invite-emails", { emails });
  return data;
}

export async function revokeInvite(email) {
  const { data } = await api.post("/api/team/revoke-invite", { email });
  return data.team;
}

export async function renameTeam(name) {
  const { data } = await api.post("/api/team/name", { name });
  return data.team;
}

export async function cancelTeamPlan() {
  const { data } = await api.post("/api/team/cancel");
  return data.team;
}

export async function resumeTeamPlan() {
  const { data } = await api.post("/api/team/resume");
  return data.team;
}
