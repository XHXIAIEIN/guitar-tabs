// Tempo panel of the song page.
import { config } from '../../../core/config.js';
import { t } from '../../../core/i18n.js';
import { h } from '../../../ui/dom.js';
import { openPanel } from '../../../ui/panel.js';

/** @param o prefs, meta, setBpm(v), listeners: a set of functions that run when the tempo changes */
export function openTempoPanel({ prefs, meta, setBpm, listeners }) {
  const { slider: range, nudges, ratios } = config.song.tempoPanel;
  const pct = h('span', { class: 'muted' });
  const big = h('output', { class: 'tempo-big' });
  const slider = h('input', { type: 'range', min: range[0], max: range[1], step: 1, value: prefs.bpm, 'aria-label': t('common.speed'), oninput: () => setBpm(+slider.value) });
  const sync = () => {
    big.textContent = prefs.bpm;
    slider.value = prefs.bpm;
    pct.textContent = t('tempo.percent', { bpm: meta.bpm, percent: Math.round((prefs.bpm / meta.bpm) * 100) });
  };
  listeners.add(sync);
  sync();
  openPanel(t('common.speed'), h('div', { class: 'stack' },
    h('div', { class: 'tempo-row' }, big, h('span', null, 'BPM'), pct),
    slider,
    h('div', { class: 'row wrap gap-s' },
      ...nudges.map((d) => h('button', { class: 'btn', type: 'button', onclick: () => setBpm(prefs.bpm + d) }, d > 0 ? `+${d}` : d)),
    ),
    h('div', { class: 'row wrap gap-s' },
      h('span', { class: 'muted' }, t('tempo.presets')),
      ...ratios.map((r) => h('button', { class: 'btn small', type: 'button', onclick: () => setBpm(meta.bpm * r) }, r === 1 ? t('tempo.original') : `${r * 100}%`)),
    ),
    h('p', { class: 'hint' }, t('tempo.hint')),
  ), { onclose: () => listeners.delete(sync) });
}
