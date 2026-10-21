import { useState } from "react";
import { ChevronDown, Lightbulb, CheckCircle2 } from "lucide-react";
import "./FeedbackReport.css";

// Order matches the feedback screen: Grammar, Vocabulary, Structure,
// Clarity, Repetition, then Pace (measured by code, not by the AI).
const SCORE_ROWS = [
  { key: "grammar", label: "Grammar" },
  { key: "vocabulary", label: "Vocabulary" },
  { key: "structure", label: "Structure" },
  { key: "clarity", label: "Clarity" },
  { key: "repetition", label: "Repetition" },
];

function scoreTone(score) {
  if (score >= 8) return "good";
  if (score >= 5) return "ok";
  return "low";
}

function paceTone(label) {
  if (label === "good") return "good";
  if (label === "slow" || label === "fast") return "ok";
  return "muted";
}

function Row({ id, label, chip, tone, open, onToggle, children }) {
  const isOpen = open === id;
  return (
    <div className={`fb-row ${isOpen ? "fb-row-open" : ""}`}>
      <button
        type="button"
        className="fb-row-head"
        onClick={() => onToggle(id)}
        aria-expanded={isOpen}
      >
        <span className="fb-row-label">{label}</span>
        <span className={`fb-chip fb-chip-${tone}`}>{chip}</span>
        <ChevronDown size={18} className="fb-chevron" aria-hidden="true" />
      </button>
      {isOpen && <div className="fb-row-body">{children}</div>}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="fb-stat">
      <span className="fb-stat-label">{label}</span>
      <span className="fb-stat-value">{value}</span>
    </div>
  );
}

export default function FeedbackReport({
  report,
  topic,
  onDone,
  doneLabel = "Back to home",
}) {
  const { transcript = "", metrics = {}, analysis = {} } = report || {};
  const scores = analysis.scores || {};
  const notes = analysis.notes || {};
  const corrections = analysis.corrections || [];

  const [open, setOpen] = useState("grammar");
  const toggle = (id) => setOpen((current) => (current === id ? null : id));

  const fillers = metrics.fillers || { total: 0, breakdown: {} };
  const pauses = metrics.pauses || { long: 0, veryLong: 0, longestSeconds: 0 };
  const repetition = metrics.repetition || {
    immediateRepeats: 0,
    examples: [],
    frequentWords: [],
  };
  const fillerText =
    Object.entries(fillers.breakdown || {})
      .map(([word, count]) => `${word} ×${count}`)
      .join(", ") || "none";
  const totalPauses = (pauses.long || 0) + (pauses.veryLong || 0);

  return (
    <div className="page session-page fb-page">
      <div className="fb-hero">
        <CheckCircle2 size={44} strokeWidth={2} aria-hidden="true" />
        <h1 className="fb-title">Your feedback is ready</h1>
        {topic && <p className="fb-topic">{topic}</p>}
        {analysis.summary && <p className="fb-summary">{analysis.summary}</p>}
      </div>

      <section className="fb-section">
        <h2 className="fb-heading">Your transcript</h2>
        <div className="fb-card fb-transcript">{transcript}</div>
      </section>

      <section className="fb-section">
        <h2 className="fb-heading">Explore your feedback</h2>
        <div className="fb-card fb-rows">
          {SCORE_ROWS.map(({ key, label }) => (
            <Row
              key={key}
              id={key}
              label={label}
              chip={`${scores[key] ?? "–"}/10`}
              tone={scoreTone(scores[key])}
              open={open}
              onToggle={toggle}
            >
              <p className="fb-note">
                {notes[key] || "No notes for this one."}
              </p>

              {key === "repetition" &&
                (repetition.frequentWords.length > 0 ||
                  repetition.immediateRepeats > 0) && (
                  <div className="fb-stats">
                    {repetition.frequentWords.length > 0 && (
                      <Stat
                        label="Words you repeated"
                        value={repetition.frequentWords
                          .map((w) => `${w.word} ×${w.count}`)
                          .join(", ")}
                      />
                    )}
                    {repetition.immediateRepeats > 0 && (
                      <Stat
                        label="Back-to-back repeats"
                        value={repetition.examples.join(", ")}
                      />
                    )}
                  </div>
                )}
            </Row>
          ))}

          <Row
            id="pace"
            label="Pace"
            chip={
              metrics.wordsPerMinute ? `${metrics.wordsPerMinute} wpm` : "–"
            }
            tone={paceTone(metrics.paceLabel)}
            open={open}
            onToggle={toggle}
          >
            <p className="fb-note">{metrics.paceNote}</p>
            <div className="fb-stats">
              <Stat
                label="Filler sounds"
                value={`${fillers.total} (${fillerText})`}
              />
              <Stat
                label="Long pauses"
                value={
                  totalPauses > 0
                    ? `${totalPauses} (longest ${pauses.longestSeconds}s)`
                    : "none"
                }
              />
              {(metrics.crutchPhrases || []).length > 0 && (
                <Stat
                  label="Phrases you leaned on"
                  value={metrics.crutchPhrases
                    .map((c) => `${c.phrase} ×${c.count}`)
                    .join(", ")}
                />
              )}
            </div>
          </Row>
        </div>
      </section>

      {corrections.length > 0 && (
        <section className="fb-section">
          <h2 className="fb-heading">Corrections</h2>
          <div className="fb-corrections">
            {corrections.map((c, i) => (
              <div className="fb-card fb-correction" key={i}>
                <p className="fb-said">
                  <span className="fb-tag">You said</span>
                  {c.original}
                </p>
                <p className="fb-better">
                  <span className="fb-tag fb-tag-good">Try</span>
                  {c.better}
                </p>
                <p className="fb-why">{c.why}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {analysis.topTip && (
        <section className="fb-section">
          <div className="fb-card fb-tip">
            <Lightbulb size={20} strokeWidth={1.8} aria-hidden="true" />
            <div>
              <p className="fb-tip-title">For next time</p>
              <p className="fb-tip-text">{analysis.topTip}</p>
            </div>
          </div>
        </section>
      )}

      <button className="spin-jar-btn fb-done" onClick={onDone}>
        {doneLabel}
      </button>
    </div>
  );
}
