import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CircleCheck,
  Link2,
  Mic,
  Pencil,
  Plus,
  UserCircle,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import {
  cancelTeamPlan,
  getMyTeam,
  inviteByEmail,
  inviteUrl,
  leaveTeam,
  newInviteLink,
  removeTeamMember,
  renameTeam,
  resumeTeamPlan,
  revokeInvite,
} from "../lib/team";
import { formatMoney, refreshPlanFromServer } from "../data/plans";
import "./Profile.css";
import "../Components/membership/MyTeam.css";

// My Team (round 10, Sheriff's team flow). Three screens:
//   ?ready=1   "Your team is ready!" right after paying
//   ?invite=1  "Invite your team" (email or invitation link)
//   default    the Team Dashboard
// Privacy: the Team Admin sees names, roles and invitation status only,
// never members' recordings, transcripts or AI feedback.
export default function MyTeam() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const screen = params.get("ready") ? "ready" : params.get("invite") ? "invite" : "dashboard";
  const [team, setTeam] = useState(undefined); // undefined = loading
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const load = () =>
      getMyTeam()
        .then((t) => alive && setTeam(t))
        .catch(() => alive && setTeam(null));
    load();
    refreshPlanFromServer();
    // A payment can take a moment to land: look again shortly.
    const timer = screen === "ready" ? setTimeout(load, 3000) : null;
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [screen]);

  const go = (next) => setParams(next ? { [next]: "1" } : {}, { replace: false });

  if (team === undefined) {
    return (
      <div className="profile-content mt-page">
        <p className="mt-muted">Loading your team…</p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="profile-content mt-page">
        <section className="mt-card mt-center">
          <h1 className="mt-title">My Team</h1>
          <p className="mt-sub">
            You&apos;re not in a team yet. Subscribe once, invite up to four
            other members and practise together.
          </p>
          <button
            type="button"
            className="mt-primary"
            onClick={() => navigate("/app/membership")}
          >
            See team plans
          </button>
        </section>
      </div>
    );
  }

  const admin = team.role === "admin";
  const shortPlan = team.planName.replace(/^Loquiex\s+/, "");
  const occupied = team.members.length;

  if (screen === "ready") {
    return (
      <div className="profile-content mt-page">
        <section className="mt-card mt-center">
          <span className="mt-ok" aria-hidden="true">
            <CircleCheck size={30} />
          </span>
          <h1 className="mt-title">Your team is ready!</h1>
          <p className="mt-sub">
            Your Loquiex team subscription is now active. You&apos;re the Team
            Admin.
          </p>
          <dl className="mt-rows">
            <div>
              <dt>Team</dt>
              <dd>{team.name || "Your team"}</dd>
            </div>
            <div>
              <dt>Plan</dt>
              <dd>{shortPlan}</dd>
            </div>
            <div>
              <dt>Team seats</dt>
              <dd>
                {occupied} of {team.maxMembers} occupied
              </dd>
            </div>
          </dl>
          <button type="button" className="mt-primary" onClick={() => go("invite")}>
            Invite your team
          </button>
          <button type="button" className="mt-outline" onClick={() => go(null)}>
            Do this later
          </button>
        </section>
      </div>
    );
  }

  if (screen === "invite") {
    return (
      <div className="profile-content mt-page">
        <button className="pf-back pf-back-link" onClick={() => go(null)}>
          <ArrowLeft size={18} /> My Team
        </button>
        <InviteTeam team={team} onTeam={setTeam} />
      </div>
    );
  }

  return (
    <div className="profile-content mt-page">
      <button className="pf-back pf-back-link" onClick={() => navigate("/app/profile")}>
        <ArrowLeft size={18} /> Profile
      </button>
      <Dashboard
        team={team}
        admin={admin}
        shortPlan={shortPlan}
        onTeam={setTeam}
        onInvite={() => go("invite")}
        error={error}
        setError={setError}
      />
    </div>
  );
}

function Dashboard({ team, admin, shortPlan, onTeam, onInvite, error, setError }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState("");
  const [confirm, setConfirm] = useState("");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.name || "");
  const seatsLeft = team.maxMembers - team.members.length - team.invitesPending;
  const others = team.members.filter((m) => !m.isYou);
  const me = team.members.find((m) => m.isYou);

  const run = async (key, fn, after) => {
    setBusy(key);
    setError("");
    try {
      const next = await fn();
      if (next !== undefined) onTeam(next);
      setConfirm("");
      after?.();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setBusy("");
    }
  };

  return (
    <section className="mt-card">
      <h1 className="mt-title">My Team</h1>
      {editing ? (
        <form
          className="mt-rename"
          onSubmit={(e) => {
            e.preventDefault();
            run("name", () => renameTeam(name), () => setEditing(false));
          }}
        >
          <input
            className="mt-input"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            aria-label="Team name"
            autoFocus
          />
          <button type="submit" className="mt-small" disabled={busy === "name"}>
            Save
          </button>
          <button type="button" className="mt-small mt-ghost" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </form>
      ) : (
        <p className="mt-sub mt-team-name">
          {team.name || "Your team"}
          {admin && (
            <button
              type="button"
              className="mt-icon-btn"
              aria-label="Change team name"
              onClick={() => setEditing(true)}
            >
              <Pencil size={14} />
            </button>
          )}
        </p>
      )}

      {team.liveRoom && (
        <button
          type="button"
          className="mt-live"
          onClick={() => navigate(`/app/group-practice/join/${team.liveRoom.code}`)}
        >
          <Mic size={18} aria-hidden="true" />
          <span>
            <strong>Your team is practising now</strong>
            <span>
              {team.liveRoom.hostName ? `${team.liveRoom.hostName} started it. ` : ""}
              Tap to join.
            </span>
          </span>
        </button>
      )}

      <div className="mt-plan">
        <p className="mt-label">Your team plan</p>
        <p className="mt-plan-name">{team.planName}</p>
        {team.priceNaira && (
          <p className="mt-plan-price">
            <strong>{formatMoney(team.priceNaira, "NGN")}</strong>
            <span>/ month</span>
          </p>
        )}
        <dl className="mt-rows mt-rows-flat">
          <div>
            <dt>Members</dt>
            <dd>
              {team.members.length} / {team.maxMembers}
            </dd>
          </div>
          <div>
            <dt>Invitations pending</dt>
            <dd>{team.invitesPending}</dd>
          </div>
          <div>
            <dt>Your role</dt>
            <dd>{admin ? "Team Admin" : "Team member"}</dd>
          </div>
        </dl>
      </div>

      <p className="mt-section">Team members</p>
      <div className="mt-box">
        {me && (
          <div className="mt-member">
            <UserCircle size={22} aria-hidden="true" />
            <span className="mt-member-text">
              <strong>You</strong>
              <span>{me.isAdmin ? "Team Admin" : "Team member"}</span>
            </span>
            <span className="mt-status">{team.active ? "Active" : "Ended"}</span>
          </div>
        )}
        {others.map((m) => (
          <div className="mt-member" key={m.id}>
            {m.photoUrl ? (
              <img className="mt-avatar" src={m.photoUrl} alt="" />
            ) : (
              <span className="mt-avatar" aria-hidden="true">
                {m.name.trim().charAt(0).toUpperCase() || "L"}
              </span>
            )}
            <span className="mt-member-text">
              <strong>{m.name}</strong>
              <span>{m.isAdmin ? "Team Admin" : "Team member"}</span>
            </span>
            {admin && !m.isAdmin ? (
              confirm === m.id ? (
                <span className="mt-confirm">
                  <button type="button" className="mt-link" onClick={() => setConfirm("")}>
                    Keep
                  </button>
                  <button
                    type="button"
                    className="mt-link mt-danger"
                    disabled={busy === m.id}
                    onClick={() => run(m.id, () => removeTeamMember(m.id))}
                  >
                    {busy === m.id ? "Removing…" : "Remove"}
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className="mt-icon-btn mt-remove"
                  aria-label={`Remove ${m.name} from your team`}
                  onClick={() => setConfirm(m.id)}
                >
                  <UserMinus size={16} />
                </button>
              )
            ) : (
              <span className="mt-status">Active</span>
            )}
          </div>
        ))}
        {admin &&
          team.invites.map((i) => (
            <div className="mt-member" key={i.email}>
              <span className="mt-avatar mt-avatar-invite" aria-hidden="true">
                @
              </span>
              <span className="mt-member-text">
                <strong>{i.email}</strong>
                <span>Invitation sent</span>
              </span>
              <span className="mt-status mt-status-pending">Invited</span>
              <button
                type="button"
                className="mt-icon-btn"
                aria-label={`Cancel the invitation to ${i.email}`}
                disabled={busy === i.email}
                onClick={() => run(i.email, () => revokeInvite(i.email))}
              >
                <X size={15} />
              </button>
            </div>
          ))}
        {others.length === 0 && team.invites.length === 0 && (
          <p className="mt-empty">No other members yet.</p>
        )}
        {admin && team.active && seatsLeft > 0 && (
          <button type="button" className="mt-outline" onClick={onInvite}>
            <UserPlus size={17} aria-hidden="true" /> Invite members
          </button>
        )}
      </div>

      <p className="mt-section">Manage subscription</p>
      <div className="mt-box">
        <dl className="mt-rows mt-rows-flat">
          <div>
            <dt>Current plan</dt>
            <dd>{shortPlan}</dd>
          </div>
          <div>
            <dt>Billing</dt>
            <dd>Monthly</dd>
          </div>
          {team.expiresAt && (
            <div>
              <dt>{team.cancelledAt ? "Ends on" : "Renewal date"}</dt>
              <dd>{formatDate(team.expiresAt)}</dd>
            </div>
          )}
        </dl>
        {team.cancelledAt && (
          <p className="mt-note">
            You cancelled the team plan. Everyone keeps it until{" "}
            {formatDate(team.expiresAt)}.
          </p>
        )}
        {admin && (
          <button
            type="button"
            className="mt-outline"
            onClick={() =>
              navigate("/app/membership", { state: { reason: "team" } })
            }
          >
            Manage subscription
          </button>
        )}
        {admin && team.active && !team.cancelledAt && (
          <button
            type="button"
            className="mt-cancel"
            disabled={busy === "cancel"}
            onClick={() =>
              confirm === "cancel" ? run("cancel", cancelTeamPlan) : setConfirm("cancel")
            }
          >
            {busy === "cancel"
              ? "Cancelling…"
              : confirm === "cancel"
                ? "Tap again to cancel the team plan"
                : "Cancel team plan"}
          </button>
        )}
        {admin && team.cancelledAt && team.active && (
          <button
            type="button"
            className="mt-outline"
            disabled={busy === "resume"}
            onClick={() => run("resume", resumeTeamPlan)}
          >
            Keep the team plan
          </button>
        )}
        {!admin && (
          <>
            <p className="mt-note">Your Team Admin manages the subscription.</p>
            <button
              type="button"
              className="mt-cancel"
              disabled={busy === "leave"}
              onClick={() =>
                confirm === "leave"
                  ? run("leave", leaveTeam, () => refreshPlanFromServer())
                  : setConfirm("leave")
              }
            >
              {busy === "leave"
                ? "Leaving…"
                : confirm === "leave"
                  ? "Tap again to leave the team"
                  : "Leave team"}
            </button>
          </>
        )}
      </div>

      {error && (
        <p className="mt-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

function InviteTeam({ team, onTeam }) {
  const [emails, setEmails] = useState([""]);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const free = team.maxMembers - team.members.length - team.invitesPending;
  const link = team.inviteCode ? inviteUrl(team.inviteCode) : "";

  if (team.role !== "admin") {
    return (
      <section className="mt-card">
        <h1 className="mt-title">Invite your team</h1>
        <p className="mt-sub">Only the Team Admin can invite members.</p>
      </section>
    );
  }

  const send = async (e) => {
    e.preventDefault();
    const list = emails.map((x) => x.trim()).filter(Boolean);
    setError("");
    setMessage("");
    if (!list.length) {
      setError("Enter at least one email address.");
      return;
    }
    setBusy("send");
    try {
      const data = await inviteByEmail(list);
      onTeam(data.team);
      setEmails([""]);
      setMessage(
        data.sent === 1 ? "Invitation sent." : `${data.sent} invitations sent.`,
      );
    } catch (err) {
      if (err.response?.data?.team) onTeam(err.response.data.team);
      setError(err.response?.data?.message || "Couldn't send the invitations. Please try again.");
    } finally {
      setBusy("");
    }
  };

  const copy = async () => {
    setError("");
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(`Copy didn't work here. Your link: ${link}`);
    }
  };

  return (
    <section className="mt-card">
      <h1 className="mt-title">Invite your team</h1>
      <p className="mt-sub">Invite up to four people to join your Loquiex team.</p>

      <form className="mt-box" onSubmit={send}>
        <p className="mt-box-title">Invite by email</p>
        {emails.map((value, i) => (
          <input
            key={i}
            className="mt-input"
            type="email"
            inputMode="email"
            autoComplete="off"
            placeholder="Enter email address"
            value={value}
            onChange={(e) =>
              setEmails((list) => list.map((x, j) => (j === i ? e.target.value : x)))
            }
          />
        ))}
        <button
          type="button"
          className="mt-outline"
          disabled={emails.length >= Math.max(1, free)}
          onClick={() => setEmails((list) => [...list, ""])}
        >
          <Plus size={16} aria-hidden="true" /> Add another email
        </button>
        <button type="submit" className="mt-primary" disabled={busy === "send" || free <= 0}>
          {busy === "send" ? "Sending…" : "Send invitations"}
        </button>
        {free <= 0 && (
          <p className="mt-note">Every place in your team is taken or invited.</p>
        )}
      </form>

      <div className="mt-box">
        <p className="mt-box-title">Or share an invitation link</p>
        <p className="mt-box-text">
          Let your team members join using a shared invitation link.
        </p>
        <button type="button" className="mt-outline" onClick={copy} disabled={!link}>
          <Link2 size={16} aria-hidden="true" />
          {copied ? "Copied" : "Copy invitation link"}
        </button>
        <button
          type="button"
          className="mt-link mt-revoke"
          disabled={busy === "code"}
          onClick={async () => {
            setBusy("code");
            setError("");
            try {
              onTeam(await newInviteLink());
              setMessage("The old link no longer works. Copy the new one to share it.");
            } catch (err) {
              setError(err.response?.data?.message || "Couldn't make a new link.");
            } finally {
              setBusy("");
            }
          }}
        >
          {busy === "code" ? "Revoking…" : "Revoke this link and make a new one"}
        </button>
      </div>

      {message && <p className="mt-success">{message}</p>}
      {error && (
        <p className="mt-error" role="alert">
          {error}
        </p>
      )}

      <p className="mt-foot">
        You can invite members or manage invitations later from your Team
        Dashboard.
      </p>
    </section>
  );
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
