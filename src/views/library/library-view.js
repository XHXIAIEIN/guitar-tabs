// Song list: search, my songs, exercises, songs, game music, the performance setlist and backup.
import { t } from '../../core/i18n.js';
import { h, fill } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { allEntries, parse } from '../../state/songs.js';
import { songRow } from './song-row.js';
import { renderSetlist } from './setlist.js';
import { backupControls } from './backup-controls.js';

const GROUPS = ['mine', 'exercise', 'song', 'game'];

export function libraryView(root) {
  let query = '';
  const listEl = h('div', { class: 'lib-groups' });
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
    fill(listEl,
      ...GROUPS.map((g) => {
        const items = entries.filter((e) => e.group === g);
        if (!items.length && (query || g !== 'mine')) return null;
        return h('section', { class: 'lib-group' },
          h('h2', null, t(`library.group.${g}`)),
          items.length
            ? h('ul', { class: 'song-list' }, items.map((entry) => songRow(entry, refreshAll)))
            : h('p', { class: 'empty' }, t('library.emptyMine')));
      }),
      entries.length ? null : h('p', { class: 'empty' }, t('library.noMatch', { query })),
    );
  }

  refreshAll();
  return () => {};
}
