import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Gauge,
  CirclePause,
  Pause,
  Play,
  Share2,
  Target,
} from "lucide-react";
import "./FeedbackReport.css";

// The five criteria the AI scores (1-10). Shown out of 100 on this page.
const SCORED = [
  {
    key: "grammar",
    label: "Grammar",
    tab: "grammar",
    bands: [
      "Your sentences were well built",
      "A few sentences slipped",
      "Sentence building needs work",
    ],
  },
  {
    key: "vocabulary",
    label: "Word choice",
    tab: "grammar",
    bands: [
      "Your meaning was clear",
      "Some words could be sharper",
      "Word choice blurred your meaning",
    ],
  },
  {
    key: "structure",
    label: "Structure",
    tab: "clarity",
    bands: [
      "Your ideas were well organised",
      "Your ideas need more development",
      "Your answer needs a clearer shape",
    ],
  },
  {
    key: "clarity",
    label: "Clarity",
    tab: "clarity",
    bands: [
      "You were easy to follow",
      "Sometimes hard to follow",
      "Often hard to follow",
    ],
  },
  {
    key: "repetition",
    label: "Repetition",
    tab: "fillers",
    bands: [
      "You kept moving forward",
      "Some ideas were repeated",
      "Repetition weakened your answer",
    ],
  },
];

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "clarity", label: "Clarity" },
  { id: "delivery", label: "Delivery" },
  { id: "fillers", label: "Fillers" },
  { id: "grammar", label: "Grammar" },
];

// Which tab holds the evidence for the biggest opportunity.
const FOCUS_TAB = { form: "grammar", shape: "clarity", deliver: "delivery" };

const TAB_CRITERIA = {
  clarity: ["clarity", "structure"],
  delivery: ["pace", "pauses"],
  fillers: ["fillers", "repetition"],
  grammar: ["grammar", "vocabulary"],
};

const TYPE_LABEL = {
  genuine_error: "Grammar to fix",
  optional_suggestion: "Wording to improve",
  observation: "Observation",
};

function isScore(value) {
  return typeof value === "number" && Number.isFinite(value);
}

// 1-10 score to 0-100.
function toHundred(value) {
  return isScore(value) ? Math.round(value * 10) : null;
}

function average(values) {
  const valid = values.filter(isScore);
  if (!valid.length) return null;
  return valid.reduce((sum, v) => sum + v, 0) / valid.length;
}

function band(score) {
  if (score >= 8) return 0;
  if (score >= 5) return 1;
  return 2;
}

function verdictFor(overall) {
  if (overall === null) return "Your feedback";
  if (overall >= 85) return "Strong answer";
  if (overall >= 70) return "Good start";
  if (overall >= 50) return "Getting there";
  return "Room to grow";
}

// Green when the message comes across, amber when it needs work.
function toneFor(score100) {
  if (score100 === null) return "muted";
  return score100 >= 70 ? "good" : "warn";
}

function firstSentence(text = "") {
  const match = text.match(/^[^.!?]+[.!?]/);
  return (match ? match[0] : text).trim();
}

function longDuration(total) {
  const s = Math.max(0, Math.round(Number(total) || 0));
  const m = Math.floor(s / 60);
  const rest = s % 60;
  if (m === 0) return `${rest} sec`;
  return rest ? `${m} min ${rest} sec` : `${m} min`;
}

function clock(total) {
  const s = Math.max(0, Math.floor(Number(total) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Split the transcript into plain and highlighted pieces. Nothing is removed:
// joining every piece gives back the original transcript exactly.
// "linked" items point at a finding; "phrases" (fillers) are marked everywhere.
function buildSegments(transcript, linked, phrases) {
  if (!transcript) return [];
  const lower = transcript.toLowerCase();
  // Only highlight when lowercasing didn't shift character positions.
  const canHighlight = lower.length === transcript.length;

  const ranges = [];
  if (canHighlight) {
    linked.forEach(({ text, id }) => {
      if (!text) return;
      const start = lower.indexOf(text.toLowerCase());
      if (start < 0) return;
      ranges.push({ start, end: start + text.length, id });
    });
    phrases.forEach((phrase) => {
      if (!phrase) return;
      const re = new RegExp(`\\b${escapeRegExp(phrase.toLowerCase())}\\b`, "g");
      let m;
      while ((m = re.exec(lower))) {
        ranges.push({ start: m.index, end: m.index + phrase.length, id: null });
      }
    });
  }
  ranges.sort((a, b) => a.start - b.start || b.end - a.end);

  const segments = [];
  let cursor = 0;
  for (const r of ranges) {
    // Overlapping highlights keep the first one.
    if (r.start < cursor) continue;
    if (r.start > cursor)
      segments.push({ text: transcript.slice(cursor, r.start) });
    segments.push({
      text: transcript.slice(r.start, r.end),
      mark: true,
      id: r.id,
    });
    cursor = r.end;
  }
  if (cursor < transcript.length)
    segments.push({ text: transcript.slice(cursor) });
  return segments;
}

function ScoreRing({ value }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = value === null ? 0 : Math.min(100, Math.max(0, value));
  return (
    <div
      className="fb-ring"
      role="img"
      aria-label={`${value ?? "No"} out of 100`}
    >
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="fb-ring-track" cx="60" cy="60" r={r} />
        <circle
          className="fb-ring-fill"
          cx="60"
          cy="60"
          r={r}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
        />
      </svg>
      <div className="fb-ring-text">
        <span className="fb-ring-value">{value ?? "–"}</span>
        <span className="fb-ring-max">/100</span>
      </div>
    </div>
  );
}

function RecordingPlayer({ src, fallbackSeconds }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    // Recorded webm files often report an Infinite duration, so fall back
    // to the time measured while recording.
    const readDuration = () =>
      setDuration(
        Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 0,
      );
    const onTime = () => {
      setCurrent(el.currentTime);
      if (Number.isFinite(el.duration) && el.duration > 0)
        setDuration(el.duration);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setCurrent(0);
    };
    el.addEventListener("loadedmetadata", readDuration);
    el.addEventListener("durationchange", readDuration);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("loadedmetadata", readDuration);
      el.removeEventListener("durationchange", readDuration);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
    };
  }, [src]);

  const total = duration || Number(fallbackSeconds) || 0;
  const pct = total > 0 ? Math.min(100, (current / total) * 100) : 0;

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  };

  const seek = (e) => {
    const el = audioRef.current;
    if (!el || !total) return;
    el.currentTime = (Number(e.target.value) / 100) * total;
    setCurrent(el.currentTime);
  };

  if (!src) {
    return (
      <div className="fb-card fb-player fb-player-empty">
        <p className="fb-muted">
          Your recording isn't available to play right now.
        </p>
      </div>
    );
  }

  return (
    <div className="fb-card fb-player">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        type="button"
        className="fb-play-btn"
        onClick={toggle}
        aria-label={playing ? "Pause recording" : "Play recording"}
      >
        {playing ? (
          <Pause size={22} fill="currentColor" strokeWidth={0} />
        ) : (
          <Play size={22} fill="currentColor" strokeWidth={0} />
        )}
      </button>
      <div className="fb-player-main">
        <input
          type="range"
          className="fb-seek"
          min="0"
          max="100"
          step="0.1"
          value={pct}
          onChange={seek}
          aria-label="Seek recording"
          style={{ "--fb-seek": `${pct}%` }}
        />
        <div className="fb-player-times">
          <span>{clock(current)}</span>
          <span>{clock(total)}</span>
        </div>
      </div>
    </div>
  );
}

function Transcript({ segments, activeId, onPick, evidenceNote, label }) {
  if (!segments.length) return null;
  return (
    <div className="fb-transcript">
      {label && <p className="fb-eyebrow">{label}</p>}
      <p className="fb-transcript-text">
        {segments.map((seg, i) =>
          seg.mark && seg.id !== null && seg.id !== undefined ? (
            <span
              key={i}
              role="button"
              tabIndex={0}
              className={`fb-mark ${seg.id === activeId ? "fb-mark-active" : ""}`}
              onClick={() => onPick(seg.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onPick(seg.id);
                }
              }}
            >
              {seg.text}
            </span>
          ) : seg.mark ? (
            <mark key={i} className="fb-mark fb-mark-static">
              {seg.text}
            </mark>
          ) : (
            <span key={i}>{seg.text}</span>
          ),
        )}
      </p>
      {segments.some((s) => s.mark && s.id !== null && s.id !== undefined) && (
        <p className="fb-footnote">
          Tap a highlighted phrase to see its feedback.
        </p>
      )}
      {evidenceNote && <p className="fb-footnote">{evidenceNote}</p>}
    </div>
  );
}

function Finding({ c, id, active }) {
  return (
    <div
      className={`fb-finding ${active ? "fb-finding-active" : ""}`}
      id={`fb-c-${id}`}
    >
      {c.original ? (
        <div className="fb-box">
          <p className="fb-eyebrow">From your response</p>
          <p className="fb-quote">“{c.original}”</p>
          <p className="fb-box-text">{c.why}</p>
        </div>
      ) : (
        <div className="fb-box">
          <p className="fb-eyebrow">What we noticed</p>
          <p className="fb-box-text">{c.why}</p>
        </div>
      )}
      {(c.better || c.tryItYourself) && (
        <div className="fb-box fb-box-good">
          <p className="fb-box-label">How to improve</p>
          {c.better && <p className="fb-box-text">“{c.better}”</p>}
          {c.tryItYourself && <p className="fb-box-text">{c.tryItYourself}</p>}
        </div>
      )}
    </div>
  );
}

export default function FeedbackReport({
  report,
  topic,
  audioUrl,
  durationSeconds,
  onTryAgain,
  onDone,
  doneLabel = "Back to practice",
}) {
  const { transcript = "", metrics = {}, analysis = {} } = report || {};
  // The server also sends the recording address with the report.
  const playbackUrl = audioUrl || report?.audioUrl;
  const scores = analysis.scores || {};
  const notes = analysis.notes || {};
  const corrections = Array.isArray(analysis.corrections)
    ? analysis.corrections
    : [];
  const opportunity = analysis.biggestOpportunity || {};
  const nextSkill = analysis.nextSkill || {};

  const [tab, setTab] = useState("overview");
  const [activeId, setActiveId] = useState(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [shareState, setShareState] = useState("");

  const fillers = metrics.fillers || { total: 0, breakdown: {}, positions: [] };
  const pauses = metrics.pauses || { long: 0, veryLong: 0, longestSeconds: 0 };
  const repetition = metrics.repetition || { frequentWords: [] };
  const crutchPhrases = metrics.crutchPhrases || [];
  const wpm =
    Number.isFinite(metrics.wordsPerMinute) && metrics.wordsPerMinute > 0
      ? metrics.wordsPerMinute
      : null;
  const recordingSeconds = durationSeconds || metrics.speakingSeconds || 0;

  const overallAvg = average(SCORED.map((k) => scores[k.key]));
  const overall = overallAvg === null ? null : Math.round(overallAvg * 10);

  // Findings grouped by the tab they belong to. Reports saved before the
  // criteria update have no "criterion"; they show in the Clarity tab.
  const byTab = { clarity: [], delivery: [], fillers: [], grammar: [] };
  corrections.forEach((c, i) => {
    const owner =
      Object.keys(TAB_CRITERIA).find((t) =>
        TAB_CRITERIA[t].includes(c.criterion),
      ) || "clarity";
    byTab[owner].push({ c, i });
  });

  const strongest =
    SCORED.filter((k) => isScore(scores[k.key])).sort(
      (a, b) => scores[b.key] - scores[a.key],
    )[0] || null;

  const fillerPhrases = [
    ...Object.keys(fillers.breakdown || {}),
    ...crutchPhrases.map((p) => p.phrase),
  ];

  const segments = showTranscript
    ? buildSegments(
        transcript,
        (byTab[tab] || []).map(({ c, i }) => ({ text: c.original, id: i })),
        tab === "fillers" ? fillerPhrases : [],
      )
    : [];

  useEffect(() => {
    if (activeId === null) return;
    const el = document.getElementById(`fb-c-${activeId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeId]);

  const openTab = (id, scroll = true) => {
    setTab(id);
    setActiveId(null);
    setShowTranscript(false);
    if (scroll) {
      document
        .getElementById("fb-explore")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const share = async () => {
    const text =
      overall !== null
        ? `I scored ${overall}/100 on my speaking practice${topic ? `: "${topic}"` : ""}.`
        : `I just finished a speaking practice${topic ? `: "${topic}"` : ""}.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "My speaking practice", text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setShareState("Copied");
      setTimeout(() => setShareState(""), 2000);
    } catch {
      // The person closed the share sheet; nothing to do.
    }
  };

  const renderFindings = (items) =>
    items.map(({ c, i }) => (
      <Finding key={i} c={c} id={i} active={activeId === i} />
    ));

  const transcriptToggle = (label, primary = false) =>
    transcript ? (
      <>
        <button
          type="button"
          className={primary ? "fb-btn-dark" : "fb-disclosure"}
          onClick={() => setShowTranscript((v) => !v)}
          aria-expanded={showTranscript}
        >
          {!primary && (
            <FileText size={16} strokeWidth={1.8} aria-hidden="true" />
          )}
          <span>{showTranscript ? "Hide transcript" : label}</span>
          {!primary && (
            <ChevronDown
              size={18}
              className={`fb-disclosure-chev ${showTranscript ? "fb-open" : ""}`}
              aria-hidden="true"
            />
          )}
        </button>
        {showTranscript && (
          <Transcript
            segments={segments}
            activeId={activeId}
            onPick={setActiveId}
            evidenceNote={analysis.evidenceNote}
          />
        )}
      </>
    ) : null;

  // ---------- TAB CONTENTS ----------
  const renderOverview = () => (
    <>
      <div className="fb-card fb-panel">
        <h3 className="fb-panel-title">Performance breakdown</h3>
        <div className="fb-breakdown">
          {SCORED.map(({ key, label, tab: target, bands }) => {
            const value = toHundred(scores[key]);
            const tone = toneFor(value);
            return (
              <button
                key={key}
                type="button"
                className="fb-metric"
                onClick={() => openTab(target)}
              >
                <span className="fb-metric-top">
                  <span className="fb-metric-text">
                    <span className="fb-metric-label">{label}</span>
                    <span className="fb-metric-sub">
                      {isScore(scores[key])
                        ? bands[band(scores[key])]
                        : "Not scored this time"}
                    </span>
                  </span>
                  <span className="fb-metric-value">{value ?? "–"}</span>
                  <ChevronRight
                    size={18}
                    className="fb-metric-chev"
                    aria-hidden="true"
                  />
                </span>
                <span className="fb-bar">
                  <span
                    className={`fb-bar-fill fb-bar-${tone}`}
                    style={{ width: `${value ?? 0}%` }}
                  />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {(strongest && notes[strongest.key]) || analysis.summary ? (
        <div className="fb-card fb-callout fb-callout-good">
          <h3 className="fb-callout-title">
            <CheckCircle2 size={22} strokeWidth={1.8} aria-hidden="true" />
            What you did well
          </h3>
          <p className="fb-callout-text">
            {strongest && notes[strongest.key]
              ? notes[strongest.key]
              : analysis.summary}
          </p>
        </div>
      ) : null}

      {opportunity.title && (
        <div className="fb-card fb-callout fb-callout-warn">
          <h3 className="fb-callout-title">
            <Target size={22} strokeWidth={1.8} aria-hidden="true" />
            Focus on this next
          </h3>
          <p className="fb-callout-headline">{opportunity.title}</p>
          {opportunity.evidence && (
            <p className="fb-callout-text">{opportunity.evidence}</p>
          )}
          <button
            type="button"
            className="fb-text-link"
            onClick={() => openTab(FOCUS_TAB[opportunity.focus] || "clarity")}
          >
            See the evidence <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {(wpm || notes.pauses) && (
        <div className="fb-card fb-panel">
          <h3 className="fb-panel-title">Your delivery at a glance</h3>
          <div className="fb-glance">
            {wpm && (
              <div className="fb-glance-row">
                <span className="fb-glance-icon fb-glance-good">
                  <Gauge size={22} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span>
                  <span className="fb-glance-label">Speaking pace</span>
                  <span className="fb-glance-text">
                    About {wpm} words per minute
                  </span>
                </span>
              </div>
            )}
            {notes.pauses && (
              <div className="fb-glance-row">
                <span className="fb-glance-icon fb-glance-warn">
                  <CirclePause size={22} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span>
                  <span className="fb-glance-label">Pauses and flow</span>
                  <span className="fb-glance-text">
                    {firstSentence(notes.pauses)}
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );

  const renderClarity = () => {
    const value = toHundred(average([scores.clarity, scores.structure]));
    const isFocus = opportunity.focus === "shape" && opportunity.title;
    const items = byTab.clarity;
    return (
      <div className="fb-card fb-panel">
        <div className="fb-panel-head">
          <h3 className="fb-panel-title">Clarity and structure</h3>
          {value !== null && (
            <span className={`fb-status fb-status-${toneFor(value)}`}>
              {value}/100
            </span>
          )}
        </div>
        <p className="fb-panel-sub">
          {isFocus
            ? "Your main improvement area"
            : "How easy your answer was to follow"}
        </p>
        {isFocus && <p className="fb-panel-headline">{opportunity.title}</p>}
        {[notes.structure, notes.clarity].filter(Boolean).map((n, i) => (
          <p key={i} className="fb-panel-text">
            {n}
          </p>
        ))}
        {renderFindings(items)}
        {isFocus &&
          !items.some(({ c }) => c.better || c.tryItYourself) &&
          opportunity.technique && (
            <div className="fb-box fb-box-good">
              <p className="fb-box-label">How to improve</p>
              <p className="fb-box-text">{opportunity.technique}</p>
            </div>
          )}
        {analysis.clearerVersion && (
          <div className="fb-box">
            <p className="fb-eyebrow">One clearer way to say it</p>
            <p className="fb-box-text">{analysis.clearerVersion}</p>
            <p className="fb-footnote">
              One possible version in your own voice, not the only correct
              answer.
            </p>
          </div>
        )}
        {transcriptToggle("View full transcript")}
      </div>
    );
  };

  const renderDelivery = () => {
    const deliveryTip =
      byTab.delivery
        .map(({ c }) => c.tryItYourself || c.better)
        .find(Boolean) ||
      (opportunity.focus === "deliver" ? opportunity.technique : "");
    return (
      <div className="fb-card fb-panel">
        <div className="fb-panel-head">
          <h3 className="fb-panel-title">Delivery</h3>
          {wpm && <span className="fb-status fb-status-good">{wpm} wpm</span>}
        </div>
        <p className="fb-panel-text">
          {wpm
            ? `Your pace was measured at approximately ${wpm} words per minute${
                recordingSeconds
                  ? ` across ${longDuration(recordingSeconds)}`
                  : ""
              }.`
            : metrics.paceNote || "We couldn't measure your pace this time."}
        </p>
        <div className="fb-box">
          <p className="fb-box-head">
            <Gauge
              size={18}
              strokeWidth={1.8}
              aria-hidden="true"
              className="fb-icon-good"
            />
            Pace{wpm ? ` · ${wpm} words/min` : ""}
          </p>
          <p className="fb-box-text">
            {notes.pace || metrics.paceNote || "No notes for pace."}
          </p>
        </div>
        <div className="fb-box">
          <p className="fb-box-head">
            <CirclePause
              size={18}
              strokeWidth={1.8}
              aria-hidden="true"
              className="fb-icon-warn"
            />
            Pauses
            {(pauses.long || 0) + (pauses.veryLong || 0) > 0 && (
              <span className="fb-box-count">
                longest {pauses.longestSeconds}s
              </span>
            )}
          </p>
          <p className="fb-box-text">
            {notes.pauses || "No notes for pauses."}
          </p>
        </div>
        {renderFindings(byTab.delivery.filter(({ c }) => c.original))}
        {deliveryTip && (
          <div className="fb-box fb-box-good">
            <p className="fb-box-label">Try this</p>
            <p className="fb-box-text">{deliveryTip}</p>
          </div>
        )}
      </div>
    );
  };

  const renderFillers = () => {
    const repScore = scores.repetition;
    const clean = fillers.total === 0 && crutchPhrases.length === 0;
    const repOk = !isScore(repScore) || repScore >= 8;
    const status =
      clean && repOk
        ? { label: "Clean", tone: "good" }
        : fillers.total <= 2 && (!isScore(repScore) || repScore >= 7)
          ? { label: "Mostly clear", tone: "good" }
          : { label: "Needs work", tone: "warn" };
    const repeated = byTab.fillers.filter(
      ({ c }) => c.criterion === "repetition",
    );
    const fillerFindings = byTab.fillers.filter(
      ({ c }) => c.criterion !== "repetition",
    );
    return (
      <div className="fb-card fb-panel">
        <div className="fb-panel-head">
          <h3 className="fb-panel-title">Fillers and repetition</h3>
          <span className={`fb-status fb-status-${status.tone}`}>
            {status.label}
          </span>
        </div>
        {notes.fillers && <p className="fb-panel-text">{notes.fillers}</p>}

        {Object.entries(fillers.breakdown || {}).map(([word, count]) => (
          <div key={`f-${word}`} className="fb-box">
            <p className="fb-eyebrow">Filler word</p>
            <p className="fb-quote-row">
              <span className="fb-quote">“{word}”</span>
              <span className="fb-count">
                {count} {count === 1 ? "occurrence" : "occurrences"}
              </span>
            </p>
          </div>
        ))}

        {crutchPhrases.map((p) => (
          <div key={`p-${p.phrase}`} className="fb-box">
            <p className="fb-eyebrow">Filler phrase</p>
            <p className="fb-quote-row">
              <span className="fb-quote">“{p.phrase}”</span>
              <span className="fb-count">
                {p.count} {p.count === 1 ? "occurrence" : "occurrences"}
              </span>
            </p>
          </div>
        ))}

        {fillerFindings.map(({ c, i }) => (
          <div
            key={i}
            id={`fb-c-${i}`}
            className={`fb-box ${activeId === i ? "fb-finding-active" : ""}`}
          >
            <p className="fb-eyebrow">Filler pattern</p>
            {c.original && <p className="fb-quote">“{c.original}”</p>}
            <p className="fb-box-text">{c.why}</p>
          </div>
        ))}

        {repeated.map(({ c, i }) => (
          <div
            key={i}
            id={`fb-c-${i}`}
            className={`fb-box ${activeId === i ? "fb-finding-active" : ""}`}
          >
            <p className="fb-eyebrow">Repeated idea</p>
            {c.original && <p className="fb-quote">“{c.original}”</p>}
            <p className="fb-box-text">{c.why}</p>
            {c.better && (
              <p className="fb-box-text fb-good-text">Try: “{c.better}”</p>
            )}
          </div>
        ))}

        {(repetition.frequentWords || []).length > 0 && (
          <div className="fb-box">
            <p className="fb-eyebrow">Words you used most</p>
            <p className="fb-box-text">
              {repetition.frequentWords
                .map((w) => `${w.word} ×${w.count}`)
                .join(", ")}
            </p>
          </div>
        )}

        {notes.repetition && !repeated.length && (
          <p className="fb-panel-text">{notes.repetition}</p>
        )}

        {transcriptToggle("View highlighted transcript", true)}
      </div>
    );
  };

  const renderGrammar = () => {
    const g = scores.grammar;
    const status = !isScore(g)
      ? null
      : g >= 8
        ? { label: "Mostly clear", tone: "good" }
        : g >= 5
          ? { label: "Some slips", tone: "warn" }
          : { label: "Needs work", tone: "warn" };
    const items = byTab.grammar;
    const genuine = items.filter(({ c }) => c.type === "genuine_error");
    return (
      <div className="fb-card fb-panel">
        <div className="fb-panel-head">
          <h3 className="fb-panel-title">Grammar and wording</h3>
          {status && (
            <span className={`fb-status fb-status-${status.tone}`}>
              {status.label}
            </span>
          )}
        </div>
        <div className={`fb-box ${genuine.length ? "" : "fb-box-good"}`}>
          <p className="fb-box-title">
            {genuine.length
              ? `${genuine.length} ${genuine.length === 1 ? "error" : "errors"} to fix`
              : "Your meaning came through"}
          </p>
          {notes.grammar && <p className="fb-box-text">{notes.grammar}</p>}
          {notes.vocabulary && (
            <p className="fb-box-text">{notes.vocabulary}</p>
          )}
        </div>
        {items.map(({ c, i }) => (
          <div
            key={i}
            id={`fb-c-${i}`}
            className={`fb-box ${activeId === i ? "fb-finding-active" : ""}`}
          >
            <p className="fb-eyebrow">{TYPE_LABEL[c.type] || "Observation"}</p>
            {c.original && <p className="fb-quote">“{c.original}”</p>}
            {c.better && (
              <>
                <hr className="fb-divider" />
                <p className="fb-box-label">A clearer version</p>
                <p className="fb-quote fb-quote-soft">“{c.better}”</p>
              </>
            )}
            <p className="fb-box-text">{c.why}</p>
            {c.tryItYourself && (
              <p className="fb-box-text fb-good-text">{c.tryItYourself}</p>
            )}
          </div>
        ))}
        {items.length > 0 && !genuine.length && (
          <p className="fb-footnote">
            These are wording suggestions, not grammar corrections.
          </p>
        )}
        {transcriptToggle("View full transcript")}
      </div>
    );
  };

  const practiceText =
    nextSkill.action ||
    analysis.topTip ||
    opportunity.technique ||
    "Answer the same question again and use what you learned here.";

  return (
    <div className="page session-page fb-page">
      {/* Header */}
      <header className="fb-header">
        <p className="fb-kicker">Practice review · Completed</p>
        <h1 className="fb-title">Here's how you did.</h1>
        {topic && <p className="fb-topic">{topic}</p>}
      </header>

      {/* Overall score */}
      <section className="fb-score-card">
        <div className="fb-score-top">
          <ScoreRing value={overall} />
          <div className="fb-score-copy">
            <p className="fb-score-kicker">Overall speaking score</p>
            <p className="fb-score-verdict">{verdictFor(overall)}</p>
            {analysis.summary && (
              <p className="fb-score-summary">{analysis.summary}</p>
            )}
          </div>
        </div>
        <div className="fb-score-stats">
          <div className="fb-score-stat">
            <span className="fb-score-stat-label">Recording</span>
            <span className="fb-score-stat-value">
              {recordingSeconds ? longDuration(recordingSeconds) : "–"}
            </span>
          </div>
          <div className="fb-score-stat">
            <span className="fb-score-stat-label">Words spoken</span>
            <span className="fb-score-stat-value">
              {metrics.wordCount > 0 ? `${metrics.wordCount} words` : "–"}
            </span>
          </div>
          <button type="button" className="fb-share-btn" onClick={share}>
            <Share2 size={16} strokeWidth={2} aria-hidden="true" />
            {shareState || "Share"}
          </button>
        </div>
      </section>

      {/* Recording playback */}
      <section className="fb-section">
        <h2 className="fb-heading">Listen to your recording</h2>
        <p className="fb-subheading">
          Hear how you sounded before you explore the feedback.
        </p>
        <RecordingPlayer src={playbackUrl} fallbackSeconds={recordingSeconds} />
      </section>

      {/* Tabs */}
      <section className="fb-section" id="fb-explore">
        <h2 className="fb-heading">Explore your feedback</h2>
        <p className="fb-subheading">
          Choose an area to see specific observations from your response.
        </p>
        <div className="fb-tabs" role="tablist" aria-label="Feedback areas">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`fb-tab ${tab === t.id ? "fb-tab-active" : ""}`}
              onClick={() => openTab(t.id, false)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="fb-tab-panel" role="tabpanel" key={tab}>
          {tab === "overview" && renderOverview()}
          {tab === "clarity" && renderClarity()}
          {tab === "delivery" && renderDelivery()}
          {tab === "fillers" && renderFillers()}
          {tab === "grammar" && renderGrammar()}
        </div>
      </section>

      {/* Next step */}
      <section className="fb-practice-card">
        <h2 className="fb-practice-title">Put your feedback into practice</h2>
        <p className="fb-practice-text">
          Answer the same question again. {practiceText}
        </p>
        {onTryAgain && (
          <button type="button" className="fb-try-btn" onClick={onTryAgain}>
            Try again
          </button>
        )}
      </section>

      <button type="button" className="fb-secondary-btn" onClick={onDone}>
        {doneLabel}
      </button>
    </div>
  );
}
