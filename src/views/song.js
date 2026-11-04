// Song page for practice, and the same page in performance mode (big chords + lyrics, stage colours).
import { h, fill, icon, iconButton, segmented, toggle, stepper, openPanel, closePanel, toast, holdScreen } from '../ui/dom.js';
import { openChordPanel } from '../ui/chord-panel.js';
import { applyTheme } from '../ui/theme.js';
import { state, save, setSetting, getEntry, parse, prefsFor, savePrefs, setVersion } from '../store.js';
import { renderScore } from '../render/score.js';
import { chordDiagram } from '../render/chord-diagram.js';
import { chordShapes, isEasyChord } from '../music/chords.js';
import { parseKey, transposeKey, transposeChord, pretty, prettyKey, jianpuTonic, keyFromPc, mod12 } from '../music/theory.js';
import { patternSong, describeStrum } from '../music/format.js';
import { Sequencer } from '../audio/sequencer.js';
import { songSource } from '../audio/song-source.js';
import { resumeGuitar, setVolume } from '../audio/engine.js';

export function notFound(root) {
  root.append(h('div', { class: 'empty-page' }, h('p', null, '找不到这首曲谱，可能已经删除了。'), h('a', { class: 'btn primary', href: '#/' }, '回到曲谱列表')));
  return () => {};
}

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
  const performShow = { tab: !hasLyrics || !song.chordsUsed.length, jianpu: false, lyrics: true, chords: true };
  const live = { metronome: perform ? false : settings.metronome, guitar: perform ? false : settings.guitar };
  const trainer = { on: false, step: 2, max: Math.min(240, Math.round(meta.bpm * 1.25)) };
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

  const shapeKey = () => transposeKey(baseKey, prefs.transpose);
  const soundKey = () => transposeKey(shapeKey(), prefs.capo);
  const chordName = (name) => transposeChord(name, prefs.transpose, shapeKey());
  const chordLabel = (name) => pretty(chordName(name));
  const shapeOf = (name) => chordShapes(chordName(name))[0]?.frets ?? null;
  const tonic = jianpuTonic(song.melody, baseKey, meta.jianpu);
  const show = () => (perform ? performShow : settings.show);
  const zoom = () => (perform ? settings.performZoom : settings.zoom) * (innerWidth < 560 ? 0.94 : 1.08);

  // ---------- layout ----------
  const topbar = h('header', { class: 'topbar' },
    iconButton('back', perform ? '退出演出' : '返回', () => (history.length > 1 ? history.back() : (location.hash = '#/'))),
    h('div', { class: 'top-title' }, h('strong', null, meta.title), meta.artist ? h('span', null, meta.artist) : null),
    h('div', { class: 'top-actions' },
      iconButton('eye', '显示', openDisplay, { text: true }),
      iconButton('capo', '变调', openCapo, { text: true }),
      perform ? null : iconButton('edit', '编辑', () => (location.hash = `#/edit/${id}`), { text: true }),
      perform ? null : iconButton('stage', '演出', () => (location.hash = `#/perform/${id}`), { text: true }),
      nextId ? iconButton('next', '下一首', () => (location.hash = `#/perform/${nextId}?list`), { text: true }) : null,
    ),
  );
  const info = h('section', { class: 'song-info' });
  const scoreEl = h('div', { class: 'score' });
  const countEl = h('div', { class: 'count-overlay', hidden: true });
  const banner = h('div', { class: 'loop-banner', hidden: true });
  const followBtn = h('button', { class: 'btn follow-btn', type: 'button', hidden: true, onclick: () => { setFollowing(true); follow(current ?? cursor, true); } },
    icon('locate'), h('span', null, '回到播放位置'));
  const beatStrip = h('div', { class: 'beat-strip', 'aria-hidden': 'true' }, Array.from({ length: m.beats }, () => h('i')));

  const playBtn = h('button', { class: 'btn play-btn', type: 'button', 'aria-label': '播放', title: '播放 / 暂停（空格）', onclick: togglePlay }, icon('play'));
  const loopBtn = iconButton('loop', '循环', onLoopButton, { text: true, cls: 'loop-btn' });
  const bpmOut = h('strong');
  const bpmBtn = h('button', { class: 'btn bpm-btn', type: 'button', title: '调整速度', onclick: openTempo }, h('small', null, '♩='), bpmOut);
  const metroBtn = iconButton('metronome', '节拍器', () => setLive('metronome', !live.metronome), { cls: 'toggle-btn' });
  const guitarBtn = iconButton('guitar', '示范音', () => setLive('guitar', !live.guitar), { cls: 'toggle-btn' });
  const transport = h('footer', { class: 'transport' },
    beatStrip,
    h('div', { class: 'transport-row' },
      iconButton('restart', '回到开头', () => {
        stop();
        setCursor(prefs.loop ? prefs.loop[0] : 0);
        follow(cursor, true);
      }),
      playBtn,
      loopBtn,
      h('div', { class: 'bpm' }, iconButton('minus', '减慢 5', () => setBpm(prefs.bpm - 5), { cls: 'wide-only' }), bpmBtn, iconButton('plus', '加快 5', () => setBpm(prefs.bpm + 5), { cls: 'wide-only' })),
      h('span', { class: 'spacer' }),
      metroBtn,
      guitarBtn,
      perform
        ? h('span', { class: 'page-btns' }, iconButton('up', '上一屏', () => page(-1)), iconButton('down', '下一屏', () => page(1)))
        : iconButton('sliders', '练习设置', openPractice),
    ),
  );
  const page$ = h('div', { class: 'song-page' + (perform ? ' perform' : '') + (perform && settings.stage !== false ? ' stage' : '') },
    topbar, h('main', { class: 'song-body' }, info, scoreEl), banner, followBtn, countEl, transport);
  root.append(page$);
  // Hand scrolling stops the following
  // follow() scrolls by script, which fires neither event
  page$.addEventListener('wheel', (e) => { if (e.deltaY) detach(); }, { passive: true });
  page$.addEventListener('touchmove', detach, { passive: true });

  // ---------- info ----------
  function keyText() {
    const k = prettyKey(shapeKey());
    return prefs.capo ? `${k} 调指法 · 夹 ${prefs.capo} 品 → 实际 ${prettyKey(soundKey())} 调` : `${k} 调`;
  }

  function renderInfo() {
    const chip = (t, onclick) => (onclick ? h('button', { class: 'chip', type: 'button', onclick }, t) : h('span', { class: 'chip' }, t));
    const errors = song.errors.concat(song.warnings);
    fill(info,
      h('div', { class: 'chips' },
        entry.version ? chip(entry.version.name, openPractice) : null,
        chip(keyText(), openCapo),
        chip(meta.time.join('/')),
        chip(`♩ = ${prefs.bpm}${prefs.bpm !== meta.bpm ? `（原速 ${meta.bpm}）` : ''}`, openTempo),
        meta.level ? chip(meta.level) : null,
      ),
      meta.note && !perform ? h('p', { class: 'song-note' }, meta.note) : null,
      song.chordsUsed.length && show().chords
        ? h('div', { class: 'chord-strip', role: 'list', 'aria-label': '本曲和弦' },
            song.chordsUsed.map((c) => {
              const name = chordName(c);
              const shape = chordShapes(name)[0];
              return h('button', { class: 'chord-card', type: 'button', role: 'listitem', title: `${pretty(name)} 的按法`, onclick: () => openChordPanel(name) },
                shape ? h('span', { class: 'diagram', html: chordDiagram(shape, { name: pretty(name), chord: name }) }) : h('strong', null, pretty(name)));
            }))
        : null,
      song.strum && !perform ? strumBox() : null,
      errors.length && !perform
        ? h('div', { class: 'alert' },
            h('strong', null, `这份曲谱有 ${errors.length} 处需要修改`),
            h('ul', null, errors.slice(0, 4).map((e) => h('li', null, `第 ${e.line} 行：${e.message}`))),
            h('a', { href: `#/edit/${id}` }, '去编辑'))
        : null,
    );
  }

  function strumBox() {
    const box = h('div', { class: 'strum-box' }, h('div', { class: 'strum-head' }, h('strong', null, '节奏型'), h('span', null, describeStrum(song.strum, m))));
    const sc = h('div', { class: 'score mini' });
    box.append(sc);
    requestAnimationFrame(() => {
      if (!sc.isConnected) return;
      renderScore(sc, patternSong(song.strum, meta.time), {
        width: Math.min(sc.clientWidth, 340), scale: 1, show: { tab: true, jianpu: false, lyrics: false, chords: false }, chordLabel: pretty, tonic, barNumbers: false,
      });
    });
    return box;
  }

  // ---------- score ----------
  function renderNow() {
    const width = Math.floor(scoreEl.clientWidth);
    if (!width) return;
    renderedWidth = width;
    handle = renderScore(scoreEl, song, { width, scale: zoom(), show: show(), chordLabel, tonic, compact: perform && !show().tab && !show().jianpu });
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
      trainer: trainer.on && loop ? trainer : null,
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
    savePrefs(entry.prefsId, prefs);
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
      if (nextId) toast(`下一首：${parse(getEntry(nextId).text).meta.title}`, ['开始', () => (location.hash = `#/perform/${nextId}?list`)]);
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
    playBtn.setAttribute('aria-label', playing ? '暂停' : '播放');
    playBtn.classList.toggle('on', playing);
  }

  function setBpm(v) {
    prefs.bpm = Math.max(20, Math.min(320, Math.round(v)));
    if (playing) seq.setBpm(prefs.bpm);
    updateBpm();
    savePrefs(entry.prefsId, prefs);
  }

  function updateBpm() {
    bpmOut.textContent = prefs.bpm;
    bpmBtn.classList.toggle('changed', prefs.bpm !== meta.bpm);
    tempoListeners.forEach((fn) => fn());
  }
  const tempoListeners = new Set();

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
  function onLoopButton() {
    if (selecting !== null) return endSelect();
    if (prefs.loop) {
      const old = prefs.loop;
      setLoop(null);
      toast(`已取消第 ${old[0] + 1}–${old[1] + 1} 小节的循环`, ['撤销', () => setLoop(old)]);
      return;
    }
    selecting = 'first';
    showBanner('点选循环的第一个小节');
  }

  function pickLoop(i) {
    if (selecting === 'first') {
      selecting = i;
      handle.setLoop(i, i);
      showBanner(`从第 ${i + 1} 小节开始，再点选最后一个小节（可以是同一个）`);
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
    banner.replaceChildren(h('span', null, msg), h('button', { class: 'btn small', type: 'button', onclick: endSelect }, '取消'));
  }

  function setLoop(range) {
    prefs.loop = range;
    savePrefs(entry.prefsId, prefs);
    handle.setLoop(...(range ?? [null, null]));
    loopBtn.classList.toggle('on', !!range);
    loopBtn.querySelector('span:last-child').textContent = range ? `${range[0] + 1}–${range[1] + 1}` : '循环';
    if (playing) start(range ? range[0] : current ?? cursor);
  }

  // ---------- panels ----------
  function openTempo() {
    const pct = h('span', { class: 'muted' });
    const big = h('output', { class: 'tempo-big' });
    const slider = h('input', { type: 'range', min: 30, max: 240, step: 1, value: prefs.bpm, 'aria-label': '速度', oninput: () => setBpm(+slider.value) });
    const sync = () => {
      big.textContent = prefs.bpm;
      slider.value = prefs.bpm;
      pct.textContent = `原速 ${meta.bpm} 的 ${Math.round((prefs.bpm / meta.bpm) * 100)}%`;
    };
    tempoListeners.add(sync);
    sync();
    const taps = [];
    const tap = () => {
      const now = performance.now();
      if (taps.length && now - taps[taps.length - 1] > 2000) taps.length = 0;
      taps.push(now);
      if (taps.length >= 3) {
        const recent = taps.slice(-6);
        setBpm((60000 * (recent.length - 1)) / (recent[recent.length - 1] - recent[0]));
      }
    };
    openPanel('速度', h('div', { class: 'stack' },
      h('div', { class: 'tempo-row' }, big, h('span', null, 'BPM'), pct),
      slider,
      h('div', { class: 'row wrap gap-s' },
        ...[-5, -1, 1, 5].map((d) => h('button', { class: 'btn', type: 'button', onclick: () => setBpm(prefs.bpm + d) }, d > 0 ? `+${d}` : d)),
        h('span', { class: 'spacer' }),
        h('button', { class: 'btn', type: 'button', onclick: tap }, '点击测速'),
      ),
      h('div', { class: 'row wrap gap-s' },
        h('span', { class: 'muted' }, '常用：'),
        ...[0.5, 0.75, 0.9, 1].map((r) => h('button', { class: 'btn small', type: 'button', onclick: () => setBpm(meta.bpm * r) }, r === 1 ? '原速' : `${r * 100}%`)),
      ),
      h('p', { class: 'hint' }, '新曲先用 50%–75% 的速度弹准，再逐步加快。'),
    ), { onclose: () => tempoListeners.delete(sync) });
  }

  function openPractice() {
    const trainerBox = h('div', { class: 'stack' });
    const renderTrainer = () => {
      fill(trainerBox,
        toggle('循环时逐步加速', trainer.on, (v) => {
          trainer.on = v;
          renderTrainer();
          if (v && !prefs.loop) toast('先点「循环」选好要练的小节，加速会在每次重新开始时生效');
          if (playing) start(current ?? cursor);
        }),
        trainer.on
          ? h('div', { class: 'row wrap gap-m' },
              h('label', { class: 'field-inline' }, '每轮', stepper(trainer.step, { min: 1, max: 10, label: '每轮增加', format: (v) => `+${v}`, onchange: (v) => (trainer.step = v) })),
              h('label', { class: 'field-inline' }, '最高', stepper(trainer.max, { min: 40, max: 240, step: 5, label: '最高速度', onchange: (v) => (trainer.max = v) })))
          : null,
      );
    };
    renderTrainer();
    const volume = (key, kind) => h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: settings[key], 'aria-label': kind, oninput: (e) => { setSetting(key, +e.target.value); setVolume(kind, +e.target.value); } });
    openPanel('练习设置', h('div', { class: 'stack' },
      entry.version
        ? h('div', { class: 'field' }, h('label', null, '版本'),
            segmented(entry.versions.map((v) => [v.id, v.name]), entry.version.id, (v) => {
              setVersion(id, v);
              // The router rebuilds the page for the chosen version
              dispatchEvent(new HashChangeEvent('hashchange'));
            }))
        : null,
      h('div', { class: 'field' }, h('label', null, '预备拍'), segmented([[0, '无'], [1, '1 小节'], [2, '2 小节']], settings.countIn, (v) => setSetting('countIn', v))),
      h('div', { class: 'field' }, h('label', null, '节拍器音量'), volume('volMetronome', 'metronome')),
      h('div', { class: 'field' }, h('label', null, '示范音音量'), volume('volGuitar', 'guitar')),
      trainerBox,
      h('p', { class: 'hint' }, '快捷键：空格 播放/暂停 · ←/→ 移动起点 · L 循环 · +/− 速度 · M 节拍器'),
    ));
  }

  function openDisplay() {
    const sh = show();
    const zoomKey = perform ? 'performZoom' : 'zoom';
    const changed = () => {
      if (!perform) save();
      renderInfo();
      renderNow();
    };
    openPanel('显示', h('div', { class: 'stack' },
      h('div', { class: 'toggle-grid' },
        ...[['tab', '六线谱'], ['jianpu', '简谱（唱名数字）'], ['chords', '和弦'], ['lyrics', '歌词']].map(([k, label]) =>
          toggle(label, sh[k], (v) => {
            sh[k] = v;
            changed();
          })),
      ),
      h('div', { class: 'field' }, h('label', null, '字号'),
        stepper(Math.round(settings[zoomKey] * 100), { min: 60, max: 260, step: 10, label: '字号', format: (v) => `${v}%`, onchange: (v) => {
          setSetting(zoomKey, v / 100);
          renderNow();
        } })),
      perform
        ? toggle('舞台深色', settings.stage !== false, (v) => {
            setSetting('stage', v);
            page$.classList.toggle('stage', v);
            renderNow();
          })
        : h('div', { class: 'field' }, h('label', null, '主题'),
            segmented([['auto', '跟随系统'], ['light', '浅色'], ['dark', '深色']], settings.theme, (v) => {
              setSetting('theme', v);
              applyTheme();
              renderNow();
            })),
      h('p', { class: 'hint' }, '扫弦箭头 ↓ 表示手向下（从粗弦扫向细弦），↑ 表示向上。有些谱子用相反方向的箭头，以文字说明为准。'),
    ));
  }

  function openCapo() {
    const body = h('div', { class: 'stack' });
    let target = soundKey().pc;
    const apply = (patch) => {
      Object.assign(prefs, patch);
      savePrefs(entry.prefsId, prefs);
      renderInfo();
      renderNow();
      render();
      if (playing) start(current ?? cursor);
    };
    const options = () => {
      const list = [];
      for (let t = -6; t < 6; t++) {
        const key = transposeKey(baseKey, t);
        const capo = mod12(target - key.pc);
        if (capo > 7) continue;
        const hard = song.chordsUsed.map((c) => transposeChord(c, t, key)).filter((c) => !isEasyChord(c));
        list.push({ t, capo, key, hard: [...new Set(hard)] });
      }
      return list.sort((a, b) => a.hard.length - b.hard.length || a.capo - b.capo).slice(0, 4);
    };
    const render = () => {
      const minor = baseKey.minor;
      fill(body,
        h('div', { class: 'field' }, h('label', null, '变调夹'),
          stepper(prefs.capo, { min: 0, max: 9, label: '变调夹', format: (v) => (v ? `第 ${v} 品` : '不夹'), onchange: (v) => apply({ capo: v }) })),
        canTranspose
          ? h('div', { class: 'field' }, h('label', null, '指法'),
              stepper(prefs.transpose, { min: -6, max: 6, label: '移调', format: (v) => `${prettyKey(transposeKey(baseKey, v))} 调`, onchange: (v) => apply({ transpose: v }) }))
          : null,
        h('p', { class: 'capo-summary' }, `用 ${prettyKey(shapeKey())} 调的指法${prefs.capo ? `，变调夹夹在第 ${prefs.capo} 品` : ''}，实际发声是 ${prettyKey(soundKey())} 调。`),
        canTranspose
          ? h('div', { class: 'stack' },
              h('label', { class: 'field-label' }, '想唱的调（实际发声）'),
              h('div', { class: 'key-grid' }, Array.from({ length: 12 }, (_, pc) =>
                h('button', { class: 'btn small' + (pc === target ? ' on' : ''), type: 'button', onclick: () => { target = pc; render(); } }, prettyKey(keyFromPc(pc, minor))))),
              h('div', { class: 'capo-options' }, options().map((o) =>
                h('button', { class: 'capo-option' + (o.t === prefs.transpose && o.capo === prefs.capo ? ' on' : ''), type: 'button', onclick: () => apply({ transpose: o.t, capo: o.capo }) },
                  h('strong', null, `${o.capo ? `夹 ${o.capo} 品` : '不夹'} · ${prettyKey(o.key)} 调指法`),
                  h('span', null, o.hard.length ? `需要 ${o.hard.map(pretty).join('、')}` : '全部是开放和弦，最好按')))),
            )
          : h('p', { class: 'hint' }, '这首曲谱带六线谱旋律，品位是固定的。变调夹会让整首曲子按同样的指法升高。'),
        h('button', { class: 'btn', type: 'button', onclick: () => apply({ capo: meta.capo, transpose: 0 }) }, '恢复原谱设置'),
      );
    };
    render();
    openPanel('变调夹与移调', body);
  }

  // ---------- keyboard ----------
  function onKey(e) {
    if (e.target.closest?.('input, textarea, select, [contenteditable]') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (document.querySelector('.panel-wrap') && e.key !== ' ') return;
    const k = e.key;
    if (k === ' ' || (perform && k === 'Enter')) {
      e.preventDefault();
      togglePlay();
    } else if (perform && (k === 'PageDown' || k === 'ArrowDown')) {
      e.preventDefault();
      page(1);
    } else if (perform && (k === 'PageUp' || k === 'ArrowUp')) {
      e.preventDefault();
      page(-1);
    } else if (k === 'ArrowRight' || k === 'ArrowLeft') {
      e.preventDefault();
      setCursor(cursor + (k === 'ArrowRight' ? 1 : -1));
      follow(cursor);
      if (playing) start(cursor);
    } else if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(k)) detach(); // the browser scrolls the page
    else if (k === 'l' || k === 'L') onLoopButton();
    else if (k === '+' || k === '=') setBpm(prefs.bpm + 5);
    else if (k === '-') setBpm(prefs.bpm - 5);
    else if (k === 'm' || k === 'M') setLive('metronome', !live.metronome);
  }
  addEventListener('keydown', onKey);

  // ---------- init ----------
  renderInfo();
  updateBpm();
  updateToggles();
  updatePlay();
  if (prefs.loop) {
    loopBtn.classList.add('on');
    loopBtn.querySelector('span:last-child').textContent = `${prefs.loop[0] + 1}–${prefs.loop[1] + 1}`;
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
    savePrefs(entry.prefsId, prefs);
  };
}
