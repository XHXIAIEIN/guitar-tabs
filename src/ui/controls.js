// Form controls shared by the views: icon button, segmented choice, switch and stepper.
import { t } from '../core/i18n.js';
import { h } from './dom.js';
import { icon } from './icons.js';

/** Icon button; `label` is shown as text when `text` is true and always used as the accessible name. */
export function iconButton(name, label, onclick, { text = false, cls = '' } = {}) {
  return h('button', { class: `btn icon-btn ${text ? 'with-text' : ''} ${cls}`, type: 'button', title: label, 'aria-label': label, onclick }, icon(name), text ? h('span', null, label) : null);
}

/** Segmented choice. options: [[value, label]]. */
export function segmented(options, value, onchange, cls = '') {
  const el = h('div', { class: 'seg ' + cls, role: 'radiogroup' });
  const render = (v) => {
    el.replaceChildren(
      ...options.map(([val, label]) =>
        h('button', { type: 'button', class: 'seg-btn' + (val === v ? ' on' : ''), role: 'radio', 'aria-checked': String(val === v), onclick: () => { render(val); onchange(val); } }, label),
      ),
    );
  };
  render(value);
  el.set = render;
  return el;
}

export function toggle(label, checked, onchange) {
  const input = h('input', { type: 'checkbox', checked, onchange: () => onchange(input.checked) });
  return h('label', { class: 'switch' }, h('span', null, label), input, h('span', { class: 'switch-ui', 'aria-hidden': 'true' }));
}

/** Stepper with − / value / +. format(v) renders the value. */
export function stepper(value, { min, max, step = 1, format = String, onchange, label }) {
  const out = h('output', { class: 'stepper-value' });
  const set = (v) => {
    value = Math.min(max, Math.max(min, v));
    out.textContent = format(value);
    minus.disabled = value <= min;
    plus.disabled = value >= max;
  };
  const minus = iconButton('minus', t('controls.decrease', { label }), () => { set(value - step); onchange(value); });
  const plus = iconButton('plus', t('controls.increase', { label }), () => { set(value + step); onchange(value); });
  const el = h('div', { class: 'stepper', role: 'group', 'aria-label': label }, minus, out, plus);
  set(value);
  el.set = set;
  return el;
}
