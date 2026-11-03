// Chord library, timed chord-change drill, and the one-minute change challenge.
import { h, icon, segmented, toggle, stepper, toast, holdScreen } from '../ui/dom.js';
import { openChordPanel, FINGER_LEGEND } from '../ui/chord-panel.js';
import { state, save } from '../store.js';
import { chordDiagram } from '../render/chord-diagram.js';
import { chordShapes, CHORD_GROUPS } from '../music/chords.js';
import { pretty } from '../music/theory.js';
import { Sequencer } from '../audio/sequencer.js';
import { beatItems } from '../audio/song-source.js';
import { resumeAudio, click, strum, audioContext } from '../audio/engine.js';

const PRESETS = [
  ['C', 'G'], ['G', 'D'], ['Am', 'Em'], ['C', 'Am'], ['D', 'A'], ['E', 'A'],
  ['G', 'D', 'Em', 'C'], ['C', 'Am', 'Dm', 'G'], ['C', 'G', 'Am', 'F'], ['Am', 'F', 'C', 'G'],
];
const PICKABLE = [...CHORD_GROUPS[0].chords, 'A7', 'B7', 'C7', 'D7', 'E7', 'G7', 'Am7', 'Dm7', 'Em7', 'Cmaj7', 'Fmaj7', 'Dsus2', 'Dsus4', 'Asus2', 'Cadd9', 'F', 'Bm', 'B7'];

const diagram = (name, cls = 'diagram') => {
  const shape = chordShapes(name)[0];
  return shape ? h('span', { class: cls, html: chordDiagram(shape, { name: pretty(name), chord: name }) }) : h('strong', null, pretty(name));
};

export function chordsView(root, tab = 'library') {
  const body = h('div');
  let cleanup = () => {};
  const show = (t) => {
    cleanup();
    body.replaceChildren();
    history.replaceState(null, '', t === 'library' ? '#/chords' : `#/chords/${t}`);
    cleanup = { library, drill, minute }[t](body);
  };
  root.append(
    h('div', { class: 'page' },
      h('header', { class: 'page-head' },
        h('h1', null, '和弦'),
        segmented([['library', '和弦库'], ['drill', '换和弦练习'], ['minute', '一分钟挑战']], tab, show),
      ),
      body,
    ),
  );
  show(tab);
  return () => cleanup();
}

function library(root) {
  root.append(
    h('p', { class: 'legend' }, FINGER_LEGEND, ' · ', h('span', { class: 'root-swatch' }), ' 根音。点和弦可以听声音、看其他按法。'),
    ...CHORD_GROUPS.map((g) =>
      h('section', { class: 'chord-group' },
        h('h2', null, g.name),
        h('div', { class: 'chord-grid' }, g.chords.map((name) => h('button', { class: 'chord-card', type: 'button', onclick: () => openChordPanel(name) }, diagram(name)))),
      )),
  );
  return () => {};
}

function drill(root) {
  const seq = new Sequencer();
  const live = { metronome: true, strum: true };
  let chords = ['C', 'G'];
  let beatsPer = 4;
  let bpm = 60;
  let release = null;
  const stage = h('div', { class: 'drill-stage' });
  const presetRow = h('div', { class: 'chip-row' });
  const custom = h('div', { class: 'chip-row' });
  const playBtn = h('button', { class: 'btn primary big', type: 'button', onclick: () => (seq.running ? stop() : start()) });

  function renderPick() {
    presetRow.replaceChildren(
      ...PRESETS.map((p) => h('button', { class: 'chip' + (p.join() === chords.join() ? ' on' : ''), type: 'button', onclick: () => setChords(p) }, p.map(pretty).join(' – '))),
    );
    custom.replaceChildren(
      h('span', { class: 'muted' }, '自选：'),
      ...PICKABLE.map((c) =>
        h('button', { class: 'chip small' + (chords.includes(c) ? ' on' : ''), type: 'button', onclick: () => setChords(chords.includes(c) ? chords.filter((x) => x !== c) : [...chords, c]) }, pretty(c))),
    );
  }

  function setChords(list) {
    if (list.length < 2) return toast('至少选两个和弦');
    chords = list;
    renderPick();
    renderStage(0, -1);
    if (seq.running) start();
  }

  function renderStage(idx, beat) {
    const next = (idx + 1) % chords.length;
    stage.replaceChildren(
      h('div', { class: 'drill-now' }, h('small', null, '现在'), diagram(chords[idx], 'diagram-xl')),
      h('div', { class: 'drill-next' + (beat === beatsPer - 1 ? ' ready' : '') }, h('small', null, beat === beatsPer - 1 ? '准备换！' : '下一个'), diagram(chords[next], 'diagram-lg')),
      h('div', { class: 'drill-beats' }, Array.from({ length: beatsPer }, (_, k) => h('i', { class: k === beat ? 'on' : k < beat ? 'past' : '' }))),
    );
  }

  async function start() {
    await resumeAudio();
    if (!root.isConnected) return;
    let count = 1;
    let i = 0;
    const m = { beats: beatsPer, beatTicks: 48 };
    const source = {
      next() {
        if (count) {
          count--;
          return { ticks: 192, beatTicks: 48, items: beatItems({ beats: 4, beatTicks: 48 }, live, true, (k) => ({ count: k + 1 })) };
        }
        const idx = i++ % chords.length;
        const shape = chordShapes(chords[idx])[0];
        return {
          ticks: beatsPer * 48,
          beatTicks: 48,
          items: Array.from({ length: m.beats }, (_, k) => ({
            tick: k * 48,
            sound: (t) => {
              if (live.metronome) click(t, k === 0 ? 2 : 1);
              if (live.strum && shape) strum(t, shape.frets, 0, 'D', k === 0);
            },
            ui: { idx, beat: k },
          })),
        };
      },
    };
    seq.start(source, bpm, (u) => {
      if (u.count) stage.querySelector('.drill-now small').textContent = `预备 ${u.count}`;
      else renderStage(u.idx, u.beat);
    });
    release ??= holdScreen();
    playBtn.replaceChildren(icon('stop'), '停止');
  }

  function stop() {
    seq.stop();
    release?.();
    release = null;
    playBtn.replaceChildren(icon('play'), '开始');
    renderStage(0, -1);
  }

  renderPick();
  renderStage(0, -1);
  playBtn.replaceChildren(icon('play'), '开始');
  // The stage and the start button come first, so on a phone they fill the first screen while you play.
  root.append(
    stage,
    h('div', { class: 'center' }, playBtn),
    h('section', { class: 'card stack' },
      h('p', { class: 'hint' }, '跟着节拍换和弦：最后一拍提前抬手去按下一个和弦，换不过来就降速，别停下。'),
      presetRow,
      custom,
      h('div', { class: 'row wrap gap-m' },
        h('label', { class: 'field-inline' }, '每个和弦', segmented([[2, '2 拍'], [4, '4 拍'], [8, '8 拍']], beatsPer, (v) => { beatsPer = v; renderStage(0, -1); if (seq.running) start(); })),
        h('label', { class: 'field-inline' }, '速度', stepper(bpm, { min: 30, max: 180, step: 5, label: '速度', format: (v) => `♩${v}`, onchange: (v) => { bpm = v; if (seq.running) seq.setBpm(v); } })),
        toggle('节拍器', live.metronome, (v) => (live.metronome = v)),
        toggle('扫弦示范', live.strum, (v) => (live.strum = v)),
      ),
    ),
  );
  return () => {
    seq.stop();
    release?.();
  };
}

function minute(root) {
  let pair = ['C', 'G'];
  let timer = 0;
  let count = 0;
  let endAt = 0;
  let release = null;
  const records = (state.records.minute ??= {});
  const select = (i) =>
    h('select', { 'aria-label': `第 ${i + 1} 个和弦`, onchange: (e) => { pair[i] = e.target.value; renderHistory(); } },
      PICKABLE.map((c) => h('option', { value: c, selected: c === pair[i] }, pretty(c))));
  const clock = h('div', { class: 'big-clock' }, '60');
  const counter = h('div', { class: 'big-count' }, '0');
  const tapBtn = h('button', { class: 'btn tap-pad', type: 'button', disabled: true, onpointerdown: (e) => { e.preventDefault(); tap(); } }, '换成功 +1');
  const startBtn = h('button', { class: 'btn primary big', type: 'button', onclick: () => (timer ? finish(false) : begin()) }, icon('play'), '开始 60 秒');
  const historyEl = h('div', { class: 'history' });
  const pairShapes = h('div', { class: 'pair-shapes' });
  const key = () => pair.join('-');

  function renderHistory() {
    pairShapes.replaceChildren(diagram(pair[0], 'diagram-lg'), h('span', { class: 'swap' }, '⇄'), diagram(pair[1], 'diagram-lg'));
    const list = records[key()] ?? [];
    const best = Math.max(0, ...list.map((r) => r.n));
    historyEl.replaceChildren(
      list.length
        ? h('div', null,
            h('p', null, `${pair.map(pretty).join(' ⇄ ')} 最好成绩 `, h('strong', null, best), ' 次/分钟'),
            h('div', { class: 'bars' }, list.slice(-12).map((r) => h('span', { class: 'bar-col', title: `${new Date(r.t).toLocaleDateString()}：${r.n} 次`, style: { '--h': `${(r.n / Math.max(best, 1)) * 100}%` } }, h('i'), h('small', null, r.n)))))
        : h('p', { class: 'muted' }, '还没有这组和弦的记录。每天测一次，看着次数慢慢变多。'),
    );
  }

  function tap() {
    if (!timer) return;
    count++;
    counter.textContent = count;
    counter.classList.remove('pop');
    void counter.offsetWidth; // restart the pop animation
    counter.classList.add('pop');
  }

  async function begin() {
    await resumeAudio();
    count = 0;
    counter.textContent = '0';
    let pre = 3;
    clock.textContent = `${pre}`;
    clock.classList.add('pre');
    startBtn.replaceChildren(icon('stop'), '放弃');
    release ??= holdScreen();
    const t0 = audioContext().currentTime;
    for (let k = 0; k < 3; k++) click(t0 + 0.05 + k, 1);
    click(t0 + 3.05, 2);
    timer = setInterval(() => {
      if (pre > 0) {
        pre--;
        clock.textContent = pre ? `${pre}` : '开始';
        if (!pre) {
          endAt = performance.now() + 60000;
          tapBtn.disabled = false;
          clock.classList.remove('pre');
        }
        return;
      }
      const left = Math.max(0, Math.ceil((endAt - performance.now()) / 1000));
      clock.textContent = left;
      if (left === 0) finish(true);
    }, 1000);
  }

  function finish(done) {
    clearInterval(timer);
    timer = 0;
    tapBtn.disabled = true;
    release?.();
    release = null;
    clock.classList.remove('pre');
    startBtn.replaceChildren(icon('play'), '开始 60 秒');
    if (!done) {
      clock.textContent = '60';
      return;
    }
    click(audioContext().currentTime + 0.02, 2);
    (records[key()] ??= []).push({ t: Date.now(), n: count });
    records[key()] = records[key()].slice(-30);
    save();
    toast(`${pair.map(pretty).join(' ⇄ ')}：${count} 次/分钟`);
    renderHistory();
  }

  function onKey(e) {
    if (e.key === ' ' && timer && !e.target.closest('select')) {
      e.preventDefault();
      tap();
    }
  }
  addEventListener('keydown', onKey);
  renderHistory();
  root.append(
    h('section', { class: 'card stack' },
      h('p', { class: 'hint' }, '在两个和弦之间来回换，每次按好并扫响一下就点一次「+1」（电脑上按空格）。只数干净的换和弦。'),
      h('div', { class: 'row gap-s' }, select(0), h('span', null, '⇄'), select(1)),
      pairShapes,
    ),
    h('div', { class: 'minute-stage' }, clock, counter, tapBtn),
    h('div', { class: 'center' }, startBtn),
    historyEl,
  );
  return () => {
    clearInterval(timer);
    release?.();
    removeEventListener('keydown', onKey);
  };
}
