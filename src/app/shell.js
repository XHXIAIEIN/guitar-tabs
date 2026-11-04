// The app frame: navigation beside (or below, on phones) the current view.
import { t } from '../core/i18n.js';
import { h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';

const NAV = [
  ['#/', 'library', 'nav.library'],
  ['#/chords', 'chord', 'nav.chords'],
  ['#/rhythm', 'rhythm', 'nav.rhythm'],
  ['#/tools', 'tuner', 'nav.tools'],
];

/** Builds the frame inside `mount` and returns its parts for the router. */
export function createShell(mount) {
  const view = h('main', { id: 'view' });
  const nav = h('nav', { class: 'nav', 'aria-label': t('nav.label') },
    h('a', { class: 'brand', href: '#/', title: t('app.name') }, h('span', { class: 'brand-mark' }, t('app.mark')), h('span', { class: 'brand-name' }, t('app.name'))),
    NAV.map(([href, ic, label]) => h('a', { class: 'nav-link', href, 'data-nav': href }, icon(ic), h('span', null, t(label)))),
  );
  const shell = h('div', { class: 'shell' }, nav, view);
  mount.append(shell);
  return { shell, nav, view };
}
