import { useEffect, useState } from "react";
import { Flame, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  buildStreakNotification,
  getNotificationPrefs,
  markSeenToday,
  wasSeenToday,
} from "../data/notifications";
import "../styles/StreakPopup.css";

// Tailored streak pop-up on Home: first streak, keep it alive, fresh start
// or a milestone cheer. Shown at most once per message per day.
export default function StreakPopup({ streak, user }) {
  const navigate = useNavigate();
  const [note, setNote] = useState(null);

  useEffect(() => {
    const next = buildStreakNotification({
      streak,
      user,
      prefs: getNotificationPrefs(),
    });
    if (!next || wasSeenToday(next.id)) return undefined;
    // A short delay so the pop-up arrives after the page has settled.
    const timer = setTimeout(() => setNote(next), 700);
    return () => clearTimeout(timer);
  }, [streak, user]);

  if (!note) return null;

  const close = () => {
    markSeenToday(note.id);
    setNote(null);
  };

  const act = () => {
    markSeenToday(note.id);
    setNote(null);
    if (!note.celebrate) navigate("/app/practice");
  };

  return (
    <div className="sp-backdrop" onClick={close}>
      <div
        className="sp-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sp-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="sp-close" onClick={close} aria-label="Close">
          <X size={18} />
        </button>
        <span className={`sp-flame ${note.celebrate ? "sp-flame-lit" : ""}`}>
          <Flame size={40} strokeWidth={1.8} />
        </span>
        <h2 id="sp-title">{note.title}</h2>
        <p className="sp-body">{note.body}</p>
        {note.focus && <p className="sp-focus">{note.focus}</p>}
        <button className="sp-action" onClick={act}>
          {note.action}
        </button>
        <button className="sp-later" onClick={close}>
          Maybe later
        </button>
      </div>
    </div>
  );
}
