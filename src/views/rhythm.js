// Rhythm trainer: note values and strum patterns on a step grid, rendered as notation,
// played with metronome and strums, plus a tap-along timing test.
import { h, icon, segmented, toggle, stepper, toast, holdScreen } from '../ui/dom.js';
import { state, setSetting } from '../store.js';
import { renderScore } from '../render/score.js';
import { patternSong, meter, beatAccent } from '../music/format.js';
import { chordShapes } from '../music/chords.js';
import { pretty } from '../music/theory.js';
import { Sequencer } from '../audio/sequencer.js';
import { resumeGuitar, click, strum, audioContext, outputLatency } from '../audio/engine.js';

const GRIDS = { q: { ticks: 48, label: '四分' }, e: { ticks: 24, label: '八分' }, e3: { ticks: 16, label: '三连音' }, s: { ticks: 12, label: '十六分' } };
const PRESETS = [
  { group: '音符时值', name: '四分音符', time: [4, 4], grid: 'q', steps: 'DDDD' },
  { group: '音符时值', name: '二分音符', time: [4, 4], grid: 'q', steps: 'D-D-' },
  { group: '音符时值', name: '八分音符', time: [4, 4], grid: 'e', steps: 'DUDUDUDU' },
  { group: '音符时值', name: '三连音', time: [4, 4], grid: 'e3', steps: 'DUDUDUDUDUDU' },
  { group: '音符时值', name: '十六分音符', time: [4, 4], grid: 's', steps: 'DUDUDUDUDUDUDUDU' },
  { group: '音符时值', name: '附点八分 + 十六分', time: [4, 4], grid: 's', steps: 'D--UD--UD--UD--U' },
  { group: '扫弦节奏型', name: '下 下上 上下上', time: [4, 4], grid: 'e', steps: 'D-DU.UDU' },
  { group: '扫弦节奏型', name: '八分全下扫', time: [4, 4], grid: 'e', steps: 'DDDDDDDD' },
  { group: '扫弦节奏型', name: '切音：下 切上 下上 切上', time: [4, 4], grid: 'e', steps: 'D-XUDUXU' },
  { group: '扫弦节奏型', name: '华尔兹 3/4：下 下上 下上', time: [3, 4], grid: 'e', steps: 'D-DUDU' },
  { group: '扫弦节奏型', name: '6/8：下 下上 下 下上', time: [6, 8], grid: 'e', steps: 'DDUDDU' },
  { group: '扫弦节奏型', name: '十六分：下 下上下 上下上', time: [4, 4], grid: 's', steps: 'D-D-D.DUD.DU.UDU' },
];
const STEP_ICON = { D: 'arrowDown', U: 'arrowUp', X: 'close', '-': 'minus' };
const STEP_NAME = { D: '下扫', U: '上扫', X: '切音', '-': '延长', '.': '空拍' };
const CYCLE = ['D', 'U', 'X', '-', '.'];
const DUR = { 12: ['s', false], 18: ['s', true], 24: ['e', false], 36: ['e', true], 48: ['q', false], 72: ['q', true], 96: ['h', false], 144: ['h', true], 192: ['w', false] };
const TRIPLET = { 16: 'e', 32: 'q' };

/** Converts grid steps to score events: holds lengthen the previous strum, empty steps become rests. */
function stepsToEvents(steps, stepTicks, m) {
  const triplet = stepTicks === 16;
  const fits = (dur) => (triplet ? TRIPLET[dur] || DUR[dur] : DUR[dur]);
  const events = [];
  steps.forEach((s, i) => {
    const at = i * stepTicks;
    const last = events[events.length - 1];
    const sameBeat = last && Math.floor(last.at / m.groupTicks) === Math.floor(at / m.groupTicks);
    const extend = last && (s === '-' ? last.kind === 'strum' || last.kind === 'rest' : s === '.' && last.kind === 'rest' && sameBeat);
    if (extend && fits(last.dur + stepTicks) && (sameBeat || last.at % m.groupTicks === 0)) {
      last.dur += stepTicks;
      return;
    }
    events.push(s === 'D' || s === 'U' || s === 'X' ? { at, dur: stepTicks, kind: 'strum', dir: s, notes: [] } : { at, dur: stepTicks, kind: 'rest', notes: [] });
  });
  for (const e of events) {
    const tri = triplet && TRIPLET[e.dur];
    const [base, dotted] = tri ? [tri, false] : DUR[e.dur];
    Object.assign(e, { base, dotted, tuplet: !!tri, lyric: '' });
  }
  return events;
}

function countLabel(i, stepTicks, m) {
  const tick = i * stepTicks;
  if (tick % m.beatTicks === 0) return String(tick / m.beatTicks + 1);
  const pos = (tick % m.beatTicks) / stepTicks;
  return stepTicks === 12 ? ['e', '+', 'a'][pos - 1] : stepTicks === 16 ? ['+', 'a'][pos - 1] : '+';
}

function stepMark(s) {
  return h('span', { class: `step-mark s-${s === '.' ? 'rest' : s === '-' ? 'hold' : s}` }, STEP_ICON[s] ? icon(STEP_ICON[s]) : null);
}

/** Context time of a tap, aligned with what the listener hears. */
function tapTime(ev) {
  const c = audioContext();
  const ts = c.getOutputTimestamp?.();
  if (ts?.performanceTime) return ts.contextTime + (ev.timeStamp - ts.performanceTime) / 1000;
  return c.currentTime - outputLatency() - (performance.now() - ev.timeStamp) / 1000;
}

export function rhythmView(root) {
  const seq = new Sequencer();
  const live = { metronome: true, strum: true };
  let preset = PRESETS[6];
  let time = preset.time;
  let grid = preset.grid;
  let steps = [...preset.steps];
  let bpm = 70;
  let chord = 'C';
  let release = null;
  let test = null; // { expected: [{t, matched}], results: [] } while the tap test runs
  let calibrating = null;

  const presetEl = h('div', { class: 'preset-groups' });
  const gridEl = h('div', { class: 'step-grid', role: 'group', 'aria-label': '节奏格子' });
  const notation = h('div', { class: 'score mini' });
  const playBtn = h('button', { class: 'btn primary big', type: 'button', onclick: () => (seq.running ? stop() : start()) });
  const results = h('div', { class: 'tap-results' });
  const tapPad = h('button', { class: 'btn tap-pad', type: 'button', onpointerdown: onTap }, '跟着节奏点这里（或按空格）');
  const timeSeg = segmented([['4/4', '4/4'], ['3/4', '3/4'], ['6/8', '6/8']], time.join('/'), (v) => setGrid(v.split('/').map(Number), grid));
  const gridSeg = segmented(Object.entries(GRIDS).map(([k, g]) => [k, g.label]), grid, (v) => setGrid(time, v));

  const m = () => meter(time);
  const stepTicks = () => GRIDS[grid].ticks;

  function setGrid(t, g) {
    time = t;
    grid = g;
    const n = m().barTicks / stepTicks();
    // alternate down/up strokes, the way the hand moves; quarter notes are all downstrokes
    steps = Array.from({ length: n }, (_, i) => (grid !== 'q' && i % 2 ? 'U' : 'D'));
    preset = null;
    timeSeg.set(time.join('/'));
    gridSeg.set(grid);
    renderAll();
  }

  function usePreset(p) {
    preset = p;
    time = p.time;
    grid = p.grid;
    steps = [...p.steps];
    timeSeg.set(time.join('/'));
    gridSeg.set(grid);
    renderAll();
    // The presets sit below the pattern: bring the new pattern and the play button back into view.
    const card = gridEl.closest('.card');
    if (card.getBoundingClientRect().top < 0) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderPresets() {
    const groups = [...new Set(PRESETS.map((p) => p.group))];
    presetEl.replaceChildren(
      ...groups.map((g) =>
        h('div', { class: 'chip-row' }, h('span', { class: 'muted' }, g),
          PRESETS.filter((p) => p.group === g).map((p) => h('button', { class: 'chip' + (p === preset ? ' on' : ''), type: 'button', onclick: () => usePreset(p) }, p.name)))),
    );
  }

  function renderGrid() {
    const mm = m();
    gridEl.replaceChildren(
      ...steps.map((s, i) => {
        const tick = i * stepTicks();
        const count = countLabel(i, stepTicks(), mm);
        return h('button', {
          class: `step ${tick % mm.beatTicks === 0 ? 'beat' : ''} ${tick % mm.groupTicks === 0 ? 'group' : ''}`,
          type: 'button',
          title: '点击切换：下扫 → 上扫 → 切音 → 延长 → 空拍',
          'aria-label': `${count} ${STEP_NAME[s]}`,
          onclick: () => {
            steps[i] = CYCLE[(CYCLE.indexOf(s) + 1) % CYCLE.length];
            preset = null;
            renderAll();
          },
        }, h('small', null, count), stepMark(s));
      }),
    );
  }

  function renderNotation() {
    const width = Math.min(notation.clientWidth || 600, 640);
    renderScore(notation, patternSong(stepsToEvents(steps, stepTicks(), m()), time), {
      width, scale: 1.15, show: { tab: true, jianpu: false, rhythm: true, lyrics: false, chords: false }, chordLabel: pretty, tonic: 60, barNumbers: false,
    });
  }

  function renderAll() {
    renderPresets();
    renderGrid();
    renderNotation();
    if (seq.running) start();
  }

  function markStep(i) {
    [...gridEl.children].forEach((el, k) => el.classList.toggle('on', k === i));
  }

  async function start(onlyBeats = false) {
    await resumeGuitar();
    if (!root.isConnected) return;
    const mm = m();
    const st = stepTicks();
    const shape = chordShapes(chord)[0];
    let countIn = true;
    const source = {
      next() {
        const isCount = countIn;
        countIn = false;
        const items = [];
        for (let k = 0; k < mm.beats; k++) {
          items.push({ tick: k * mm.beatTicks, sound: (t) => (isCount || live.metronome || onlyBeats) && click(t, beatAccent(k, mm)), ui: isCount ? { count: k + 1 } : undefined });
        }
        if (isCount) return { ticks: mm.barTicks, beatTicks: mm.beatTicks, items };
        if (onlyBeats) {
          for (const it of items) {
            const s0 = it.sound;
            it.sound = (t) => {
              s0(t);
              calibrating?.expected.push({ t, matched: false });
            };
          }
        } else {
          steps.forEach((s, i) => {
            const hit = s === 'D' || s === 'U' || s === 'X';
            items.push({
              tick: i * st,
              sound: hit ? (t) => {
                if (live.strum && shape) strum(t, shape.frets, 0, s, i === 0);
                test?.expected.push({ t, matched: false });
              } : undefined,
              ui: { step: i },
            });
          });
        }
        items.sort((a, b) => a.tick - b.tick);
        return { ticks: mm.barTicks, beatTicks: mm.beatTicks, items };
      },
    };
    seq.start(source, bpm, (u) => {
      if (u.count) playBtn.replaceChildren(icon('stop'), `预备 ${u.count}`);
      else if (u.step !== undefined) {
        if (u.step === 0) playBtn.replaceChildren(icon('stop'), '停止');
        markStep(u.step);
      }
    });
    release ??= holdScreen();
    playBtn.replaceChildren(icon('stop'), '停止');
  }

  function stop() {
    seq.stop();
    release?.();
    release = null;
    markStep(-1);
    playBtn.replaceChildren(icon('play'), '播放');
    if (test) finishTest();
    if (calibrating) finishCalibration();
  }

  // ---------- tap test ----------
  function tolerance() {
    return Math.min(0.15, ((stepTicks() / m().beatTicks) * 60) / bpm / 2);
  }

  function onTap(ev) {
    ev.preventDefault?.();
    const run = test ?? calibrating;
    if (!run || !seq.running) return;
    const t = tapTime(ev);
    const offset = calibrating ? 0 : state.settings.tapOffset;
    const near = run.expected.filter((x) => !x.matched).sort((a, b) => Math.abs(a.t - t) - Math.abs(b.t - t))[0];
    if (!near || Math.abs(t - offset - near.t) > tolerance()) return;
    near.matched = true;
    run.results.push((t - offset - near.t) * 1000);
    tapPad.classList.remove('flash');
    void tapPad.offsetWidth; // restart the flash animation
    tapPad.classList.add('flash');
    if (test) renderResults();
    if (calibrating && run.results.length >= 8) stop();
  }

  function renderResults() {
    const r = test.results;
    const late = audioContext().currentTime - tolerance();
    const missed = test.expected.filter((x) => !x.matched && x.t < late).length;
    const good = r.filter((d) => Math.abs(d) <= 40).length;
    const ok = r.filter((d) => Math.abs(d) > 40 && Math.abs(d) <= 80).length;
    const mean = r.length ? r.reduce((a, b) => a + b, 0) / r.length : 0;
    results.replaceChildren(
      h('div', { class: 'tap-dots' }, r.slice(-24).map((d) => h('span', { class: Math.abs(d) <= 40 ? 'good' : Math.abs(d) <= 80 ? 'ok' : 'bad', title: `${d > 0 ? '晚' : '早'} ${Math.abs(Math.round(d))} ms`, style: { '--x': `${Math.max(-1, Math.min(1, d / 120))}` } }))),
      h('p', null,
        `准 ${good} · 稍偏 ${ok} · 偏差大 ${r.length - good - ok} · 漏拍 ${missed}`,
        r.length < 4 ? '' : Math.abs(mean) < 10 ? ' · 整体没有明显偏早或偏晚' : ` · 整体${mean > 0 ? '偏晚' : '偏早'} ${Math.abs(Math.round(mean))} ms`),
    );
  }

  function startTest() {
    if (calibrating) return;
    test = { expected: [], results: [] };
    results.replaceChildren(h('p', { class: 'muted' }, '预备拍之后，每个箭头点一下。'));
    start();
    testBtn.replaceChildren('结束测试');
  }

  function finishTest() {
    renderResults();
    test = null;
    testBtn.replaceChildren('开始跟拍测试');
  }

  function startCalibration() {
    if (test) finishTest();
    calibrating = { expected: [], results: [] };
    results.replaceChildren(h('p', { class: 'muted' }, '校准中：只听节拍器，每一拍点一下，点满 8 下自动结束。'));
    start(true);
  }

  function finishCalibration() {
    const r = calibrating.results.slice().sort((a, b) => a - b);
    calibrating = null;
    if (r.length < 6) return results.replaceChildren(h('p', { class: 'muted' }, '点击次数太少，没有保存校准结果。'));
    const median = r[Math.floor(r.length / 2)] / 1000;
    setSetting('tapOffset', median);
    offsetOut.textContent = `${Math.round(median * 1000)} ms`;
    results.replaceChildren(h('p', null, `校准完成：你的设备点击延迟约 ${Math.round(median * 1000)} ms，之后的测试会自动扣除。`));
  }

  const testBtn = h('button', { class: 'btn', type: 'button', onclick: () => (test ? stop() : startTest()) }, '开始跟拍测试');
  const offsetOut = h('output', null, `${Math.round(state.settings.tapOffset * 1000)} ms`);
  function onKey(e) {
    if (e.key === ' ' && !e.repeat && (test || calibrating)) {
      e.preventDefault();
      onTap(e);
    } else if (e.key === ' ' && !e.target.closest('input, select, textarea, button')) {
      e.preventDefault();
      seq.running ? stop() : start();
    }
  }
  addEventListener('keydown', onKey);

  playBtn.replaceChildren(icon('play'), '播放');
  // The pattern and the play button come first, so on a phone they fill the first screen; the presets follow.
  root.append(
    h('div', { class: 'page' },
      h('header', { class: 'page-head' }, h('h1', null, '节奏')),
      h('section', { class: 'card stack' },
        gridEl,
        h('div', { class: 'step-keys' }, CYCLE.map((s) => h('span', { class: 'step-key' }, stepMark(s), STEP_NAME[s]))),
        h('p', { class: 'legend' }, '切音：扫的同时用手掌外侧压住弦。空拍：手照常摆动，不碰弦。点格子可以修改。'),
        notation,
        h('div', { class: 'row wrap gap-m' },
          h('label', { class: 'field-inline' }, '速度', stepper(bpm, { min: 30, max: 220, step: 5, label: '速度', format: (v) => `♩${v}`, onchange: (v) => { bpm = v; if (seq.running) seq.setBpm(v); } })),
          h('label', { class: 'field-inline' }, '和弦',
            h('select', { onchange: (e) => (chord = e.target.value) }, ['C', 'G', 'D', 'Am', 'Em', 'A', 'E'].map((c) => h('option', { value: c }, c)))),
          toggle('节拍器', live.metronome, (v) => (live.metronome = v)),
          toggle('扫弦声', live.strum, (v) => (live.strum = v)),
        ),
        h('div', { class: 'center' }, playBtn),
      ),
      h('section', { class: 'card stack' },
        h('h2', null, '节奏型'),
        presetEl,
        h('div', { class: 'row wrap gap-m' }, h('label', { class: 'field-inline' }, '拍号', timeSeg), h('label', { class: 'field-inline' }, '细分', gridSeg)),
      ),
      h('section', { class: 'card stack' },
        h('h2', null, '跟拍测试'),
        h('p', { class: 'hint' }, '关掉「扫弦声」，自己跟着节拍器在每个箭头的位置点击，看点得准不准。绿色 = 误差 40 ms 以内。'),
        tapPad,
        results,
        h('div', { class: 'row wrap gap-s' }, testBtn, h('button', { class: 'btn', type: 'button', onclick: startCalibration }, '校准点击延迟'),
          h('span', { class: 'muted nowrap' }, '当前补偿 ', offsetOut)),
      ),
    ),
  );
  renderAll();
  return () => {
    seq.stop();
    release?.();
    removeEventListener('keydown', onKey);
  };
}
