// Shown when a route names a song that does not exist.
import { t } from '../core/i18n.js';
import { h } from '../ui/dom.js';

export function notFound(root) {
  root.append(h('div', { class: 'empty-page' }, h('p', null, t('song.notFound')), h('a', { class: 'btn primary', href: '#/' }, t('song.backToList'))));
  return () => {};
}
