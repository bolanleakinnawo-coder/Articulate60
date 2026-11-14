// Reminders for planned group practices, 5 minutes before they start.
//
// Two routes, so a reminder still arrives when one fails:
//   1. The server sends a phone notification (Web Push) to every device
//      where the member turned notifications on. Works with Loquiex closed.
//   2. While Loquiex is open (even in a background tab), this file keeps a
//      timer for each practice the member hosts or asked to be reminded
//      about, and shows the notification itself.
// Both use the same notification tag, so the member never sees it twice.
import { enablePush, getPushState } from "./push";
import { fetchScheduled, roomTitle } from "./activeCall";

export const REMIND_BEFORE_MIN = 5;

const shown = new Set();
const timers = new Map();

async function showSystemNotification(r) {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission !== "granted") return false;
  const title = r.isHost
    ? "Your group practice starts in 5 min"
    : "Group practice starts in 5 min";
  const options = {
    body: `"${r.title}". Open Loquiex to join.`,
    icon: "/icons/app-icon-192.png",
    badge: "/icons/app-icon-192.png",
    tag: `group-scheduled-${r.id}`,
    renotify: false,
    requireInteraction: true,
    data: { url: "/app/practice?tab=group" },
  };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, options);
      return true;
    }
    new Notification(title, options);
    return true;
  } catch {
    return false;
  }
}

// Shows the reminder once: a system notification (when allowed) plus the
// in-app banner via `onBanner`.
export function deliverReminder(r, onBanner) {
  if (!r?.id || shown.has(r.id)) return;
  shown.add(r.id);
  onBanner?.(r);
  showSystemNotification(r);
}

// Keeps a timer for each practice this member should be reminded about.
// Returns a function that stops everything.
export function watchPlannedReminders(onBanner) {
  let alive = true;
  const sync = async () => {
    const data = await fetchScheduled();
    if (!alive || !data) return;
    const wanted = [
      ...data.mine.filter((x) => !x.liveRoomId),
      ...data.upcoming.filter((x) => x.reminded && !x.liveRoomId),
    ];
    const ids = new Set(wanted.map((x) => x.id));
    for (const [id, t] of timers) {
      if (!ids.has(id)) {
        clearTimeout(t);
        timers.delete(id);
      }
    }
    for (const item of wanted) {
      if (timers.has(item.id) || shown.has(item.id)) continue;
      const startsAt = new Date(item.startsAt).getTime();
      const at = startsAt - REMIND_BEFORE_MIN * 60 * 1000;
      const wait = at - Date.now();
      // Started more than a minute ago: too late for a reminder.
      if (startsAt < Date.now() - 60 * 1000) continue;
      // Browsers cap timers at ~24.8 days; re-sync handles later ones.
      if (wait > 6 * 60 * 60 * 1000) continue;
      const reminder = {
        id: item.id,
        title: roomTitle(item),
        startsAt: item.startsAt,
        isHost: item.isHost,
      };
      timers.set(
        item.id,
        setTimeout(() => {
          timers.delete(item.id);
          if (alive) deliverReminder(reminder, onBanner);
        }, Math.max(0, wait)),
      );
    }
  };
  sync();
  const every = setInterval(sync, 5 * 60 * 1000);
  const onChange = () => sync();
  window.addEventListener("loquiex:planned-changed", onChange);
  return () => {
    alive = false;
    clearInterval(every);
    window.removeEventListener("loquiex:planned-changed", onChange);
    for (const t of timers.values()) clearTimeout(t);
    timers.clear();
  };
}

// Tell the watcher the list changed (planned, cancelled, Remind me tapped).
export function plannedChanged() {
  window.dispatchEvent(new Event("loquiex:planned-changed"));
}

// Called from the tap that plans a practice or sets a reminder: asks for
// notification permission then (browsers only allow asking from a tap) and
// subscribes this device to phone notifications. Returns the push state:
// "on" | "off" | "denied" | "needs-install" | "unsupported".
export async function ensureReminderNotifications() {
  // The permission pop-up is asked for first, inside the tap, because Safari
  // ignores the request once anything else has been awaited.
  try {
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      const state = await enablePush();
      return state;
    }
    const state = await getPushState();
    if (state === "on") return "on";
    if (state === "off") return await enablePush();
    return state;
  } catch {
    // Push isn't set up on the server; the in-app reminder still works.
    return "off";
  }
}

// One line explaining why reminders may not reach this device.
export function reminderHelp(state) {
  switch (state) {
    case "denied":
      return "Notifications are blocked for Loquiex. Allow them in your browser or phone settings to get the reminder.";
    case "needs-install":
      return "On iPhone, add Loquiex to your Home Screen and open it from there to get reminders.";
    case "unsupported":
      return "This browser can't show notifications. Keep Loquiex open to see the reminder.";
    case "off":
      return "Turn on notifications in Profile > Notifications to get the reminder on your phone.";
    default:
      return "";
  }
}
