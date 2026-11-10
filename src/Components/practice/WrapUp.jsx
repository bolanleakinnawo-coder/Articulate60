import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Pause, Play } from "lucide-react";
import { PLANS } from "../../data/plans";
import "./WrapUp.css";

const BLOOM_PER_DAY =
  PLANS.find((p) => p.id === "bloom")?.limits.aiFeedbackPerDay ?? 5;

const BENEFITS = [
  "What you did well",
  "Areas that need improvement",
  "Your transcript with specific observations",
  "Actionable tips for your next practice",
];

function clock(total) {
  const s = Math.max(0, Math.floor(Number(total) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Round play button + "Listen to your response 0:34".
function ListenButton({ src, seconds }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setCurrent(el.currentTime);
    const onEnd = () => {
      setPlaying(false);
      setCurrent(0);
    };
    const onPause = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnd);
    el.addEventListener("pause", onPause);
    el.addEventListener("play", onPlay);
    return () => {
      el.pause();
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnd);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("play", onPlay);
    };
  }, [src]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) el.pause();
    else el.play().catch(() => setPlaying(false));
  };

  return (
    <div className="wrap-listen">
      {src && <audio ref={audioRef} src={src} preload="metadata" />}
      <button
        type="button"
        className="wrap-play"
        onClick={toggle}
        disabled={!src}
        aria-label={playing ? "Pause your recording" : "Play your recording"}
      >
        {playing ? (
          <Pause size={18} fill="currentColor" />
        ) : (
          <Play size={18} fill="currentColor" />
        )}
      </button>
      <span className="wrap-listen-text">
        <strong>Listen to your response</strong>
        <span>{playing || current > 0 ? `${clock(current)} / ` : ""}{clock(seconds)}</span>
      </span>
    </div>
  );
}

function Benefits({ title, intro, badge }) {
  return (
    <div className="wrap-card wrap-benefits">
      <div className="wrap-benefits-head">
        <h3>{title}</h3>
        {badge && <span className="wrap-badge">{badge}</span>}
      </div>
      {intro && <p className="wrap-benefits-intro">{intro}</p>}
      <ul>
        {BENEFITS.map((b) => (
          <li key={b}>
            <Check size={16} aria-hidden="true" />
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}

// "That's a wrap!" — shown as soon as a practice is saved. The member picks
// whether this practice gets AI feedback. Every number is the server's
// (GET /api/practice/ai-allowance).
export default function WrapUp({
  audioUrl,
  seconds,
  allowance,
  allowanceLoaded,
  locked,
  note,
  canAnalyse,
  onBack,
  onGetFeedback,
  onSkip,
  onExplorePlans,
}) {
  const state = allowance?.state;
  const unlimited = allowance && !locked && allowance.limit === null;
  const left = allowance?.left ?? null;
  const outToday = !locked && !unlimited && left === 0;

  let allowanceBlock = null;
  if (!locked && allowance) {
    const label =
      state === "trial" ? "Trial feedback allowance" : "Feedback allowance";
    let foot;
    if (unlimited) foot = "Unlimited reviews on your plan.";
    else if (state === "trial")
      foot = `${allowance.limit} reviews per day during your 3-day trial${
        allowance.trialDaysLeft
          ? ` · ${allowance.trialDaysLeft} ${allowance.trialDaysLeft === 1 ? "day" : "days"} left`
          : ""
      }.`;
    else foot = "Allowance resets at midnight.";

    allowanceBlock = (
      <div className="wrap-allowance">
        <p className="wrap-eyebrow">{label}</p>
        <p className="wrap-count">
          {unlimited ? (
            "Unlimited"
          ) : (
            <>
              {left} <span>/ {allowance.limit}</span>
            </>
          )}
        </p>
        <p className="wrap-count-label">
          {unlimited
            ? allowance.used
              ? `${allowance.used} used today`
              : "Reviews today"
            : `${left === 1 ? "Review" : "Reviews"} remaining today`}
        </p>
        <p className="wrap-count-foot">{foot}</p>
      </div>
    );
  }

  return (
    <div className="page session-page wrap-page">
      <div className="wrap-topbar">
        <button type="button" className="wrap-back" onClick={onBack}>
          <ArrowLeft size={18} aria-hidden="true" /> Practice
        </button>
        <span className="wrap-status">Completed</span>
      </div>

      <h1 className="wrap-title">That&apos;s a wrap!</h1>
      <p className="wrap-sub">
        Your speaking session has been saved.
        {!locked && " Want to see how you did?"}
      </p>

      <div className={`wrap-card wrap-summary ${allowanceBlock ? "has-split" : ""}`}>
        <div className="wrap-recording">
          <p className="wrap-eyebrow">Your recording</p>
          <ListenButton src={audioUrl} seconds={seconds} />
        </div>
        {allowanceBlock}
        {!locked && !allowanceLoaded && (
          <div className="wrap-allowance wrap-allowance-loading">
            <p className="wrap-eyebrow">Feedback allowance</p>
            <span className="wrap-skeleton" />
            <span className="wrap-skeleton wrap-skeleton-sm" />
          </div>
        )}
      </div>

      {note && <p className="wrap-note">{note}</p>}

      {locked ? (
        <>
          <h2 className="wrap-heading">
            Know what&apos;s working. Know what to improve.
          </h2>
          <p className="wrap-text">
            Get detailed feedback to understand your strengths and improve how
            you communicate.
          </p>
          <Benefits
            title="Unlock detailed feedback"
            intro="With a plan, you get:"
            badge="Bloom"
          />
          <button type="button" className="wrap-primary" onClick={onExplorePlans}>
            Explore all plans
          </button>
          <p className="wrap-hint">
            Bloom gives you {BLOOM_PER_DAY} reviews a day. Find a plan that works
            for you.
          </p>
          <button type="button" className="wrap-secondary" onClick={onSkip}>
            Save practice without feedback
          </button>
          <p className="wrap-hint">
            You can listen to your recording later from your practice history.
          </p>
        </>
      ) : (
        <>
          <h2 className="wrap-heading">Would you like detailed feedback?</h2>
          <p className="wrap-text">
            Get a closer look at how you communicated, what worked, and what
            you can improve.
          </p>
          <Benefits title="What you'll get" />

          <div className="wrap-cost">
            <span>Cost of this review</span>
            <strong>{unlimited ? "Included in your plan" : "1 feedback credit"}</strong>
          </div>
          <button
            type="button"
            className="wrap-primary"
            onClick={onGetFeedback}
            disabled={!canAnalyse || outToday}
          >
            {outToday ? "No reviews left today" : "Get my feedback"}
          </button>
          {outToday && (
            <p className="wrap-hint">
              {state === "trial"
                ? `You've used today's ${allowance.limit} trial reviews. They reset at midnight, or get Bloom for ${BLOOM_PER_DAY} a day.`
                : "You've used today's reviews. Your allowance resets at midnight."}
            </p>
          )}
          {outToday && state === "trial" && (
            <button type="button" className="wrap-link" onClick={onExplorePlans}>
              Explore all plans
            </button>
          )}
          <button type="button" className="wrap-secondary" onClick={onSkip}>
            Save practice without feedback
          </button>
          <p className="wrap-hint">
            You can request a review later from your practice history.
          </p>
        </>
      )}
    </div>
  );
}
