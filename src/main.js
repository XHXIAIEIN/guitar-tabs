// App shell: hash router, navigation, theme and offline support.
import { h, icon, toast } from './ui/dom.js';
import { applyTheme } from './ui/theme.js';
import { onSave } from './store.js';
import * as store from './store.js';
import { libraryView } from './views/library.js';
import { songView } from './views/song.js';
import { editorView } from './views/editor.js';
import { chordsView } from './views/chords.js';
import { rhythmView } from './views/rhythm.js';
import { toolsView } from './views/tools.js';
import { setVolume } from './audio/engine.js';

const NAV = [
  ['#/', 'library', '曲谱'],
  ['#/chords', 'chord', '和弦'],
  ['#/rhythm', 'rhythm', '节奏'],
  ['#/tools', 'tuner', '工具'],
];

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

const view = h('main', { id: 'view' });
const nav = h('nav', { class: 'nav', 'aria-label': '主导航' },
  h('a', { class: 'brand', href: '#/', title: '六弦本' }, h('span', { class: 'brand-mark' }, '六'), h('span', { class: 'brand-name' }, '六弦本')),
  NAV.map(([href, ic, label]) => h('a', { class: 'nav-link', href, 'data-nav': href }, icon(ic), h('span', null, label))),
);
const shell = h('div', { class: 'shell' }, nav, view);
document.getElementById('app').append(shell);

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
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
let warned = false;
onSave(() => {
  if (store.saveFailed && !warned) {
    warned = true;
    toast('浏览器不允许保存数据，关闭页面后修改会丢失。请导出备份。');
  }
});
setVolume('metronome', store.state.settings.volMetronome);
setVolume('guitar', store.state.settings.volGuitar);
applyTheme();
route();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch((e) => console.warn('离线缓存注册失败', e));
}
