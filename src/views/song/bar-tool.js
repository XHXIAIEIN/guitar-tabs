// Floating toolbar beside a bar of the song page. It sits in the page, so it scrolls with the score.
import { fill, h } from '../../ui/dom.js';

const GAP = 6;

/**
 * @param area the positioned element that holds the toolbar
 * @param topbar the bar that covers the top of the screen
 * @param transport the bar that covers the bottom of the screen
 */
export function barTool(area, topbar, transport) {
  // The buttons re-render while they handle a click, and the song page closes the toolbar on any other click.
  const el = h('div', { class: 'bar-tool', role: 'toolbar', hidden: true, onclick: (e) => e.stopPropagation() });
  area.append(el);

  /** Centres the toolbar above the bar, or below it when the top bar is in the way. @param box the bar's client rect */
  function place(box) {
    const frame = area.getBoundingClientRect();
    const above = box.top - el.offsetHeight - GAP;
    const top = above >= topbar.getBoundingClientRect().bottom + GAP ? above : box.bottom + GAP;
    const left = box.left + (box.width - el.offsetWidth) / 2;
    const maxTop = transport.getBoundingClientRect().top - el.offsetHeight - GAP;
    el.style.top = `${Math.min(top, maxTop) - frame.top}px`;
    el.style.left = `${Math.max(frame.left + GAP, Math.min(left, frame.right - el.offsetWidth - GAP)) - frame.left}px`;
  }

  return {
    place,
    show(label, buttons, box) {
      el.setAttribute('aria-label', label);
      fill(el, buttons);
      el.hidden = false;
      place(box);
    },
    hide() {
      el.hidden = true;
    },
  };
}
