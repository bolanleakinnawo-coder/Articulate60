import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Info,
  Infinity as InfinityIcon,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
import { PLANS, PRICES, formatMoney } from "../../data/plans";

const BLOOM = PLANS.find((p) => p.id === "bloom");
const BLOOM_PER_DAY = BLOOM?.limits.aiFeedbackPerDay ?? 5;
const BLOOM_PRICE = formatMoney(PRICES.NGN.bloom ?? BLOOM?.priceNaira ?? 0);
// Up to this many sessions a day show as separate pips, more as one bar.
const MAX_PIPS = 6;

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// "AI FEEDBACK  3 left" beside "Choose your level" on the Solo tab. Every
// number comes from the server (GET /api/practice/ai-allowance), so it
// matches what the analyser will actually allow.
export function AiFeedbackMeter({ allowance, infoOpen, onToggleInfo }) {
  if (!allowance) return null;
  const { state, limit, left, used } = allowance;
  const locked = state === "locked";
  const unlimited = !locked && limit === null;
  const empty = !locked && !unlimited && left === 0;

  return (
    <div
      className={`ai-meter ${locked ? "is-locked" : ""} ${empty ? "is-empty" : ""}`}
    >
      <p className="eyebrow ai-meter-label">AI FEEDBACK</p>
      <button
        type="button"
        className="ai-meter-box"
        onClick={onToggleInfo}
        aria-expanded={infoOpen}
        aria-controls="ai-meter-info"
        aria-label={
          locked
            ? "AI feedback locked. Your free trial has ended."
            : unlimited
              ? "Unlimited AI feedback"
              : `${left} AI feedback ${left === 1 ? "session" : "sessions"} left today`
        }
      >
        <span className="ai-meter-value">
          {locked ? (
            <>
              <LockKeyhole size={14} strokeWidth={2} aria-hidden="true" />
              Locked
            </>
          ) : unlimited ? (
            <>
              <InfinityIcon size={16} strokeWidth={2} aria-hidden="true" />
              Unlimited
            </>
          ) : (
            `${left} left`
          )}
          <Info
            size={13}
            strokeWidth={2}
            className="ai-meter-info-icon"
            aria-hidden="true"
          />
        </span>
        {locked ? (
          <span className="ai-meter-note">Trial ended</span>
        ) : unlimited ? (
          <span className="ai-meter-note">
            {used ? `${used} used today` : "Infinity plan"}
          </span>
        ) : limit <= MAX_PIPS ? (
          <span className="ai-meter-pips" aria-hidden="true">
            {Array.from({ length: limit }, (_, i) => (
              <span key={i} className={i < left ? "on" : ""} />
            ))}
          </span>
        ) : (
          <span className="ai-meter-bar" aria-hidden="true">
            <span style={{ width: `${(left / limit) * 100}%` }} />
          </span>
        )}
      </button>
    </div>
  );
}

// One line under the row when the (i) is tapped.
export function AiFeedbackInfo({ allowance }) {
  if (!allowance) return null;
  const { state, limit, left } = allowance;
  let text;
  if (state === "locked") {
    text = `Your 3-day free trial of AI feedback has ended. Bloom gives you ${BLOOM_PER_DAY} a day.`;
  } else if (limit === null) {
    text = "Your plan has unlimited AI feedback.";
  } else if (state === "trial") {
    text = `Your free trial gives you ${limit} AI feedback sessions a day. ${plural(left, "session")} left today; they reset at midnight.`;
  } else {
    text = `Your plan gives you ${limit} AI feedback sessions a day. ${plural(left, "session")} left today; they reset at midnight.`;
  }
  return (
    <p className="ai-meter-info" id="ai-meter-info" role="note">
      {text}
    </p>
  );
}

// Free members only: a slim card nudging them to Bloom.
export function AiFeedbackNudge({ allowance }) {
  const navigate = useNavigate();
  if (!allowance || allowance.state === "paid") return null;
  const { state, limit, left, trialDaysLeft } = allowance;

  let title;
  let body;
  let cta = "Get Bloom";
  if (state === "locked") {
    title = "Your free AI feedback has ended.";
    body = `Unlock it with Bloom from ${BLOOM_PRICE} a month.`;
    cta = "Unlock";
  } else if (left === 0) {
    title = `You've used today's ${limit} free feedbacks.`;
    body = `Bloom gives you ${BLOOM_PER_DAY} a day, every day.`;
  } else {
    title = `Free trial: ${plural(trialDaysLeft, "day")} left.`;
    body = `Keep your feedback going with Bloom, ${BLOOM_PER_DAY} a day.`;
  }

  return (
    <div className="ai-nudge">
      <span className="ai-nudge-icon" aria-hidden="true">
        <Sparkles size={16} strokeWidth={1.8} />
      </span>
      <p className="ai-nudge-text">
        <strong>{title}</strong> {body}
      </p>
      <button
        type="button"
        className="ai-nudge-btn"
        onClick={() =>
          navigate("/app/membership", { state: { reason: "feedback" } })
        }
      >
        {cta}
        <ArrowRight size={14} strokeWidth={2.2} aria-hidden="true" />
      </button>
    </div>
  );
}
