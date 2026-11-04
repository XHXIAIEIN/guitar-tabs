// One-minute challenge: counts clean changes between two chords and keeps the recent results per pair.
import { config } from '../../core/config.js';
import { currentLocale, t } from '../../core/i18n.js';
import { h } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { toast } from '../../ui/toast.js';
import { holdScreen } from '../../ui/wake-lock.js';
import { chordDiagramEl } from '../../ui/chord-diagram-el.js';
import { state, save } from '../../state/store.js';
import { pretty } from '../../music/pitch.js';
import { audioContext, resumeAudio } from '../../audio/context.js';
import { click } from '../../audio/click.js';

export function minuteChallenge(root) {
  const options = config.chords.minute;
  const { pair } = state.tools.minute;
  let timer = 0;
  let count = 0;
  let endAt = 0;
  let release = null;
  const records = (state.records.minute ??= {});
  const select = (i) =>
    h('select', { 'aria-label': t('minute.chordLabel', { n: i + 1 }), onchange: (e) => { pair[i] = e.target.value; save(); renderHistory(); } },
      config.chords.pickable.map((c) => h('option', { value: c, selected: c === pair[i] }, pretty(c))));
  const clock = h('div', { class: 'big-clock' }, String(options.seconds));
  const counter = h('div', { class: 'big-count' }, '0');
  const tapBtn = h('button', { class: 'btn tap-pad', type: 'button', disabled: true, onpointerdown: (e) => { e.preventDefault(); tap(); } }, t('minute.tap'));
  const startLabel = () => t('minute.start', { seconds: options.seconds });
  const startBtn = h('button', { class: 'btn primary big', type: 'button', onclick: () => (timer ? finish(false) : begin()) }, icon('play'), startLabel());
  const historyEl = h('div', { class: 'history' });
  const pairShapes = h('div', { class: 'pair-shapes' });
  const key = () => pair.join('-');
  const pairName = () => pair.map(pretty).join(' ⇄ ');

  function renderHistory() {
    pairShapes.replaceChildren(chordDiagramEl(pair[0], 'diagram-lg'), h('span', { class: 'swap' }, '⇄'), chordDiagramEl(pair[1], 'diagram-lg'));
    const list = records[key()] ?? [];
    const best = Math.max(0, ...list.map((r) => r.n));
    historyEl.replaceChildren(
      list.length
        ? h('div', null,
            h('p', null, t('minute.best', { pair: pairName() }), ' ', h('strong', null, best), ` ${t('minute.perMinute')}`),
            h('div', { class: 'bars' }, list.slice(-options.historyShown).map((r) => h('span', { class: 'bar-col', title: t('minute.resultTitle', { date: new Date(r.t).toLocaleDateString(currentLocale()), count: r.n }), style: { '--h': `${(r.n / Math.max(best, 1)) * 100}%` } }, h('i'), h('small', null, r.n)))))
        : h('p', { class: 'muted' }, t('minute.noHistory')),
    );
  }

  function tap() {
    if (!timer) return;
    count++;
    counter.textContent = count;
    counter.classList.remove('pop');
    void counter.offsetWidth; // restart the pop animation
    counter.classList.add('pop');
  }

  async function begin() {
    await resumeAudio();
    count = 0;
    counter.textContent = '0';
    let pre = options.countdown;
    clock.textContent = `${pre}`;
    clock.classList.add('pre');
    startBtn.replaceChildren(icon('stop'), t('minute.giveUp'));
    release ??= holdScreen();
    const t0 = audioContext().currentTime;
    for (let k = 0; k < options.countdown; k++) click(t0 + 0.05 + k, 1);
    click(t0 + options.countdown + 0.05, 2);
    timer = setInterval(() => {
      if (pre > 0) {
        pre--;
        clock.textContent = pre ? `${pre}` : t('common.start');
        if (!pre) {
          endAt = performance.now() + options.seconds * 1000;
          tapBtn.disabled = false;
          clock.classList.remove('pre');
        }
        return;
      }
      const left = Math.max(0, Math.ceil((endAt - performance.now()) / 1000));
      clock.textContent = left;
      if (left === 0) finish(true);
    }, 1000);
  }

  function finish(done) {
    clearInterval(timer);
    timer = 0;
    tapBtn.disabled = true;
    release?.();
    release = null;
    clock.classList.remove('pre');
    startBtn.replaceChildren(icon('play'), startLabel());
    if (!done) {
      clock.textContent = String(options.seconds);
      return;
    }
    click(audioContext().currentTime + 0.02, 2);
    (records[key()] ??= []).push({ t: Date.now(), n: count });
    records[key()] = records[key()].slice(-options.recordsKept);
    save();
    toast(t('minute.result', { pair: pairName(), count }));
    renderHistory();
  }

  function onKey(e) {
    if (e.key === ' ' && timer && !e.target.closest('select')) {
      e.preventDefault();
      tap();
    }
  }
  addEventListener('keydown', onKey);
  renderHistory();
  root.append(
    h('section', { class: 'card stack' },
      h('p', { class: 'hint' }, t('minute.hint')),
      h('div', { class: 'row gap-s' }, select(0), h('span', null, '⇄'), select(1)),
      pairShapes,
    ),
    h('div', { class: 'minute-stage' }, clock, counter, tapBtn),
    h('div', { class: 'center' }, startBtn),
    historyEl,
  );
  return () => {
    clearInterval(timer);
    release?.();
    removeEventListener('keydown', onKey);
  };
}
