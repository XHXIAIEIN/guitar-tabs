// Offline support: network first so updates arrive at once, cached copy when the network is slow or gone.
const CACHE = 'guitar-v4';
// Caches this app may delete: its own versions and those of the app it replaced at each published path.
// One origin hosts several sites, so Cache Storage also holds other sites' caches.
const OWN_CACHES = /^(guitar-v\d|guitar-tabs-(cafcda4b|ac0a22bf)-)/;
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'config/app.json',
  'lang/zh_CN.json',
  'scores/index.json',
  'scores/exercise/ex-arpeggio-68/full.txt',
  'scores/exercise/ex-arpeggio-68/simple.txt',
  'scores/exercise/ex-arpeggio/full.txt',
  'scores/exercise/ex-arpeggio/simple.txt',
  'scores/exercise/ex-c-scale/full.txt',
  'scores/exercise/ex-c-scale/simple.txt',
  'scores/exercise/ex-folk-strum/full.txt',
  'scores/exercise/ex-folk-strum/simple.txt',
  'scores/exercise/ex-spider/full.txt',
  'scores/exercise/ex-spider/simple.txt',
  'scores/exercise/ex-strum-eighth/full.txt',
  'scores/exercise/ex-strum-eighth/simple.txt',
  'scores/exercise/ex-strum-quarter/full.txt',
  'scores/exercise/ex-strum-quarter/simple.txt',
  'scores/game/mario-bros/mario-bros.txt',
  'scores/game/pac-man/pac-man.txt',
  'scores/game/super-mario/super-mario.txt',
  'scores/game/tetris/tetris.txt',
  'scores/game/zelda-lost-woods/zelda-lost-woods.txt',
  'scores/game/zelda-lullaby/zelda-lullaby.txt',
  'scores/game/zelda-overworld/zelda-overworld.txt',
  'scores/game/zelda-song-of-storms/zelda-song-of-storms.txt',
  'scores/song/amazing-grace/amazing-grace.txt',
  'scores/song/farewell/full.txt',
  'scores/song/farewell/simple.txt',
  'scores/song/happy-birthday/full.txt',
  'scores/song/happy-birthday/simple.txt',
  'scores/song/mary-lamb/mary-lamb.txt',
  'scores/song/ode-to-joy/full.txt',
  'scores/song/ode-to-joy/simple.txt',
  'scores/song/perfect/perfect.txt',
  'scores/song/twinkle/full.txt',
  'scores/song/twinkle/simple.txt',
  'scores/song/two-tigers/full.txt',
  'scores/song/two-tigers/simple.txt',
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
  'src/core/config.js',
  'src/core/i18n.js',
  'src/core/storage.js',
  'src/music/chord-name.js',
  'src/music/chord-shapes.js',
  'src/music/chord-tones.js',
  'src/music/format/events.js',
  'src/music/format/meter.js',
  'src/music/format/parse-song.js',
  'src/music/format/pattern.js',
  'src/music/format/syntax.js',
  'src/music/numbers.js',
  'src/music/key.js',
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
  'src/styles/chord.css',
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
  'src/ui/panel.js',
  'src/ui/tap-tempo.js',
  'src/ui/theme.js',
  'src/ui/toast.js',
  'src/ui/wake-lock.js',
  'src/views/chords/chords-view.js',
  'src/views/chords/drill.js',
  'src/views/chords/library.js',
  'src/views/chords/minute.js',
  'src/views/editor/editor-view.js',
  'src/views/library/backup-controls.js',
  'src/views/library/library-view.js',
  'src/views/library/setlist.js',
  'src/views/library/song-row.js',
  'src/views/not-found.js',
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
  'src/views/tools/tools-view.js',
  'src/views/tools/tuner.js',
  // the pitches in audio.samples.recordings of config/app.json
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
