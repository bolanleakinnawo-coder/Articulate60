import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Gift, FlaskConical, Sparkles } from "lucide-react";
import { PLANS, demoSubscribe, getPlanId } from "../data/plans";
import "../styles/Membership.css";

const REASONS = {
  feedback: "Unlock AI feedback and see exactly how you communicated.",
  group: "Group practice comes with Loquiex Bloom and Loquiex Flourish.",
};

// Plans page, opened from "Unlock my AI feedback", group practice, and
// Profile > My plan. Payments aren't live: "Demo pay" switches plan locally.
export default function Membership() {
  const navigate = useNavigate();
  const location = useLocation();
  const reason = location.state?.reason;
  const [currentId, setCurrentId] = useState(getPlanId());
  const [justJoined, setJustJoined] = useState(null);

  const choose = (planId) => {
    demoSubscribe(planId);
    setCurrentId(planId);
    setJustJoined(PLANS.find((p) => p.id === planId));
  };

  if (justJoined) {
    return (
      <div className="page ms-page">
        <div className="ms-success">
          <span className="ms-success-icon" aria-hidden="true">
            <Sparkles size={26} />
          </span>
          <h1>
            {justJoined.id === "free"
              ? "You're on Loquiex Free"
              : `Welcome to ${justJoined.name}`}
          </h1>
          <p>
            This was a demo payment, so nothing was charged. Your plan is saved
            on this device while we test.
          </p>
          {reason === "group" && justJoined.id !== "free" ? (
            <button
              className="ms-primary"
              onClick={() => navigate("/app/group-practice/room")}
            >
              Go to group practice
            </button>
          ) : (
            <button
              className="ms-primary"
              onClick={() => navigate("/app/practice")}
            >
              Back to practice
            </button>
          )}
          <button className="ms-link" onClick={() => navigate("/app/profile")}>
            Go to my profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page ms-page">
      <button
        className="ms-back"
        onClick={() => navigate(-1)}
        aria-label="Back"
      >
        <ArrowLeft size={18} />
      </button>

      <p className="ms-kicker">Membership</p>
      <h1 className="ms-title">Make room for more growth.</h1>
      <p className="ms-sub">
        {REASONS[reason] || "Pick the plan that fits how often you practise."}
      </p>

      <div className="ms-testing">
        <FlaskConical size={18} aria-hidden="true" />
        <p>
          We're still testing, so everyone gets the AI analyser for now and
          payments aren't live yet. Use <strong>Demo pay</strong> to try a plan.
        </p>
      </div>

      <div className="ms-plans">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentId;
          return (
            <section
              key={plan.id}
              className={`ms-plan ${plan.recommended ? "ms-plan-featured" : ""}`}
            >
              {plan.recommended && (
                <span className="ms-badge">Most popular</span>
              )}
              <h2>{plan.name}</h2>
              <p className="ms-plan-tagline">{plan.tagline}</p>
              <p className="ms-price">{plan.price}</p>
              <ul>
                {plan.features.map((f) => (
                  <li key={f}>
                    <Check size={16} aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
              {plan.offer && (
                <p className="ms-offer">
                  <Gift size={16} aria-hidden="true" />
                  {plan.offer}
                </p>
              )}
              <button
                className={isCurrent ? "ms-current" : "ms-primary"}
                disabled={isCurrent}
                onClick={() => choose(plan.id)}
              >
                {isCurrent
                  ? "Your current plan"
                  : plan.id === "free"
                    ? "Switch to Free"
                    : "Demo pay"}
              </button>
            </section>
          );
        })}
      </div>

      <p className="ms-footnote">
        Plan details, allowances and fees are placeholders until pricing is
        final.
      </p>
    </div>
  );
}
