// The performance setlist at the top of the song list.
import { t } from '../../core/i18n.js';
import { h } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { iconButton } from '../../ui/controls.js';
import { state } from '../../state/store.js';
import { getEntry, parse } from '../../state/songs.js';
import { moveInSetlist, toggleSetlist } from '../../state/setlist.js';

/** Fills `el` with the setlist. `onRemove` runs after a song leaves it, because the song list shows membership too. */
export function renderSetlist(el, onRemove) {
  const ids = state.setlist.filter((id) => getEntry(id));
  if (!ids.length) {
    el.replaceChildren();
    el.hidden = true;
    return;
  }
  el.hidden = false;
  const move = (i, delta) => {
    moveInSetlist(i, delta);
    renderSetlist(el, onRemove);
  };
  el.replaceChildren(
    h('div', { class: 'section-head' },
      h('h2', null, t('library.setlistTitle')),
      h('a', { class: 'btn primary small', href: `#/perform/${ids[0]}?list` }, icon('stage'), t('library.startPerformance')),
    ),
    h('ol', { class: 'setlist-items' },
      ids.map((id, i) => {
        const song = parse(getEntry(id).text);
        return h('li', null,
          h('span', { class: 'set-no' }, i + 1),
          h('a', { href: `#/perform/${id}?list` }, song.meta.title),
          h('span', { class: 'spacer' }),
          iconButton('up', t('library.moveUp'), () => move(i, -1), { cls: 'small' + (i === 0 ? ' invisible' : '') }),
          iconButton('down', t('library.moveDown'), () => move(i, 1), { cls: 'small' + (i === ids.length - 1 ? ' invisible' : '') }),
          iconButton('close', t('library.removeFromSetlist'), () => { toggleSetlist(id); onRemove(); }, { cls: 'small' }),
        );
      }),
    ),
  );
}
