import { useState } from "react";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  LoaderCircle,
  Mic,
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

  const vocabCount = recordings.filter((r) => r.isWordOfTheDay).length;
  const promptCount = recordings.length - vocabCount;

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

  return (
    <div className="profile-content pf-practices-page">
      <button className="pf-back pf-back-link" onClick={onBack}>
        <ChevronLeft size={18} /> Your Profile
      </button>

      <header className="pf-page-header">
        <h1>Your Practices</h1>
        <p>Your previous sessions and feedback.</p>
      </header>

      <section className="pf-panel pf-journey">
        <p className="pf-stats-kicker">Your journey</p>
        <div className="pf-journey-grid">
          <div className="pf-journey-item">
            <span className="pf-row-icon">
              <Mic size={18} />
            </span>
            <span>
              <strong>{promptCount}</strong>
              <span>
                {promptCount === 1 ? "Prompt practised" : "Prompts practised"}
              </span>
            </span>
          </div>
          <div className="pf-journey-item">
            <span className="pf-row-icon">
              <BookOpen size={18} />
            </span>
            <span>
              <strong>{vocabCount}</strong>
              <span>
                {vocabCount === 1 ? "Word practised" : "Words practised"}
              </span>
            </span>
          </div>
        </div>
      </section>

      <div className="pf-stats-head">
        <h2>Practice history</h2>
        <span className="pf-history-count">
          {shown.length} shown
          {filtered.length > shown.length ? ` of ${filtered.length}` : ""}
        </span>
      </div>

      <div className="pf-chips" role="tablist">
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
        <div className="pf-list pf-history">
          {shown.map((r) => {
            const hasFeedback = r.analysisStatus === "done" && r.analysis;
            const isAnalysing = analysingId === r._id;
            return (
              <button
                key={r._id}
                className="pf-history-row"
                disabled={isAnalysing}
                onClick={() =>
                  hasFeedback ? onOpenFeedback(r) : onGetFeedback(r)
                }
              >
                <span className="pf-history-text">
                  <strong>{r.topic || "Practice session"}</strong>
                  <span className="pf-history-meta">
                    {[
                      formatWhen(r.createdAt),
                      r.durationSeconds ? formatDuration(r.durationSeconds) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  {hasFeedback ? (
                    <span className="pf-history-status is-ready">
                      <CircleCheck size={15} /> Feedback available
                    </span>
                  ) : isAnalysing ? (
                    <span className="pf-history-status">
                      <LoaderCircle size={15} className="pf-spin" /> Getting
                      your feedback…
                    </span>
                  ) : (
                    <span className="pf-history-status">
                      <Sparkles size={15} /> Get AI feedback
                    </span>
                  )}
                </span>
                <ChevronRight size={18} className="pf-row-chev" />
              </button>
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
  if (seconds < 60) return `${seconds} sec`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m} min ${s} sec` : `${m} min`;
}

// "Today · 10:42 AM", "Yesterday · 2:30 PM", "Oct 23 · 6:15 PM"
function formatWhen(date) {
  if (!date) return "";
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  let day;
  if (d.toDateString() === today.toDateString()) day = "Today";
  else if (d.toDateString() === yesterday.toDateString()) day = "Yesterday";
  else
    day = d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      ...(d.getFullYear() !== today.getFullYear() && { year: "numeric" }),
    });
  return `${day} · ${time}`;
}
