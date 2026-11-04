// A chord's first shape as an element, or its name when no shape is known.
import { h } from './dom.js';
import { chordDiagram } from '../render/chord-diagram.js';
import { chordShapes } from '../music/chord-shapes.js';
import { pretty } from '../music/pitch.js';

export function chordDiagramEl(name, cls = 'diagram') {
  const shape = chordShapes(name)[0];
  return shape ? h('span', { class: cls, html: chordDiagram(shape, { name: pretty(name), chord: name }) }) : h('strong', null, pretty(name));
}
