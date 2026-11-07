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
                  ? `Up to ${aiFeedbackPerDay} a day${
                      aiFeedbackPerMonth
                        ? ` · ${aiFeedbackPerMonth} a month`
                        : ""
                    }`
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
                foot: `Up to ${aiFeedbackPerDay} a day · resets on the 1st`,
              }
            : {
                big: ai.usedThisMonth,
                label: "sessions used this month",
                right: `${aiFeedbackPerDay} a day`,
                pct: null,
                foot: "Your daily sessions reset at midnight.",
              };

  const groupCard =
    groupMinutesPerMonth === 0
      ? { notIncluded: true }
      : groupMinutesPerMonth === null
        ? {
            unlimited: true,
            used: period === "today" ? group.usedToday : group.usedThisMonth,
          }
        : {
            big: group.left,
            label: "minutes left this month",
            right:
              period === "today"
                ? `${group.usedToday} used today`
                : `${group.usedThisMonth.toLocaleString()} of ${groupMinutesPerMonth.toLocaleString()} used`,
            pct: Math.min(
              100,
              Math.round((group.usedThisMonth / groupMinutesPerMonth) * 100),
            ),
            foot: `${groupMinutesPerMonth.toLocaleString()} minutes a month · resets on the 1st`,
          };

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

      <section className="pf-panel pf-plan-card">
        <div className="pf-plan-top">
          <span className="pf-row-icon">
            <PlanIcon size={18} />
          </span>
          <div className="pf-plan-name">
            <p className="pf-stats-kicker">Your current plan</p>
            <strong>{plan.name}</strong>
          </div>
          <span className="pf-active-badge">Active</span>
        </div>
        <div className="pf-plan-period">
          <div>
            <p className="pf-plan-period-label">Usage overview</p>
            <strong>{period === "today" ? "Today" : "This month"}</strong>
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
            : "Monthly allowances reset on the 1st of each month."}
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
                {card.used} {unit} used{" "}
                {period === "today" ? "today" : "this month"}
              </span>
              <strong>Unlimited</strong>
            </div>
          ) : (
            <>
              <div className="pf-allowance-line">
                <p>
                  <strong>{card.big.toLocaleString()}</strong>
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
          Practise at your own pace without using your AI feedback or group
          practice allowances.
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
              AI feedback has a monthly allowance and a daily limit. The daily
              limit resets at midnight.
            </li>
            <li>
              Group practice counts each minute you spend in a call with at
              least one other member against your monthly minutes. Waiting alone
              in a room is free.
            </li>
            <li>Monthly allowances reset on the 1st of each month.</li>
            <li>
              Solo practice, recordings and streaks never use your allowances.
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
