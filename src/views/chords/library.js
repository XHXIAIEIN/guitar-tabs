// Chord library: every chord group as a grid of cards.
import { config } from '../../core/config.js';
import { t } from '../../core/i18n.js';
import { h } from '../../ui/dom.js';
import { chordDiagramEl } from '../../ui/chord-diagram-el.js';
import { fingerLegend, openChordPanel } from '../../ui/chord-panel.js';

export function chordLibrary(root) {
  root.append(
    h('p', { class: 'legend' }, fingerLegend(), ' · ', h('span', { class: 'root-swatch' }), ` ${t('chords.libraryLegend')}`),
    ...config.chords.groups.map((g) =>
      h('section', { class: 'chord-group' },
        h('h2', null, t(`chords.group.${g.id}`)),
        h('div', { class: 'chord-grid' }, g.chords.map((name) => h('button', { class: 'chord-card', type: 'button', onclick: () => openChordPanel(name) }, chordDiagramEl(name)))),
      )),
  );
  return () => {};
}
