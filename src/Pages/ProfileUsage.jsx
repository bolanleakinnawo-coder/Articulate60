import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  Info,
  Infinity as InfinityIcon,
  MessagesSquare,
  Sprout,
  Users,
} from "lucide-react";
import { PLANS, fetchGroupUsage, getUsage } from "../data/plans";
import { PLAN_ICONS } from "../data/planIcons";

// "15 Dec 2026"
function formatResetDay(date) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// "7 Nov"
function formatShortDay(date) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

// Call time is always hours and minutes: "1 hr 30 min", "1 hr", "45 min".
function formatCallTime(minutes) {
  const total = Math.max(0, Math.floor(Number(minutes) || 0));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

// "Usage & Limits" page. AI feedback comes from the user's saved recordings
// (each analysed recording counts on the day it was analysed); group minutes
// come from the group-practice tracker in data/plans.js. AI feedback has a
// monthly allowance with a daily cap; group practice has monthly minutes.
export default function ProfileUsage({ user, recordings, onBack, onPlans }) {
  const [period, setPeriod] = useState("today"); // today | month
  const [howOpen, setHowOpen] = useState(false);
  const [, setGroupSynced] = useState(0);

  // Group minutes are counted by the server; refresh the local copy.
  useEffect(() => {
    fetchGroupUsage().then((data) => data && setGroupSynced((n) => n + 1));
  }, []);

  const usage = getUsage(recordings, user);
  const resetDay = formatResetDay(usage.cycle.resetsAt);
  const plan = usage.plan;
  const PlanIcon = PLAN_ICONS[plan.id] || Sprout;
  const isTopPlan = plan.id === PLANS[PLANS.length - 1].id;
  const ai = usage.aiFeedback;
  const group = usage.groupMinutes;
  const { aiFeedbackPerDay, aiFeedbackPerMonth, groupMinutesPerMonth } =
    usage.limits;

  // Each card: big number + label, a right-hand note, an optional bar, a foot.
  const aiCard =
    aiFeedbackPerDay === 0
      ? { notIncluded: true, trialOver: plan.id === "free" }
      : aiFeedbackPerDay === null && aiFeedbackPerMonth === null
        ? {
            unlimited: true,
            used: period === "today" ? ai.usedToday : ai.usedThisMonth,
          }
        : period === "today"
          ? {
              big: ai.left,
              label: "sessions left today",
              right: `${ai.usedToday} used today`,
              pct: aiFeedbackPerDay
                ? Math.min(
                    100,
                    Math.round((ai.usedToday / aiFeedbackPerDay) * 100),
                  )
                : null,
              foot: usage.onAiTrial
                ? `Free trial: up to ${aiFeedbackPerDay} a day · ${usage.aiTrialDaysLeft} day${
                    usage.aiTrialDaysLeft === 1 ? "" : "s"
                  } left`
                : aiFeedbackPerDay !== null
                  ? `Up to ${aiFeedbackPerDay} a day · resets at midnight`
                  : null,
            }
          : aiFeedbackPerMonth
            ? {
                big: Math.max(0, aiFeedbackPerMonth - ai.usedThisMonth),
                label: "sessions left this month",
                right: `${ai.usedThisMonth} of ${aiFeedbackPerMonth} used`,
                pct: Math.min(
                  100,
                  Math.round((ai.usedThisMonth / aiFeedbackPerMonth) * 100),
                ),
                foot: `Your monthly allowance resets on ${resetDay}.`,
              }
            : {
                big: ai.usedThisMonth,
                label: "sessions used this month",
                right: "",
                pct: null,
                foot: `Your monthly usage resets on ${resetDay}.`,
              };

  const groupCard =
    groupMinutesPerMonth === 0
      ? { notIncluded: true }
      : groupMinutesPerMonth === null
        ? {
            unlimited: true,
            used: period === "today" ? group.usedToday : group.usedThisMonth,
          }
        : (() => {
            // Daily call time (Sheriff, 2026-11-10). Round 8: Today shows the
            // daily figures, This month shows monthly usage only, and call
            // time is always hours and minutes.
            const perDay = usage.limits.groupMinutesPerDay || 90;
            const usedToday = group.usedToday || 0;
            const leftToday = Math.max(0, perDay - usedToday);
            if (period === "month") {
              return {
                big: formatCallTime(group.usedThisMonth || 0),
                label: "call time used this month",
                right: `Since ${formatShortDay(usage.cycle.start)}`,
                pct: null,
                foot: `Your monthly usage resets on ${resetDay}, a month after the day you paid.`,
              };
            }
            return {
              big: formatCallTime(leftToday),
              label: "call time left today",
              right: `${formatCallTime(usedToday)} used today`,
              pct: Math.min(100, Math.round((usedToday / perDay) * 100)),
              foot: `${formatCallTime(perDay)} a day · resets at midnight`,
            };
          })();

  const allowances = [
    {
      key: "ai",
      icon: MessagesSquare,
      title: "AI feedback sessions",
      text: "Get personalised feedback on your practice.",
      unit: "sessions",
      card: aiCard,
    },
    {
      key: "group",
      icon: Users,
      title: "Group practice",
      text: "Practise speaking with other members.",
      unit: "minutes",
      card: groupCard,
    },
  ];

  return (
    <div className="profile-content pf-usage-page">
      <button className="pf-back pf-back-link" onClick={onBack}>
        <ArrowLeft size={18} /> Your Profile
      </button>

      <header className="pf-page-header">
        <h1>Usage &amp; Limits</h1>
        <p>Your remaining allowances.</p>
      </header>

      <section className="pf-panel pf-usage-overview">
        <div className="pf-plan-period">
          <div>
            <p className="pf-plan-period-label">Usage overview</p>
            <strong>{period === "today" ? "Today" : "This month"}</strong>
            <span className="pf-plan-mini">
              <PlanIcon size={13} aria-hidden="true" />
              {plan.name.replace(/^Loquiex\s+/i, "")} plan
            </span>
          </div>
          <div className="pf-segment" role="tablist">
            {[
              ["today", "Today"],
              ["month", "This month"],
            ].map(([key, label]) => (
              <button
                key={key}
                role="tab"
                aria-selected={period === key}
                className={period === key ? "is-active" : ""}
                onClick={() => setPeriod(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <p className="pf-panel-text pf-plan-foot">
          {period === "today"
            ? "Daily limits reset at midnight."
            : `Your monthly allowance resets on ${resetDay}, a month after the day you paid.`}
        </p>
      </section>

      <div>
        <h2 className="pf-stats-title">Your allowances</h2>
        <p className="pf-stats-sub pf-allowance-sub">
          See what you&apos;ve used and what you have left.
        </p>
      </div>

      {allowances.map(({ key, icon: Icon, title, text, unit, card }) => (
        <section className="pf-panel pf-allowance" key={key}>
          <div className="pf-allowance-head">
            <span className="pf-row-icon">
              <Icon size={18} />
            </span>
            <div>
              <p className="pf-panel-title">{title}</p>
              <p className="pf-panel-text">{text}</p>
            </div>
          </div>
          {card.notIncluded ? (
            <p className="pf-allowance-foot">
              {card.trialOver
                ? "Your 3-day free trial has ended. AI feedback is included with Bloom, Flourish and Infinity."
                : `Not included in ${plan.name}.`}{" "}
              <button className="pf-inline-link" onClick={onPlans}>
                See plans
              </button>
            </p>
          ) : card.unlimited ? (
            <div className="pf-allowance-line pf-unlimited">
              <span>
                {unit === "minutes"
                  ? `${formatCallTime(card.used)} of call time`
                  : `${card.used} ${unit}`}{" "}
                used {period === "today" ? "today" : "this month"}
              </span>
              <strong>Unlimited</strong>
            </div>
          ) : (
            <>
              <div className="pf-allowance-line">
                <p>
                  <strong>
                    {typeof card.big === "number"
                      ? card.big.toLocaleString()
                      : card.big}
                  </strong>
                  <span>{card.label}</span>
                </p>
                <span>{card.right}</span>
              </div>
              {card.pct !== null && (
                <span className="pf-bar pf-allowance-bar">
                  <span style={{ width: `${card.pct}%` }} />
                </span>
              )}
              {card.foot && <p className="pf-allowance-foot">{card.foot}</p>}
            </>
          )}
        </section>
      ))}

      <section className="pf-panel pf-allowance">
        <p className="pf-panel-title pf-title-with-icon">
          <InfinityIcon size={20} /> Personal practice
        </p>
        <div className="pf-allowance-line pf-unlimited">
          <span>Your solo speaking practice</span>
          <strong>Unlimited</strong>
        </div>
        <p className="pf-panel-text pf-allowance-note">
          Solo practice without AI feedback doesn&apos;t use your allowance.
          Asking for AI feedback on a practice uses one AI feedback session.
        </p>
      </section>

      <section className={`pf-panel pf-how ${howOpen ? "is-open" : ""}`}>
        <button
          className="pf-how-toggle"
          aria-expanded={howOpen}
          onClick={() => setHowOpen((open) => !open)}
        >
          <Info size={20} />
          <span>How usage works</span>
          <ChevronDown size={18} className="pf-row-chev" />
        </button>
        {howOpen && (
          <ul className="pf-how-list">
            <li>
              Each time AI feedback is created for one of your recordings, it
              uses one session.
            </li>
            <li>
              AI feedback has a daily limit and a monthly allowance. The daily
              limit resets at midnight.
            </li>
            <li>
              Your monthly allowance resets every month on the date you paid,
              not on the 1st. Next reset: {resetDay}.
            </li>
            <li>
              Group practice uses your call time whether you host the call or
              join it. Daily call time resets at midnight.
            </li>
            <li>
              Your plan lasts for the period you paid for (1, 3, 6 or 12
              months) and ends on its expiry date unless you renew.
            </li>
            <li>
              Solo practice without AI feedback doesn&apos;t use your
              allowance.
            </li>
          </ul>
        )}
      </section>

      {!isTopPlan && (
        <section className="pf-panel pf-upsell">
          <p className="pf-panel-title">Need more room to practise?</p>
          <p className="pf-panel-text">
            Explore a plan with higher allowances to support your communication
            journey.
          </p>
          <button
            className="profile-save-button pf-wide-button"
            onClick={onPlans}
          >
            Explore plans
          </button>
        </section>
      )}
    </div>
  );
}
