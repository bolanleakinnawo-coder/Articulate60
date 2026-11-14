import { useState } from "react";
import {
  ArrowLeft,
  Award,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  CircleCheck,
  Clock3,
  Flame,
  GraduationCap,
  Medal,
  Mic,
  Sprout,
  Target,
  Trophy,
} from "lucide-react";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// "Your Stats" page. Everything is worked out from the user's real recordings
// and streak, which Profile keeps fresh (on open, on focus, and every minute).
export default function ProfileStats({ recordings, streak, onBack, onStart }) {
  const [range, setRange] = useState("week"); // week | all

  const weekStart = startOfWeek(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const thisWeek = recordings.filter((r) => {
    const d = new Date(r.createdAt);
    return d >= weekStart && d < weekEnd;
  });
  const inRange = range === "week" ? thisWeek : recordings;

  const seconds = inRange.reduce((t, r) => t + (r.durationSeconds || 0), 0);
  const time = splitSpeakingTime(seconds);
  const daysPractised = new Set(inRange.map((r) => dayKey(r.createdAt))).size;

  // Minutes spoken on each day of this week (Mon..Sun).
  const perDay = DAY_LABELS.map(() => 0);
  thisWeek.forEach((r) => {
    const index = (new Date(r.createdAt).getDay() + 6) % 7;
    perDay[index] += r.durationSeconds || 0;
  });
  const maxDay = Math.max(...perDay);
  const todayIndex = (new Date().getDay() + 6) % 7;

  const totalPractices = recordings.length;
  const vocab = recordings.filter((r) => r.isWordOfTheDay).length;
  const bestStreak = Math.max(streak.longest || 0, streak.current || 0);

  const milestones = [
    {
      icon: Sprout,
      title: "First steps",
      text: "You've started building your practice habit.",
      value: totalPractices,
      goal: 1,
      hideCount: true,
    },
    countMilestone(Target, 10, totalPractices),
    countMilestone(Award, 50, totalPractices),
    countMilestone(Trophy, 100, totalPractices),
    streakMilestone(Flame, 7, "seven", bestStreak),
    streakMilestone(CalendarDays, 30, "30", bestStreak),
    streakMilestone(Medal, 100, "100", bestStreak),
    vocabMilestone(BookOpen, 100, vocab),
    vocabMilestone(GraduationCap, 250, vocab),
  ];

  const overview = [
    {
      icon: Mic,
      value: inRange.length,
      label:
        inRange.length === 1 ? "Practice completed" : "Practices completed",
    },
    { icon: Clock3, value: time.value, unit: time.unit, label: "Speaking time" },
    {
      icon: Flame,
      value: streak.current || 0,
      unit: streak.current === 1 ? "day" : "days",
      label: "Current streak",
    },
    {
      icon: CalendarCheck,
      value: daysPractised,
      unit: daysPractised === 1 ? "day" : "days",
      label: "Days practised",
    },
  ];

  return (
    <div className="profile-content pf-stats">
      <button className="pf-back pf-back-link" onClick={onBack}>
        <ArrowLeft size={18} /> Your Profile
      </button>

      <header className="pf-page-header">
        <h1>Your Stats</h1>
        <p>Your progress and milestones.</p>
      </header>

      <section className="pf-panel pf-stats-hero">
        <h2>Every practice counts.</h2>
        <p>
          See the time you&apos;ve put in, the sessions you&apos;ve completed,
          and the consistency you&apos;re building.
        </p>
      </section>

      <div className="pf-stats-head">
        <h2>Your overview</h2>
        <div className="pf-segment" role="tablist">
          {[
            ["week", "This week"],
            ["all", "All time"],
          ].map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={range === key}
              className={range === key ? "is-active" : ""}
              onClick={() => setRange(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="pf-overview-grid">
        {overview.map((item) => (
          <div className="pf-overview-card" key={item.label}>
            <span className="pf-row-icon">
              <item.icon size={20} />
            </span>
            <p className="pf-overview-value">
              <strong>{item.value}</strong>
              {item.unit && <span>{item.unit}</span>}
            </p>
            <p className="pf-overview-label">{item.label}</p>
          </div>
        ))}
      </div>
      <p className="pf-stats-note">
        {range === "week"
          ? "Showing your activity for this week (Monday to Sunday)."
          : "Showing your activity since you joined."}
      </p>

      <h2 className="pf-stats-title">Your consistency</h2>
      <section className="pf-panel">
        <p className="pf-panel-title">Your practice activity</p>
        <p className="pf-panel-text">Minutes spoken each day this week</p>
        <div className="pf-week-chart">
          {perDay.map((secs, i) => (
            <div
              className={`pf-week-day ${i === todayIndex ? "is-today" : ""}`}
              key={DAY_LABELS[i]}
            >
              <div
                className="pf-week-track"
                title={`${DAY_LABELS[i]}: ${formatMinutes(secs)}`}
              >
                <span
                  style={{
                    height: maxDay
                      ? `${Math.max(6, Math.round((secs / maxDay) * 100))}%`
                      : 0,
                    opacity: secs ? 1 : 0,
                  }}
                />
              </div>
              <span className="pf-week-label">{DAY_LABELS[i]}</span>
            </div>
          ))}
        </div>
        <p className="pf-panel-text pf-week-foot">
          {thisWeek.length
            ? "Keep showing up, even for a short practice."
            : "No practice yet this week. A short one is a great start."}
        </p>
      </section>

      <h2 className="pf-stats-title">Milestones</h2>
      <p className="pf-stats-sub">
        Small steps, meaningful progress. Keep going to unlock each milestone.
      </p>
      <div className="pf-list">
        {milestones.map((m) => {
          const done = m.value >= m.goal;
          const pct = Math.min(100, Math.round((m.value / m.goal) * 100));
          return (
            <div className="pf-row pf-milestone" key={m.title}>
              <span className="pf-row-icon">
                <m.icon size={20} />
              </span>
              <span className="pf-row-text">
                <strong>{m.title}</strong>
                <span>{m.text}</span>
                {!done && (
                  <span className="pf-bar pf-milestone-bar">
                    <span style={{ width: `${pct}%` }} />
                  </span>
                )}
              </span>
              {done ? (
                <CircleCheck
                  size={24}
                  className="pf-milestone-done"
                  aria-label="Completed"
                />
              ) : (
                <span className="pf-milestone-count">
                  {Math.min(m.value, m.goal)}/{m.goal}
                  {m.unit ? ` ${m.unit}` : ""}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <p className="pf-stats-note">
        Milestones count all your practice since you joined. Streak milestones
        use your best streak.
      </p>

      <button className="profile-save-button pf-start-button" onClick={onStart}>
        <Mic size={18} /> Start a practice
      </button>
    </div>
  );
}

function countMilestone(icon, goal, value) {
  return {
    icon,
    title: `${goal} speaking practices`,
    text: `Complete ${goal} speaking practices.`,
    value,
    goal,
  };
}

function streakMilestone(icon, goal, words, value) {
  return {
    icon,
    title: `${goal}-day streak`,
    text: `Practise on ${words} consecutive days.`,
    value,
    goal,
    unit: "days",
  };
}

function vocabMilestone(icon, goal, value) {
  return {
    icon,
    title: `${goal} vocabulary practices`,
    text: `Practise using new words in sentences ${goal} times.`,
    value,
    goal,
  };
}

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function dayKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function splitSpeakingTime(seconds) {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return { value: m ? `${h}h ${m}` : h, unit: m ? "min" : "hr" };
  }
  if (seconds >= 60) return { value: Math.floor(seconds / 60), unit: "min" };
  return { value: seconds, unit: "sec" };
}

function formatMinutes(seconds) {
  if (!seconds) return "no practice";
  return seconds < 60 ? `${seconds} sec` : `${Math.round(seconds / 60)} min`;
}
