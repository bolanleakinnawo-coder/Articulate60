import {
  ArrowLeft,
  ArrowRight,
  CircleCheck,
  Mic,
  User,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { PAID_PLANS, TEAM_MAX_MEMBERS, TEAM_PLANS, formatMoney } from "../../data/plans";
import "./SubscriptionPicker.css";

// Round 10 (Sheriff, 2026-11-19): "Choose your subscription", then
// Individual Plans or Team Plans. Every word is Sheriff's, from the
// screenshots; the look follows the Loquiex brand (Home tab colours).
//
// view: "choose" | "individual" | "team"
// prices: { NGN: {...}, USD: {...} } monthly prices (server's when known)
export default function SubscriptionPicker({
  view,
  onView,
  prices,
  currentPlanId,
  selectedId,
  onChoose,
  // "Create your team" (view "create")
  teamName = "",
  onTeamName,
  onPay,
  paying = false,
  payError = "",
}) {
  const naira = (id) => formatMoney(prices.NGN?.[id] ?? 0, "NGN");
  const dollars = (id) => formatMoney(prices.USD?.[id] ?? 0, "USD");
  // "$6.80", "$25": cents shown only when there are any.
  const usd = (id) => {
    const n = Number(prices.USD?.[id] ?? 0);
    return Number.isInteger(n) ? dollars(id) : `$${n.toFixed(2)}`;
  };
  const perPerson = (id, currency) => {
    const n = Number(prices[currency]?.[id] ?? 0) / TEAM_MAX_MEMBERS;
    return currency === "USD" ? `$${n.toFixed(2)}` : formatMoney(n, "NGN");
  };

  if (view === "create") {
    const plan = TEAM_PLANS.find((p) => p.id === selectedId) || TEAM_PLANS[1];
    return (
      <section className="sp-panel">
        <button type="button" className="sp-back" onClick={() => onView("team")}>
          <ArrowLeft size={16} aria-hidden="true" />
          Back to team plans
        </button>
        <h2 className="sp-title">Create your team</h2>
        <p className="sp-sub">Give your team a name. You can change it later.</p>
        <form
          className="sp-create"
          onSubmit={(e) => {
            e.preventDefault();
            onPay();
          }}
        >
          <label className="sp-field-label" htmlFor="sp-team-name">
            Team name
          </label>
          <input
            id="sp-team-name"
            className="sp-input"
            type="text"
            maxLength={60}
            placeholder="e.g. The Communication Circle"
            value={teamName}
            onChange={(e) => onTeamName(e.target.value)}
          />
          <div className="sp-selected">
            <p className="sp-selected-label">Your selected plan</p>
            <p className="sp-selected-name">{plan.name}</p>
            <p className="sp-selected-price">
              {naira(plan.id)} / {usd(plan.id)} monthly
            </p>
            <p className="sp-selected-note">Up to 5 members, including you.</p>
          </div>
          {payError && (
            <p className="sp-error" role="alert">
              {payError}
            </p>
          )}
          <button type="submit" className="sp-continue" disabled={paying}>
            {paying ? "Opening Paystack…" : "Continue to payment"}
          </button>
        </form>
      </section>
    );
  }

  if (view === "individual" || view === "team") {
    const team = view === "team";
    const plans = team ? TEAM_PLANS : PAID_PLANS;
    return (
      <section className="sp-panel">
        <button type="button" className="sp-back" onClick={() => onView("choose")}>
          <ArrowLeft size={16} aria-hidden="true" />
          Back to subscription type
        </button>
        <h2 className="sp-title">{team ? "Team Plans" : "Individual Plans"}</h2>
        <p className="sp-sub">
          {team
            ? "Bring your friends, classmates or colleagues together to practise on Loquiex. One subscription gives your team access to its own individual accounts."
            : "Choose a plan that suits your needs and enjoy unlimited personal speaking practice, with or without AI feedback."}
        </p>

        {team && (
          <div className="sp-how">
            <p className="sp-how-title">How it works</p>
            <HowItem icon={Users} title="Up to 5 members">
              Each subscription covers five people in total, including the
              person who purchases it.
            </HowItem>
            <HowItem icon={UserPlus} title="Invite your team">
              The purchaser becomes the Team Admin and can invite up to four
              other members.
            </HowItem>
            <HowItem icon={Wallet} title="Share the cost">
              One person pays for the subscription. Your team can split the
              cost among yourselves and arrange contributions separately.
            </HowItem>
            <HowItem icon={Mic} title="Practise independently and together">
              Everyone gets their own account, personal speaking practice and
              individual AI feedback allowance. You can also practise together
              through Group Practice.
            </HowItem>
          </div>
        )}

        <div className="sp-divider" />
        {team && <p className="sp-section-title">Choose your team plan</p>}

        <div className="sp-plans">
          {plans.map((p) => {
            const short = p.name.replace(/^Loquiex\s+/, "");
            const isCurrent = p.id === currentPlanId;
            const isSelected = p.id === selectedId && !isCurrent;
            return (
              <article
                key={p.id}
                className={`sp-plan ${isCurrent ? "is-current" : ""} ${isSelected ? "is-selected" : ""}`}
              >
                <div className="sp-plan-head">
                  <p className="sp-plan-name">{p.name}</p>
                  {isCurrent ? (
                    <span className="sp-chip-muted">Current plan</span>
                  ) : (
                    p.badge && <span className="sp-badge">{p.badge}</span>
                  )}
                </div>
                <p className="sp-price">{naira(p.id)}</p>
                <p className="sp-price-usd">/ {usd(p.id)} monthly</p>
                {team && (
                  <p className="sp-per-person">
                    {perPerson(p.id, "NGN")} / {perPerson(p.id, "USD")} per person
                    when five members split equally.
                  </p>
                )}
                <ul className="sp-features">
                  {p.features.map((f) => (
                    <li key={f}>
                      <CircleCheck size={17} aria-hidden="true" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={`sp-choose ${isSelected ? "is-selected" : ""}`}
                  // A Team Admin renews the current team plan from here.
                  disabled={isCurrent && !team}
                  onClick={() => onChoose(p.id)}
                >
                  {isCurrent && team
                    ? `Renew ${short}`
                    : isCurrent
                    ? "Your current plan"
                    : isSelected
                      ? `${short} selected`
                      : `Choose ${short}`}
                </button>
              </article>
            );
          })}
        </div>

        {team && (
          <p className="sp-foot">
            Per-person prices are examples based on five members sharing
            equally. The full subscription is paid by the Team Admin.
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="sp-panel sp-choose-panel">
      <h2 className="sp-title sp-title-center">Choose your subscription</h2>
      <p className="sp-sub sp-sub-center">How would you like to use Loquiex?</p>
      <div className="sp-types">
        <article className="sp-type">
          <p className="sp-type-name">
            <User size={22} aria-hidden="true" />
            Individual Subscription
          </p>
          <p className="sp-type-text">
            For yourself. Get access to more ways to practise, improve your
            communication and track your progress.
          </p>
          <button type="button" className="sp-continue" onClick={() => onView("individual")}>
            Continue <ArrowRight size={18} aria-hidden="true" />
          </button>
        </article>
        <article className="sp-type">
          <p className="sp-type-name">
            <Users size={22} aria-hidden="true" />
            Team Subscription
          </p>
          <p className="sp-type-text">
            For you and your team. Subscribe once, invite up to four other
            members and practise together.
          </p>
          <button type="button" className="sp-continue" onClick={() => onView("team")}>
            Continue <ArrowRight size={18} aria-hidden="true" />
          </button>
        </article>
      </div>
    </section>
  );
}

function HowItem({ icon: Icon, title, children }) {
  return (
    <div className="sp-how-item">
      <Icon size={20} aria-hidden="true" />
      <span>
        <strong>{title}</strong>
        <span>{children}</span>
      </span>
    </div>
  );
}
