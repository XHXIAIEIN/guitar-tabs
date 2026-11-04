// Capo and transposition panel of the song page.
import { config } from '../../../core/config.js';
import { t } from '../../../core/i18n.js';
import { h, fill } from '../../../ui/dom.js';
import { stepper } from '../../../ui/controls.js';
import { openPanel } from '../../../ui/panel.js';
import { isEasyChord } from '../../../music/chord-shapes.js';
import { transposeChord } from '../../../music/chord-name.js';
import { keyFromPc, prettyKey, transposeKey } from '../../../music/key.js';
import { mod12, pretty } from '../../../music/pitch.js';

/** Capo and fingering choices that sound in `target`, fewest hard chords first. */
function capoOptions(song, baseKey, target) {
  const { transposeRange, optionMaxCapo, optionsShown } = config.song.capo;
  const list = [];
  for (let semis = transposeRange[0]; semis < transposeRange[1]; semis++) {
    const key = transposeKey(baseKey, semis);
    const capo = mod12(target - key.pc);
    if (capo > optionMaxCapo) continue;
    const hard = song.chordsUsed.map((c) => transposeChord(c, semis, key)).filter((c) => !isEasyChord(c));
    list.push({ semis, capo, key, hard: [...new Set(hard)] });
  }
  return list.sort((a, b) => a.hard.length - b.hard.length || a.capo - b.capo).slice(0, optionsShown);
}

/** @param o song, baseKey, prefs, canTranspose, shapeKey(), soundKey(), apply(patch): stores and shows a change */
export function openCapoPanel({ song, baseKey, prefs, canTranspose, shapeKey, soundKey, apply }) {
  const { meta } = song;
  const limits = config.song.capo;
  const body = h('div', { class: 'stack' });
  let target = soundKey().pc;
  const change = (patch) => {
    apply(patch);
    render();
  };
  const capoName = (capo) => (capo ? t('capo.optionCapo', { n: capo }) : t('capo.none'));
  const render = () => {
    const shape = prettyKey(shapeKey());
    const sound = prettyKey(soundKey());
    fill(body,
      h('div', { class: 'field' }, h('label', null, t('capo.capo')),
        stepper(prefs.capo, { min: 0, max: limits.maxCapo, label: t('capo.capo'), format: (v) => (v ? t('capo.fret', { n: v }) : t('capo.none')), onchange: (v) => change({ capo: v }) })),
      canTranspose
        ? h('div', { class: 'field' }, h('label', null, t('capo.shapes')),
            stepper(prefs.transpose, { min: limits.transposeRange[0], max: limits.transposeRange[1], label: t('capo.transpose'), format: (v) => t('common.key', { key: prettyKey(transposeKey(baseKey, v)) }), onchange: (v) => change({ transpose: v }) }))
        : null,
      h('p', { class: 'capo-summary' }, prefs.capo ? t('capo.summaryWithCapo', { shape, capo: prefs.capo, sound }) : t('capo.summary', { shape, sound })),
      canTranspose
        ? h('div', { class: 'stack' },
            h('label', { class: 'field-label' }, t('capo.target')),
            h('div', { class: 'key-grid' }, Array.from({ length: 12 }, (_, pc) =>
              h('button', { class: 'btn small' + (pc === target ? ' on' : ''), type: 'button', onclick: () => { target = pc; render(); } }, prettyKey(keyFromPc(pc, baseKey.minor))))),
            h('div', { class: 'capo-options' }, capoOptions(song, baseKey, target).map((o) =>
              h('button', { class: 'capo-option' + (o.semis === prefs.transpose && o.capo === prefs.capo ? ' on' : ''), type: 'button', onclick: () => change({ transpose: o.semis, capo: o.capo }) },
                h('strong', null, t('capo.option', { capo: capoName(o.capo), key: prettyKey(o.key) })),
                h('span', null, o.hard.length ? t('capo.needs', { chords: o.hard.map(pretty).join(t('capo.listSeparator')) }) : t('capo.allOpen'))))),
          )
        : h('p', { class: 'hint' }, t('capo.fixedHint')),
      h('button', { class: 'btn', type: 'button', onclick: () => change({ capo: meta.capo, transpose: 0 }) }, t('capo.reset')),
    );
  };
  render();
  openPanel(t('capo.title'), body);
}
