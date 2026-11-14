import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ShieldCheck, Trophy } from "lucide-react";
import api from "../api/axios";

const MAX_LENGTH = 280;

const STATUS = {
  pending: { label: "Pending", className: "is-pending" },
  approved: { label: "Published", className: "is-published" },
  rejected: { label: "Not published", className: "is-rejected" },
};

const FILTERS = [
  ["all", "All"],
  ["pending", "Pending"],
  ["approved", "Published"],
];

// "Share a Win" page. Wins are saved to /api/testimonials and reviewed by the
// Loquiex team; the user's own wins and their status come from
// /api/testimonials/mine and refresh whenever the app comes back into focus.
export default function ProfileShareWin({ user, onBack }) {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [wins, setWins] = useState([]);
  const [loadState, setLoadState] = useState("loading"); // loading | ready | error
  const [filter, setFilter] = useState("all");

  const loadWins = useCallback(() => {
    api
      .get("/api/testimonials/mine")
      .then((response) => {
        setWins(Array.isArray(response.data) ? response.data : []);
        setLoadState("ready");
      })
      .catch(() => setLoadState((state) => (state === "ready" ? state : "error")));
  }, []);

  useEffect(() => {
    loadWins();
    const onVisible = () => {
      if (document.visibilityState === "visible") loadWins();
    };
    window.addEventListener("focus", loadWins);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", loadWins);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadWins]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!text.trim()) return;
    setError("");
    setMessage("");
    setIsSubmitting(true);
    try {
      const response = await api.post("/api/testimonials", {
        quote: text.trim(),
        displayName: displayNameFor(user),
      });
      setWins((list) => [response.data, ...list]);
      setLoadState("ready");
      setFilter("all");
      setText("");
      setMessage("Thank you! Your win was sent for review.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Could not submit your win. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const shown =
    filter === "all" ? wins : wins.filter((win) => win.status === filter);

  return (
    <div className="profile-content pf-win-page">
      <button className="pf-back pf-back-link" onClick={onBack}>
        <ArrowLeft size={18} /> Your Profile
      </button>

      <header className="pf-page-header">
        <h1>Share a Win</h1>
        <p>Your communication journey deserves to be celebrated.</p>
      </header>

      <section className="pf-panel pf-win-hero">
        <span className="pf-row-icon pf-win-hero-icon">
          <Trophy size={26} />
        </span>
        <span className="pf-win-hero-text">
          <h2>What&apos;s a communication win you&apos;re celebrating today?</h2>
          <p>Big or small, tell us about the moment.</p>
        </span>
      </section>

      <form className="pf-win-form" onSubmit={handleSubmit}>
        <label className="pf-win-label" htmlFor="pf-win-text">
          Your win
        </label>
        <textarea
          id="pf-win-text"
          className="pf-win-textarea"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setMessage("");
          }}
          maxLength={MAX_LENGTH}
          rows={5}
          placeholder='E.g. "I finally spoke up in a meeting at work."'
        />
        <span className="pf-win-count">
          {text.length}/{MAX_LENGTH}
        </span>
        {error && <p className="form-error">{error}</p>}
        {message && <p className="profile-win-success">{message}</p>}
        <button
          type="submit"
          className="pf-win-submit"
          disabled={!text.trim() || isSubmitting}
        >
          {isSubmitting ? "Sharing..." : "Share my win"}
        </button>
      </form>

      <section className="pf-panel pf-win-note">
        <p className="pf-panel-title">
          <ShieldCheck size={20} /> Keeping our community thoughtful
        </p>
        <p className="pf-panel-text">
          Every submission is reviewed to keep the community encouraging and
          free from spam.
        </p>
      </section>

      <h2 className="pf-stats-title">Your recent wins</h2>
      <div className="pf-chips" role="tablist">
        {FILTERS.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={filter === key}
            className={filter === key ? "is-active" : ""}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {loadState === "loading" && <p className="pf-empty">Loading your wins…</p>}
      {loadState === "error" && (
        <p className="pf-empty">
          We couldn&apos;t load your wins right now.{" "}
          <button className="pf-inline-link" onClick={loadWins}>
            Try again
          </button>
        </p>
      )}
      {loadState === "ready" && shown.length === 0 && (
        <p className="pf-empty">
          {wins.length === 0
            ? "Your shared wins will appear here."
            : filter === "pending"
              ? "No wins waiting for review."
              : "None of your wins are published yet."}
        </p>
      )}

      <div className="pf-win-list">
        {shown.map((win) => {
          const status = STATUS[win.status] || STATUS.pending;
          return (
            <article className="pf-win-card" key={win._id}>
              {/* Round 8: one top line (date, time and current status) and
                  no Sent / In review / Published steps. */}
              <div className="pf-win-top">
                <p className="pf-win-date">{formatWhen(win.createdAt)}</p>
                <p className={`pf-win-status ${status.className}`}>
                  <span aria-hidden="true" /> {status.label}
                </p>
              </div>
              <p className="pf-win-quote">{win.quote}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function displayNameFor(user) {
  const name = (user?.username || user?.fullName || "").trim();
  return name.length >= 2 ? name.slice(0, 40) : "Loquiex member";
}

// "Today · 10:30 am", "Yesterday · 4:15 pm", "3 Nov · 9:00 am"
function formatWhen(date) {
  if (!date) return "";
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  // 12-hour clock, "9:40 am".
  const time = d
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    .replace(/\s?AM$/i, " am")
    .replace(/\s?PM$/i, " pm");
  let day;
  if (d.toDateString() === today.toDateString()) day = "Today";
  else if (d.toDateString() === yesterday.toDateString()) day = "Yesterday";
  else
    day = d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      ...(d.getFullYear() !== today.getFullYear() && { year: "numeric" }),
    });
  return `${day} · ${time}`;
}
