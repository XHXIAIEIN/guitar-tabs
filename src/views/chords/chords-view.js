// Chord pages: library, timed chord-change drill, and the one-minute change challenge.
import { t } from '../../core/i18n.js';
import { h } from '../../ui/dom.js';
import { segmented } from '../../ui/controls.js';
import { chordLibrary } from './library.js';
import { chordDrill } from './drill.js';
import { minuteChallenge } from './minute.js';

const TABS = { library: chordLibrary, drill: chordDrill, minute: minuteChallenge };

export function chordsView(root, tab = 'library') {
  const body = h('div');
  let cleanup = () => {};
  const page = h('div', { class: 'page' });
  const show = (name) => {
    cleanup();
    body.replaceChildren();
    page.classList.toggle('practice', name !== 'library');
    body.className = name === 'library' ? '' : 'practice-grid';
    history.replaceState(null, '', name === 'library' ? '#/chords' : `#/chords/${name}`);
    cleanup = TABS[name](body);
  };
  page.append(
    h('header', { class: 'page-head' },
      h('h1', null, t('nav.chords')),
      segmented([['library', t('chords.tabLibrary')], ['drill', t('chords.tabDrill')], ['minute', t('chords.tabMinute')]], tab, show),
    ),
    body,
  );
  root.append(page);
  show(tab);
  return () => cleanup();
}
