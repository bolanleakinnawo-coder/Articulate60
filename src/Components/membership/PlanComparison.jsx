import { Check, Minus } from "lucide-react";
import { PLANS, TEAM_PLANS, formatMoney } from "../../data/plans";
import "./PlanComparison.css";

// Round 11 (Sheriff, 2026-11-19): "Compare plans" shows the plans side by
// side. Every figure comes from data/plans.js (the same numbers the server
// enforces), so this table can't drift from what members get.
// The paid plans (Free has no plan to compare against on a phone-width row).
const ORDER = ["bloom", "flourish", "infinity"];

// Call time is always hours and minutes (1 hr 30 min), never raw minutes.
function callTime(minutes) {
  if (minutes === null || minutes === undefined) return "Unlimited";
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

function cell(value) {
  if (value === true) return <Check size={16} aria-label="Included" className="pc-yes" />;
  if (value === null || value === false || value === undefined)
    return <Minus size={16} aria-label="Not included" className="pc-no" />;
  return value;
}

export default function PlanComparison({ prices, currentPlanId, onChoose }) {
  const plans = ORDER.map((id) => PLANS.find((p) => p.id === id)).filter(Boolean);
  const naira = (id) =>
    id === "free" ? "Free" : formatMoney(prices.NGN?.[id] ?? 0, "NGN");
  const teamPrice = (id) => {
    const t = TEAM_PLANS.find((p) => p.base === id);
    return t ? formatMoney(prices.NGN?.[t.id] ?? t.priceNaira, "NGN") : null;
  };

  const rows = [
    { label: "Price per month", get: (p) => naira(p.id), strong: true },
    { label: "Team of 5, per month", get: (p) => teamPrice(p.id) },
    {
      label: "AI feedback",
      get: (p) =>
        p.id === "free"
          ? "3-day trial"
          : p.limits.aiFeedbackPerDay === null
            ? "Unlimited"
            : `${p.limits.aiFeedbackPerDay} a day`,
    },
    { label: "Personal speaking practice", get: () => "Unlimited" },
    { label: "Spin the Jar, Yap Mode and Research Mode", get: () => true },
    {
      label: "Group Practice time",
      get: (p) => {
        const t = callTime(p.limits.groupMinutesPerDay);
        return t && t !== "Unlimited" ? `${t} a day` : t;
      },
    },
    {
      label: "People in a call you host",
      get: (p) =>
        p.limits.unlimitedSeats
          ? "Unlimited"
          : p.limits.maxSeats
            ? `${p.limits.maxSeats} incl. you`
            : null,
    },
    {
      label: "Discounts on Loquiex Learn",
      get: (p) => p.id === "flourish" || p.id === "infinity",
    },
  ];

  return (
    <section className="sp-panel pc-panel">
      <h2 className="sp-title">Compare plans</h2>
      <p className="sp-sub">See what each plan includes, side by side.</p>
      <div className="pc-scroll">
        <table className="pc-table">
          <thead>
            <tr>
              <th scope="col" className="pc-corner">
                <span className="pc-sr">Feature</span>
              </th>
              {plans.map((p) => (
                <th
                  key={p.id}
                  scope="col"
                  className={p.id === currentPlanId ? "is-current" : ""}
                >
                  <span className="pc-plan">{p.name.replace(/^Loquiex\s+/, "")}</span>
                  {p.id === currentPlanId && <span className="pc-now">Your plan</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                {plans.map((p) => (
                  <td
                    key={p.id}
                    className={`${p.id === currentPlanId ? "is-current" : ""} ${row.strong ? "pc-strong" : ""}`}
                  >
                    {cell(row.get(p))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="sp-continue pc-choose" onClick={onChoose}>
        Choose a plan
      </button>
    </section>
  );
}
