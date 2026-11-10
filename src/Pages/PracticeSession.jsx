import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  X,
  Mic,
  Check,
  CheckCircle2,
  AudioLines,
  Flame,
  LoaderCircle,
  Share2,
} from "lucide-react";
import {
  LEVEL_META,
  DEFAULT_SPEAK_SECONDS,
  describeSpeakTime,
} from "../data/prompts";
import { canUseAiFeedback, fetchAiAllowance } from "../data/plans";
import api from "../api/axios";
import FeedbackReport from "../Components/practice/FeedbackReport";
import WrapUp from "../Components/practice/WrapUp";
import { describeSeconds } from "../Components/practice/wrapUpText";
import RecordingPlayer from "../Components/practice/RecordingPlayer";
import DurationPicker from "../Components/practice/DurationPicker";
import ShareSheet from "../Components/practice/ShareSheet";
import "./PracticeSession.css";

// Flow after speaking (Reflect and "Amazing!" pages removed, 2026-11-09):
//   speak -> saving (practice saved automatically, streak counted)
//         -> wrap ("That's a wrap!": choose feedback or not, live allowance)
//              Get my feedback  -> analyzing ("Let's unpack your response")
//                               -> feedback report
//              Save without feedback -> complete ("Amazing!") for members
//                with AI feedback (paid or trial); saved ("You did it!" +
//                unlock + share) for Free members without AI feedback
// Any saved practice can still get feedback later from Profile > Your
// practices. The server decides who can use AI feedback; the allowance shown
// comes from GET /api/practice/ai-allowance.

// Steps shown under the loading bar while the analysis runs.
const ANALYSIS_STEPS = [
  "Listening to your recording",
  "Transcribing what you said",
  "Analysing your response",
  "Preparing your feedback",
];

const formatTime = (totalSeconds) => {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

// Pick a recording format this browser can also play back. iPhones report
// webm as recordable but can't play it in an <audio> element, which is why
// recordings wouldn't play; mp4 is tried first when it's playable.
function pickRecordingType() {
  if (typeof MediaRecorder === "undefined") return undefined;
  const probe = document.createElement("audio");
  const candidates = [
    "audio/mp4",
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg",
  ];
  const recordable = candidates.filter((type) =>
    MediaRecorder.isTypeSupported(type),
  );
  return (
    recordable.find((type) => probe.canPlayType(type) !== "") || recordable[0]
  );
}

function capitalizeFirstLetter(value = "") {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || null;
  } catch {
    return null;
  }
}

// "Try again" navigates to this same page with the same prompt. Keying on the
// navigation gives the new attempt a fresh session (timers, recorder, report).
export default function PracticeSession() {
  const location = useLocation();
  return <PracticeSessionAttempt key={location.key} />;
}

function PracticeSessionAttempt() {
  const location = useLocation();
  const navigate = useNavigate();
  const analysisInProgress = useRef(false);
  const {
    level,
    category,
    prompt,
    isWordOfTheDay = false,
    isYap = false,
    isResearch = false,
  } = location.state || {};
  const currentUser = location.state?.user || getStoredUser();
  const username = capitalizeFirstLetter(
    currentUser?.username || location.state?.username || "there",
  );
  const levelInfo = LEVEL_META.find((l) => l.id === level) || LEVEL_META[0];

  const prepareTotal = isYap || isResearch ? 0 : levelInfo.prepareSeconds;
  // Chosen on the topic page (no prep) or on the preparation screen.
  const [speakTotal, setSpeakTotal] = useState(
    location.state?.speakSeconds || DEFAULT_SPEAK_SECONDS,
  );

  // Research Mode opens on a "get ready to explain" page (duration + I'm ready).
  const [phase, setPhase] = useState(
    isResearch ? "ready" : prepareTotal > 0 ? "prepare" : "speak",
  );
  const [timeLeft, setTimeLeft] = useState(
    prepareTotal > 0 ? prepareTotal : speakTotal,
  );
  const [isRecording, setIsRecording] = useState(false);
  const [isRequestingMic, setIsRequestingMic] = useState(false);

  // ---- real audio capture ----
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordStartRef = useRef(null);
  const activeRecordingElapsedRef = useRef(0);
  const activeRecordingSegmentStartRef = useRef(null);
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

  // ---- save / streak state ----
  const saveStarted = useRef(false);
  const [submitError, setSubmitError] = useState("");
  const [streak, setStreak] = useState(null);
  // Today's AI feedback allowance from the server (null while loading or
  // offline), and whether it has finished loading.
  const [allowance, setAllowance] = useState(null);
  const [allowanceLoaded, setAllowanceLoaded] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  // ---- AI feedback state ----
  const [savedRecordingId, setSavedRecordingId] = useState(null);
  const [report, setReport] = useState(null);
  const [analysisError, setAnalysisError] = useState("");
  const [unlockNote, setUnlockNote] = useState("");
  const [analysisErrorCode, setAnalysisErrorCode] = useState("");
  // Share image for practices without a feedback score (time spent speaking).
  const [showShare, setShowShare] = useState(false);

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
    setIsRequestingMic(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      streamRef.current = stream;
      startAudioAnalysis(stream);

      const mimeType = pickRecordingType();

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
          const elapsedMilliseconds =
            activeRecordingElapsedRef.current +
            (activeRecordingSegmentStartRef.current === null
              ? 0
              : performance.now() - activeRecordingSegmentStartRef.current);
          setActualDurationSeconds(
            elapsedMilliseconds >= speakTotal * 1000
              ? speakTotal
              : Math.ceil(elapsedMilliseconds / 1000),
          );
        }

        // Release the mic
        stream.getTracks().forEach((track) => track.stop());
        stopAudioAnalysis();
        setIsRecording(false);
      };

      recordStartRef.current = Date.now();
      setActualDurationSeconds(0);
      mediaRecorder.start();
      activeRecordingElapsedRef.current = 0;
      activeRecordingSegmentStartRef.current = performance.now();
      setTimeLeft(speakTotal);
      setPhase("speak");
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access denied or unavailable:", err);
      setMicError(
        "We couldn't access your microphone. Check your browser permissions and try again.",
      );
      setIsRecording(false);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      stopAudioAnalysis();
    } finally {
      setIsRequestingMic(false);
    }
  }, [speakTotal, startAudioAnalysis, stopAudioAnalysis]);
  const stopRecording = useCallback(() => {
    if (activeRecordingSegmentStartRef.current !== null) {
      activeRecordingElapsedRef.current +=
        performance.now() - activeRecordingSegmentStartRef.current;
      activeRecordingSegmentStartRef.current = null;
    }
    setActualDurationSeconds(
      Math.min(speakTotal, Math.ceil(activeRecordingElapsedRef.current / 1000)),
    );
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    stopAudioAnalysis();
    setIsRecording(false);
  }, [speakTotal, stopAudioAnalysis]);

  const togglePauseResume = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (recorder.state === "recording") {
      recorder.pause();
      if (activeRecordingSegmentStartRef.current !== null) {
        activeRecordingElapsedRef.current +=
          performance.now() - activeRecordingSegmentStartRef.current;
        activeRecordingSegmentStartRef.current = null;
      }
      stopAudioAnalysis();
      setIsRecording(false);
    } else if (recorder.state === "paused") {
      recorder.resume();
      activeRecordingSegmentStartRef.current = performance.now();
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
    if (prepareTotal === 0 && !isResearch) {
      goToSpeak();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Speaking finished: stop the recorder and save the practice straight away
  // (the save runs once the recorder hands over the audio).
  const goToReflect = useCallback(() => {
    stopRecording();
    setPhase("saving");
  }, [stopRecording]);

  const handleExit = () => {
    stopRecording();
    navigate("/app/practice");
  };

  // Practise the same prompt again from the start.
  const handleTryAgain = () => {
    navigate(location.pathname, {
      state: { ...location.state, speakSeconds: speakTotal },
      replace: true,
    });
  };

  const handleBackToPractice = () => {
    navigate("/app/practice");
  };

  // Preparation time is independent of microphone permission requests.
  useEffect(() => {
    if (phase !== "prepare") return;

    if (timeLeft <= 0) {
      goToSpeak();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, phase, goToSpeak, goToReflect]);

  // Start the full speaking countdown only once the recorder is active.
  useEffect(() => {
    if (phase !== "speak" || !isRecording) return;

    const timer = setInterval(() => {
      const segmentStart = activeRecordingSegmentStartRef.current;
      const elapsedMilliseconds =
        activeRecordingElapsedRef.current +
        (segmentStart === null ? 0 : performance.now() - segmentStart);
      const remainingMilliseconds = speakTotal * 1000 - elapsedMilliseconds;
      const remainingSeconds = Math.max(
        0,
        Math.ceil(remainingMilliseconds / 1000),
      );

      setTimeLeft(remainingSeconds);
      if (remainingMilliseconds <= 0) {
        activeRecordingElapsedRef.current = speakTotal * 1000;
        activeRecordingSegmentStartRef.current = null;
        goToReflect();
      }
    }, 100);

    return () => clearInterval(timer);
  }, [goToReflect, isRecording, phase, speakTotal]);

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

  const runAnalysis = async (recordingId) => {
    if (!recordingId || analysisInProgress.current) return;

    analysisInProgress.current = true;
    setAnalysisError("");
    setAnalysisProgress(4);
    setPhase("analyzing");

    try {
      const res = await api.post(
        `/api/practice/recordings/${recordingId}/analyze`,
        null,
        { timeout: 120000 },
      );

      setReport(res.data);
      setPhase("feedback");
    } catch (err) {
      if (err.response?.data?.code === "UPGRADE_REQUIRED") {
        // Trial ended or today's trial reviews used: back to the wrap-up
        // page, refreshed, with the server's reason.
        setUnlockNote(err.response.data.message || "");
        loadAllowance();
        setPhase("wrap");
        return;
      }

      console.error(
        "Analysis failed:",
        err.response?.status,
        err.response?.data || err.message,
      );

      setAnalysisError(
        err.response?.data?.message ||
          "We couldn't analyse this recording right now.",
      );
      setAnalysisErrorCode(err.response?.data?.code || "");

      setPhase("analysis-error");
    } finally {
      analysisInProgress.current = false;
    }
  };

  const loadAllowance = async () => {
    const data = await fetchAiAllowance();
    setAllowance(data);
    setAllowanceLoaded(true);
  };

  const savePractice = async () => {
    setSubmitError("");

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
      formData.append("durationSeconds", String(actualDurationSeconds));
      formData.append("isWordOfTheDay", String(isWordOfTheDay));

      const res = await api.post("/api/practice/complete", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setStreak(res.data.streak);
      setSavedRecordingId(res.data.recording?._id || null);
      setPhase("wrap");
    } catch (err) {
      console.error("Failed to save practice session:", err);
      saveStarted.current = false;
      setSubmitError(
        err.response?.data?.message ||
          "Couldn't save your recording. Check your connection and try again.",
      );
    }
  };

  // Save as soon as the recorder has handed over the audio, and load the
  // allowance at the same time so the wrap-up page opens with real numbers.
  useEffect(() => {
    if (phase !== "saving" || !audioBlob || saveStarted.current) return;
    saveStarted.current = true;
    savePractice();
    loadAllowance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, audioBlob]);

  const retrySave = () => {
    if (saveStarted.current) return;
    saveStarted.current = true;
    savePractice();
  };

  // Loading bar on "Let's unpack your response": eases towards 92% while the
  // server works (about 30 seconds), then the feedback page replaces it.
  useEffect(() => {
    if (phase !== "analyzing") return;
    const timer = setInterval(() => {
      setAnalysisProgress((p) => p + (92 - p) * 0.035);
    }, 300);
    return () => clearInterval(timer);
  }, [phase]);

  const circumference = 2 * Math.PI * 70;
  const totalForPhase = phase === "prepare" ? prepareTotal : speakTotal;
  const progress = totalForPhase > 0 ? timeLeft / totalForPhase : 0;
  const dashOffset = circumference * (1 - progress);


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
      <div className="page session-page session-prepare-page">
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

        <div className="session-prep-guidance">
          <DurationPicker
            className="session-duration"
            value={speakTotal}
            onChange={setSpeakTotal}
          />

          <div className="session-tips-card session-tips-card-compact">
            <p className="session-tips-title">Remember, {username}</p>
            <p className="session-tip-line">
              Your recordings are only visible to you. Practise freely, make
              mistakes, and get better without worrying about anyone listening.
            </p>
          </div>

          <div className="session-ready-actions">
            <p className="session-note">
              You can start speaking when you're ready.
            </p>

            <button
              className="spin-jar-btn session-ready-btn"
              onClick={goToSpeak}
            >
              I'M READY
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- RESEARCH: GET READY TO EXPLAIN ----------
  if (phase === "ready") {
    return (
      <div className="page session-page session-prepare-page research-ready-page">
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

        <p className="session-phase-label">Get ready to explain</p>

        <div className="research-ready-topic">
          <p className="research-ready-label">YOUR RESEARCH TOPIC</p>
          <p className="research-ready-text">{prompt}</p>
          {category?.title && (
            <p className="research-ready-subject">{category.title}</p>
          )}
        </div>

        <div className="session-prep-guidance">
          <DurationPicker
            className="session-duration"
            value={speakTotal}
            onChange={setSpeakTotal}
          />

          <div className="session-tips-card session-tips-card-compact">
            <p className="session-tips-title">Remember, {username}</p>
            <p className="session-tip-line">
              Put your notes aside and explain what you&apos;ve learned without
              reading from them, as if you&apos;re teaching a friend.
            </p>
          </div>

          <div className="session-ready-actions">
            <p className="session-note">
              You can start speaking when you&apos;re ready.
            </p>

            <button
              className="spin-jar-btn session-ready-btn"
              onClick={goToSpeak}
            >
              I&apos;M READY
            </button>
          </div>
        </div>
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

        <h1 className="session-speak-title">
          {isResearch ? "Explain what you learned" : "Speak your response"}
        </h1>
        <p className="session-speak-subtitle">
          {isRequestingMic
            ? "Waiting for microphone permission..."
            : `Speak for up to ${describeSpeakTime(speakTotal)}, and finish whenever you're ready.`}
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
          onClick={() => {
            if (!mediaRecorderRef.current) {
              startRecording();
            } else {
              togglePauseResume();
            }
          }}
          disabled={isRequestingMic}
          aria-label={
            isRequestingMic
              ? "Waiting for microphone permission"
              : mediaRecorderRef.current?.state === "paused"
                ? "Resume"
                : mediaRecorderRef.current?.state === "recording"
                  ? "Pause"
                  : "Request microphone access"
          }
        >
          <Mic size={42} strokeWidth={2} />
        </button>

        <p className="session-speak-time">{formatTime(timeLeft)}</p>
        <p className="session-speak-time-label">
          {isRecording ? "Time remaining" : "Recording starts after permission"}
        </p>
        <button
          className="spin-jar-btn session-done-btn"
          onClick={goToReflect}
          disabled={
            isRequestingMic ||
            !mediaRecorderRef.current ||
            mediaRecorderRef.current.state === "inactive"
          }
        >
          I’m done speaking
        </button>
      </div>
    );
  }

  // ---------- SAVING (right after speaking) ----------
  if (phase === "saving") {
    return (
      <div className="page session-page wrap-page wrap-saving">
        {submitError ? (
          <>
            <h1 className="an-title">Your practice isn&apos;t saved yet</h1>
            <p className="an-sub">{submitError}</p>
            <button
              type="button"
              className="an-unlock-btn"
              onClick={retrySave}
            >
              Try again
            </button>
            <button
              type="button"
              className="fb-secondary-btn"
              onClick={handleExit}
            >
              Leave without saving
            </button>
          </>
        ) : (
          <>
            <LoaderCircle size={34} className="wrap-spin" aria-hidden="true" />
            <p className="an-sub">Saving your practice...</p>
          </>
        )}
      </div>
    );
  }

  // Free members whose trial has ended (or offline with no AI on the plan).
  const aiLocked = allowance
    ? allowance.state === "locked"
    : !canUseAiFeedback(currentUser);

  // ---------- THAT'S A WRAP! (choose feedback) ----------
  if (phase === "wrap") {
    return (
      <WrapUp
        audioUrl={audioUrl}
        seconds={actualDurationSeconds}
        allowance={allowance}
        allowanceLoaded={allowanceLoaded}
        locked={aiLocked}
        note={unlockNote}
        canAnalyse={Boolean(savedRecordingId)}
        onBack={handleBackToPractice}
        onGetFeedback={() => runAnalysis(savedRecordingId)}
        onSkip={() => setPhase(aiLocked ? "saved" : "complete")}
        onExplorePlans={() =>
          navigate("/app/membership", {
            state: { reason: "feedback", recordingId: savedRecordingId },
          })
        }
      />
    );
  }

  // ---------- LET'S UNPACK YOUR RESPONSE (analysing) ----------
  if (phase === "analyzing") {
    const stepIndex = Math.min(
      ANALYSIS_STEPS.length - 1,
      Math.floor((analysisProgress / 92) * ANALYSIS_STEPS.length),
    );
    return (
      <div className="page session-page unpack-page">
        <div className="unpack-body">
          <div className="unpack-icon" aria-hidden="true">
            <AudioLines size={34} strokeWidth={1.8} />
          </div>
          <h1 className="unpack-title">Let&apos;s unpack your response.</h1>
          <p className="unpack-sub">
            Your communication feedback is being prepared.
          </p>

          <div
            className="unpack-bar"
            role="progressbar"
            aria-label="Preparing your feedback"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(analysisProgress)}
          >
            <span style={{ width: `${analysisProgress}%` }} />
          </div>
          <p className="unpack-step" aria-live="polite">
            <span className="unpack-dot" aria-hidden="true" />
            {ANALYSIS_STEPS[stepIndex]}
          </p>
        </div>
        <p className="unpack-foot">Your feedback will be ready shortly.</p>
      </div>
    );
  }

  const shareButton = actualDurationSeconds > 0 && (
    <button
      type="button"
      className="an-unlock-btn sh-btn saved-share-btn"
      onClick={() => setShowShare(true)}
    >
      <Share2 size={17} aria-hidden="true" /> Share my practice
    </button>
  );
  const shareSheet = showShare && (
    <ShareSheet
      score={null}
      seconds={actualDurationSeconds}
      onClose={() => setShowShare(false)}
    />
  );

  // ---------- YOU DID IT! (saved without feedback) ----------
  if (phase === "saved") {
    return (
      <div className="page session-page fb-page an-page saved-page">
        <div className="an-done-icon" aria-hidden="true">
          <Check size={28} />
        </div>
        <h1 className="an-title">You did it!</h1>
        <p className="an-sub">
          Your practice is saved. Every time you practise, you get better.
        </p>

        <div className="saved-stats">
          <div className="saved-stat">
            <span className="saved-stat-label">You practised for</span>
            <strong>{describeSeconds(actualDurationSeconds)}</strong>
          </div>
          <div className="saved-stat">
            <span className="saved-stat-label">
              <Flame size={14} aria-hidden="true" /> Day streak
            </span>
            <strong>{streak?.current ?? "—"}</strong>
          </div>
        </div>

        <RecordingPlayer
          src={audioUrl}
          fallbackSeconds={actualDurationSeconds}
          title="Your recording"
          subtitle="Listen to your response"
        />

        <p className="saved-share-text">
          Share an image of your practice with friends, or post it to your
          status.
        </p>
        {shareButton}
        <button
          type="button"
          className="fb-secondary-btn"
          onClick={handleTryAgain}
        >
          Practise this topic again
        </button>
        <button
          type="button"
          className="fb-secondary-btn"
          onClick={handleBackToPractice}
        >
          Back to practice
        </button>

        {aiLocked ? (
          <p className="saved-later">
            Want to know how you did?{" "}
            <button
              type="button"
              onClick={() =>
                navigate("/app/membership", {
                  state: { reason: "feedback", recordingId: savedRecordingId },
                })
              }
            >
              Unlock detailed feedback
            </button>
          </p>
        ) : (
          <p className="saved-later">
            Changed your mind? Get feedback on this practice any time from{" "}
            <button
              type="button"
              onClick={() =>
                navigate("/app/profile", { state: { open: "practices" } })
              }
            >
              Your practices
            </button>
            .
          </p>
        )}
        {shareSheet}
      </div>
    );
  }

  // ---------- COMPLETE PHASE ----------
  if (phase === "complete") {
    const timeSpentMinutes = Math.floor(actualDurationSeconds / 60);
    const remainingSeconds = actualDurationSeconds % 60;
    const timeSpent = [
      timeSpentMinutes > 0
        ? `${timeSpentMinutes} minute${timeSpentMinutes !== 1 ? "s" : ""}`
        : null,
      remainingSeconds > 0 || timeSpentMinutes === 0
        ? `${remainingSeconds} second${remainingSeconds !== 1 ? "s" : ""}`
        : null,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="page session-page">
        <div className="complete-icon">
          <Check size={56} strokeWidth={3} aria-hidden="true" />
        </div>

        <h1 className="complete-title">Amazing!</h1>
        <p className="complete-subtitle">You showed up for yourself today.</p>

        <div className="complete-stats">
          <div className="complete-stat-row">
            <span className="complete-stat-label">
              <Flame size={16} strokeWidth={1.8} />
              Time spent
            </span>
            <span className="complete-stat-value">
              {timeSpent}
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
          onClick={() => navigate("/app/home")}
        >
          Back to home
        </button>
        {shareButton && (
          <button
            type="button"
            className="fb-secondary-btn sh-btn sh-open-btn"
            onClick={() => setShowShare(true)}
          >
            <Share2 size={17} aria-hidden="true" /> Share my practice
          </button>
        )}
        <p className="saved-later">
          Want feedback on this one later? Find it in{" "}
          <button
            type="button"
            onClick={() =>
              navigate("/app/profile", { state: { open: "practices" } })
            }
          >
            Your practices
          </button>
          .
        </p>
        {shareSheet}
      </div>
    );
  }

  // ---------- ANALYSIS ERROR PHASE ----------
  if (phase === "analysis-error") {
    return (
      <div className="page session-page fb-wait">
        <h1 className="fb-wait-title">
          {analysisErrorCode === "DAILY_LIMIT"
            ? "That's today's AI feedback"
            : "Feedback isn't ready"}
        </h1>
        <p className="fb-wait-text">{analysisError}</p>
        {analysisErrorCode !== "DAILY_LIMIT" && (
          <button
            className="spin-jar-btn"
            onClick={() => runAnalysis(savedRecordingId)}
          >
            Try again
          </button>
        )}
        <button
          className="fb-link-btn"
          onClick={() => setPhase(aiLocked ? "saved" : "complete")}
        >
          {analysisErrorCode === "DAILY_LIMIT" ? "Continue" : "Skip for now"}
        </button>
      </div>
    );
  }

  // ---------- FEEDBACK PHASE ----------
  if (phase === "feedback" && report) {
    return (
      <FeedbackReport
        report={report}
        topic={prompt}
        audioUrl={audioUrl}
        durationSeconds={actualDurationSeconds}
        onTryAgain={handleTryAgain}
        onDone={handleBackToPractice}
        doneLabel="Back to practice"
      />
    );
  }

  return null;
}
