// Offline support: network first so updates arrive at once, cached copy when the network is slow or gone.
const CACHE = 'guitar-v10';
// Caches this app may delete: its own versions and those of the app it replaced at each published path.
// One origin hosts several sites, so Cache Storage also holds other sites' caches.
const OWN_CACHES = /^(guitar-v\d|guitar-tabs-(cafcda4b|ac0a22bf)-)/;
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'scores/index.json',
  'scores/anime/crayon-shin-chan.atex',
  'scores/anime/doraemon.atex',
  'scores/anime/huluwa.atex',
  'scores/anime/totoro.atex',
  'scores/game/mario-bros.atex',
  'scores/game/pac-man.atex',
  'scores/game/super-mario.atex',
  'scores/game/tetris.atex',
  'scores/game/zelda-lullaby.atex',
  'scores/game/zelda-overworld.atex',
  'scores/game/zelda-sarias-song.atex',
  'scores/game/zelda-song-of-storms.atex',
  'scores/pop/really-love-you.atex',
  'scores/practice/amazing-grace/full.atex',
  'scores/practice/amazing-grace/simple.atex',
  'scores/practice/castle-in-the-sky/full.atex',
  'scores/practice/castle-in-the-sky/simple.atex',
  'scores/practice/farewell/full.atex',
  'scores/practice/farewell/simple.atex',
  'scores/practice/find-friends/full.atex',
  'scores/practice/find-friends/simple.atex',
  'scores/practice/happy-birthday/full.atex',
  'scores/practice/happy-birthday/simple.atex',
  'scores/practice/jasmine-flower.atex',
  'scores/practice/jingle-bells/full.atex',
  'scores/practice/jingle-bells/simple.atex',
  'scores/practice/little-bee/full.atex',
  'scores/practice/little-bee/simple.atex',
  'scores/practice/london-bridge/full.atex',
  'scores/practice/london-bridge/simple.atex',
  'scores/practice/mary-lamb.atex',
  'scores/practice/new-year/full.atex',
  'scores/practice/new-year/simple.atex',
  'scores/practice/nokia-tune.atex',
  'scores/practice/ode-to-joy/full.atex',
  'scores/practice/ode-to-joy/simple.atex',
  'scores/practice/painter/full.atex',
  'scores/practice/painter/simple.atex',
  'scores/practice/red-river-valley/full.atex',
  'scores/practice/red-river-valley/simple.atex',
  'scores/practice/row-your-boat/full.atex',
  'scores/practice/row-your-boat/simple.atex',
  'scores/practice/saints/full.atex',
  'scores/practice/saints/simple.atex',
  'scores/practice/twinkle/full.atex',
  'scores/practice/twinkle/simple.atex',
  'scores/practice/two-tigers/full.atex',
  'scores/practice/two-tigers/simple.atex',
  'scores/song/perfect.cho',
  'assets/icons/icon.svg',
  'assets/textures/tuner-wood.webp',
  'src/app/main.js',
  'src/app/router.js',
  'src/app/shell.js',
  'src/audio/click.js',
  'src/audio/context.js',
  'src/audio/guitar.js',
  'src/audio/pitch-detect.js',
  'src/audio/samples.js',
  'src/audio/sequencer.js',
  'src/audio/song-source.js',
  'src/config.json',
  'src/core/config.js',
  'src/core/i18n.js',
  'src/core/storage.js',
  'src/lang/zh_CN.json',
  'src/music/chord-name.js',
  'src/music/chord-shapes.js',
  'src/music/chord-tones.js',
  'src/music/format/alphatex.js',
  'src/music/format/chordpro.js',
  'src/music/format/events.js',
  'src/music/format/meter.js',
  'src/music/format/parse-song.js',
  'src/music/format/pattern.js',
  'src/music/format/syntax.js',
  'src/music/import/load-score.js',
  'src/music/import/to-alphatex.js',
  'src/music/key.js',
  'src/music/numbers.js',
  'src/music/pitch.js',
  'src/render/chord-diagram.js',
  'src/render/score/bar.js',
  'src/render/score/glyphs.js',
  'src/render/score/layout.js',
  'src/render/score/marks.js',
  'src/render/score/measure.js',
  'src/render/score/score.js',
  'src/render/svg.js',
  'src/state/backup.js',
  'src/state/prefs.js',
  'src/state/setlist.js',
  'src/state/songs.js',
  'src/state/store.js',
  'src/styles/app.css',
  'src/styles/base.css',
  'src/styles/chord-diagram.css',
  'src/styles/chords.css',
  'src/styles/controls.css',
  'src/styles/editor.css',
  'src/styles/library.css',
  'src/styles/panels.css',
  'src/styles/responsive.css',
  'src/styles/rhythm.css',
  'src/styles/score.css',
  'src/styles/shell.css',
  'src/styles/song.css',
  'src/styles/tokens.css',
  'src/styles/tools.css',
  'src/styles/topbar.css',
  'src/styles/transport.css',
  'src/ui/chord-diagram-el.js',
  'src/ui/chord-panel.js',
  'src/ui/controls.js',
  'src/ui/dom.js',
  'src/ui/icons.js',
  'src/ui/not-found.js',
  'src/ui/panel.js',
  'src/ui/theme.js',
  'src/ui/toast.js',
  'src/ui/wake-lock.js',
  'src/views/chords/chords-view.js',
  'src/views/chords/drill.js',
  'src/views/chords/library.js',
  'src/views/chords/minute.js',
  'src/views/editor/editor-view.js',
  'src/views/library/backup-controls.js',
  'src/views/library/import-score.js',
  'src/views/library/library-view.js',
  'src/views/library/setlist.js',
  'src/views/library/song-row.js',
  'src/views/rhythm/rhythm-view.js',
  'src/views/rhythm/steps.js',
  'src/views/rhythm/tap-test.js',
  'src/views/song/bar-tool.js',
  'src/views/song/info.js',
  'src/views/song/keyboard.js',
  'src/views/song/panels/capo.js',
  'src/views/song/panels/display.js',
  'src/views/song/panels/practice.js',
  'src/views/song/panels/tempo.js',
  'src/views/song/song-view.js',
  'src/views/tools/metronome.js',
  'src/views/tools/tap-tempo.js',
  'src/views/tools/tools-view.js',
  'src/views/tools/tuner.js',
  // the pitches in audio.samples.recordings of src/config.json
  ...[40, 43, 47, 50, 53, 56, 59, 62, 65, 69, 72, 75, 78, 81, 84].map((midi) => `assets/audio/guitar/${midi}.sample`),
];
// On stage Wi-Fi a request can hang for a long time; after this the cached copy answers.
const NETWORK_TIMEOUT = 2500;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && OWN_CACHES.test(k)).map((k) => caches.delete(k))))
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
