import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  AudioLines,
  CalendarClock,
  Clock,
  ClockAlert,
  Hand,
  LockKeyhole,
  MessageCircle,
  MessagesSquare,
  Mic,
  MicOff,
  PhoneOff,
  RefreshCw,
  Sprout,
  Users,
} from "lucide-react";
import {
  addGroupMinutes,
  getPlan,
  groupMinutesUsedToday,
  isPaidPlan,
} from "../data/plans";
import { getRandomPrompt } from "../data/prompts";
import "../styles/Membership.css";
import "../styles/PracticeExtras.css";

// What people who haven't subscribed see when they open Group Practice.
export function GroupPracticeIntro() {
  const navigate = useNavigate();

  useEffect(() => {
    if (isPaidPlan()) navigate("/app/group-practice/room", { replace: true });
  }, [navigate]);

  return (
    <div className="page ms-page">
      <button
        className="ms-back"
        onClick={() => navigate("/app/practice")}
        aria-label="Back"
      >
        <ArrowLeft size={18} />
      </button>

      <p className="ms-kicker">Group practice</p>
      <h1 className="ms-title">Your voice belongs in the room.</h1>
      <p className="ms-sub">
        Get comfortable expressing yourself in real conversations.
      </p>

      <div className="gp-feature-card">
        <div className="gp-hero">
          <div className="gp-hero-top">
            <span className="gp-hero-icon" aria-hidden="true">
              <Users size={22} />
            </span>
            <span className="gp-hero-copy">
              <strong>Live group practice</strong>
              <span>Learn by speaking with others</span>
            </span>
            <LockKeyhole size={18} className="gp-lock" aria-label="Locked" />
          </div>
          <div className="gp-hero-bottom">
            <span className="gp-dots" aria-hidden="true">
              <span>
                <MessageCircle size={16} />
              </span>
              <span>
                <Mic size={16} />
              </span>
              <span>
                <MessagesSquare size={16} />
              </span>
            </span>
            <span className="gp-tagline">Speak · Listen · Grow</span>
          </div>
        </div>

        <ul className="gp-list">
          <li>
            <MessagesSquare size={22} aria-hidden="true" />
            <span>
              <strong>Join live practice sessions</strong>
              <span>
                Meet other learners and practise expressing your thoughts in
                real conversations.
              </span>
            </span>
          </li>
          <li>
            <AudioLines size={22} aria-hidden="true" />
            <span>
              <strong>Build confidence speaking aloud</strong>
              <span>
                Get more comfortable sharing ideas, responding to others and
                thinking on your feet.
              </span>
            </span>
          </li>
          <li>
            <CalendarClock size={22} aria-hidden="true" />
            <span>
              <strong>Practise on your schedule</strong>
              <span>
                Join available sessions or host a practice call when you're
                ready.
              </span>
            </span>
          </li>
        </ul>
      </div>

      <h2 className="gp-growth">
        <Sprout size={22} aria-hidden="true" /> Make room for more growth.
      </h2>
      <p className="ms-sub">
        Unlock group practice alongside your AI feedback allowance with either
        Loquiex Bloom or Loquiex Flourish.
      </p>

      <button
        className="ms-primary"
        onClick={() =>
          navigate("/app/membership", { state: { reason: "group" } })
        }
      >
        Explore membership →
      </button>
      <button className="ms-link" onClick={() => navigate("/app/practice")}>
        I'll keep practising on my own for now
      </button>
    </div>
  );
}

const MEMBERS = ["You", "Member 02", "Member 03", "Member 04"];

function TimeUp({ onBack }) {
  return (
    <div className="page ms-page">
      <div className="gp-timeup">
        <span className="gp-timeup-icon" aria-hidden="true">
          <ClockAlert size={30} />
        </span>
        <h1>Your daily practice time is up</h1>
        <p className="ms-sub">
          You've used all your Group Practice minutes for today.
        </p>
        <div className="gp-reset">
          <p>
            <RefreshCw size={18} aria-hidden="true" /> Your time resets at
            midnight
          </p>
          <span>Come back tomorrow to join another group practice.</span>
        </div>
        <button className="ms-primary" onClick={onBack}>
          Back to Practice
        </button>
      </div>
    </div>
  );
}

// Members' group practice room. PREVIEW: there are no live calls yet, so this
// shows the room layout and runs the daily allowance, the 5-minute and
// 1-minute warnings and the "time is up" screen. Each person's minutes
// belong to their own account; only their own allowance is used.
export function GroupPracticeRoom() {
  const navigate = useNavigate();
  const plan = getPlan();
  const total = plan.limits.groupMinutesPerDay;
  const [used, setUsed] = useState(groupMinutesUsedToday());
  const [muted, setMuted] = useState(false);
  const [handUp, setHandUp] = useState(false);
  const [dismissedAt, setDismissedAt] = useState(null);
  const prompt = useMemo(
    () =>
      getRandomPrompt("everyday-conversations") ||
      "What makes someone a good communicator?",
    [],
  );

  const left = Math.max(0, total - used);

  useEffect(() => {
    if (!isPaidPlan()) navigate("/app/group-practice", { replace: true });
  }, [navigate]);

  // One minute of allowance is used for every minute in the room.
  useEffect(() => {
    if (left <= 0) return undefined;
    const timer = setInterval(() => setUsed(addGroupMinutes(1)), 60000);
    return () => clearInterval(timer);
  }, [left]);

  const leave = () => navigate("/app/practice");

  if (total === 0) return null;
  if (left <= 0) return <TimeUp onBack={leave} />;

  const warning = left <= 1 ? "final" : left <= 5 ? "low" : null;
  const showWarning = warning && dismissedAt !== warning;

  return (
    <div className="page ms-page">
      <div className="gp-room-head">
        <div>
          <h1 className="ms-title gp-room-title">Group Practice</h1>
          <p className="ms-sub gp-room-sub">Everyday Conversations</p>
        </div>
        {warning ? (
          <span className="gp-pill gp-pill-warn">{left} min left</span>
        ) : (
          <span className="gp-pill">
            <span className="gp-live-dot" /> LIVE
          </span>
        )}
      </div>

      {showWarning && (
        <div className="gp-warning" role="alert">
          <p>
            <Clock size={18} aria-hidden="true" />
            {warning === "final"
              ? "One minute left."
              : "Your daily practice time is running low."}
          </p>
          <span>
            {warning === "final"
              ? "You'll leave the call when your time runs out. The others can keep going."
              : `You have ${left} minutes of Group Practice time remaining today. Make the most of them!`}
          </span>
          <button onClick={() => setDismissedAt(warning)}>Got it</button>
        </div>
      )}

      <div className="gp-allowance">
        <p>
          <Clock size={18} aria-hidden="true" /> Your daily allowance
          <strong>{left} min left</strong>
        </p>
        <span className="limit-row-bar">
          <span style={{ width: `${(left / total) * 100}%` }} />
        </span>
        <small>This is your remaining Group Practice time for today.</small>
      </div>

      <h2 className="gp-section-title">Who's in the room?</h2>
      <div className="gp-members">
        {MEMBERS.map((m, i) => (
          <div className="gp-member" key={m}>
            <span className={`gp-avatar ${i === 0 ? "gp-avatar-you" : ""}`}>
              {m.charAt(0)}
            </span>
            <span>{m}</span>
            {i === 0 && handUp && <Hand size={14} className="gp-hand" />}
          </div>
        ))}
      </div>

      <div className="gp-prompt">
        <span>Today's prompt</span>
        <p>{prompt}</p>
      </div>

      <div className="gp-controls">
        <button
          onClick={() => setMuted((v) => !v)}
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>
        <button
          onClick={() => setHandUp((v) => !v)}
          aria-label="Raise hand"
          className={handUp ? "gp-on" : ""}
        >
          <Hand size={22} />
        </button>
        <button className="gp-leave" onClick={leave} aria-label="Leave call">
          <PhoneOff size={22} />
        </button>
      </div>

      <p className="ms-footnote">
        Preview: live group calls are coming soon. Your allowance is counted on
        this device for now.{" "}
        <button
          className="gp-demo-skip"
          onClick={() => setUsed(addGroupMinutes(Math.min(5, left)))}
        >
          Use 5 minutes (test the warnings)
        </button>
      </p>
    </div>
  );
}
