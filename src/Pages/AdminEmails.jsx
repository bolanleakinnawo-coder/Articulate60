// Round 14 (Sheriff): Admin > Emails. The automatic emails (sent through
// Resend). Each one can be switched on or off, and its subject and text
// edited. {name} and the other words in curly brackets are filled in for
// each member.
import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import api from "../api/axios";
import "./Admin.css";
import "./AdminRound14.css";

const WORDS = {
  welcome: ["{name}"],
  trial_started: ["{name}", "{date}"],
  trial_ending: ["{name}", "{date}"],
  trial_ended: ["{name}", "{date}"],
  sub_confirmed: ["{name}", "{plan}", "{date}"],
  payment_success: ["{name}", "{item}", "{amount}", "{reference}", "{date}"],
  payment_failed: ["{name}", "{item}", "{amount}", "{reference}"],
  sub_expiring: ["{name}", "{plan}", "{date}"],
  sub_expired: ["{name}", "{plan}", "{date}"],
};

function EmailCard({ email, onSaved }) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(email.subject);
  const [body, setBody] = useState(email.body);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const save = async (patch) => {
    setBusy(true);
    setNote("");
    try {
      const { data } = await api.put(`/api/admin/emails/${email.key}`, patch);
      onSaved(data.email);
      if (!("enabled" in patch)) setNote("Saved.");
    } catch (err) {
      setNote(err.response?.data?.message || "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  const changed = subject !== email.subject || body !== email.body;

  return (
    <article className={`adm-card adm-email${email.enabled ? "" : " is-off"}`}>
      <div className="adm-email-top">
        <span className="adm-history-icon" aria-hidden="true">
          <Mail size={16} />
        </span>
        <div className="adm-email-title">
          <strong>{email.label}</strong>
          <span>{email.when}</span>
          <span>
            {email.sentCount} sent
          </span>
        </div>
        <label className="adm-switch">
          <input
            type="checkbox"
            checked={email.enabled}
            disabled={busy}
            onChange={(e) => save({ enabled: e.target.checked })}
          />
          <span className="adm-switch-track" aria-hidden="true" />
          <span className="adm-sr">{email.enabled ? "On" : "Off"}</span>
        </label>
      </div>
      <button type="button" className="adm-text-btn" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? "Close" : "Edit email"}
      </button>
      {open && (
        <div className="adm-form">
          <label className="adm-field">
            <span>Subject</span>
            <input value={subject} maxLength={200} onChange={(e) => setSubject(e.target.value)} />
          </label>
          <label className="adm-field">
            <span>Text</span>
            <textarea rows={7} maxLength={5000} value={body} onChange={(e) => setBody(e.target.value)} />
            <small>
              You can use {WORDS[email.key].join(", ")}. Leave a blank line to start a new paragraph.
            </small>
          </label>
          <button
            type="button"
            className="adm-primary"
            disabled={busy || !changed || !subject.trim() || !body.trim()}
            onClick={() => save({ subject, body })}
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      )}
      {note && (
        <p className="adm-note" role="status">
          {note}
        </p>
      )}
    </article>
  );
}

export default function AdminEmails() {
  const [emails, setEmails] = useState(null);
  const [configured, setConfigured] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/api/admin/emails")
      .then((r) => {
        setEmails(r.data.emails);
        setConfigured(r.data.configured);
      })
      .catch((e) => setError(e.response?.data?.message || "Could not load the emails."));
  }, []);

  return (
    <section className="adm-section">
      <header className="adm-head">
        <div>
          <p className="admin-overview-eyebrow">Admin dashboard</p>
          <h1>Emails</h1>
          <p className="adm-sub">Automatic emails. Switch each one on or off and edit its text.</p>
        </div>
      </header>
      {error && (
        <p className="admin-overview-error" role="alert">
          {error}
        </p>
      )}
      {!configured && (
        <p className="adm-warn" role="note">
          Emails can&apos;t be sent yet: set RESEND_API_KEY and EMAIL_FROM on Render.
        </p>
      )}
      {!emails && !error && (
        <p className="adm-empty" role="status">
          Loading…
        </p>
      )}
      <div className="adm-emails">
        {(emails || []).map((email) => (
          <EmailCard
            key={email.key}
            email={email}
            onSaved={(updated) =>
              setEmails((list) => list.map((x) => (x.key === updated.key ? updated : x)))
            }
          />
        ))}
      </div>
    </section>
  );
}
