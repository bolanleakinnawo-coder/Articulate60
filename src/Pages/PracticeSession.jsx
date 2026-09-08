import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  X,
  Mic,
  Play,
  Pause,
  Lightbulb,
  Pencil,
  CheckCircle2,
  Flame,
} from "lucide-react";
import { LEVEL_META, HELP_TIPS } from "../data/prompts";
import amazingImage from "../assets/amazing.PNG";
import "./PracticeSession.css";

const formatTime = (totalSeconds) => {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

export default function PracticeSession() {
  const location = useLocation();
  const navigate = useNavigate();

  const { level, category, prompt } = location.state || {};
  const levelInfo = LEVEL_META.find((l) => l.id === level) || LEVEL_META[0];

  const prepareTotal = levelInfo.prepareSeconds;
  const speakTotal = levelInfo.speakSeconds;

  const [phase, setPhase] = useState(prepareTotal > 0 ? "prepare" : "speak");
  const [timeLeft, setTimeLeft] = useState(
    prepareTotal > 0 ? prepareTotal : speakTotal,
  );
  const [isRecording, setIsRecording] = useState(false);

  // ---- reflect phase state ----
  const [isPlaying, setIsPlaying] = useState(false);
  const [playedSeconds, setPlayedSeconds] = useState(0);
  const [answer1, setAnswer1] = useState("");
  const [answer2, setAnswer2] = useState("");
  const playIntervalRef = useRef(null);

  const tips =
    category?.id && HELP_TIPS[category.id]?.[level]
      ? HELP_TIPS[category.id][level]
      : [
          "Plan your key point.",
          "Think of one example.",
          "Then speak with clarity.",
        ];

  const goToSpeak = useCallback(() => {
    setPhase("speak");
    setTimeLeft(speakTotal);
    setIsRecording(true);
  }, [speakTotal]);

  const goToReflect = useCallback(() => {
    setPhase("reflect");
    setIsRecording(false);
  }, []);

  const handleExit = () => {
    navigate("/app/practice");
  };

  const handleBackToHome = () => {
    navigate("/app/home");
  };

  // countdown effect for prepare + speak
  useEffect(() => {
    if (phase !== "prepare" && phase !== "speak") return;

    if (timeLeft <= 0) {
      if (phase === "prepare") goToSpeak();
      if (phase === "speak") goToReflect();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, phase, goToSpeak, goToReflect]);

  // simulated playback for the recording
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setPlayedSeconds((prev) => {
          if (prev >= speakTotal) {
            setIsPlaying(false);
            return speakTotal;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      clearInterval(playIntervalRef.current);
    }

    return () => clearInterval(playIntervalRef.current);
  }, [isPlaying, speakTotal]);

  const togglePlayback = () => {
    if (playedSeconds >= speakTotal) setPlayedSeconds(0);
    setIsPlaying((prev) => !prev);
  };

  const handleCompletePractice = () => {
    setPhase("complete");
  };

  const circumference = 2 * Math.PI * 70;
  const totalForPhase = phase === "prepare" ? prepareTotal : speakTotal;
  const progress = totalForPhase > 0 ? timeLeft / totalForPhase : 0;
  const dashOffset = circumference * (1 - progress);

  const playbackProgress =
    speakTotal > 0 ? (playedSeconds / speakTotal) * 100 : 0;
  const reflectionCompleted =
    answer1.trim().length > 0 || answer2.trim().length > 0;

  if (!prompt) {
    return (
      <div className="page session-page">
        <p className="session-empty">
          No topic selected. Go back and spin the jar first.
        </p>
        <button className="spin-jar-btn" onClick={handleExit}>
          Back to Practice
        </button>
      </div>
    );
  }

  // ---------- PREPARE PHASE ----------
  if (phase === "prepare") {
    return (
      <div className="page session-page">
        <div className="session-topbar">
          <button
            className="session-icon-btn"
            onClick={handleExit}
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <button
            className="session-icon-btn"
            onClick={handleExit}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <p className="session-phase-label">Preparing...</p>

        <div className="session-ring-wrapper">
          <svg viewBox="0 0 160 160" className="session-ring">
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
              strokeDashoffset={dashOffset}
              transform="rotate(-90 80 80)"
              className="session-ring-progress"
            />
          </svg>
          <div className="session-ring-center">
            <span className="session-ring-time">{formatTime(timeLeft)}</span>
            <span className="session-ring-label">Time left</span>
          </div>
        </div>

        <div className="session-tips-card">
          <p className="session-tips-title">Plan your response</p>
          {tips.slice(0, 2).map((tip, i) => (
            <p className="session-tip-line" key={i}>
              {tip}
            </p>
          ))}
        </div>

        <p className="session-note">
          You can start speaking when you're ready.
        </p>

        <button className="spin-jar-btn session-ready-btn" onClick={goToSpeak}>
          I'M READY
        </button>
      </div>
    );
  }

  // ---------- SPEAK PHASE ----------
  if (phase === "speak") {
    return (
      <div className="page session-page">
        <div className="session-topbar">
          <button
            className="session-icon-btn"
            onClick={handleExit}
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <p className="session-phase-label session-phase-label-inline">
            Speak
          </p>
          <button
            className="session-icon-btn"
            onClick={handleExit}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <h1 className="session-speak-title">Speak your response</h1>
        <p className="session-speak-subtitle">
          You have up to {Math.round(speakTotal / 60)} minute
          {speakTotal / 60 !== 1 ? "s" : ""}.
        </p>

        <div className={`session-waveform ${isRecording ? "active" : ""}`}>
          {Array.from({ length: 24 }).map((_, i) => (
            <span
              key={i}
              className="session-wave-bar"
              style={{ animationDelay: `${i * 0.05}s` }}
            />
          ))}
        </div>

        <button
          className={`session-mic-btn ${isRecording ? "active" : ""}`}
          onClick={() => setIsRecording((prev) => !prev)}
          aria-label={isRecording ? "Pause" : "Resume"}
        >
          <Mic size={42} strokeWidth={2} />
        </button>

        <p className="session-speak-time">{formatTime(timeLeft)}</p>
        <p className="session-speak-time-label">Max time</p>
      </div>
    );
  }

  // ---------- REFLECT PHASE ----------
  if (phase === "reflect") {
    return (
      <div className="page session-page">
        <div className="session-topbar">
          <button
            className="session-icon-btn"
            onClick={handleExit}
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <p className="session-phase-label session-phase-label-inline">
            Reflect
          </p>
          <span className="session-icon-btn" />
        </div>

        <p className="session-reflect-subtitle">Answer 2 quick questions</p>

        <div className="listen-card">
          <p className="listen-label">Listen</p>
          <p className="listen-desc">Review your recording</p>

          <button
            className="listen-play-btn"
            onClick={togglePlayback}
            aria-label="Play recording"
          >
            {isPlaying ? (
              <Pause size={26} fill="currentColor" />
            ) : (
              <Play size={26} fill="currentColor" />
            )}
          </button>

          <div className="listen-progress-track">
            <div
              className="listen-progress-fill"
              style={{ width: `${playbackProgress}%` }}
            />
          </div>
          <div className="listen-progress-times">
            <span>{formatTime(playedSeconds)}</span>
            <span>{formatTime(speakTotal)}</span>
          </div>

          <div className="listen-tip">
            <p className="listen-tip-label">TIP</p>
            <p className="listen-tip-text">
              Listen with a learner's mindset. Notice what you did well and what
              you can say better next time.
            </p>
          </div>
        </div>

        <div className="reflect-question">
          <div className="reflect-question-header">
            <Lightbulb size={16} strokeWidth={1.8} />
            <span>What did I do well in this response?</span>
          </div>
          <textarea
            className="reflect-textarea"
            placeholder="Write your answer... (optional)"
            value={answer1}
            onChange={(e) => setAnswer1(e.target.value)}
          />
        </div>

        <div className="reflect-question">
          <div className="reflect-question-header">
            <Pencil size={16} strokeWidth={1.8} />
            <span>What can I say better next time?</span>
          </div>
          <textarea
            className="reflect-textarea"
            placeholder="Write your answer... (optional)"
            value={answer2}
            onChange={(e) => setAnswer2(e.target.value)}
          />
        </div>

        <button
          className="spin-jar-btn reflect-complete-btn"
          onClick={handleCompletePractice}
        >
          Complete practice
        </button>
      </div>
    );
  }

  // ---------- COMPLETE PHASE ----------
  if (phase === "complete") {
    const timeSpentMinutes = Math.round(speakTotal / 60);

    return (
      <div className="page session-page">
        <div className="complete-icon">
          <img src={amazingImage} alt="Practice completed" />
        </div>

        <h1 className="complete-title">Amazing work!</h1>
        <p className="complete-subtitle">You showed up for yourself today.</p>

        <div className="complete-stats">
          <div className="complete-stat-row">
            <span className="complete-stat-label">
              <Flame size={16} strokeWidth={1.8} />
              Time spent
            </span>
            <span className="complete-stat-value">
              {timeSpentMinutes} minute{timeSpentMinutes !== 1 ? "s" : ""}
              <CheckCircle2 size={14} strokeWidth={2} />
            </span>
          </div>

          <div className="complete-stat-row">
            <span className="complete-stat-label">Topic completed</span>
            <CheckCircle2
              size={14}
              strokeWidth={2}
              className="complete-check"
            />
          </div>

          <div className="complete-stat-row">
            <span className="complete-stat-label">Recording saved</span>
            <CheckCircle2
              size={14}
              strokeWidth={2}
              className="complete-check"
            />
          </div>

          <div className="complete-stat-row">
            <span className="complete-stat-label">Reflection completed</span>
            {reflectionCompleted ? (
              <CheckCircle2
                size={14}
                strokeWidth={2}
                className="complete-check"
              />
            ) : (
              <span className="complete-skipped">Skipped</span>
            )}
          </div>
        </div>

        <div className="complete-streak-card">
          <Flame size={18} strokeWidth={1.8} />
          <div>
            <p className="complete-streak-value">8</p>
            <p className="complete-streak-label">Day streak</p>
          </div>
        </div>

        <button
          className="spin-jar-btn complete-home-btn"
          onClick={handleBackToHome}
        >
          Back to home
        </button>
      </div>
    );
  }

  return null;
}
