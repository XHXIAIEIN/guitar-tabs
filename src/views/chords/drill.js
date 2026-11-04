// Timed chord-change drill: the current and next chord side by side, with a cue on the last beat.
import { config } from '../../core/config.js';
import { t } from '../../core/i18n.js';
import { h } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { segmented, stepper, toggle } from '../../ui/controls.js';
import { toast } from '../../ui/toast.js';
import { holdScreen } from '../../ui/wake-lock.js';
import { chordDiagramEl } from '../../ui/chord-diagram-el.js';
import { state, save } from '../../state/store.js';
import { chordShapes } from '../../music/chord-shapes.js';
import { pretty } from '../../music/pitch.js';
import { Sequencer } from '../../audio/sequencer.js';
import { beatItems } from '../../audio/song-source.js';
import { click } from '../../audio/click.js';
import { resumeGuitar, strum } from '../../audio/guitar.js';

const BEAT_TICKS = 48;

export function chordDrill(root) {
  const seq = new Sequencer();
  const saved = state.tools.drill;
  const options = config.chords.drill;
  let release = null;
  const stage = h('div', { class: 'drill-stage' });
  const presetRow = h('div', { class: 'chip-row' });
  const custom = h('div', { class: 'chip-row' });
  const playBtn = h('button', { class: 'btn primary big', type: 'button', onclick: () => (seq.running ? stop() : start()) });
  const update = (patch) => {
    Object.assign(saved, patch);
    save();
  };

  function renderPick() {
    presetRow.replaceChildren(
      ...options.presets.map((p) => h('button', { class: 'chip' + (p.join() === saved.chords.join() ? ' on' : ''), type: 'button', onclick: () => setChords(p) }, p.map(pretty).join(' – '))),
    );
    custom.replaceChildren(
      h('span', { class: 'muted' }, t('drill.custom')),
      ...config.chords.pickable.map((c) =>
        h('button', { class: 'chip small' + (saved.chords.includes(c) ? ' on' : ''), type: 'button', onclick: () => setChords(saved.chords.includes(c) ? saved.chords.filter((x) => x !== c) : [...saved.chords, c]) }, pretty(c))),
    );
  }

  function setChords(list) {
    if (list.length < 2) return toast(t('drill.needTwo'));
    update({ chords: list });
    renderPick();
    renderStage(0, -1);
    if (seq.running) start();
  }

  function renderStage(idx, beat) {
    const { chords, beatsPer } = saved;
    const next = (idx + 1) % chords.length;
    stage.replaceChildren(
      h('div', { class: 'drill-now' }, h('small', null, t('drill.now')), chordDiagramEl(chords[idx], 'diagram-xl')),
      h('div', { class: 'drill-next' + (beat === beatsPer - 1 ? ' ready' : '') }, h('small', null, beat === beatsPer - 1 ? t('drill.ready') : t('drill.next')), chordDiagramEl(chords[next], 'diagram-lg')),
      h('div', { class: 'drill-beats' }, Array.from({ length: beatsPer }, (_, k) => h('i', { class: k === beat ? 'on' : k < beat ? 'past' : '' }))),
    );
  }

  async function start() {
    await resumeGuitar();
    if (!root.isConnected) return;
    const { chords, beatsPer } = saved;
    let count = 1;
    let i = 0;
    const source = {
      next() {
        if (count) {
          count--;
          return { ticks: 4 * BEAT_TICKS, beatTicks: BEAT_TICKS, items: beatItems({ beats: 4, beatTicks: BEAT_TICKS }, saved, true, (k) => ({ count: k + 1 })) };
        }
        const idx = i++ % chords.length;
        const shape = chordShapes(chords[idx])[0];
        return {
          ticks: beatsPer * BEAT_TICKS,
          beatTicks: BEAT_TICKS,
          items: Array.from({ length: beatsPer }, (_, k) => ({
            tick: k * BEAT_TICKS,
            sound: (time) => {
              if (saved.metronome) click(time, k === 0 ? 2 : 1);
              if (saved.strum && shape) strum(time, shape.frets, 0, 'D', k === 0);
            },
            ui: { idx, beat: k },
          })),
        };
      },
    };
    seq.start(source, saved.bpm, (u) => {
      if (u.count) stage.querySelector('.drill-now small').textContent = t('common.countIn', { count: u.count });
      else renderStage(u.idx, u.beat);
    });
    release ??= holdScreen();
    playBtn.replaceChildren(icon('stop'), t('common.stop'));
  }

  function stop() {
    seq.stop();
    release?.();
    release = null;
    playBtn.replaceChildren(icon('play'), t('common.start'));
    renderStage(0, -1);
  }

  renderPick();
  renderStage(0, -1);
  playBtn.replaceChildren(icon('play'), t('common.start'));
  // The stage and the start button come first, so on a phone they fill the first screen while you play.
  root.append(
    stage,
    h('div', { class: 'center' }, playBtn),
    h('section', { class: 'card stack' },
      h('p', { class: 'hint' }, t('drill.hint')),
      presetRow,
      custom,
      h('div', { class: 'row wrap gap-m' },
        h('label', { class: 'field-inline' }, t('drill.perChord'), segmented(options.beatsPerChord.map((n) => [n, t('drill.beats', { n })]), saved.beatsPer, (v) => { update({ beatsPer: v }); renderStage(0, -1); if (seq.running) start(); })),
        h('label', { class: 'field-inline' }, t('common.speed'), stepper(saved.bpm, { min: options.bpm.min, max: options.bpm.max, step: options.bpm.step, label: t('common.speed'), format: (v) => `♩${v}`, onchange: (v) => { update({ bpm: v }); if (seq.running) seq.setBpm(v); } })),
        toggle(t('common.metronome'), saved.metronome, (v) => update({ metronome: v })),
        toggle(t('drill.strumDemo'), saved.strum, (v) => update({ strum: v })),
      ),
    ),
  );
  return () => {
    seq.stop();
    release?.();
  };
}
