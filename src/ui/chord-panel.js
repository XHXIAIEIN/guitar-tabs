// Chord detail panel: every known shape with fingers, chord tones, and buttons to hear it.
import { h, icon, openPanel } from './dom.js';
import { chordDiagram } from '../render/chord-diagram.js';
import { chordShapes, chordTones } from '../music/chords.js';
import { parseChord, pretty, TUNING, keyFromPc, noteName } from '../music/theory.js';
import { resumeGuitar, strum, pluck } from '../audio/engine.js';

export const FINGER_LEGEND = '1 食指 · 2 中指 · 3 无名指 · 4 小指 · T 拇指 · ○ 空弦 · × 不弹';

export async function playShape(shape, mode, capo = 0) {
  const c = await resumeGuitar();
  const t = c.currentTime + 0.05;
  if (mode === 'strum') strum(t, shape.frets, capo, 'D', true);
  else {
    shape.frets.forEach((fret, i) => {
      if (fret >= 0) pluck(t + i * 0.28, 6 - i, TUNING[6 - i] + capo + fret, 0.8);
    });
  }
}

function tip(name, shape) {
  if (shape.barre && shape.barre.from - shape.barre.to >= 4) return `食指平放横按第 ${shape.barre.fret} 品的所有弦，用食指外侧（靠拇指的一侧）压弦更省力，拇指放在琴颈背面中间。`;
  if (shape.barre) return `食指同时按住第 ${shape.barre.fret} 品的 ${shape.barre.from}–${shape.barre.to} 弦（小横按）。`;
  if (shape.frets.includes(-1)) return `标 × 的弦不要弹到：右手从和弦最低音的那根弦开始扫。`;
  return '手指立起来，用指尖按在品丝后面一点，别碰到相邻的弦。';
}

export function openChordPanel(name) {
  const shapes = chordShapes(name);
  const c = parseChord(name);
  // spell the tones in the key of the chord's own root: Cm → C E♭ G, F♯m → F♯ A C♯
  const home = c && keyFromPc(c.root, /^m(?!aj)/.test(c.quality));
  const tones = chordTones(name, (pc) => pretty(noteName(pc, home)));
  const body = h('div', { class: 'chord-detail' });
  if (!shapes.length) {
    body.append(h('p', { class: 'hint' }, `暂时没有「${pretty(name)}」的指法图。`));
  } else {
    body.append(
      h('div', { class: 'chord-shapes' },
        shapes.slice(0, 3).map((shape, i) =>
          h('figure', { class: 'chord-shape' },
            h('div', { class: 'diagram-lg', html: chordDiagram(shape, { chord: name }) }),
            h('figcaption', null, i === 0 ? '常用按法' : shape.barre ? `横按 · ${shape.barre.fret} 品` : `按法 ${i + 1}`),
            h('div', { class: 'row gap-s' },
              h('button', { class: 'btn small', type: 'button', onclick: () => playShape(shape, 'strum') }, icon('sound'), '扫弦'),
              h('button', { class: 'btn small', type: 'button', onclick: () => playShape(shape, 'arp') }, '分解'),
            ),
          ),
        ),
      ),
      tones.length ? h('p', { class: 'chord-tones' }, '组成音：', tones.map(([n, iv]) => h('span', { class: 'tone' }, n, h('small', null, iv)))) : null,
      h('p', { class: 'hint' }, tip(name, shapes[0])),
      h('p', { class: 'legend' }, FINGER_LEGEND, ' · ', h('span', { class: 'root-swatch' }), ' 根音'),
    );
  }
  openPanel(`${pretty(name)} 和弦`, body, { wide: shapes.length > 1 });
}
