/* Loquiex phone notifications. Loaded into the service worker that
   vite-plugin-pwa generates (see workbox.importScripts in vite.config.js). */

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Loquiex", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Loquiex";
  const options = {
    body: data.body || "",
    icon: "/icons/app-icon-192.png",
    badge: "/icons/app-icon-192.png",
    tag: data.tag || "loquiex",
    renotify: true,
    data: { url: data.url || "/app/home" },
    actions: [
      { action: "open", title: data.action || "Practise today" },
      { action: "later", title: "Maybe later" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // "Maybe later" just dismisses; the next reminder comes at its usual time.
  if (event.action === "later") return;

  const target = new URL(
    event.notification.data?.url || "/app/home",
    self.location.origin,
  ).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) => {
        const open = windows.find((w) => w.url.startsWith(self.location.origin));
        if (open) {
          return open
            .focus()
            .then((w) => (w || open).navigate(target))
            .catch(() => self.clients.openWindow(target));
        }
        return self.clients.openWindow(target);
      }),
  );
});
