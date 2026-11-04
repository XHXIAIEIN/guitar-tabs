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
  const show = (name) => {
    cleanup();
    body.replaceChildren();
    history.replaceState(null, '', name === 'library' ? '#/chords' : `#/chords/${name}`);
    cleanup = TABS[name](body);
  };
  root.append(
    h('div', { class: 'page' },
      h('header', { class: 'page-head' },
        h('h1', null, t('nav.chords')),
        segmented([['library', t('chords.tabLibrary')], ['drill', t('chords.tabDrill')], ['minute', t('chords.tabMinute')]], tab, show),
      ),
      body,
    ),
  );
  show(tab);
  return () => cleanup();
}
