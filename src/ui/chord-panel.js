// Chord detail panel: every known shape with fingers, chord tones, and buttons to hear it.
import { t } from '../core/i18n.js';
import { h } from './dom.js';
import { icon } from './icons.js';
import { openPanel } from './panel.js';
import { chordDiagram } from '../render/chord-diagram.js';
import { chordShapes } from '../music/chord-shapes.js';
import { chordTones } from '../music/chord-tones.js';
import { parseChord } from '../music/chord-name.js';
import { keyFromPc, noteName } from '../music/key.js';
import { TUNING, pretty } from '../music/pitch.js';
import { pluck, resumeGuitar, strum } from '../audio/guitar.js';

const SHAPES_SHOWN = 3;

export const fingerLegend = () => t('chords.fingerLegend');

async function playShape(shape, mode) {
  const c = await resumeGuitar();
  const time = c.currentTime + 0.05;
  if (mode === 'strum') strum(time, shape.frets, 0, 'D', true);
  else {
    shape.frets.forEach((fret, i) => {
      if (fret >= 0) pluck(time + i * 0.28, 6 - i, TUNING[6 - i] + fret, 0.8);
    });
  }
}

function tip(shape) {
  if (shape.barre && shape.barre.from - shape.barre.to >= 4) return t('chords.tip.fullBarre', { fret: shape.barre.fret });
  if (shape.barre) return t('chords.tip.smallBarre', { fret: shape.barre.fret, from: shape.barre.from, to: shape.barre.to });
  if (shape.frets.includes(-1)) return t('chords.tip.muted');
  return t('chords.tip.default');
}

export function openChordPanel(name) {
  const shapes = chordShapes(name);
  const c = parseChord(name);
  // spell the tones in the key of the chord's own root: Cm → C E♭ G, F♯m → F♯ A C♯
  const home = c && keyFromPc(c.root, /^m(?!aj)/.test(c.quality));
  const tones = chordTones(name, (pc) => pretty(noteName(pc, home)));
  const body = h('div', { class: 'chord-detail' });
  if (!shapes.length) {
    body.append(h('p', { class: 'hint' }, t('chords.noShape', { name: pretty(name) })));
  } else {
    body.append(
      h('div', { class: 'chord-shapes' },
        shapes.slice(0, SHAPES_SHOWN).map((shape, i) =>
          h('figure', { class: 'chord-shape' },
            h('div', { class: 'diagram-lg', html: chordDiagram(shape, { chord: name }) }),
            h('figcaption', null, i === 0 ? t('chords.shapeCommon') : shape.barre ? t('chords.shapeBarre', { fret: shape.barre.fret }) : t('chords.shapeNumber', { n: i + 1 })),
            h('div', { class: 'row gap-s' },
              h('button', { class: 'btn small', type: 'button', onclick: () => playShape(shape, 'strum') }, icon('sound'), t('chords.strum')),
              h('button', { class: 'btn small', type: 'button', onclick: () => playShape(shape, 'arp') }, t('chords.arpeggio')),
            ),
          ),
        ),
      ),
      tones.length ? h('p', { class: 'chord-tones' }, t('chords.tones'), tones.map(([n, iv]) => h('span', { class: 'tone' }, n, h('small', null, iv)))) : null,
      h('p', { class: 'hint' }, tip(shapes[0])),
      h('p', { class: 'legend' }, fingerLegend(), ' · ', h('span', { class: 'root-swatch' }), ` ${t('chords.root')}`),
    );
  }
  openPanel(t('chords.panelTitle', { name: pretty(name) }), body, { wide: shapes.length > 1 });
}
