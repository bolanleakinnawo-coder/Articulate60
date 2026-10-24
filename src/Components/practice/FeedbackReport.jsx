import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Lightbulb,
  CheckCircle2,
  Target,
  Sparkles,
  SpellCheck,
  BookOpen,
  ListOrdered,
  Eye,
  Repeat,
  Gauge,
  Pause,
  MessageSquareWarning,
} from "lucide-react";
import "./FeedbackReport.css";

// The eight Loquiex criteria, in the required order.
// Five are scored by the AI; pace, pauses and fillers come from measurements.
const CRITERIA = [
  {
    key: "grammar",
    label: "Grammar",
    scored: true,
    icon: SpellCheck,
    definition: "Whether your sentences are built correctly.",
  },
  {
    key: "vocabulary",
    label: "Vocabulary",
    scored: true,
    icon: BookOpen,
    definition: "How well your word choices fit what you wanted to say.",
  },
  {
    key: "structure",
    label: "Structure",
    scored: true,
    icon: ListOrdered,
    definition: "How well your ideas are organised, from opening to close.",
  },
  {
    key: "clarity",
    label: "Clarity",
    scored: true,
    icon: Eye,
    definition: "How easily a listener can follow your point.",
  },
  {
    key: "repetition",
    label: "Repetition",
    scored: true,
    icon: Repeat,
    definition: "Words or ideas you used again and again.",
  },
  {
    key: "pace",
    label: "Pace",
    icon: Gauge,
    definition: "How fast you spoke, in words per minute.",
  },
  {
    key: "pauses",
    label: "Pauses",
    icon: Pause,
    definition: "Silent breaks of a second or more while you spoke.",
  },
  {
    key: "fillers",
    label: "Filler words",
    icon: MessageSquareWarning,
    definition: 'Sounds like "um" and "uh" that fill gaps while you think.',
  },
];

const TYPE_META = {
  genuine_error: { label: "Genuine error", tone: "error" },
  optional_suggestion: { label: "Optional suggestion", tone: "option" },
  observation: { label: "Observation", tone: "observe" },
};

const FOCUS_LABEL = { form: "Form", shape: "Shape", deliver: "Deliver" };

// A missing or invalid score shows as neutral, never as a low score.
function scoreTone(score) {
  if (typeof score !== "number") return "muted";
  if (score >= 8) return "good";
  if (score >= 5) return "ok";
  return "low";
}

function formatSeconds(total) {
  const s = Math.max(0, Math.round(Number(total) || 0));
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

function clock(total) {
  const s = Math.max(0, Math.round(Number(total) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// "after "so", before "I"" for a measured pause or filler.
function around(item) {
  return [
    item.before ? `after "${item.before}"` : "",
    item.after ? `before "${item.after}"` : "",
  ]
    .filter(Boolean)
    .join(", ");
}

// Split the transcript into plain and highlighted pieces. Nothing is removed:
// joining every piece gives back the original transcript exactly.
function buildSegments(transcript, corrections) {
  if (!transcript) return [];
  const lower = transcript.toLowerCase();
  // Only highlight when lowercasing didn't shift character positions.
  const canHighlight = lower.length === transcript.length;

  const ranges = [];
  if (canHighlight) {
    corrections.forEach((c, i) => {
      if (!c.original) return;
      const start = lower.indexOf(c.original.toLowerCase());
      if (start < 0) return;
      ranges.push({ start, end: start + c.original.length, ids: [i] });
    });
  }
  ranges.sort((a, b) => a.start - b.start || b.end - a.end);

  const merged = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r.start < last.end) {
      // Same wording flagged twice: share one highlight. Partial overlaps
      // keep the first highlight; the other correction still shows below.
      if (r.start === last.start && r.end === last.end) last.ids.push(...r.ids);
      continue;
    }
    merged.push({ ...r });
  }

  const segments = [];
  let cursor = 0;
  for (const r of merged) {
    if (r.start > cursor) {
      segments.push({ text: transcript.slice(cursor, r.start) });
    }
    segments.push({ text: transcript.slice(r.start, r.end), ids: r.ids });
    cursor = r.end;
  }
  if (cursor < transcript.length)
    segments.push({ text: transcript.slice(cursor) });
  return segments;
}

function Row({
  id,
  label,
  definition,
  icon: Icon,
  count,
  chip,
  tone,
  open,
  onToggle,
  children,
}) {
  const isOpen = open === id;
  return (
    <div
      className={`fb-row ${isOpen ? "fb-row-open" : ""}`}
      id={`fb-row-${id}`}
    >
      <button
        type="button"
        className="fb-row-head"
        onClick={() => onToggle(id)}
        aria-expanded={isOpen}
      >
        {Icon && (
          <span className="fb-row-icon" aria-hidden="true">
            <Icon size={20} strokeWidth={1.8} />
          </span>
        )}
        <span className="fb-row-text">
          <span className="fb-row-label">
            {label}
            {count > 0 && (
              <span className="fb-row-count">
                {count} {count === 1 ? "finding" : "findings"}
              </span>
            )}
          </span>
          {definition && <span className="fb-row-def">{definition}</span>}
        </span>
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

function Correction({ c, index, active, setRef }) {
  const meta = TYPE_META[c.type] || TYPE_META.observation;
  return (
    <div
      className={`fb-card fb-correction ${active ? "fb-correction-active" : ""}`}
      id={`fb-c-${index}`}
      ref={setRef}
    >
      <span className={`fb-type fb-type-${meta.tone}`}>{meta.label}</span>
      {c.original && (
        <p className="fb-said">
          <span className="fb-tag">You said</span>
          {c.original}
        </p>
      )}
      {c.better && (
        <p className="fb-better">
          <span className="fb-tag fb-tag-good">Try this</span>
          {c.better}
        </p>
      )}
      <p className="fb-why">
        <span className="fb-tag fb-tag-muted">Why this helps</span>
        {c.why}
      </p>
      {c.tryItYourself && (
        <p className="fb-try">
          <span className="fb-tag fb-tag-muted">Try it yourself</span>
          {c.tryItYourself}
        </p>
      )}
    </div>
  );
}

function PaceGauge({ wpm, label }) {
  // Neutral scale: a marker on a track, not a pass/fail band.
  const MIN = 60;
  const MAX = 220;
  const pct = Math.min(100, Math.max(0, ((wpm - MIN) / (MAX - MIN)) * 100));
  return (
    <div className="fb-viz">
      <div className="fb-viz-head">
        <span className="fb-viz-title">Your pace</span>
        <span className="fb-viz-value">{wpm} words per minute</span>
      </div>
      <div
        className="fb-gauge"
        role="img"
        aria-label={`${wpm} words per minute, ${label || "measured"}`}
      >
        <span className="fb-gauge-marker" style={{ left: `${pct}%` }} />
      </div>
      <div className="fb-gauge-scale" aria-hidden="true">
        <span>Slower</span>
        <span>Faster</span>
      </div>
      <p className="fb-viz-caption">
        Measured from your recording. It's a guide, not a pass mark: what
        matters is whether it helps your listener follow you.
      </p>
    </div>
  );
}

function PauseTimeline({ pauses, speakingSeconds }) {
  // "all" holds every listed pause in time order; older saved reports only have "longest".
  const items =
    (pauses.all && pauses.all.length ? pauses.all : pauses.longest) || [];
  const end = Math.max(
    Number(speakingSeconds) || 0,
    ...items.map((p) => p.atSecond + p.seconds),
    1,
  );
  return (
    <div className="fb-viz">
      <div className="fb-viz-head">
        <span className="fb-viz-title">Where you paused</span>
        <span className="fb-viz-value">longest {pauses.longestSeconds}s</span>
      </div>
      <div
        className="fb-timeline"
        role="img"
        aria-label="Timeline of your pauses"
      >
        {items.map((p, i) => (
          <span
            key={i}
            className="fb-timeline-mark"
            style={{
              left: `${Math.min(98, (p.atSecond / end) * 100)}%`,
              width: `${Math.max(1.5, (p.seconds / end) * 100)}%`,
            }}
            title={`${p.seconds}s at ${clock(p.atSecond)}`}
          />
        ))}
      </div>
      <div className="fb-gauge-scale" aria-hidden="true">
        <span>0:00</span>
        <span>{clock(end)}</span>
      </div>
      <div className="fb-stats">
        {items.map((p, i) => (
          <Stat
            key={i}
            label={`${clock(p.atSecond)} · ${p.seconds}s`}
            value={around(p) || "in your recording"}
          />
        ))}
      </div>
      <p className="fb-viz-caption">
        Pauses of a second or more, measured from your recording. Pauses aren't
        mistakes; look at whether they gave you thinking time or interrupted an
        idea.
      </p>
    </div>
  );
}

export default function FeedbackReport({
  report,
  topic,
  audioUrl,
  onDone,
  doneLabel = "Back to home",
}) {
  const { transcript = "", metrics = {}, analysis = {} } = report || {};
  // The server also sends the recording address with the report.
  const playbackUrl = audioUrl || report?.audioUrl;
  const scores = analysis.scores || {};
  const notes = analysis.notes || {};
  const corrections = useMemo(
    () => (Array.isArray(analysis.corrections) ? analysis.corrections : []),
    [analysis.corrections],
  );
  const opportunity = analysis.biggestOpportunity;
  const hasOpportunity = Boolean(opportunity && opportunity.title);
  const nextSkill = analysis.nextSkill;
  const hasNextSkill = Boolean(
    nextSkill && (nextSkill.name || nextSkill.action),
  );

  const [open, setOpen] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const correctionRefs = useRef({});
  const toggle = (id) => setOpen((current) => (current === id ? null : id));

  const fillers = metrics.fillers || { total: 0, breakdown: {}, positions: [] };
  const pauses = metrics.pauses || {
    long: 0,
    veryLong: 0,
    longestSeconds: 0,
    longest: [],
  };
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

  const segments = useMemo(
    () => buildSegments(transcript, corrections),
    [transcript, corrections],
  );

  // Corrections grouped by criterion. Reports saved before the update have no
  // "criterion", so those fall into one general list further down.
  const byCriterion = {};
  const legacy = [];
  corrections.forEach((c, i) => {
    if (c.criterion && CRITERIA.some((k) => k.key === c.criterion)) {
      (byCriterion[c.criterion] ||= []).push({ c, i });
    } else {
      legacy.push({ c, i });
    }
  });

  // Tapping a highlight opens its criterion row and scrolls to the correction.
  const jumpToCorrection = (id) => {
    const c = corrections[id];
    if (c?.criterion) setOpen(c.criterion);
    setActiveId(id);
  };

  useEffect(() => {
    if (activeId === null) return;
    const el =
      correctionRefs.current[activeId] ||
      document.getElementById(`fb-c-${activeId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeId, open]);

  // Pace, pauses and fillers are shown as plain measurements with a neutral
  // look. Whether they help or hurt this answer is the coach's note to explain.
  const chipFor = (key) => {
    if (CRITERIA.find((k) => k.key === key)?.scored) {
      const score = scores[key];
      return {
        chip: typeof score === "number" ? `${score}/10` : "–",
        tone: scoreTone(score),
      };
    }
    if (key === "pace") {
      return {
        chip: metrics.wordsPerMinute ? `${metrics.wordsPerMinute} wpm` : "–",
        tone: "muted",
      };
    }
    if (key === "pauses") {
      return {
        chip:
          totalPauses > 0
            ? `${totalPauses} ${totalPauses === 1 ? "pause" : "pauses"}`
            : "none",
        tone: "muted",
      };
    }
    return {
      chip: fillers.total > 0 ? `${fillers.total} heard` : "none",
      tone: "muted",
    };
  };

  const noteFor = (key) => {
    if (notes[key]) return notes[key];
    if (key === "pace" && metrics.paceNote) return metrics.paceNote;
    return "No notes for this one.";
  };

  const showPaceViz =
    Number.isFinite(metrics.wordsPerMinute) && metrics.wordsPerMinute > 0;
  const showPauseViz =
    (pauses.longest || []).length > 0 && metrics.speakingSeconds > 0;

  return (
    <div className="page session-page fb-page">
      {/* 1. Introduction */}
      <div className="fb-hero">
        <CheckCircle2 size={44} strokeWidth={2} aria-hidden="true" />
        <h1 className="fb-title">Your feedback is ready</h1>
        <p className="fb-intro">
          Let's look at what you can improve and find one thing to work on in
          your next practice.
        </p>
        {topic && <p className="fb-topic">{topic}</p>}
        {analysis.summary && <p className="fb-summary">{analysis.summary}</p>}
      </div>

      {/* 2. Recording and recording information */}
      <section className="fb-section">
        <h2 className="fb-heading">Your recording</h2>
        <div className="fb-card fb-recording">
          {playbackUrl && (
            <audio
              className="fb-audio"
              controls
              preload="metadata"
              src={playbackUrl}
            >
              Your browser can't play this recording.
            </audio>
          )}
          <div className="fb-stats">
            {metrics.speakingSeconds > 0 && (
              <Stat
                label="Speaking time"
                value={formatSeconds(metrics.speakingSeconds)}
              />
            )}
            {metrics.wordCount > 0 && (
              <Stat label="Words spoken" value={metrics.wordCount} />
            )}
            {metrics.wordsPerMinute ? (
              <Stat label="Pace" value={`${metrics.wordsPerMinute} wpm`} />
            ) : null}
          </div>
        </div>
      </section>

      {/* 3. Biggest opportunity */}
      {hasOpportunity && (
        <section className="fb-section">
          <h2 className="fb-heading">Your biggest opportunity</h2>
          <div className="fb-card fb-opportunity">
            <div className="fb-opp-top">
              <Target size={20} strokeWidth={1.8} aria-hidden="true" />
              <p className="fb-opp-title">{opportunity.title}</p>
              {FOCUS_LABEL[opportunity.focus] && (
                <span className="fb-focus">
                  {FOCUS_LABEL[opportunity.focus]}
                </span>
              )}
            </div>
            {opportunity.evidence && (
              <p className="fb-opp-block">
                <span className="fb-tag fb-tag-muted">What we noticed</span>
                {opportunity.evidence}
              </p>
            )}
            {opportunity.whyItMatters && (
              <p className="fb-opp-block">
                <span className="fb-tag fb-tag-muted">Why it matters</span>
                {opportunity.whyItMatters}
              </p>
            )}
            {opportunity.technique && (
              <p className="fb-opp-block fb-opp-technique">
                <span className="fb-tag fb-tag-good">Try this</span>
                {opportunity.technique}
              </p>
            )}
          </div>
        </section>
      )}

      {/* 4. Complete transcript with linked highlights */}
      <section className="fb-section">
        <h2 className="fb-heading">Your transcript</h2>
        <div className="fb-card fb-transcript">
          {segments.map((seg, i) =>
            seg.ids ? (
              <button
                key={i}
                type="button"
                className={`fb-mark ${seg.ids.includes(activeId) ? "fb-mark-active" : ""}`}
                onClick={() => jumpToCorrection(seg.ids[0])}
                aria-label={`See feedback on: ${seg.text}`}
              >
                {seg.text}
              </button>
            ) : (
              <span key={i}>{seg.text}</span>
            ),
          )}
        </div>
        {segments.some((s) => s.ids) && (
          <p className="fb-hint">
            Tap a highlighted phrase to see its feedback.
          </p>
        )}
        {analysis.evidenceNote && (
          <p className="fb-hint">{analysis.evidenceNote}</p>
        )}
      </section>

      {/* 5. All eight criteria, in order */}
      <section className="fb-section">
        <h2 className="fb-heading">Explore your feedback</h2>
        <div className="fb-card fb-rows">
          {CRITERIA.map(({ key, label, icon, definition }) => {
            const { chip, tone } = chipFor(key);
            const items = byCriterion[key] || [];
            return (
              <Row
                key={key}
                id={key}
                label={label}
                definition={definition}
                icon={icon}
                count={items.length}
                chip={chip}
                tone={tone}
                open={open}S
                onToggle={toggle}
              >
                <p className="fb-note">{noteFor(key)}</p>

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

                {key === "pace" && showPaceViz && (
                  <PaceGauge
                    wpm={metrics.wordsPerMinute}
                    label={metrics.paceLabel}
                  />
                )}

                {key === "pauses" && (
                  <>
                    <div className="fb-stats">
                      <Stat
                        label="Pauses of 1s or more"
                        value={
                          totalPauses > 0
                            ? `${totalPauses} (longest ${pauses.longestSeconds}s)`
                            : "none"
                        }
                      />
                    </div>
                    {showPauseViz && (
                      <PauseTimeline
                        pauses={pauses}
                        speakingSeconds={metrics.speakingSeconds}
                      />
                    )}
                  </>
                )}

                {key === "fillers" && (
                  <>
                    <div className="fb-stats">
                      <Stat
                        label="Filler sounds"
                        value={`${fillers.total} (${fillerText})`}
                      />
                      {(metrics.crutchPhrases || []).length > 0 && (
                        <Stat
                          label="Phrases used more than once"
                          value={metrics.crutchPhrases
                            .map((c) => `${c.phrase} ×${c.count}`)
                            .join(", ")}
                        />
                      )}
                    </div>
                    {(fillers.positions || []).length > 0 && (
                      <div className="fb-stats">
                        {fillers.positions.slice(0, 8).map((f, i) => (
                          <Stat
                            key={i}
                            label={`${clock(f.atSecond)} · ${f.word}`}
                            value={around(f) || "in your recording"}
                          />
                        ))}
                      </div>
                    )}
                    {(fillers.positions || []).length > 8 && (
                      <p className="fb-hint">
                        Showing the first 8 of {fillers.positions.length}.
                      </p>
                    )}
                  </>
                )}

                {items.length > 0 && (
                  <div className="fb-corrections">
                    {items.map(({ c, i }) => (
                      <Correction
                        key={i}
                        c={c}
                        index={i}
                        active={activeId === i}
                        setRef={(el) => {
                          correctionRefs.current[i] = el;
                        }}
                      />
                    ))}
                  </div>
                )}
              </Row>
            );
          })}
        </div>
      </section>

      {/* Reports saved before the criteria update still show their corrections */}
      {legacy.length > 0 && (
        <section className="fb-section">
          <h2 className="fb-heading">Corrections</h2>
          <div className="fb-corrections">
            {legacy.map(({ c, i }) => (
              <Correction
                key={i}
                c={c}
                index={i}
                active={activeId === i}
                setRef={(el) => {
                  correctionRefs.current[i] = el;
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* 7. Optional clearer version */}
      {analysis.clearerVersion && (
        <section className="fb-section">
          <h2 className="fb-heading">A clearer version</h2>
          <div className="fb-card fb-clearer">
            <Sparkles
              size={18}
              strokeWidth={1.8}
              aria-hidden="true"
              className="fb-clearer-icon"
            />
            <div>
              <p className="fb-clearer-text">{analysis.clearerVersion}</p>
              <p className="fb-hint">
                This is one possible way to say it in your own voice, not the
                only correct answer.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 8. One skill to practise next */}
      {(hasNextSkill || analysis.topTip) && (
        <section className="fb-section">
          <div className="fb-card fb-tip">
            <Lightbulb size={20} strokeWidth={1.8} aria-hidden="true" />
            <div>
              <p className="fb-tip-title">Practise next</p>
              {hasNextSkill ? (
                <>
                  {nextSkill.name && (
                    <p className="fb-skill-name">{nextSkill.name}</p>
                  )}
                  {nextSkill.reason && (
                    <p className="fb-tip-reason">{nextSkill.reason}</p>
                  )}
                  {nextSkill.action && (
                    <p className="fb-tip-text">{nextSkill.action}</p>
                  )}
                </>
              ) : (
                <p className="fb-tip-text">{analysis.topTip}</p>
              )}
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
