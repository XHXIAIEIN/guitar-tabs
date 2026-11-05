// Song page for practice, and the same page in performance mode (big chords + lyrics, stage colours).
import { config } from '../../core/config.js';
import { t } from '../../core/i18n.js';
import { h } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { iconButton } from '../../ui/controls.js';
import { closePanel } from '../../ui/panel.js';
import { toast } from '../../ui/toast.js';
import { holdScreen } from '../../ui/wake-lock.js';
import { openChordPanel } from '../../ui/chord-panel.js';
import { state, save, setSetting } from '../../state/store.js';
import { getEntry, parse, setVersion } from '../../state/songs.js';
import { prefsFor, savePrefs } from '../../state/prefs.js';
import { renderScore } from '../../render/score/score.js';
import { chordShapes } from '../../music/chord-shapes.js';
import { transposeChord } from '../../music/chord-name.js';
import { parseKey, prettyKey, transposeKey } from '../../music/key.js';
import { numberTonic } from '../../music/numbers.js';
import { pretty } from '../../music/pitch.js';
import { Sequencer } from '../../audio/sequencer.js';
import { songSource } from '../../audio/song-source.js';
import { resumeGuitar } from '../../audio/guitar.js';
import { notFound } from '../not-found.js';
import { renderSongInfo } from './info.js';
import { songKeyHandler } from './keyboard.js';
import { openCapoPanel } from './panels/capo.js';
import { openDisplayPanel } from './panels/display.js';
import { openPracticePanel } from './panels/practice.js';
import { openTempoPanel } from './panels/tempo.js';

/** @param opts perform: performance mode; list: true when opened from the setlist */
export function songView(root, id, opts = {}) {
  const entry = getEntry(id);
  if (!entry) return notFound(root);
  const perform = !!opts.perform;
  const song = parse(entry.text);
  const meta = song.meta;
  const m = song.meter;
  const baseKey = parseKey(meta.key);
  const settings = state.settings;
  const prefs = prefsFor(entry.prefsId, song);
  const canTranspose = !song.hasEvents;
  if (!canTranspose) prefs.transpose = 0;
  const hasLyrics = song.bars.some((b) => b.lyric || b.events.some((e) => e.lyric));
  if (perform) prefs.performShow ??= { tab: !hasLyrics || !song.chordsUsed.length, numbers: false, rhythm: false, lyrics: true, chords: true };
  const live = { metronome: perform ? false : settings.metronome, guitar: perform ? false : settings.guitar };
  const seq = new Sequencer();
  const last = song.bars.length - 1;
  const setlist = opts.list ? state.setlist : null;
  const nextId = setlist ? setlist[setlist.indexOf(id) + 1] : null;

  let handle = null;
  let playing = false;
  let cursor = prefs.loop ? prefs.loop[0] : 0;
  let current = null;
  let selecting = null; // null, 'first', or the first bar index while picking a loop
  let following = true; // page scrolls with the playing bar
  let releaseScreen = perform ? holdScreen() : null;
  let renderedWidth = 0;
  const tempoListeners = new Set();

  const shapeKey = () => transposeKey(baseKey, prefs.transpose);
  const soundKey = () => transposeKey(shapeKey(), prefs.capo);
  const chordName = (name) => transposeChord(name, prefs.transpose, shapeKey());
  const chordLabel = (name) => pretty(chordName(name));
  const shapeOf = (name) => chordShapes(chordName(name))[0]?.frets ?? null;
  const tonic = numberTonic(song.melody, baseKey, meta.octave);
  const show = () => (perform ? prefs.performShow : settings.show);
  const zoom = () => {
    const { narrowBelow, narrow, wide } = config.song.zoom;
    return (perform ? settings.performZoom : settings.zoom) * (innerWidth < narrowBelow ? narrow : wide);
  };
  const persistPrefs = () => savePrefs(entry.prefsId, prefs);
  const restartIfPlaying = () => {
    if (playing) start(current ?? cursor);
  };

  // ---------- layout ----------
  const topbar = h('header', { class: 'topbar' },
    iconButton('back', perform ? t('song.exitPerform') : t('common.back'), () => (history.length > 1 ? history.back() : (location.hash = '#/'))),
    h('div', { class: 'top-title' }, h('strong', null, meta.title), meta.artist ? h('span', null, meta.artist) : null),
    h('div', { class: 'top-actions' },
      iconButton('eye', t('song.display'), openDisplay, { text: true }),
      iconButton('note', t('song.capoButton'), openCapo, { text: true }),
      perform ? null : iconButton('edit', t('song.edit'), () => (location.hash = `#/edit/${id}`), { text: true }),
      perform ? null : iconButton('stage', t('song.perform'), () => (location.hash = `#/perform/${id}`), { text: true }),
      nextId ? iconButton('next', t('song.next'), () => (location.hash = `#/perform/${nextId}?list`), { text: true }) : null,
    ),
  );
  const info = h('section', { class: 'song-info' });
  const scoreEl = h('div', { class: 'score' });
  const countEl = h('div', { class: 'count-overlay', hidden: true });
  const banner = h('div', { class: 'loop-banner', hidden: true });
  const followBtn = h('button', { class: 'btn follow-btn', type: 'button', hidden: true, onclick: () => { setFollowing(true); follow(current ?? cursor, true); } },
    icon('locate'), h('span', null, t('song.backToPlayhead')));
  const beatStrip = h('div', { class: 'beat-strip', 'aria-hidden': 'true' }, Array.from({ length: m.beats }, () => h('i')));

  const playBtn = h('button', { class: 'btn play-btn', type: 'button', 'aria-label': t('common.play'), title: t('song.playTitle'), onclick: togglePlay }, icon('play'));
  const loopBtn = iconButton('loop', t('song.loop'), onLoopButton, { text: true, cls: 'loop-btn' });
  const bpmOut = h('strong');
  const bpmBtn = h('button', { class: 'btn bpm-btn', type: 'button', title: t('song.changeTempo'), onclick: openTempo }, icon('speed'), bpmOut);
  const metroBtn = iconButton('metronome', t('common.metronome'), () => setLive('metronome', !live.metronome), { cls: 'toggle-btn' });
  const guitarBtn = iconButton('guitar', t('song.demo'), () => setLive('guitar', !live.guitar), { cls: 'toggle-btn' });
  const bpmStep = config.song.bpmStep;
  const transport = h('footer', { class: 'transport' },
    beatStrip,
    h('div', { class: 'transport-row' },
      iconButton('restart', t('song.restart'), () => {
        stop();
        setCursor(prefs.loop ? prefs.loop[0] : 0);
        follow(cursor, true);
      }),
      playBtn,
      loopBtn,
      h('div', { class: 'bpm' }, iconButton('minus', t('song.slower', { n: bpmStep }), () => setBpm(prefs.bpm - bpmStep), { cls: 'wide-only' }), bpmBtn, iconButton('plus', t('song.faster', { n: bpmStep }), () => setBpm(prefs.bpm + bpmStep), { cls: 'wide-only' })),
      h('span', { class: 'spacer' }),
      metroBtn,
      guitarBtn,
      perform
        ? h('span', { class: 'page-btns' }, iconButton('up', t('song.pageUp'), () => page(-1)), iconButton('down', t('song.pageDown'), () => page(1)))
        : iconButton('sliders', t('song.practice'), openPractice),
    ),
  );
  const page$ = h('div', { class: 'song-page' + (perform ? ' perform' : '') + (perform && settings.stage ? ' stage' : '') },
    topbar, h('main', { class: 'song-body' }, info, scoreEl), banner, followBtn, countEl, transport);
  root.append(page$);
  // Hand scrolling stops the following
  // follow() scrolls by script, which fires neither event
  page$.addEventListener('wheel', (e) => { if (e.deltaY) detach(); }, { passive: true });
  page$.addEventListener('touchmove', detach, { passive: true });

  // ---------- info ----------
  function keyText() {
    const shape = prettyKey(shapeKey());
    return prefs.capo ? t('song.keyWithCapo', { shape, capo: prefs.capo, sound: prettyKey(soundKey()) }) : t('common.key', { key: shape });
  }

  function renderInfo() {
    renderSongInfo(info, { id, entry, song, prefs, perform, show: show(), tonic, keyText: keyText(), chordName, chooseVersion, openCapo, openTempo });
  }

  function chooseVersion(version) {
    setVersion(id, version);
    // The router rebuilds the page for the chosen version
    dispatchEvent(new HashChangeEvent('hashchange'));
  }

  // ---------- score ----------
  function renderNow() {
    const width = Math.floor(scoreEl.clientWidth);
    if (!width) return;
    renderedWidth = width;
    handle = renderScore(scoreEl, song, {
      width, scale: zoom(), show: show(), chordLabel, tonic, compact: perform && !show().tab && !show().numbers,
      stringLabels: settings.stringLabels, stringWidth: settings.stringWidth,
    });
    handle.setLoop(...(prefs.loop ?? [null, null]));
    if (!playing) handle.setCursor(cursor);
    if (current !== null) handle.setCurrent(current);
  }
  const ro = new ResizeObserver(() => {
    if (Math.floor(scoreEl.clientWidth) !== renderedWidth) renderNow();
  });
  ro.observe(scoreEl);

  scoreEl.addEventListener('click', (e) => {
    const chordEl = e.target.closest('[data-chord]');
    if (chordEl && selecting === null) return openChordPanel(chordName(chordEl.dataset.chord));
    const barEl = e.target.closest('[data-bar]');
    if (!barEl) return;
    const i = +barEl.dataset.bar;
    if (selecting !== null) return pickLoop(i);
    setCursor(i);
    if (playing) start(i);
  });

  function setCursor(i) {
    cursor = Math.max(0, Math.min(last, i));
    handle?.setCursor(playing ? null : cursor);
  }

  /** Scrolls so the line of bar `i` sits near the top, leaving the following lines visible. */
  function follow(i, force = false) {
    if (!following && !force) return;
    const el = handle?.lineEl(i);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const top = topbar.getBoundingClientRect().bottom + 8;
    const usable = innerHeight - transport.offsetHeight - top;
    if (force || r.top < top || r.top > top + usable * 0.42 || r.bottom > top + usable) {
      scrollBy({ top: r.top - top - 6, behavior: 'smooth' });
    }
  }

  function setFollowing(on) {
    following = on;
    followBtn.hidden = on;
  }

  function detach() {
    if (playing && following && document.documentElement.scrollHeight > innerHeight) setFollowing(false);
  }

  function page(dir) {
    detach();
    const usable = innerHeight - transport.offsetHeight - topbar.offsetHeight - 48;
    scrollBy({ top: dir * usable, behavior: 'smooth' });
  }

  // ---------- playback ----------
  async function start(from) {
    await resumeGuitar();
    if (!page$.isConnected) return;
    const loop = prefs.loop;
    const begin = loop && (from < loop[0] || from > loop[1]) ? loop[0] : from;
    const source = songSource(song, {
      from: begin, loop, countIn: settings.countIn, bpm: prefs.bpm, live, shapeOf, capo: prefs.capo,
      trainer: prefs.trainer.on && loop ? prefs.trainer : null,
    });
    seq.start(source, prefs.bpm, onUi, (bpm) => {
      prefs.bpm = bpm;
      updateBpm();
    });
    playing = true;
    setFollowing(true);
    releaseScreen ??= holdScreen();
    handle.setCursor(null);
    updatePlay();
  }

  function stop() {
    if (!playing) return;
    seq.stop();
    playing = false;
    setFollowing(true);
    countEl.hidden = true;
    markBeat(-1);
    if (current !== null) setCursor(current);
    current = null;
    handle?.setCurrent(null);
    if (!perform) {
      releaseScreen?.();
      releaseScreen = null;
    }
    persistPrefs();
    updatePlay();
  }

  function togglePlay() {
    if (playing) stop();
    else start(cursor);
  }

  function onUi(u) {
    if (u.end) {
      stop();
      setCursor(prefs.loop ? prefs.loop[0] : 0);
      if (nextId) toast(t('song.nextUp', { title: parse(getEntry(nextId).text).meta.title }), [t('common.start'), () => (location.hash = `#/perform/${nextId}?list`)]);
      return;
    }
    if (u.count) {
      countEl.hidden = false;
      countEl.textContent = u.count;
      countEl.classList.toggle('last', u.count === u.of);
      markBeat(u.count - 1);
      return;
    }
    if (u.beat !== undefined) {
      countEl.hidden = true;
      markBeat(u.beat);
      return;
    }
    if (u.bar !== current) {
      current = u.bar;
      follow(u.bar);
    }
    handle.setCurrent(u.bar, u.ev);
  }

  function markBeat(k) {
    [...beatStrip.children].forEach((el, i) => {
      el.classList.toggle('on', i === k);
      el.classList.toggle('accent', i === k && k === 0);
    });
  }

  function updatePlay() {
    playBtn.replaceChildren(icon(playing ? 'pause' : 'play'));
    playBtn.setAttribute('aria-label', playing ? t('common.pause') : t('common.play'));
    playBtn.classList.toggle('on', playing);
  }

  function setBpm(v) {
    const [min, max] = config.format.limits.bpm;
    prefs.bpm = Math.max(min, Math.min(max, Math.round(v)));
    if (playing) seq.setBpm(prefs.bpm);
    updateBpm();
    persistPrefs();
  }

  function updateBpm() {
    bpmOut.textContent = prefs.bpm;
    bpmBtn.classList.toggle('changed', prefs.bpm !== meta.bpm);
    tempoListeners.forEach((fn) => fn());
  }

  function setLive(kind, on) {
    live[kind] = on;
    if (!perform) setSetting(kind, on);
    updateToggles();
  }

  function updateToggles() {
    metroBtn.classList.toggle('on', live.metronome);
    metroBtn.setAttribute('aria-pressed', String(live.metronome));
    guitarBtn.classList.toggle('on', live.guitar);
    guitarBtn.setAttribute('aria-pressed', String(live.guitar));
  }

  // ---------- loop ----------
  const loopLabel = () => loopBtn.querySelector('span:last-child');

  function onLoopButton() {
    if (selecting !== null) return endSelect();
    if (prefs.loop) {
      const old = prefs.loop;
      setLoop(null);
      toast(t('song.loopCancelled', { from: old[0] + 1, to: old[1] + 1 }), [t('common.undo'), () => setLoop(old)]);
      return;
    }
    selecting = 'first';
    showBanner(t('song.loopPickFirst'));
  }

  function pickLoop(i) {
    if (selecting === 'first') {
      selecting = i;
      handle.setLoop(i, i);
      showBanner(t('song.loopPickLast', { n: i + 1 }));
      return;
    }
    const range = [Math.min(selecting, i), Math.max(selecting, i)];
    endSelect();
    setLoop(range);
    setCursor(range[0]);
    if (playing) start(range[0]);
  }

  function endSelect() {
    selecting = null;
    banner.hidden = true;
    handle.setLoop(...(prefs.loop ?? [null, null]));
    scoreEl.classList.remove('selecting');
  }

  function showBanner(msg) {
    scoreEl.classList.add('selecting');
    banner.hidden = false;
    banner.replaceChildren(h('span', null, msg), h('button', { class: 'btn small', type: 'button', onclick: endSelect }, t('common.cancel')));
  }

  function setLoop(range) {
    prefs.loop = range;
    persistPrefs();
    handle.setLoop(...(range ?? [null, null]));
    loopBtn.classList.toggle('on', !!range);
    loopLabel().textContent = range ? `${range[0] + 1}–${range[1] + 1}` : t('song.loop');
    if (playing) start(range ? range[0] : current ?? cursor);
  }

  // ---------- panels ----------
  function openTempo() {
    openTempoPanel({ prefs, meta, setBpm, listeners: tempoListeners });
  }

  function openPractice() {
    openPracticePanel({ prefs, savePrefs: persistPrefs, restartIfPlaying });
  }

  function openDisplay() {
    openDisplayPanel({
      perform,
      show: show(),
      saveShow: perform ? persistPrefs : save,
      refresh: () => {
        renderInfo();
        renderNow();
      },
      renderScore: renderNow,
      setStage: (on) => page$.classList.toggle('stage', on),
    });
  }

  function openCapo() {
    openCapoPanel({
      song, baseKey, prefs, canTranspose, shapeKey, soundKey,
      apply: (patch) => {
        Object.assign(prefs, patch);
        persistPrefs();
        renderInfo();
        renderNow();
        restartIfPlaying();
      },
    });
  }

  // ---------- keyboard ----------
  const onKey = songKeyHandler(perform, {
    togglePlay,
    page,
    detach,
    moveCursor: (delta) => {
      setCursor(cursor + delta);
      follow(cursor);
      if (playing) start(cursor);
    },
    toggleLoop: onLoopButton,
    nudgeBpm: (dir) => setBpm(prefs.bpm + dir * bpmStep),
    toggleMetronome: () => setLive('metronome', !live.metronome),
  });
  addEventListener('keydown', onKey);

  // ---------- init ----------
  renderInfo();
  updateBpm();
  updateToggles();
  updatePlay();
  if (prefs.loop) {
    loopBtn.classList.add('on');
    loopLabel().textContent = `${prefs.loop[0] + 1}–${prefs.loop[1] + 1}`;
  }
  renderNow();
  scrollTo(0, 0);

  return () => {
    seq.stop();
    playing = false;
    ro.disconnect();
    removeEventListener('keydown', onKey);
    releaseScreen?.();
    closePanel();
    persistPrefs();
  };
}
