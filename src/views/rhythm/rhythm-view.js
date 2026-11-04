// Rhythm trainer: note values and strum patterns on a step grid, rendered as notation,
// played with metronome and strums, plus a tap-along timing test.
import { config } from '../../core/config.js';
import { t } from '../../core/i18n.js';
import { h } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { segmented, stepper, toggle } from '../../ui/controls.js';
import { holdScreen } from '../../ui/wake-lock.js';
import { state, save } from '../../state/store.js';
import { renderScore } from '../../render/score/score.js';
import { patternSong } from '../../music/format/pattern.js';
import { beatAccent, meter } from '../../music/format/meter.js';
import { chordShapes } from '../../music/chord-shapes.js';
import { pretty } from '../../music/pitch.js';
import { Sequencer } from '../../audio/sequencer.js';
import { click } from '../../audio/click.js';
import { resumeGuitar, strum } from '../../audio/guitar.js';
import { GRID_TICKS, countLabel, stepsToEvents } from './steps.js';
import { createTapTest } from './tap-test.js';

const STEP_ICON = { D: 'arrowDown', U: 'arrowUp', X: 'close', '-': 'minus' };
const STEP_KEY = { D: 'down', U: 'up', X: 'mute', '-': 'hold', '.': 'rest' };
const CYCLE = ['D', 'U', 'X', '-', '.'];

function stepMark(s) {
  return h('span', { class: `step-mark s-${s === '.' ? 'rest' : s === '-' ? 'hold' : s}` }, STEP_ICON[s] ? icon(STEP_ICON[s]) : null);
}

export function rhythmView(root) {
  const seq = new Sequencer();
  const saved = state.tools.rhythm;
  const { presets, bpm: bpmRange, chords: chordChoices, timeSignatures } = config.rhythm;
  let steps = [...saved.steps];
  let release = null;

  const persist = () => {
    saved.steps = steps.join('');
    save();
  };

  const presetEl = h('div', { class: 'preset-groups' });
  const gridEl = h('div', { class: 'step-grid', role: 'group', 'aria-label': t('rhythm.gridLabel') });
  const notation = h('div', { class: 'score mini' });
  const playBtn = h('button', { class: 'btn primary big', type: 'button', onclick: () => (seq.running ? stop() : start()) });
  const timeSeg = segmented(timeSignatures.map((v) => [v, v]), saved.time.join('/'), (v) => setGrid(v.split('/').map(Number), saved.grid));
  const gridSeg = segmented(Object.keys(GRID_TICKS).map((k) => [k, t(`rhythm.grid.${k}`)]), saved.grid, (v) => setGrid(saved.time, v));

  const m = () => meter(saved.time);
  const stepTicks = () => GRID_TICKS[saved.grid];
  const tapTest = createTapTest({
    isPlaying: () => seq.running,
    play: (onlyBeats) => start(onlyBeats),
    stop: () => stop(),
    stepSeconds: () => ((stepTicks() / m().beatTicks) * 60) / saved.bpm,
  });

  function setGrid(time, grid) {
    saved.time = time;
    saved.grid = grid;
    const n = m().barTicks / stepTicks();
    // alternate down/up strokes, the way the hand moves; quarter notes are all downstrokes
    steps = Array.from({ length: n }, (_, i) => (grid !== 'q' && i % 2 ? 'U' : 'D'));
    saved.preset = null;
    persist();
    timeSeg.set(time.join('/'));
    gridSeg.set(grid);
    renderAll();
  }

  function usePreset(p) {
    saved.preset = p.id;
    saved.time = p.time;
    saved.grid = p.grid;
    steps = [...p.steps];
    persist();
    timeSeg.set(p.time.join('/'));
    gridSeg.set(p.grid);
    renderAll();
    // The presets sit below the pattern: bring the new pattern and the play button back into view.
    const card = gridEl.closest('.card');
    if (card.getBoundingClientRect().top < 0) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderPresets() {
    const groups = [...new Set(presets.map((p) => p.group))];
    presetEl.replaceChildren(
      ...groups.map((g) =>
        h('div', { class: 'chip-row' }, h('span', { class: 'muted' }, t(`rhythm.presetGroup.${g}`)),
          presets.filter((p) => p.group === g).map((p) => h('button', { class: 'chip' + (p.id === saved.preset ? ' on' : ''), type: 'button', onclick: () => usePreset(p) }, t(`rhythm.preset.${p.id}`))))),
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
          title: t('rhythm.stepTitle'),
          'aria-label': `${count} ${t(`rhythm.step.${STEP_KEY[s]}`)}`,
          onclick: () => {
            steps[i] = CYCLE[(CYCLE.indexOf(s) + 1) % CYCLE.length];
            saved.preset = null;
            persist();
            renderAll();
          },
        }, h('small', null, count), stepMark(s));
      }),
    );
  }

  function renderNotation() {
    const width = Math.min(notation.clientWidth || 600, 640);
    renderScore(notation, patternSong(stepsToEvents(steps, stepTicks(), m()), saved.time), {
      width, scale: 1.15, show: { tab: true, numbers: false, rhythm: true, lyrics: false, chords: false }, chordLabel: pretty, tonic: 60, barNumbers: false, notation: 'slash',
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
    const shape = chordShapes(saved.chord)[0];
    let countIn = true;
    const source = {
      next() {
        const isCount = countIn;
        countIn = false;
        const items = [];
        for (let k = 0; k < mm.beats; k++) {
          items.push({ tick: k * mm.beatTicks, sound: (time) => (isCount || saved.metronome || onlyBeats) && click(time, beatAccent(k, mm)), ui: isCount ? { count: k + 1 } : undefined });
        }
        if (isCount) return { ticks: mm.barTicks, beatTicks: mm.beatTicks, items };
        if (onlyBeats) {
          for (const it of items) {
            const s0 = it.sound;
            it.sound = (time) => {
              s0(time);
              tapTest.expectBeat(time);
            };
          }
        } else {
          steps.forEach((s, i) => {
            const hit = s === 'D' || s === 'U' || s === 'X';
            items.push({
              tick: i * st,
              sound: hit ? (time) => {
                if (saved.strum && shape) strum(time, shape.frets, 0, s, i === 0);
                tapTest.expectStep(time);
              } : undefined,
              ui: { step: i },
            });
          });
        }
        items.sort((a, b) => a.tick - b.tick);
        return { ticks: mm.barTicks, beatTicks: mm.beatTicks, items };
      },
    };
    seq.start(source, saved.bpm, (u) => {
      if (u.count) playBtn.replaceChildren(icon('stop'), t('common.countIn', { count: u.count }));
      else if (u.step !== undefined) {
        if (u.step === 0) playBtn.replaceChildren(icon('stop'), t('common.stop'));
        markStep(u.step);
      }
    });
    release ??= holdScreen();
    playBtn.replaceChildren(icon('stop'), t('common.stop'));
  }

  function stop() {
    seq.stop();
    release?.();
    release = null;
    markStep(-1);
    playBtn.replaceChildren(icon('play'), t('common.play'));
    tapTest.finish();
  }

  function onKey(e) {
    if (e.key === ' ' && !e.repeat && tapTest.active()) {
      e.preventDefault();
      tapTest.onTap(e);
    } else if (e.key === ' ' && !e.target.closest('input, select, textarea, button')) {
      e.preventDefault();
      seq.running ? stop() : start();
    }
  }
  addEventListener('keydown', onKey);

  playBtn.replaceChildren(icon('play'), t('common.play'));
  // The pattern and the play button come first, so on a phone they fill the first screen; the presets follow.
  root.append(
    h('div', { class: 'page' },
      h('header', { class: 'page-head' }, h('h1', null, t('nav.rhythm'))),
      h('section', { class: 'card stack' },
        gridEl,
        h('div', { class: 'step-keys' }, CYCLE.map((s) => h('span', { class: 'step-key' }, stepMark(s), t(`rhythm.step.${STEP_KEY[s]}`)))),
        h('p', { class: 'legend' }, t('rhythm.legend')),
        notation,
        h('div', { class: 'row wrap gap-m' },
          h('label', { class: 'field-inline' }, t('common.speed'), stepper(saved.bpm, { min: bpmRange.min, max: bpmRange.max, step: bpmRange.step, label: t('common.speed'), format: (v) => `♩${v}`, onchange: (v) => { saved.bpm = v; save(); if (seq.running) seq.setBpm(v); } })),
          h('label', { class: 'field-inline' }, t('rhythm.chord'),
            h('select', { onchange: (e) => { saved.chord = e.target.value; save(); } }, chordChoices.map((c) => h('option', { value: c, selected: c === saved.chord }, c)))),
          toggle(t('common.metronome'), saved.metronome, (v) => { saved.metronome = v; save(); }),
          toggle(t('rhythm.strumSound'), saved.strum, (v) => { saved.strum = v; save(); }),
        ),
        h('div', { class: 'center' }, playBtn),
      ),
      h('section', { class: 'card stack' },
        h('h2', null, t('rhythm.presetsTitle')),
        presetEl,
        h('div', { class: 'row wrap gap-m' }, h('label', { class: 'field-inline' }, t('common.timeSignature'), timeSeg), h('label', { class: 'field-inline' }, t('common.subdivision'), gridSeg)),
      ),
      h('section', { class: 'card stack' },
        h('h2', null, t('tapTest.title')),
        h('p', { class: 'hint' }, t('tapTest.hint', { good: config.rhythm.tapTest.goodMs })),
        tapTest.tapPad,
        tapTest.results,
        h('div', { class: 'row wrap gap-s' }, tapTest.testBtn, tapTest.calibrateBtn,
          h('span', { class: 'muted nowrap' }, t('tapTest.offset'), ' ', tapTest.offsetOut)),
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
