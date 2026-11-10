// Song list: search, the performance setlist, my songs, built-in songs by playing style and group, and backup.
import { t } from '../../core/i18n.js';
import { h, fill } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { segmented } from '../../ui/controls.js';
import { state, setSetting } from '../../state/store.js';
import { allEntries, parse } from '../../state/songs.js';
import { songRow } from './song-row.js';
import { renderSetlist } from './setlist.js';
import { backupControls } from './backup-controls.js';
import { importScoreButton } from './import-score.js';

// Built-in groups under each playing style, in list order.
const STYLES = { fingerstyle: ['practice', 'game', 'anime', 'pop', 'classical'], strum: ['song'] };

export function libraryView(root) {
  let query = '';
  const listEl = h('div', { class: 'lib-groups' });
  const styleSeg = segmented(Object.keys(STYLES).map((s) => [s, t(`library.style.${s}`)]), state.settings.libraryStyle, (s) => { setSetting('libraryStyle', s); renderList(); }, 'lib-style');
  const setlistEl = h('section', { class: 'setlist' });

  const refreshSetlist = () => renderSetlist(setlistEl, refreshAll);
  function refreshAll() {
    refreshSetlist();
    renderList();
  }

  root.append(
    h('div', { class: 'page' },
      h('header', { class: 'page-head' },
        h('h1', null, t('library.title')),
        h('div', { class: 'row gap-s' },
          importScoreButton(),
          h('a', { class: 'btn primary', href: '#/edit/new' }, icon('plus'), h('span', null, t('library.newSong'))),
        ),
      ),
      h('input', { class: 'search', type: 'search', placeholder: t('library.searchPlaceholder'), 'aria-label': t('library.searchLabel'), oninput: (e) => { query = e.target.value.trim().toLowerCase(); renderList(); } }),
      setlistEl,
      listEl,
      backupControls(refreshAll),
    ),
  );

  function renderList() {
    const entries = allEntries().filter((e) => {
      if (!query) return true;
      const s = parse(e.text);
      return [s.meta.title, s.meta.artist, ...s.chordsUsed].join(' ').toLowerCase().includes(query);
    });
    const group = (g) => {
      const items = entries.filter((e) => e.group === g);
      if (!items.length) return null;
      return h('section', { class: 'lib-group' },
        h('h2', null, t(`library.group.${g}`)),
        h('ul', { class: 'song-list' }, items.map((entry) => songRow(entry, refreshAll))));
    };
    fill(listEl,
      group('mine'),
      query ? null : styleSeg,
      // A search looks through both styles, so the style choice cannot hide a match.
      ...(query ? Object.values(STYLES).flat() : STYLES[state.settings.libraryStyle]).map(group),
      entries.length ? null : h('p', { class: 'empty' }, t('library.noMatch', { query })),
    );
  }

  refreshAll();
  return () => {};
}
