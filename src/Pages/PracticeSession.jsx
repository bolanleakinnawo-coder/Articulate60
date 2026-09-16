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
import amazingImage from "../assets/amazing.png";
import api from "../api/axios";
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

  // ---- real audio capture ----
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordStartRef = useRef(null);
  const audioContextRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastWaveformUpdateRef = useRef(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [actualDurationSeconds, setActualDurationSeconds] = useState(0);
  const [micError, setMicError] = useState("");
  const [waveformLevels, setWaveformLevels] = useState(() =>
    Array(24).fill(0.08),
  );

  // ---- reflect phase state ----
  const audioElRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playedSeconds, setPlayedSeconds] = useState(0);
  const [answer1, setAnswer1] = useState("");
  const [answer2, setAnswer2] = useState("");

  // ---- submit / streak state ----
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [streak, setStreak] = useState(null);

  const tips =
    category?.id && HELP_TIPS[category.id]?.[level]
      ? HELP_TIPS[category.id][level]
      : [
          "Plan your key point.",
          "Think of one example.",
          "Then speak with clarity.",
        ];

  // ---------- MIC / RECORDING ----------
  const stopAudioAnalysis = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    setWaveformLevels(Array(24).fill(0.08));
    lastWaveformUpdateRef.current = 0;
  }, []);

  const startAudioAnalysis = useCallback(
    (stream) => {
      stopAudioAnalysis();

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.72;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      audioContextRef.current = audioContext;

      const timeDomainData = new Uint8Array(analyser.fftSize);
      const updateWaveform = () => {
        const now = performance.now();
        // Add one new live audio sample roughly every 70ms. Keeping prior samples
        // makes the waveform scroll from right to left instead of just pulsing.
        if (now - lastWaveformUpdateRef.current >= 70) {
          analyser.getByteTimeDomainData(timeDomainData);
          const rms = Math.sqrt(
            timeDomainData.reduce(
              (sum, value) => sum + ((value - 128) / 128) ** 2,
              0,
            ) / timeDomainData.length,
          );
          const level = Math.max(0.08, Math.min(1, rms * 8));
          setWaveformLevels((previous) => [...previous.slice(1), level]);
          lastWaveformUpdateRef.current = now;
        }
        animationFrameRef.current = requestAnimationFrame(updateWaveform);
      };

      updateWaveform();
    },
    [stopAudioAnalysis],
  );

  const startRecording = useCallback(async () => {
    setMicError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      streamRef.current = stream;
      startAudioAnalysis(stream);

      const preferredTypes = ["audio/webm", "audio/mp4", "audio/ogg"];
      const mimeType = preferredTypes.find((type) =>
        MediaRecorder.isTypeSupported(type),
      );

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream); // last-resort browser default

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const actualType = mediaRecorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, {
          type: actualType,
        });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));

        if (recordStartRef.current) {
          const elapsed = Math.round(
            (Date.now() - recordStartRef.current) / 1000,
          );
          setActualDurationSeconds(elapsed);
        }

        // Release the mic
        stream.getTracks().forEach((track) => track.stop());
        stopAudioAnalysis();
      };

      recordStartRef.current = Date.now();
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access denied or unavailable:", err);
      setMicError(
        "We couldn't access your microphone. Check your browser permissions and try again.",
      );
      setIsRecording(false);
    }
  }, [startAudioAnalysis, stopAudioAnalysis]);
  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    stopAudioAnalysis();
    setIsRecording(false);
  }, [stopAudioAnalysis]);

  const togglePauseResume = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (recorder.state === "recording") {
      recorder.pause();
      stopAudioAnalysis();
      setIsRecording(false);
    } else if (recorder.state === "paused") {
      recorder.resume();
      if (streamRef.current) startAudioAnalysis(streamRef.current);
      setIsRecording(true);
    }
  };

  const goToSpeak = useCallback(() => {
    setPhase("speak");
    setTimeLeft(speakTotal);
    startRecording();
  }, [speakTotal, startRecording]);

  useEffect(() => {
    if (prepareTotal === 0) {
      goToSpeak();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToReflect = useCallback(() => {
    stopRecording();
    setPhase("reflect");
  }, [stopRecording]);

  const handleExit = () => {
    stopRecording();
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

  // Clean up the object URL when we're done with it
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  useEffect(() => {
    return () => {
      stopAudioAnalysis();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [stopAudioAnalysis]);

  // real playback progress, driven by the actual <audio> element
  useEffect(() => {
    const el = audioElRef.current;
    if (!el) return;

    const onTimeUpdate = () => setPlayedSeconds(Math.floor(el.currentTime));
    const onEnded = () => {
      setIsPlaying(false);
      setPlayedSeconds(0);
    };

    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("ended", onEnded);
    };
  }, [audioUrl]);

  const togglePlayback = () => {
    const el = audioElRef.current;
    if (!el) return;

    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      if (playedSeconds >= (actualDurationSeconds || speakTotal)) {
        el.currentTime = 0;
      }
      el.play();
      setIsPlaying(true);
    }
  };

  const handleCompletePractice = async () => {
    setSubmitError("");
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append(
        "audio",
        audioBlob || new Blob(),
        audioBlob?.type.includes("mp4") ? "recording.m4a" : "recording.webm",
      );
      formData.append("topic", prompt);
      formData.append("category", category?.title || "");
      formData.append("level", level);
      formData.append("durationSeconds", actualDurationSeconds || speakTotal);
      formData.append("wentWell", answer1);
      formData.append("improveNextTime", answer2);

      const res = await api.post("/api/practice/complete", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setStreak(res.data.streak);
      setPhase("complete");
    } catch (err) {
      console.error("Failed to save practice session:", err);
      setSubmitError(
        err.response?.data?.message ||
          "Couldn't save your recording. Check your connection and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const circumference = 2 * Math.PI * 70;
  const totalForPhase = phase === "prepare" ? prepareTotal : speakTotal;
  const progress = totalForPhase > 0 ? timeLeft / totalForPhase : 0;
  const dashOffset = circumference * (1 - progress);

  const playbackTotal = actualDurationSeconds || speakTotal;
  const playbackProgress =
    playbackTotal > 0 ? (playedSeconds / playbackTotal) * 100 : 0;
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

        {micError && <p className="session-mic-error">{micError}</p>}

        <div className={`session-waveform ${isRecording ? "active" : ""}`}>
          {waveformLevels.map((level, i) => (
            <span
              key={i}
              className="session-wave-bar"
              style={{ height: `${Math.round(8 + level * 64)}px` }}
            />
          ))}
        </div>

        <button
          className={`session-mic-btn ${isRecording ? "active" : ""}`}
          onClick={togglePauseResume}
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

        {audioUrl && <audio ref={audioElRef} src={audioUrl} preload="auto" />}

        <div className="listen-card">
          <p className="listen-label">Listen</p>
          <p className="listen-desc">Review your recording</p>

          <button
            className="listen-play-btn"
            onClick={togglePlayback}
            aria-label="Play recording"
            disabled={!audioUrl}
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
            <span>{formatTime(playbackTotal)}</span>
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

        {submitError && <p className="session-mic-error">{submitError}</p>}

        <button
          className="spin-jar-btn reflect-complete-btn"
          onClick={handleCompletePractice}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Complete practice"}
        </button>
      </div>
    );
  }

  // ---------- COMPLETE PHASE ----------
  if (phase === "complete") {
    const timeSpentMinutes = Math.round(
      (actualDurationSeconds || speakTotal) / 60,
    );

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
            <p className="complete-streak-value">{streak?.current ?? "—"}</p>
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
