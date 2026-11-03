// Offline support: network first so updates arrive at once, cached copy when the network is slow or gone.
const CACHE = 'liuxian-v1';
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'styles/app.css',
  'icons/icon.svg',
  'src/main.js',
  'src/store.js',
  'src/data/songs.js',
  'src/music/theory.js',
  'src/music/chords.js',
  'src/music/format.js',
  'src/render/score.js',
  'src/render/chord-diagram.js',
  'src/audio/engine.js',
  'src/audio/sequencer.js',
  'src/audio/song-source.js',
  'src/ui/dom.js',
  'src/ui/theme.js',
  'src/ui/chord-panel.js',
  'src/views/library.js',
  'src/views/song.js',
  'src/views/editor.js',
  'src/views/chords.js',
  'src/views/rhythm.js',
  'src/views/tools.js',
];
// On stage Wi-Fi a request can hang for a long time; after this the cached copy answers.
const NETWORK_TIMEOUT = 2500;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // no-cache: revalidate with the server. Static hosts send no Cache-Control, and the browser's heuristic
    // freshness would otherwise serve an old module next to new ones after an update.
    const network = fetch(req, { cache: 'no-cache' }).then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    });
    const timeout = new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT));
    try {
      const res = await Promise.race([network, timeout]);
      if (res) return res;
    } catch {
      // offline: fall through to the cache
    }
    return (await cache.match(req, { ignoreSearch: true })) ?? network;
  })());
});
