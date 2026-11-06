import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CircleCheck,
  Megaphone,
  Sparkles,
} from "lucide-react";
import api from "../api/axios";
import {
  disablePush,
  enablePush,
  getPushState,
  sendTestPush,
} from "../lib/push";

const TYPES = {
  learn: { label: "Learn", icon: BookOpen },
  update: { label: "Update", icon: Sparkles },
  announcement: { label: "Announcement", icon: Megaphone },
};

const READ_KEY = "loquiex.readNotifications";

// Notifications page: updates, announcements and news from Loquiex.
// Reads GET /api/notifications → [{ _id, type, title, body, createdAt }].
// Until that feed exists (or while it's empty) the page shows
// "You're all caught up". Read/unread is remembered on this device.
export default function ProfileNotifications({ prefs, onTogglePref, onBack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [readIds] = useState(readSet);

  useEffect(() => {
    let live = true;
    api
      .get("/api/notifications")
      .then((response) => {
        if (live) setItems(Array.isArray(response.data) ? response.data : []);
      })
      .catch(() => {
        if (live) setItems([]);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);

  // Everything on screen counts as read next time (dots show this visit).
  useEffect(() => {
    if (!items.length) return;
    const next = new Set(readIds);
    items.forEach((n) => next.add(n._id));
    try {
      localStorage.setItem(READ_KEY, JSON.stringify([...next].slice(-300)));
    } catch {
      // Storage blocked: unread dots just show again next time.
    }
  }, [items, readIds]);

  const sorted = [...items].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );

  return (
    <div className="profile-content pf-notifications-page">
      <button className="pf-back pf-back-link" onClick={onBack}>
        <ArrowLeft size={18} /> Your Profile
      </button>

      <header className="pf-page-header">
        <h1>Notifications</h1>
        <p>Updates, announcements and news from Loquiex.</p>
      </header>

      {loading ? (
        <p className="pf-empty">Loading…</p>
      ) : (
        <>
          {sorted.map((n) => {
            const type = TYPES[n.type] || TYPES.update;
            const unread = !readIds.has(n._id);
            return (
              <article className="pf-panel pf-note" key={n._id}>
                <div className="pf-note-head">
                  <span className="pf-row-icon">
                    <type.icon size={18} />
                  </span>
                  <div className="pf-note-meta">
                    <p className="pf-note-type">{type.label}</p>
                    <h2 className="pf-note-title">{n.title}</h2>
                    <p className="pf-note-time">{formatWhen(n.createdAt)}</p>
                  </div>
                  {unread && (
                    <span className="pf-unread-dot" aria-label="Unread" />
                  )}
                </div>
                {n.body && (
                  <p className="pf-panel-text pf-note-body">{n.body}</p>
                )}
              </article>
            );
          })}

          <div className="pf-caught-up">
            <CircleCheck size={28} />
            <p>You&apos;re all caught up.</p>
            {sorted.length === 0 && (
              <span>
                New updates and announcements from Loquiex will appear here.
              </span>
            )}
          </div>
        </>
      )}

      <PhoneReminders />

      <h2 className="pf-stats-title">Pop-up settings</h2>
      <div className="pf-list">
        {[
          {
            key: "streakPopups",
            title: "Streak pop-ups",
            text: "A quick nudge when your streak needs you, a reminder on your grace day to restore it, and a cheer when you hit a milestone.",
          },
          {
            key: "practiceNudges",
            title: "Practice nudges",
            text: "Tips and reminders shaped around what you told us you want to improve.",
          },
        ].map((p) => (
          <label className="pf-row pf-toggle-row" key={p.key}>
            <span className="pf-row-text">
              <strong>{p.title}</strong>
              <span>{p.text}</span>
            </span>
            <input
              type="checkbox"
              className="pf-switch"
              checked={prefs[p.key]}
              onChange={() => onTogglePref(p.key)}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

const PUSH_NOTES = {
  "needs-install":
    "On iPhone or iPad, add Loquiex to your Home Screen first (Share, then Add to Home Screen, iOS 16.4 or later), then open it from there and turn this on.",
  unsupported: "This browser can't show phone notifications.",
  denied:
    "Notifications are blocked for Loquiex. Allow them in your browser or phone settings, then come back here.",
  error: "Couldn't change this right now. Please try again.",
};

// Phone (push) reminders for this device. They follow the switches below
// and arrive even when Loquiex is closed.
function PhoneReminders() {
  const [state, setState] = useState("loading");
  const [busy, setBusy] = useState(false);
  const [testNote, setTestNote] = useState("");

  const load = useCallback(() => {
    getPushState()
      .then(setState)
      .catch(() => setState("unsupported"));
  }, []);

  useEffect(load, [load]);

  const toggle = async () => {
    setBusy(true);
    setTestNote("");
    try {
      setState(state === "on" ? await disablePush() : await enablePush());
    } catch {
      setState("error");
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setTestNote("Sending…");
    try {
      const { data } = await sendTestPush();
      setTestNote(
        data.delivered
          ? "Sent. It should arrive in a few seconds."
          : "Couldn't reach this device. Try turning reminders off and on again.",
      );
    } catch {
      setTestNote("Couldn't send a test right now.");
    }
  };

  const canToggle = state === "on" || state === "off" || state === "error";

  return (
    <>
      <h2 className="pf-stats-title">Phone reminders</h2>
      <div className="pf-list">
        <label className="pf-row pf-toggle-row">
          <span className="pf-row-text">
            <strong>Streak reminders on this device</strong>
            <span>
              {PUSH_NOTES[state] ||
                "Get your streak reminders even when Loquiex is closed. Times follow your local time zone."}
            </span>
          </span>
          {canToggle && (
            <input
              type="checkbox"
              className="pf-switch"
              checked={state === "on"}
              disabled={busy}
              onChange={toggle}
            />
          )}
        </label>
      </div>
      {state === "on" && (
        <p className="pf-panel-text pf-push-test">
          <button className="pf-text-link" onClick={test}>
            Send a test notification
          </button>
          {testNote && <span> {testNote}</span>}
        </p>
      )}
    </>
  );
}

function readSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

// "Today · 9:00 AM", "Yesterday · 2:15 PM", "Oct 26 · 10:00 AM"
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
