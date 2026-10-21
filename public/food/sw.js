// Only used to show "New order" notifications from the receive page and to
// bring that tab back to the front when one is tapped.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const tab = clients.find((client) => client.url.includes("/food/receive"));
      return tab ? tab.focus() : self.clients.openWindow("/food/receive");
    }),
  );
});
