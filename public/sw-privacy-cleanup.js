// Delete the legacy navigation cache, which may contain authenticated SSR HTML.
// The precached offline shell remains available without retaining user pages.
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.delete("tf-pages"));
});
