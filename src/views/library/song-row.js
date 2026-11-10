// One row of the song list.
import { t } from '../../core/i18n.js';
import { h } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { parse } from '../../state/songs.js';
import { inSetlist, toggleSetlist } from '../../state/setlist.js';
import { parseKey, prettyKey } from '../../music/key.js';

export function songRow(entry, onSetlistChange) {
  const song = parse(entry.text);
  const { meta } = song;
  const key = parseKey(meta.key);
  const added = inSetlist(entry.id);
  return h('li', { class: 'song-row' },
    h('a', { class: 'song-link', href: `#/song/${entry.id}` },
      h('strong', null, meta.title),
      h('span', { class: 'song-sub' },
        [meta.artist, entry.version && t(`version.${entry.version.id}`), key && t('common.key', { key: prettyKey(key) }), meta.time.join('/'), `♩${meta.bpm}`, entry.level].filter(Boolean).join(' · '),
        song.errors.length ? h('em', { class: 'bad' }, ` · ${t('library.errorCount', { count: song.errors.length })}`) : null),
    ),
    h('button', { class: 'btn small ghost' + (added ? ' on' : ''), type: 'button', title: added ? t('library.setlistRemove') : t('library.setlistAdd'), onclick: () => { toggleSetlist(entry.id); onSetlistChange(); } },
      icon(added ? 'list' : 'plus'), h('span', null, added ? t('library.inSetlist') : t('library.setlistShort'))),
  );
}
