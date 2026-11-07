import { useEffect, useState } from "react";
import { Flame, TrendingUp, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  buildStreakNotification,
  formatTimeLeft,
  getNotificationPrefs,
  markSeenToday,
  syncNotificationPrefs,
  wasSeenToday,
} from "../data/notifications";
import { enablePush, getPushState, refreshPushSubscription } from "../lib/push";
import "../styles/StreakPopup.css";

let prefsSynced = false;

// Streak card on Home: first streak, keep it going, restore within the
// 24h grace day, come back, or a milestone cheer. Driven by the live streak
// status, so it can appear while the app is open (e.g. at reminder time).
// Shown at most once per card per day; "Maybe later" closes it for today.
export default function StreakPopup({ streak, user }) {
  const navigate = useNavigate();
  const [note, setNote] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [pushState, setPushState] = useState(null);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (prefsSynced) return;
    prefsSynced = true;
    // Once per app load: copy the switches to the server and make sure it
    // still has this device's reminder subscription.
    syncNotificationPrefs();
    refreshPushSubscription();
  }, []);

  useEffect(() => {
    const next = buildStreakNotification({
      streak,
      user,
      prefs: getNotificationPrefs(),
    });
    // No card fits any more (e.g. they just practised on another device):
    // close any open one. Otherwise show the new one after a short delay so
    // it arrives once the page has settled.
    const show = next && !wasSeenToday(next.id) ? next : null;
    const timer = setTimeout(() => setNote(show), show ? 700 : 0);
    return () => clearTimeout(timer);
  }, [streak, user]);

  // Live "time left to restore" countdown.
  useEffect(() => {
    if (!note?.restoreDeadline) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => clearInterval(timer);
  }, [note?.restoreDeadline]);

  // Offer phone reminders under the card if this device hasn't got them.
  useEffect(() => {
    if (!note || note.celebrate) return;
    getPushState()
      .then(setPushState)
      .catch(() => setPushState("unsupported"));
  }, [note]);

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

  const turnOnPush = async () => {
    setPushBusy(true);
    try {
      setPushState(await enablePush());
    } catch {
      setPushState("error");
    } finally {
      setPushBusy(false);
    }
  };

  const timeLeft = note.restoreDeadline
    ? formatTimeLeft(new Date(note.restoreDeadline).getTime() - now)
    : "";
  const Icon = note.icon === "trend" ? TrendingUp : Flame;

  return (
    <div className="sp-backdrop" onClick={close}>
      <div
        className={`sp-card sp-${note.layout || "center"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sp-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="sp-close" onClick={close} aria-label="Close">
          <X size={18} strokeWidth={2} />
        </button>
        {note.layout === "streak" ? (
          <>
            <p className="sp-eyebrow">{note.eyebrow}</p>
            <div className="sp-streak-row">
              <span className="sp-flame">
                <Flame size={26} strokeWidth={1.8} />
              </span>
              <div>
                <p className="sp-headline">{note.headline}</p>
                {note.restoreDeadline ? (
                  <p className="sp-subline" aria-live="polite">
                    Time left to restore: <strong>{timeLeft}</strong>
                  </p>
                ) : (
                  <p className="sp-subline">{note.subline}</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <span className={`sp-icon ${note.celebrate ? "sp-icon-lit" : ""}`}>
              <Icon size={30} strokeWidth={1.8} />
            </span>
            {note.eyebrow && <p className="sp-eyebrow">{note.eyebrow}</p>}
          </>
        )}

        <h2 id="sp-title">{note.title}</h2>
        <p className="sp-body">{note.body}</p>
        {note.focus && <p className="sp-focus">{note.focus}</p>}

        <button className="sp-action" onClick={act}>
          {note.action}
        </button>
        <button className="sp-later" onClick={close}>
          Maybe later
        </button>

        {pushState === "off" && (
          <div className="sp-push">
            <span>
              Get these reminders on your phone, even when Loquiex is closed.
            </span>
            <button onClick={turnOnPush} disabled={pushBusy}>
              {pushBusy ? "Turning on…" : "Turn on"}
            </button>
          </div>
        )}
        {pushState === "needs-install" && (
          <div className="sp-push">
            <span>
              To get reminders on your iPhone, add Loquiex to your Home Screen
              (Share, then Add to Home Screen) and open it from there.
            </span>
          </div>
        )}
        {pushState === "on" && (
          <div className="sp-push sp-push-done">
            <span>Phone reminders are on.</span>
          </div>
        )}
        {(pushState === "denied" || pushState === "error") && (
          <div className="sp-push">
            <span>
              {pushState === "denied"
                ? "Notifications are blocked for Loquiex. You can allow them in your browser or phone settings."
                : "Couldn't turn on reminders right now. Please try again later."}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
