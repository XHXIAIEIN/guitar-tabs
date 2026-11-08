// Standalone metronome.
import { config } from '../../core/config.js';
import { t } from '../../core/i18n.js';
import { h } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { iconButton, segmented, toggle } from '../../ui/controls.js';
import { holdScreen } from '../../ui/wake-lock.js';
import { state, save } from '../../state/store.js';
import { beatAccent, meter } from '../../music/format/meter.js';
import { Sequencer } from '../../audio/sequencer.js';
import { resumeAudio } from '../../audio/context.js';
import { click } from '../../audio/click.js';
import { tapTempo } from './tap-tempo.js';

export function metronomeTool(root) {
  const seq = new Sequencer();
  const saved = state.tools.metronome;
  const options = config.tools.metronome;
  let release = null;
  const big = h('output', { class: 'tempo-big' }, saved.bpm);
  const slider = h('input', { type: 'range', min: options.bpm.min, max: options.bpm.max, value: saved.bpm, 'aria-label': t('common.speed'), oninput: () => setBpm(+slider.value) });
  const dots = h('div', { class: 'metro-dots' });
  const playBtn = h('button', { class: 'btn primary big practice-start', type: 'button', onclick: () => (seq.running ? stop() : start()) });

  function setBpm(v) {
    saved.bpm = Math.max(options.bpm.min, Math.min(options.bpm.max, Math.round(v)));
    save();
    big.textContent = saved.bpm;
    slider.value = saved.bpm;
    if (seq.running) seq.setBpm(saved.bpm);
  }

  function renderDots(on = -1) {
    const m = meter(saved.time);
    dots.replaceChildren(...Array.from({ length: m.beats }, (_, k) => h('i', { class: (k === on ? 'on ' : '') + (beatAccent(k, m) && saved.accent ? 'accent' : '') })));
  }

  async function start() {
    await resumeAudio();
    if (!root.isConnected) return;
    const m = meter(saved.time);
    const { accent, subdivision } = saved;
    const source = {
      next() {
        const items = [];
        for (let k = 0; k < m.beats; k++) {
          const level = accent ? beatAccent(k, m) : 1;
          items.push({ tick: k * m.beatTicks, sound: (time) => click(time, level === 0 ? 1 : level), ui: k });
          for (let j = 1; j < subdivision; j++) items.push({ tick: k * m.beatTicks + (j * m.beatTicks) / subdivision, sound: (time) => click(time, 0) });
        }
        return { ticks: m.barTicks, beatTicks: m.beatTicks, items };
      },
    };
    seq.start(source, saved.bpm, (k) => renderDots(k));
    release ??= holdScreen();
    playBtn.replaceChildren(icon('stop'), t('common.stop'));
  }

  function stop() {
    seq.stop();
    release?.();
    release = null;
    renderDots();
    playBtn.replaceChildren(icon('play'), t('common.start'));
  }

  const change = (patch) => {
    Object.assign(saved, patch);
    save();
    renderDots();
    if (seq.running) start();
  };
  function onKey(e) {
    if (e.key === ' ' && !e.target.closest('button, input, select')) {
      e.preventDefault();
      seq.running ? stop() : start();
    }
  }
  addEventListener('keydown', onKey);
  playBtn.replaceChildren(icon('play'), t('common.start'));
  renderDots();
  root.append(
    h('div', { class: 'practice-main' },
      h('section', { class: 'card practice-stage metro-stage' },
        dots,
        h('div', { class: 'tempo-row center' }, iconButton('minus', t('tools.slower'), () => setBpm(saved.bpm - 1)), big, iconButton('plus', t('tools.faster'), () => setBpm(saved.bpm + 1))),
        slider,
        h('div', { class: 'row wrap gap-s center' }, ...options.quickBpm.map((v) => h('button', { class: 'btn small', type: 'button', onclick: () => setBpm(v) }, v)), h('button', { class: 'btn small', type: 'button', onclick: tapTempo(setBpm) }, t('common.tapTempo'))),
      ),
      playBtn,
      h('section', { class: 'card stack metro-settings' },
        h('div', { class: 'field' }, h('span', { class: 'field-label' }, t('common.timeSignature')), segmented(options.timeSignatures.map((v) => [v, v]), saved.time.join('/'), (v) => change({ time: v.split('/').map(Number) }))),
        h('div', { class: 'field' }, h('span', { class: 'field-label' }, t('common.subdivision')), segmented(options.subdivisions.map((n) => [n, t(`tools.subdivision.${n}`)]), saved.subdivision, (v) => change({ subdivision: v }))),
        h('div', { class: 'field' }, toggle(t('tools.accent'), saved.accent, (v) => change({ accent: v }))),
      ),
    ),
  );
  return () => {
    seq.stop();
    release?.();
    removeEventListener('keydown', onKey);
  };
}
