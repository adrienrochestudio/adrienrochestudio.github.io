// Changer VERSION à chaque déploiement, sinon l'iPhone garde l'ancienne version.
const VERSION = "v1";
const CACHE = `soiree-cheese-${VERSION}`;
const FICHIERS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./quiz.json",
  "./manifest.webmanifest",
  "./petite-souris.png",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHIERS)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(cles.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "activer") self.skipWaiting();
});

function mettreEnCache(req, rep) {
  if (rep && rep.ok) {
    const copie = rep.clone();
    caches.open(CACHE).then((c) => c.put(req, copie));
  }
  return rep;
}

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;

  // quiz.json : réseau d'abord, cache si hors ligne.
  if (url.pathname.endsWith("/quiz.json")) {
    e.respondWith(
      fetch(e.request, { cache: "no-store" })
        .then((rep) => mettreEnCache("./quiz.json", rep))
        .catch(() => caches.match("./quiz.json"))
    );
    return;
  }

  // Fichiers de l'app : cache d'abord.
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((enCache) =>
      enCache ||
      fetch(e.request).then((rep) => mettreEnCache(e.request, rep))
        .catch(() => (e.request.mode === "navigate" ? caches.match("./index.html") : undefined))
    )
  );
});
