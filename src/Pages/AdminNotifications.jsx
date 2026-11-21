// Round 14 (Sheriff): Admin > Notifications. The admin picks a group, types
// one message ({name} optional) and sends it to everyone in the group at
// once, now or at a time they choose. Only the number of members is shown.
// Nothing is sent automatically.
import { useCallback, useEffect, useState } from "react";
import { BellRing, Clock, Send, Users } from "lucide-react";
import api from "../api/axios";
import "./Admin.css";
import "./AdminRound14.css";

const STATUS = {
  scheduled: "Scheduled",
  sending: "Sending",
  sent: "Sent",
  cancelled: "Cancelled",
  failed: "Failed",
};

function when(date) {
  if (!date) return "";
  return new Date(date).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function AdminNotifications() {
  const [groups, setGroups] = useState([]);
  const [list, setList] = useState([]);
  const [phonesReady, setPhonesReady] = useState(true);
  const [error, setError] = useState("");
  const [group, setGroup] = useState("");
  const [count, setCount] = useState(null);
  const [message, setMessage] = useState("");
  const [later, setLater] = useState(false);
  const [at, setAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const load = useCallback(() => {
    api
      .get("/api/admin/notifications")
      .then((r) => {
        setGroups(r.data.groups);
        setList(r.data.notifications);
        setPhonesReady(r.data.phonesReady);
        setError("");
      })
      .catch((e) => setError(e.response?.data?.message || "Could not load notifications."));
  }, []);
  useEffect(load, [load]);

  useEffect(() => {
    if (!group) return undefined;
    let alive = true;
    api
      .get("/api/admin/notifications/count", { params: { group } })
      .then((r) => alive && setCount(r.data.count))
      .catch(() => alive && setCount(null));
    return () => {
      alive = false;
    };
  }, [group]);

  const chosen = groups.find((g) => g.id === group);

  const send = async (e) => {
    e.preventDefault();
    if (!group || !message.trim()) return;
    if (later && !at) return;
    const confirmText = later
      ? `Schedule this for ${when(at)}?`
      : `Send this to ${count ?? "every"} ${count === 1 ? "member" : "members"} now?`;
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    setNote("");
    try {
      const { data } = await api.post("/api/admin/notifications", {
        group,
        message: message.trim(),
        scheduledFor: later ? new Date(at).toISOString() : null,
      });
      const n = data.notification;
      setNote(
        n.status === "scheduled"
          ? `Scheduled for ${when(n.scheduledFor)}.`
          : n.status === "sent"
            ? `Sent to ${n.recipients} ${n.recipients === 1 ? "member" : "members"}.`
            : "Could not send the notification.",
      );
      load();
    } catch (err) {
      setNote(err.response?.data?.message || "Could not send the notification.");
      load();
    } finally {
      // Round 15 (Sheriff): the form is cleared once you press Send.
      setMessage("");
      setGroup("");
      setCount(null);
      setAt("");
      setLater(false);
      setBusy(false);
    }
  };

  const cancel = async (n) => {
    if (!window.confirm("Cancel this scheduled notification?")) return;
    try {
      await api.post(`/api/admin/notifications/${n.id}/cancel`);
      load();
    } catch (err) {
      setNote(err.response?.data?.message || "Could not cancel it.");
    }
  };

  return (
    <section className="adm-section">
      <header className="adm-head">
        <div>
          <p className="admin-overview-eyebrow">Admin dashboard</p>
          <h1>Notifications</h1>
          <p className="adm-sub">Create, schedule and monitor notifications.</p>
        </div>
      </header>

      {error && (
        <p className="admin-overview-error" role="alert">
          {error}
        </p>
      )}
      {!phonesReady && (
        <p className="adm-warn" role="note">
          Phone notifications are off on the server (VAPID keys missing). Members with
          Loquiex open still see the message in the app.
        </p>
      )}

      <form className="adm-card adm-form" onSubmit={send}>
        <label className="adm-field">
          <span>Group</span>
          <select
            value={group}
            onChange={(e) => {
              setCount(null);
              setGroup(e.target.value);
            }}
          >
            <option value="">Choose a group</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
        {chosen && (
          <div className="adm-audience">
            <Users size={16} aria-hidden="true" />
            <strong>{count === null ? "Counting…" : `${count} ${count === 1 ? "member" : "members"}`}</strong>
            <span>{chosen.who}</span>
          </div>
        )}
        <label className="adm-field">
          <span>Message</span>
          <textarea
            rows={4}
            maxLength={500}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hi {name}, …"
          />
          <small>Type {"{name}"} to use each member&apos;s first name. {message.length}/500</small>
        </label>
        <div className="adm-when">
          <label className="adm-check">
            <input type="radio" name="when" checked={!later} onChange={() => setLater(false)} />
            Send now
          </label>
          <label className="adm-check">
            <input type="radio" name="when" checked={later} onChange={() => setLater(true)} />
            Schedule
          </label>
          {later && (
            <input
              className="adm-datetime"
              type="datetime-local"
              value={at}
              onChange={(e) => setAt(e.target.value)}
              aria-label="Send at"
            />
          )}
        </div>
        <button
          type="submit"
          className="adm-primary"
          disabled={busy || !group || !message.trim() || (later && !at) || count === 0}
        >
          {later ? <Clock size={16} aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
          {busy ? "Sending…" : later ? "Schedule" : "Send to all"}
        </button>
        {note && (
          <p className="adm-note" role="status">
            {note}
          </p>
        )}
      </form>

      <div className="adm-card">
        <h2 className="adm-card-title">Sent and scheduled</h2>
        {list.length === 0 ? (
          <p className="adm-empty">No notifications yet.</p>
        ) : (
          <ul className="adm-history">
            {list.map((n) => (
              <li key={n.id}>
                <span className="adm-history-icon" aria-hidden="true">
                  <BellRing size={16} />
                </span>
                <div className="adm-history-main">
                  <strong>{n.groupLabel}</strong>
                  <p>{n.message}</p>
                  <span>
                    {n.status === "sent"
                      ? `Sent ${when(n.sentAt)} · ${n.recipients} ${n.recipients === 1 ? "member" : "members"}`
                      : n.status === "scheduled"
                        ? `Scheduled for ${when(n.scheduledFor)}`
                        : `${STATUS[n.status] || n.status} · ${when(n.createdAt)}`}
                  </span>
                </div>
                <div className="adm-history-side">
                  <span className={`adm-pill is-${n.status}`}>{STATUS[n.status] || n.status}</span>
                  {n.status === "scheduled" && (
                    <button type="button" className="adm-text-btn" onClick={() => cancel(n)}>
                      Cancel
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
