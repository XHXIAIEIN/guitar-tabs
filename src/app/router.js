// Hash router: mounts one view at a time and unmounts the previous one.
import { libraryView } from '../views/library/library-view.js';
import { songView } from '../views/song/song-view.js';
import { editorView } from '../views/editor/editor-view.js';
import { chordsView } from '../views/chords/chords-view.js';
import { rhythmView } from '../views/rhythm/rhythm-view.js';
import { toolsView } from '../views/tools/tools-view.js';

// [pattern, view, focus]: focus pages hide the bottom navigation on phones
const ROUTES = [
  [/^#\/song\/([^?]+)$/, (el, id) => songView(el, id), true],
  [/^#\/perform\/([^?]+)(\?list)?$/, (el, id, list) => songView(el, id, { perform: true, list: !!list }), true],
  [/^#\/edit\/([^?]+)$/, (el, id) => editorView(el, id), true],
  [/^#\/chords(?:\/(\w+))?$/, (el, tab) => chordsView(el, tab), false],
  [/^#\/rhythm$/, (el) => rhythmView(el), false],
  [/^#\/tools(?:\/(\w+))?$/, (el, tab) => toolsView(el, tab), false],
  [/^#?\/?$/, (el) => libraryView(el), false],
];

/** Starts routing inside the shell and shows the current hash. */
export function startRouter({ shell, nav, view }) {
  let unmount = () => {};

  function route() {
    const hash = location.hash || '#/';
    unmount();
    view.replaceChildren();
    const [pattern, render, focus] = ROUTES.find(([re]) => re.test(hash)) ?? ROUTES[ROUTES.length - 1];
    const args = (pattern.exec(hash) ?? []).slice(1).map((a) => (a === undefined ? undefined : decodeURIComponent(a)));
    shell.classList.toggle('focus', focus);
    const section = hash.startsWith('#/chords') ? '#/chords' : hash.startsWith('#/rhythm') ? '#/rhythm' : hash.startsWith('#/tools') ? '#/tools' : '#/';
    for (const a of nav.querySelectorAll('[data-nav]')) a.classList.toggle('active', a.dataset.nav === section);
    unmount = render(view, ...args.filter((a) => a !== undefined)) ?? (() => {});
    if (!focus) scrollTo(0, 0);
  }

  history.scrollRestoration = 'manual'; // route() and the views set the scroll position themselves
  addEventListener('hashchange', route);
  route();
}
