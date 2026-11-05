// Timed chord-change drill: the current chord is largest, the next one beside or below it, with a cue on the last beat.
import { config } from '../../core/config.js';
import { t } from '../../core/i18n.js';
import { h } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { segmented, stepper, toggle } from '../../ui/controls.js';
import { openPanel, closePanel } from '../../ui/panel.js';
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
  const stage = h('section', { class: 'card practice-stage drill-stage' });
  const presetRow = h('div', { class: 'chip-row' });
  const custom = h('div', { class: 'chip-row' });
  const playBtn = h('button', { class: 'btn primary big practice-start', type: 'button', onclick: () => (seq.running ? stop() : start()) });
  const summary = { chords: h('span', { class: 'practice-bar-chords' }), beats: h('span'), bpm: h('span') };
  const update = (patch) => {
    Object.assign(saved, patch);
    save();
    renderSummary();
  };

  function renderSummary() {
    summary.chords.textContent = saved.chords.map(pretty).join(' – ');
    summary.beats.textContent = t('drill.beats', { n: saved.beatsPer });
    summary.bpm.textContent = `♩${saved.bpm}`;
  }

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
      h('div', { class: 'drill-now' }, h('small', null, t('drill.now')), chordDiagramEl(chords[idx], 'drill-diagram')),
      h('div', { class: 'drill-beats' }, Array.from({ length: beatsPer }, (_, k) => h('i', { class: k === beat ? 'on' : k < beat ? 'past' : '' }))),
      h('div', { class: 'drill-next' + (beat === beatsPer - 1 ? ' ready' : '') }, h('small', null, beat === beatsPer - 1 ? t('drill.ready') : t('drill.next')), chordDiagramEl(chords[next], 'drill-diagram')),
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

  const settings = h('div', { class: 'stack' },
    h('div', { class: 'field' }, h('span', { class: 'field-label' }, t('drill.perChord')), segmented(options.beatsPerChord.map((n) => [n, t('drill.beats', { n })]), saved.beatsPer, (v) => { update({ beatsPer: v }); renderStage(0, -1); if (seq.running) start(); })),
    h('div', { class: 'field' }, h('span', { class: 'field-label' }, t('common.speed')), stepper(saved.bpm, { min: options.bpm.min, max: options.bpm.max, step: options.bpm.step, label: t('common.speed'), format: (v) => `♩${v}`, onchange: (v) => { update({ bpm: v }); if (seq.running) seq.setBpm(v); } })),
    h('div', { class: 'field' }, toggle(t('common.metronome'), saved.metronome, (v) => update({ metronome: v })), toggle(t('drill.strumDemo'), saved.strum, (v) => update({ strum: v }))),
    h('div', { class: 'practice-divider' }),
    presetRow,
    custom,
    h('p', { class: 'hint' }, t('drill.hint')),
  );
  const side = h('aside', { class: 'card practice-side' }, settings);
  // One settings element: it lives in the side column and moves into the panel where the column is hidden.
  const openSettings = () => openPanel(t('drill.settings'), settings, { onclose: () => side.append(settings) });
  const barBtn = (...label) => h('button', { class: 'btn', type: 'button', title: t('drill.settings'), onclick: openSettings }, ...label);

  renderSummary();
  renderPick();
  renderStage(0, -1);
  playBtn.replaceChildren(icon('play'), t('common.start'));
  root.append(
    h('div', { class: 'practice-main' },
      stage,
      h('div', { class: 'practice-bar' }, barBtn(summary.chords, icon('down')), barBtn(summary.beats), barBtn(summary.bpm)),
      playBtn,
    ),
    side,
  );
  return () => {
    seq.stop();
    release?.();
    closePanel();
  };
}
