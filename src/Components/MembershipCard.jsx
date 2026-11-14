import { useState } from "react";
import { Crown } from "lucide-react";
import {
  BILLING_PERIODS,
  aiTrialDaysLeft,
  aiTrialEndsAt,
  formatMoney,
  getPlan,
  getSubscription,
  isOnAiTrial,
  priceFor,
} from "../data/plans";
import "./MembershipCard.css";

// "Loquiex membership" card: plan, price, active until, days left and a bar
// showing how much of the paid time is left. Used at the top of Profile and
// of Manage Membership. Everything comes from the member's real plan.
//   currency  the currency they last paid in ("NGN" | "USD")
//   prices    the server's price table, when loaded
//   onClick   makes the whole card a button (Profile opens Membership)
export default function MembershipCard({
  user,
  currency = "NGN",
  prices,
  onClick,
}) {
  const [now] = useState(() => Date.now());
  const plan = getPlan(user);
  const sub = getSubscription(user);
  const isPaid = plan.id !== "free";
  const shortName = plan.name.replace(/^Loquiex\s+/i, "");

  let price = "₦0";
  let priceUnit = "Free plan";
  let label = "";
  let date = "";
  let daysText = "";
  let pct = null;
  let note = "";

  if (isPaid) {
    const period =
      BILLING_PERIODS.find((p) => p.id === sub?.periodId) || BILLING_PERIODS[0];
    price = formatMoney(priceFor(plan, period.id, currency, prices), currency);
    priceUnit = period.months === 1 ? "/ month" : `/ ${period.months} months`;
    const expires = sub?.expiresAt ? new Date(sub.expiresAt) : null;
    const started = sub?.startedAt ? new Date(sub.startedAt) : null;
    label = sub?.cancelledAt ? "Cancelled, ends on" : "Active until";
    if (expires) {
      date = formatDay(expires);
      const days = daysUntil(expires, now);
      daysText = `${days} day${days === 1 ? "" : "s"} left`;
      if (started && expires > started) {
        pct = clampPct(
          ((expires.getTime() - now) /
            (expires.getTime() - started.getTime())) *
            100,
        );
      }
    }
  } else if (isOnAiTrial(user)) {
    const ends = aiTrialEndsAt(user);
    const days = aiTrialDaysLeft(user);
    label = "AI feedback trial ends";
    date = formatDay(ends);
    daysText = `${days} day${days === 1 ? "" : "s"} left`;
    const created = user?.createdAt ? new Date(user.createdAt) : null;
    if (created && ends > created) {
      pct = clampPct(
        ((ends.getTime() - now) / (ends.getTime() - created.getTime())) *
          100,
      );
    }
  } else {
    note = "Upgrade for AI feedback and group practice.";
  }

  const Tag = onClick ? "button" : "section";
  return (
    <Tag
      className={`mc-card ${onClick ? "is-button" : ""}`}
      onClick={onClick}
      {...(onClick ? { type: "button", "aria-label": `Manage your ${shortName} membership` } : {})}
    >
      <span className="mc-glow" aria-hidden="true" />
      <span className="mc-top">
        <span className="mc-eyebrow">Loquiex membership</span>
        <Crown size={22} className="mc-crown" aria-hidden="true" />
      </span>
      <span className="mc-plan">{shortName}</span>
      <span className="mc-price">
        {isPaid ? `${price} ${priceUnit}` : priceUnit}
      </span>
      {label ? (
        <>
          <span className="mc-bottom">
            <span className="mc-until">
              <span className="mc-eyebrow">{label}</span>
              <strong>{date || "Loading…"}</strong>
            </span>
            {daysText && <span className="mc-days">{daysText}</span>}
          </span>
          {pct !== null && (
            <span className="mc-bar" aria-hidden="true">
              <span style={{ width: `${pct}%` }} />
            </span>
          )}
        </>
      ) : (
        <span className="mc-note">{note}</span>
      )}
    </Tag>
  );
}

function clampPct(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

// Whole days left until `date` (rounded up), never below 0.
function daysUntil(date, now) {
  return Math.max(0, Math.ceil((date.getTime() - now) / 86400000));
}

// "4 Dec 2026"
function formatDay(date) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
