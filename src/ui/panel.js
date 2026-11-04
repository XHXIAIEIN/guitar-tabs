// Floating panels: one at a time, a bottom sheet on phones.
import { t } from '../core/i18n.js';
import { h } from './dom.js';
import { iconButton } from './controls.js';

let openPanelEl = null;

/** Opens a floating panel (a bottom sheet on phones). Returns a close function. */
export function openPanel(title, body, { onclose, wide = false } = {}) {
  closePanel();
  const close = () => {
    if (openPanelEl !== wrap) return;
    wrap.remove();
    openPanelEl = null;
    document.removeEventListener('keydown', onKey);
    onclose?.();
  };
  const onKey = (e) => e.key === 'Escape' && close();
  const wrap = h(
    'div',
    { class: 'panel-wrap', onclick: (e) => e.target === wrap && close() },
    h('section', { class: 'panel' + (wide ? ' wide' : ''), role: 'dialog', 'aria-label': title },
      h('header', { class: 'panel-head' }, h('h2', null, title), iconButton('close', t('common.close'), close)),
      h('div', { class: 'panel-body' }, body),
    ),
  );
  document.body.append(wrap);
  document.addEventListener('keydown', onKey);
  openPanelEl = wrap;
  wrap.close = close;
  return close;
}

export function closePanel() {
  openPanelEl?.close();
}
