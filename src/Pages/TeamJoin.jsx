import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { CircleAlert, CircleCheck, Users } from "lucide-react";
import { getInvite, joinTeam } from "../lib/team";
import { ownActivePlan, refreshPlanFromServer } from "../data/plans";
import JoiningTeamDialog from "../Components/membership/JoiningTeamDialog";
import "../Components/membership/MyTeam.css";

// "You've been invited!" (round 10). Public, so new people can see it before
// they have an account. Existing users sign in, new users sign up; either way
// they come back here and join. Nobody pays again, and their practice
// history stays private to them.
export default function TeamJoin() {
  const { code } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const hasToken = Boolean(localStorage.getItem("token"));
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState(false);
  // Round 11: "Joining a team" warning for members with an individual plan.
  const [warn, setWarn] = useState(false);

  useEffect(() => {
    let alive = true;
    getInvite(code)
      .then((data) => alive && setInvite(data))
      .catch((err) =>
        alive &&
        setError(err.response?.data?.message || "Couldn't open this invitation."),
      );
    return () => {
      alive = false;
    };
  }, [code]);

  // Round 11: the server says whether this visitor is really signed in (a
  // saved sign-in may have ended), so the "already in a team" note only
  // shows for a signed-in member who is in another team.
  const signedIn = invite ? Boolean(invite.signedIn) : hasToken;
  const back = { from: { pathname: location.pathname } };

  const accept = async ({ agreed = false } = {}) => {
    if (!signedIn) {
      navigate("/register", { state: back });
      return;
    }
    if (!agreed && ownActivePlan()) {
      setWarn(true);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await joinTeam(code, { endIndividualPlan: agreed });
      await refreshPlanFromServer();
      setWarn(false);
      setJoined(true);
    } catch (err) {
      if (err.response?.data?.code === "ENDS_INDIVIDUAL_PLAN") {
        setWarn(true); // the server knows about a plan this device didn't
      } else {
        setWarn(false);
        setError(err.response?.data?.message || "Couldn't join the team. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  const full = invite && invite.membersCount >= invite.maxMembers;
  const teamLabel = invite?.teamName || "a Loquiex team";
  let blocked = "";
  if (invite && !joined && !invite.alreadyMember) {
    if (!invite.active)
      blocked = "This team's plan has ended. Ask your Team Admin to renew it, then open the link again.";
    else if (signedIn && invite.inOtherTeam)
      blocked = invite.otherTeamName
        ? `You're already in ${invite.otherTeamName}. Leave it from My Team first to join this one.`
        : "You're already in a team. Leave it from My Team first to join this one.";
    else if (full) blocked = "This team is full. It has 5 members already.";
  }

  return (
    <div className="mt-join-page">
      <div className="profile-content mt-page">
        {!invite && !error && <p className="mt-muted">Opening your invitation…</p>}

        {!invite && error && (
          <section className="mt-card mt-center">
            <span className="mt-hero-icon" aria-hidden="true">
              <CircleAlert size={34} />
            </span>
            <h1 className="mt-title">This invitation doesn&apos;t work</h1>
            <p className="mt-sub">{error}</p>
            <button type="button" className="mt-outline" onClick={() => navigate("/")}>
              Go to Loquiex
            </button>
          </section>
        )}

        {invite && (joined || invite.alreadyMember) && (
          <section className="mt-card mt-center">
            <span className="mt-ok" aria-hidden="true">
              <CircleCheck size={30} />
            </span>
            <h1 className="mt-title">You&apos;re in the team!</h1>
            <p className="mt-sub">
              You joined {teamLabel} on Loquiex. Your subscription cost is
              covered by the team.
            </p>
            <button type="button" className="mt-primary" onClick={() => navigate("/app/practice")}>
              Start practising
            </button>
            <button type="button" className="mt-outline" onClick={() => navigate("/app/team")}>
              See my team
            </button>
          </section>
        )}

        {invite && !joined && !invite.alreadyMember && (
          <section className="mt-card mt-center">
            <span className="mt-hero-icon" aria-hidden="true">
              <Users size={34} />
            </span>
            <h1 className="mt-title">You&apos;ve been invited!</h1>
            <p className="mt-sub">
              You&apos;ve been invited to join {teamLabel} on Loquiex.
            </p>
            <dl className="mt-rows">
              <div>
                <dt>Team plan</dt>
                <dd>{invite.planShortName}</dd>
              </div>
              <div>
                <dt>Invited by</dt>
                <dd>{invite.adminName}</dd>
              </div>
              <div>
                <dt>Your subscription cost</dt>
                <dd>Covered by the team</dd>
              </div>
            </dl>
            {blocked ? (
              <p className="mt-error" role="alert">
                {blocked}
              </p>
            ) : (
              <button type="button" className="mt-primary" disabled={busy} onClick={() => accept()}>
                {busy ? "Joining…" : "Accept invitation"}
              </button>
            )}
            {error && (
              <p className="mt-error" role="alert">
                {error}
              </p>
            )}
            {!signedIn && (
              <p className="mt-signin">
                Haven&apos;t registered?{" "}
                <button type="button" onClick={() => navigate("/register", { state: back })}>
                  Sign up now
                </button>
              </p>
            )}
            {!signedIn && (
              <p className="mt-signin">
                Already have a Loquiex account?{" "}
                <button type="button" onClick={() => navigate("/login", { state: back })}>
                  Sign in to join your team.
                </button>
              </p>
            )}
          </section>
        )}
      </div>
      {warn && (
        <JoiningTeamDialog
          busy={busy}
          onCancel={() => setWarn(false)}
          onContinue={() => accept({ agreed: true })}
        />
      )}
    </div>
  );
}
