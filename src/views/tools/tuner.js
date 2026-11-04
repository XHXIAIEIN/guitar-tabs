// Microphone tuner with reference tones.
import { config } from '../../core/config.js';
import { t } from '../../core/i18n.js';
import { h } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { detectPitch } from '../../audio/pitch-detect.js';
import { pluck, resumeGuitar } from '../../audio/guitar.js';
import { TUNING } from '../../music/pitch.js';

const STRINGS = [6, 5, 4, 3, 2, 1].map((s) => ({ s, midi: TUNING[s], name: ['', 'E', 'B', 'G', 'D', 'A', 'E'][s] + ['', '4', '3', '3', '3', '2', '2'][s] }));
const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

export function tunerTool(root) {
  const opts = config.tools.tuner;
  let stream = null;
  let ctx = null;
  let timer = 0;
  let target = 'auto';
  const readings = [];
  const noteEl = h('div', { class: 'tuner-note' }, '–');
  const centsEl = h('div', { class: 'tuner-cents' }, ' ');
  const needle = h('i', { class: 'needle' });
  const meterEl = h('div', { class: 'tuner-meter' }, h('span', { class: 'zone' }), needle, h('small', { class: 'l' }, t('tuner.low')), h('small', { class: 'r' }, t('tuner.high')));
  const hint = h('p', { class: 'tuner-hint' }, t('tuner.start'));
  const startBtn = h('button', { class: 'btn primary big', type: 'button', onclick: () => (stream ? stop() : begin()) }, icon('mic'), t('tuner.begin'));
  const stringRow = h('div', { class: 'string-row' });

  function renderStrings(active) {
    stringRow.replaceChildren(
      h('button', { class: 'btn small' + (target === 'auto' ? ' on' : ''), type: 'button', onclick: () => { target = 'auto'; renderStrings(); } }, t('tuner.auto')),
      ...STRINGS.map((st) =>
        h('button', { class: 'btn string-btn' + (target === st.s ? ' on' : '') + (active === st.s ? ' near' : ''), type: 'button', title: t('tuner.stringTitle', { s: st.s, name: st.name }),
          onclick: async () => {
            target = st.s;
            renderStrings();
            const c = await resumeGuitar();
            pluck(c.currentTime + 0.03, st.s, st.midi, 0.9);
          } },
          h('strong', null, st.name.replace(/\d/, '')), h('small', null, t('tuner.stringNumber', { s: st.s })))),
    );
  }

  async function begin() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    } catch (e) {
      hint.textContent = e.name === 'NotAllowedError' ? t('tuner.denied') : t('tuner.micError', { message: e.message });
      return;
    }
    if (!root.isConnected) return stream.getTracks().forEach((track) => track.stop());
    ctx = new AudioContext();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = opts.fftSize;
    src.connect(analyser);
    const data = new Float32Array(analyser.fftSize);
    startBtn.replaceChildren(icon('stop'), t('common.stop'));
    hint.textContent = t('tuner.pluck');
    timer = setInterval(() => {
      analyser.getFloatTimeDomainData(data);
      const f = detectPitch(data, ctx.sampleRate);
      if (!f || f < opts.minHz || f > opts.maxHz) return;
      readings.push(f);
      if (readings.length > opts.readingsKept) readings.shift();
      show([...readings].sort((a, b) => a - b)[readings.length >> 1]);
    }, opts.intervalMs);
  }

  function show(f) {
    const midi = 69 + 12 * Math.log2(f / 440);
    let goal;
    if (target === 'auto') goal = STRINGS.reduce((best, st) => (Math.abs(st.midi - midi) < Math.abs(best.midi - midi) ? st : best));
    else goal = STRINGS.find((st) => st.s === target);
    const cents = Math.round((midi - goal.midi) * 100);
    const nearest = Math.round(midi);
    noteEl.textContent = NAMES[((nearest % 12) + 12) % 12] + (Math.floor(nearest / 12) - 1);
    const shown = Math.max(-opts.meterCents, Math.min(opts.meterCents, cents));
    needle.style.setProperty('--x', shown / opts.meterCents);
    const inTune = Math.abs(cents) <= opts.inTuneCents;
    meterEl.classList.toggle('in-tune', inTune);
    centsEl.textContent = t('tuner.reading', { hz: f.toFixed(1), cents: `${cents > 0 ? '+' : ''}${cents}` });
    const string = { s: goal.s, name: goal.name };
    if (Math.abs(cents) > opts.farCents) hint.textContent = t('tuner.tooFar', string);
    else if (inTune) hint.textContent = t('tuner.inTune', string);
    else hint.textContent = t(cents < 0 ? 'tuner.flat' : 'tuner.sharp', string);
    renderStrings(goal.s);
  }

  function stop() {
    clearInterval(timer);
    stream?.getTracks().forEach((track) => track.stop());
    ctx?.close();
    stream = null;
    ctx = null;
    readings.length = 0;
    startBtn.replaceChildren(icon('mic'), t('tuner.begin'));
  }

  renderStrings();
  root.append(
    h('section', { class: 'card stack tuner' }, noteEl, meterEl, centsEl, hint),
    h('div', { class: 'center' }, startBtn),
    h('section', { class: 'card stack' },
      h('h2', null, t('tuner.referenceTitle')),
      h('p', { class: 'hint' }, t('tuner.referenceHint')),
      stringRow,
    ),
  );
  return stop;
}
