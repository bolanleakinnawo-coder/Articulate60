import api from "../api/axios";

// Phone notifications (Web Push). The service worker (public/push-sw.js)
// shows them, even when Loquiex is closed.
//
// States:
//   "unsupported"   this browser can't receive push
//   "needs-install" iPhone/iPad: add Loquiex to the Home Screen first
//                   (iOS 16.4 or later), then open it from there
//   "denied"        the member blocked notifications in browser settings
//   "off"           allowed to ask, not turned on yet
//   "on"            this device is subscribed

export function isIos() {
  const platform = navigator.userAgentData?.platform || navigator.platform || "";
  return (
    /iPhone|iPad|iPod|iOS/i.test(`${navigator.userAgent} ${platform}`) ||
    (platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    navigator.standalone === true
  );
}

function hasPushApis() {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function getRegistration() {
  if (!("serviceWorker" in navigator)) return null;
  const existing = await navigator.serviceWorker.getRegistration();
  if (!existing) return null;
  return navigator.serviceWorker.ready;
}

export async function getPushState() {
  if (isIos() && !isStandalone()) return "needs-install";
  if (!hasPushApis()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const registration = await getRegistration();
  if (!registration) return "unsupported";
  const sub = await registration.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

function urlBase64ToUint8Array(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// Must be called from a tap (browsers only show the permission prompt then).
export async function enablePush() {
  const state = await getPushState();
  if (state === "needs-install" || state === "unsupported" || state === "denied") {
    return state;
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return permission === "denied" ? "denied" : "off";
  }
  const { data } = await api.get("/api/push/public-key");
  if (!data?.enabled || !data.publicKey) {
    throw new Error("Notifications aren't available right now.");
  }
  const registration = await getRegistration();
  if (!registration) return "unsupported";
  let sub = await registration.pushManager.getSubscription();
  if (!sub) {
    sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    });
  }
  await api.post("/api/push/subscribe", { subscription: sub.toJSON() });
  return "on";
}

export async function disablePush() {
  const registration = await getRegistration().catch(() => null);
  const sub = await registration?.pushManager.getSubscription();
  if (!sub) return "off";
  try {
    await api.post("/api/push/unsubscribe", { endpoint: sub.endpoint });
  } finally {
    await sub.unsubscribe().catch(() => {});
  }
  return "off";
}

// Re-sends this device's subscription after sign-in, so reminders go to
// whoever is signed in on it now.
export async function refreshPushSubscription() {
  try {
    if ((await getPushState()) !== "on") return;
    const registration = await getRegistration();
    const sub = await registration.pushManager.getSubscription();
    if (sub) await api.post("/api/push/subscribe", { subscription: sub.toJSON() });
  } catch {
    // Not important enough to bother the member about.
  }
}

export function sendTestPush() {
  return api.post("/api/push/test");
}
