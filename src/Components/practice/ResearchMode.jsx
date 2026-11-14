import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Ban,
  BookOpen,
  Brain,
  Compass,
  ExternalLink,
  Layers,
  Lightbulb,
  Globe,
  NotebookPen,
  Pause,
  Play,
  RotateCw,
  Sparkles,
  X,
} from "lucide-react";
import {
  RESEARCH_MINUTES,
  RESEARCH_SECONDS,
  RESEARCH_SUBJECTS,
  researchSecondsLeft,
  saveResearchSession,
} from "../../data/research";
import "../../styles/ResearchMode.css";

const HOW_TO_ICONS = [BookOpen, Compass, Layers, Lightbulb];

const HOW_TO = [
  ["Understand the basics", "What is it? What does it mean?"],
  ["Explore the context", "Why does it happen? What led to it?"],
  ["Dig deeper", "How does it work? What are its effects and implications?"],
  [
    "Question the underlying ideas",
    "What was the original thinking behind it? What assumptions shaped it?",
  ],
];

const TOOLKIT = [
  {
    icon: NotebookPen,
    title: "Grab a notebook and pen.",
    text: "Write down important ideas in your own words. Note interesting facts, examples and questions. Don't just copy entire paragraphs.",
  },
  {
    icon: Ban,
    title: "No AI-generated answers.",
    text: "This is your opportunity to practise independent research and thinking. Use credible sources and do the intellectual work yourself.",
  },
  {
    icon: Brain,
    title: "Test what you've learned.",
    text: "Put your notes aside and explain what you've learned without reading from them.",
  },
];

function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Step 1: what Research Mode is, and how to research well.
export function ResearchIntro({ onBack, onReady }) {
  return (
    <div className="page practice-page rm-page">
      <div className="rm-head">
        <button className="yap-back rm-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} strokeWidth={2} />
        </button>
        <p className="eyebrow practice-eyebrow rm-eyebrow">RESEARCH MODE</p>
      </div>

      <h1 className="rm-title">
        <span>Learn something new.</span>
        <span>Be able to explain it.</span>
      </h1>
      <p className="rm-subtitle">
        Build your knowledge, strengthen your ability to remember information
        and become better at communicating what you know.
      </p>

      <section className="rm-howto" aria-labelledby="rm-howto-title">
        <h2 id="rm-howto-title" className="rm-section-title">
          How to research better
        </h2>
        <p className="rm-section-sub">
          Don&apos;t stop at the first thing you find. Explore any topic more
          deeply with these four questions.
        </p>
        <div className="rm-howto-grid">
          {HOW_TO.map(([title, text], i) => {
            const Icon = HOW_TO_ICONS[i];
            return (
              <div className="rm-howto-card" key={title}>
                <span className="rm-howto-top">
                  <span className="rm-howto-icon" aria-hidden="true">
                    <Icon size={17} strokeWidth={1.9} />
                  </span>
                  <span className="rm-howto-num">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <button className="spin-jar-btn rm-cta" onClick={onReady}>
        I&apos;m ready, give me a topic
        <span className="arrow">→</span>
      </button>
    </div>
  );
}

// Step 2: "What are we exploring today?" popup.
export function ResearchSubjectSheet({ onPick, onClose }) {
  return (
    <div className="category-modal-backdrop" onClick={onClose}>
      <div
        className="category-modal rm-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rm-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="category-modal-header rm-sheet-header">
          <div>
            <h2 id="rm-sheet-title">What are we exploring today?</h2>
            <p className="rm-sheet-sub">
              Choose a subject that interests you, or let us pick one for you.
            </p>
          </div>
          <button
            className="category-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="rm-subject-list">
          <button
            className="rm-subject rm-subject-surprise"
            onClick={() => onPick(null)}
          >
            <span className="rm-subject-num" aria-hidden="true">
              <Sparkles size={20} strokeWidth={1.8} />
            </span>
            <span className="rm-subject-text">
              <span className="rm-subject-title">Surprise me</span>
              <span className="rm-subject-sub">Let Loquiex pick any topic</span>
            </span>
          </button>
          {RESEARCH_SUBJECTS.map((subject, i) => (
            <button
              key={subject.id}
              className="rm-subject"
              onClick={() => onPick(subject.id)}
            >
              <span className="rm-subject-num">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="rm-subject-title">{subject.title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Step 3: "Please wait, your topic is coming".
export function ResearchLoading({ subjectTitle }) {
  return (
    <div
      className="page practice-page rm-loading"
      role="status"
      aria-live="polite"
    >
      <div className="rm-loading-card">
        <div className="spin-loader" />
        <h1 className="rm-loading-title">Please wait…</h1>
        <p className="rm-loading-sub">
          Your {subjectTitle ? `${subjectTitle} ` : ""}topic is coming.
        </p>
      </div>
    </div>
  );
}

// Step 4: the topic, the research toolkit and the member-started timer.
export function ResearchWorkspace({
  session,
  onSessionChange,
  onBack,
  onNewTopic,
  onDone,
}) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    researchSecondsLeft(session),
  );

  const update = useCallback(
    (next) => {
      saveResearchSession(next);
      onSessionChange(next);
    },
    [onSessionChange],
  );

  // Count from the saved end time, so leaving the app to search online
  // (or the phone pausing the page) never loses time.
  useEffect(() => {
    const tick = () => setSecondsLeft(researchSecondsLeft(session));
    tick();
    if (session.status !== "running") return undefined;
    const id = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [session]);

  const finished = session.status === "running" && secondsLeft === 0;
  useEffect(() => {
    if (!finished) return;
    try {
      navigator.vibrate?.([200, 100, 200]);
    } catch {
      // Not supported on this device.
    }
  }, [finished]);

  const start = () =>
    update({
      ...session,
      status: "running",
      endsAt: Date.now() + RESEARCH_SECONDS * 1000,
      remaining: null,
    });
  const pause = () =>
    update({
      ...session,
      status: "paused",
      remaining: secondsLeft,
      endsAt: null,
    });
  const resume = () =>
    update({
      ...session,
      status: "running",
      endsAt: Date.now() + secondsLeft * 1000,
      remaining: null,
    });

  const started = session.status !== "idle";
  const circumference = 2 * Math.PI * 70;
  const fraction = secondsLeft / RESEARCH_SECONDS;
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(session.topic)}`;

  return (
    <div className="page session-page rm-work">
      <div className="session-topbar">
        <button className="session-icon-btn" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <p className="session-phase-label session-phase-label-inline">
          Research
        </p>
        <span className="session-icon-btn" aria-hidden="true" />
      </div>

      <div className="rm-work-grid">
        <div className="rm-work-main">
          <div className="rm-topic-card">
            <span className="rm-chip">{session.subjectTitle}</span>
            <p className="rm-topic-label">YOUR RESEARCH TOPIC</p>
            <p className="rm-topic-text">{session.topic}</p>
            <div className="rm-topic-actions">
              <a
                className="rm-search-btn"
                href={searchUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Globe size={16} strokeWidth={2} />
                Search this topic
                <ExternalLink size={13} strokeWidth={2} />
              </a>
              {!started && (
                <button
                  className="change-topic-btn rm-new-topic"
                  onClick={onNewTopic}
                >
                  <RotateCw size={14} strokeWidth={2} />
                  Different topic
                </button>
              )}
            </div>
          </div>

          <div className="session-ring-wrapper rm-ring">
            <svg
              viewBox="0 0 160 160"
              className="session-ring"
              aria-hidden="true"
            >
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke="var(--border)"
                strokeWidth="8"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke="var(--olive-bright)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - fraction)}
                transform="rotate(-90 80 80)"
                className="session-ring-progress"
              />
            </svg>
            <div className="session-ring-center" role="timer" aria-live="off">
              <span className="session-ring-time">
                {formatClock(secondsLeft)}
              </span>
              <span className="session-ring-label">
                {finished
                  ? "Time's up"
                  : session.status === "paused"
                    ? "Paused"
                    : session.status === "running"
                      ? "Research time left"
                      : "Not started yet"}
              </span>
            </div>
          </div>

          {!started && (
            <button className="spin-jar-btn rm-timer-btn" onClick={start}>
              <Play size={17} strokeWidth={2.2} />
              Start {RESEARCH_MINUTES}-min timer
            </button>
          )}
          {session.status === "running" && !finished && (
            <button className="rm-secondary-btn" onClick={pause}>
              <Pause size={16} strokeWidth={2.2} />
              Pause timer
            </button>
          )}
          {session.status === "paused" && (
            <button className="rm-secondary-btn" onClick={resume}>
              <Play size={16} strokeWidth={2.2} />
              Resume timer
            </button>
          )}
          {finished && (
            <p className="rm-timeup">
              Time&apos;s up. Put your notes aside and get ready to explain.
            </p>
          )}
        </div>

        <div className="rm-work-side">
          {started && (
            <button className="spin-jar-btn rm-done-btn" onClick={onDone}>
              I&apos;m done researching
              <span className="arrow">→</span>
            </button>
          )}
          {!started && (
            <p className="rm-hint">
              Start the timer when you begin. You can finish early whenever
              you&apos;re ready.
            </p>
          )}

          <div className="rm-toolkit">
            <p className="rm-toolkit-head">
              <NotebookPen size={20} strokeWidth={1.8} />
              Your research toolkit
            </p>
            {TOOLKIT.map(({ icon: Icon, title, text }, i) => (
              <div className="rm-toolkit-item" key={title}>
                <p className="rm-toolkit-title">
                  {i > 0 && <Icon size={18} strokeWidth={1.9} />}
                  {title}
                </p>
                <p className="rm-toolkit-text">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Asked before leaving a research session that has started.
export function ResearchLeaveDialog({ onStay, onLeave }) {
  return (
    <div className="help-modal-backdrop" onClick={onStay}>
      <div
        className="help-modal rm-leave"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rm-leave-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="rm-leave-title" className="help-modal-heading">
          Stop researching?
        </h3>
        <p className="rm-leave-text">Your topic and timer will be cleared.</p>
        <button className="spin-jar-btn" onClick={onStay}>
          Keep researching
        </button>
        <button className="exit-result-btn" onClick={onLeave}>
          Stop and go back
        </button>
      </div>
    </div>
  );
}
