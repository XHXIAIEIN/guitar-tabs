// Short messages at the bottom of the screen.
import { config } from '../core/config.js';
import { h } from './dom.js';

let toastTimer = 0;

/** Short message at the bottom; `action` = [label, fn] adds a button such as an undo. */
export function toast(message, action) {
  document.querySelector('.toast')?.remove();
  clearTimeout(toastTimer);
  const el = h('div', { class: 'toast', role: 'status' }, h('span', null, message));
  if (action) el.append(h('button', { class: 'btn link', type: 'button', onclick: () => { action[1](); el.remove(); } }, action[0]));
  document.body.append(el);
  toastTimer = setTimeout(() => el.remove(), action ? config.toast.actionMs : config.toast.plainMs);
}
