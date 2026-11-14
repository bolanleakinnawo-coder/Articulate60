import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  MessageSquareText,
  Mic,
  Pause,
  Play,
  Plus,
  Sparkles,
} from "lucide-react";

const PAGE_SIZE = 20;

const SORTS = [
  ["recent", "Recent"],
  ["oldest", "Oldest"],
];

const FILTERS = [
  ["all", "All"],
  ["speaking", "Speaking"],
  ["vocabulary", "Vocabulary"],
];

// Practice-count milestones (the first three match Your Stats).
const MILESTONES = [10, 50, 100, 250, 500, 1000];

function nextMilestone(total) {
  const goal =
    MILESTONES.find((m) => m > total) ?? (Math.floor(total / 500) + 1) * 500;
  const prev =
    goal > 1000
      ? goal - 500
      : ([...MILESTONES].reverse().find((m) => m < goal) ?? 0);
  return { goal, prev, left: goal - total };
}

// "Your Practices" page: the user's real recordings, newest first by default.
// Vocabulary = Word of the Day practices; Speaking = every other prompt.
// Profile keeps `recordings` fresh (on open and whenever the app regains focus).
export default function ProfilePractices({
  recordings,
  analysingId,
  analysisError,
  onOpenFeedback,
  onGetFeedback,
  onBack,
  onStart,
}) {
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("recent");
  const [sortOpen, setSortOpen] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);

  // Stop playback when leaving the page.
  useEffect(
    () => () => {
      audioRef.current?.pause();
    },
    [],
  );

  const total = recordings.length;
  const yapCount = recordings.filter((r) => r.category === "Yap Mode").length;
  const vocabCount = recordings.filter((r) => r.isWordOfTheDay).length;
  const promptCount = Math.max(0, total - yapCount - vocabCount);
  const milestone = nextMilestone(total);
  const ringPct = Math.max(
    0,
    Math.min(
      100,
      ((total - milestone.prev) / (milestone.goal - milestone.prev)) * 100,
    ),
  );

  const filtered = recordings
    .filter((r) =>
      filter === "all"
        ? true
        : filter === "vocabulary"
          ? r.isWordOfTheDay
          : !r.isWordOfTheDay,
    )
    .sort((a, b) => {
      const diff = new Date(b.createdAt) - new Date(a.createdAt);
      return sort === "recent" ? diff : -diff;
    });
  const shown = filtered.slice(0, visible);

  const togglePlay = (r) => {
    if (!r.audioUrl) return;
    if (playingId === r._id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(r.audioUrl);
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => setPlayingId(null);
    audioRef.current = audio;
    audio.play().then(
      () => setPlayingId(r._id),
      () => setPlayingId(null),
    );
  };

  const smallCards = [
    { key: "yap", icon: Mic, value: yapCount, label: "Yap mode" },
    {
      key: "vocab",
      icon: BookOpen,
      value: vocabCount,
      label: "Vocabulary",
    },
    {
      key: "prompts",
      icon: MessageSquareText,
      value: promptCount,
      label: "Prompts & research",
    },
  ];

  return (
    <div className="profile-content pf-practices-page">
      <button className="pf-back pf-back-link" onClick={onBack}>
        <ChevronLeft size={18} /> Your Profile
      </button>

      <header className="pf-page-header">
        <h1>Your Practices</h1>
        <p>Revisit your speaking sessions and your feedback.</p>
      </header>

      <section className="pf-bento" aria-label="Your practice counts">
        <div className="pf-bento-big">
          <p className="pf-bento-kicker">Next milestone</p>
          <p className="pf-bento-goal">{milestone.goal} practices</p>
          <div
            className="pf-ring"
            style={{ "--pct": ringPct }}
            role="img"
            aria-label={`${milestone.left} recordings left to reach ${milestone.goal} practices`}
          >
            <span className="pf-ring-inner">
              <strong>{milestone.left}</strong>
              <span>{milestone.left === 1 ? "recording left" : "recordings left"}</span>
            </span>
          </div>
          <p className="pf-bento-foot">
            {total.toLocaleString()} of {milestone.goal.toLocaleString()} done
          </p>
        </div>
        {smallCards.map(({ key, icon: Icon, value, label }) => (
          <div className="pf-bento-small" key={key}>
            <Icon size={20} className="pf-bento-icon" aria-hidden="true" />
            <span className="pf-bento-small-text">
              <strong>{value.toLocaleString()}</strong>
              <span>{label}</span>
            </span>
          </div>
        ))}
      </section>

      <div className="pf-stats-head">
        <h2>Practice history</h2>
        <span className="pf-history-count">
          {shown.length} shown
          {filtered.length > shown.length ? ` of ${filtered.length}` : ""}
        </span>
      </div>

      <div className="pf-chips pf-chips-sm" role="tablist">
        {FILTERS.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={filter === key}
            className={filter === key ? "is-active" : ""}
            onClick={() => {
              setFilter(key);
              setVisible(PAGE_SIZE);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="pf-sort">
        <span id="pf-sort-label">Sort by</span>
        <div className="pf-select">
          <button
            type="button"
            className="pf-select-button"
            aria-haspopup="listbox"
            aria-expanded={sortOpen}
            aria-labelledby="pf-sort-label"
            onClick={() => setSortOpen((open) => !open)}
          >
            {SORTS.find(([key]) => key === sort)[1]}
            <ChevronDown size={18} aria-hidden="true" />
          </button>
          {sortOpen && (
            <>
              <div
                className="pf-select-backdrop"
                onClick={() => setSortOpen(false)}
              />
              <ul className="pf-select-menu" role="listbox">
                {SORTS.map(([key, label]) => (
                  <li key={key}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={sort === key}
                      onClick={() => {
                        setSort(key);
                        setSortOpen(false);
                      }}
                    >
                      <Check
                        size={16}
                        style={{ visibility: sort === key ? "visible" : "hidden" }}
                      />
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {analysisError && <p className="form-error">{analysisError}</p>}

      {filtered.length === 0 ? (
        <div className="pf-panel pf-history-empty">
          <p className="pf-panel-title">
            {recordings.length === 0
              ? "No practices yet"
              : filter === "vocabulary"
                ? "No vocabulary practices yet"
                : "No speaking practices yet"}
          </p>
          <p className="pf-panel-text">
            {filter === "vocabulary"
              ? "Practise the Word of the Day and it will show up here."
              : "Your recordings and feedback will appear here after your first practice."}
          </p>
        </div>
      ) : (
        <div className="pf-practice-cards">
          {shown.map((r) => {
            const hasFeedback = r.analysisStatus === "done" && r.analysis;
            const isAnalysing = analysingId === r._id;
            const isPlaying = playingId === r._id;
            const meta = [
              r.category || (r.isWordOfTheDay ? "Word of the Day" : ""),
              r.level ? `Level ${r.level}` : "",
              r.durationSeconds ? formatDuration(r.durationSeconds) : "",
            ].filter(Boolean);
            return (
              <article className="pf-practice-card" key={r._id}>
                <div className="pf-practice-card-text">
                  <p className="pf-practice-card-date">{formatWhen(r.createdAt)}</p>
                  <h3 className="pf-practice-card-title">
                    {r.topic || "Practice session"}
                  </h3>
                  {meta.length > 0 && (
                    <p className="pf-practice-card-meta">{meta.join(" · ")}</p>
                  )}
                  <button
                    type="button"
                    className="pf-feedback-cta"
                    disabled={isAnalysing}
                    onClick={() =>
                      hasFeedback ? onOpenFeedback(r) : onGetFeedback(r)
                    }
                  >
                    {isAnalysing ? (
                      <>
                        <LoaderCircle size={16} className="pf-spin" /> Getting
                        your feedback…
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        {hasFeedback ? "See your feedback" : "Get your feedback"}
                        <ChevronRight size={16} />
                      </>
                    )}
                  </button>
                </div>
                {r.audioUrl && (
                  <button
                    type="button"
                    className={`pf-play ${isPlaying ? "is-playing" : ""}`}
                    onClick={() => togglePlay(r)}
                    aria-label={isPlaying ? "Pause recording" : "Play recording"}
                  >
                    {isPlaying ? (
                      <Pause size={16} fill="currentColor" />
                    ) : (
                      <Play size={16} fill="currentColor" />
                    )}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}

      {filtered.length > shown.length && (
        <button
          className="pf-outline-button"
          onClick={() => setVisible((v) => v + PAGE_SIZE)}
        >
          Show more
        </button>
      )}

      <button className="pf-outline-button" onClick={onStart}>
        <Plus size={18} /> Start a new practice
      </button>
    </div>
  );
}

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m} min ${s}s` : `${m} min`;
}

// "Thu, 29 Oct 2026 · 3:47 pm" (12-hour clock)
function formatWhen(date) {
  if (!date) return "";
  const d = new Date(date);
  const weekday = d.toLocaleDateString("en-GB", { weekday: "short" });
  const day = d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const time = d
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase();
  return `${weekday}, ${day} · ${time}`;
}
