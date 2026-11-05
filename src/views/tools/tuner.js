// Microphone tuner with reference tones. The stage is one SVG, a needle rising from a headstock, with a button beside each tuning peg.
import { config } from '../../core/config.js';
import { t } from '../../core/i18n.js';
import { h } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { toggle } from '../../ui/controls.js';
import { detectPitch } from '../../audio/pitch-detect.js';
import { pluck, resumeGuitar } from '../../audio/guitar.js';
import { TUNING } from '../../music/pitch.js';

const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const VIEW = { w: 340, h: 400 };
// The needle turns around this point, hidden behind the headstock. tools.css repeats it as transform-origin.
const PIVOT = { x: 170, y: 170 };
const RADIUS = 150;
const SWING = 40;
// Offsets are from the centre line. Each note button is a tuning knob: it sits a little above its post, as the gears hold knobs on a real headstock.
const ROWS = [{ pegY: 158, pegX: 94, edge: 56, postY: 168, postX: 35 }, { pegY: 214, pegX: 91, edge: 52.7, postY: 225, postX: 30 }, { pegY: 268, pegX: 88, edge: 49.4, postY: 282, postX: 30 }];
const NUT_Y = 340;
const GAUGE = { 6: 3.4, 5: 2.9, 4: 2.4, 3: 1.9, 2: 1.4, 1: 1.2 };
const NUT_X = { 6: 143, 5: 153.8, 4: 164.6, 3: 175.4, 2: 186.2, 1: 197 };
const BOARD_END = 1600;
const FRET_Y = [420, 495, 566, 633, 696, 756, 813, 867];
const DOT_Y = [530, 664, 785];
const HEAD = 'M139 340 C137 322 127 313 122.6 301 L112 128.5 C128 125 143 116 151 106 L189 106 C197 116 212 125 228 128.5 L217.4 301 C213 313 203 322 201 340 Z';
// As on a real headstock: the bass strings wind on the left, and the string nearest the nut has the lowest post.
const STRINGS = [[4, 'left', 0], [5, 'left', 1], [6, 'left', 2], [3, 'right', 0], [2, 'right', 1], [1, 'right', 2]].map(([s, side, row]) => {
  const sign = side === 'left' ? -1 : 1;
  const { pegY, pegX, edge, postY, postX } = ROWS[row];
  return {
    s, sign, edge, pegY, postY, pegX: PIVOT.x + sign * pegX, postX: PIVOT.x + sign * postX,
    midi: TUNING[s], name: ['', 'E', 'B', 'G', 'D', 'A', 'E'][s] + ['', '4', '3', '3', '3', '2', '2'][s],
  };
});

function arcPoint(degrees, radius) {
  const a = (degrees * Math.PI) / 180;
  return `${PIVOT.x + radius * Math.sin(a)} ${PIVOT.y - radius * Math.cos(a)}`;
}
const arc = (from, to) => `M${arcPoint(from, RADIUS)} A${RADIUS} ${RADIUS} 0 0 1 ${arcPoint(to, RADIUS)}`;

function gaugeMarkup(zone) {
  const ticks = [-SWING, -SWING / 2, SWING / 2, SWING].map((d) => `<path d="M${arcPoint(d, RADIUS + 9)} L${arcPoint(d, RADIUS + 16)}" class="tuner-tick"/>`).join('');
  const stems = STRINGS.map(({ pegX, pegY, sign, edge }) => {
    const collar = PIVOT.x + sign * edge;
    return `<rect x="${Math.min(pegX, PIVOT.x)}" y="${pegY - 3}" width="${Math.abs(PIVOT.x - pegX)}" height="6" fill="url(#tuner-metal)"/><rect x="${collar + (sign < 0 ? -9 : 0)}" y="${pegY - 6}" width="9" height="12" rx="2" fill="url(#tuner-metal)"/>`;
  }).join('');
  const posts = STRINGS.map(({ postX, postY }) => `<circle cx="${postX}" cy="${postY}" r="9" fill="url(#tuner-washer)"/><circle cx="${postX}" cy="${postY}" r="3.8" class="tuner-post"/><circle cx="${postX - 1}" cy="${postY - 1.2}" r="1.3" class="tuner-post-shine"/>`).join('');
  const line = ({ s, postX, postY }) => `M${postX} ${postY} L${NUT_X[s]} ${NUT_Y} V${BOARD_END}`;
  const shadows = STRINGS.map((st) => `<path d="${line(st)}" stroke-width="${GAUGE[st.s]}"/>`).join('');
  const strings = STRINGS.map((st) => `<path d="${line(st)}" class="tuner-string ${st.s > 2 ? 'wound' : 'plain'}" stroke-width="${GAUGE[st.s]}" data-string="${st.s}"/>${st.s > 2 ? `<path d="${line(st)}" class="tuner-winding" stroke-width="${GAUGE[st.s]}"/>` : ''}`).join('');
  const frets = FRET_Y.map((y) => `<rect x="139" y="${y - 1.2}" width="62" height="2.4" fill="url(#tuner-metal)"/>`).join('');
  const dots = DOT_Y.map((y) => `<circle cx="142.5" cy="${y}" r="1.8" class="tuner-dot"/>`).join('');
  // The needle turns often, so it lives in its own SVG and the headstock above it is not redrawn each time.
  return `<svg class="tuner-svg" viewBox="0 0 ${VIEW.w} ${VIEW.h}" aria-hidden="true">
    <path d="${arc(-SWING, SWING)}" class="tuner-arc"/><path d="${arc(-zone, zone)}" class="tuner-zone"/>${ticks}
    <text x="52" y="52" class="tuner-sign">♭</text><text x="288" y="52" class="tuner-sign">♯</text>
    <path d="M${PIVOT.x} ${PIVOT.y} V${PIVOT.y - RADIUS + 4}" class="tuner-needle"/>
  </svg>
  <svg class="tuner-svg tuner-head" viewBox="0 0 ${VIEW.w} ${VIEW.h}" aria-hidden="true">
    <defs>
      <linearGradient id="tuner-metal" x2="0" y2="1"><stop offset="0" stop-color="#e6e2d8"/><stop offset="0.5" stop-color="#8f8a7e"/><stop offset="1" stop-color="#c4bfb2"/></linearGradient>
      <linearGradient id="tuner-ebony"><stop offset="0" stop-color="#1d1612"/><stop offset="0.5" stop-color="#3b2d23"/><stop offset="1" stop-color="#1d1612"/></linearGradient>
      <radialGradient id="tuner-washer" cx="0.38" cy="0.32" r="0.75"><stop offset="0" stop-color="#fbf8f0"/><stop offset="0.6" stop-color="#b9b3a4"/><stop offset="1" stop-color="#7d7769"/></radialGradient>
      <clipPath id="tuner-head-shape"><path d="${HEAD}"/></clipPath>
    </defs>
    ${stems}<rect x="139" y="${NUT_Y}" width="62" height="${BOARD_END - NUT_Y}" fill="url(#tuner-ebony)" class="tuner-board"/>${frets}${dots}
    <rect x="139" y="${NUT_Y + 3}" width="62" height="6" class="tuner-nut-shadow"/>
    <path d="${HEAD}" class="tuner-wood-base"/><image href="assets/textures/tuner-wood.webp" x="100" y="95" width="140" height="255" preserveAspectRatio="none" clip-path="url(#tuner-head-shape)"/><path d="${HEAD}" class="tuner-bevel"/>
    <rect x="137" y="${NUT_Y - 4}" width="66" height="7" rx="1" class="tuner-nut"/>${posts}
    <g class="tuner-string-shadow" transform="translate(1.2 1.4)">${shadows}</g>${strings}
  </svg>`;
}

export function tunerTool(root) {
  const opts = config.tools.tuner;
  let stream = null;
  let ctx = null;
  let timer = 0;
  let target = 'auto';
  let lastString = 6;
  const readings = [];
  const tuned = new Set();
  const noteEl = h('div', { class: 'tuner-note' });
  const centsEl = h('div', { class: 'tuner-cents' });
  const hint = h('p', { class: 'tuner-hint' }, t('tuner.start'));
  const startBtn = h('button', { class: 'btn primary big practice-start', type: 'button', onclick: () => (stream ? stop() : begin()) }, icon('mic'), t('tuner.begin'));
  const autoSwitch = toggle(t('tuner.auto'), true, (on) => {
    target = on ? 'auto' : lastString;
    markStrings();
  });
  const autoInput = autoSwitch.querySelector('input');
  const pegs = new Map(STRINGS.map((st) => [st.s, h('button', {
    class: 'btn tuner-peg', type: 'button', style: { left: `${(st.pegX / VIEW.w) * 100}%`, top: `${(st.pegY / VIEW.h) * 100}%` }, title: t('tuner.stringTitle', { s: st.s, name: st.name }),
    onclick: async () => {
      target = st.s;
      autoInput.checked = false;
      markStrings();
      const c = await resumeGuitar();
      pluck(c.currentTime + 0.03, st.s, st.midi, 0.9);
    },
  }, h('strong', null, st.name.replace(/\d/, '')), h('small', null, String(st.s)))]));
  const neck = h('div', { class: 'tuner-neck', html: gaugeMarkup((opts.inTuneCents / opts.meterCents) * SWING) }, [...pegs.values()]);
  const needle = neck.querySelector('.tuner-needle');
  const main = h('div', { class: 'practice-main' },
    h('section', { class: 'card practice-stage tuner-stage' }, neck),
    startBtn,
    h('section', { class: 'card tuner-read' },
      noteEl,
      h('div', { class: 'tuner-read-text' }, centsEl, hint, h('p', { class: 'hint tuner-reference' }, t('tuner.referenceHint'))),
      autoSwitch,
    ),
  );

  function markStrings(active) {
    for (const [s, peg] of pegs) {
      peg.classList.toggle('on', target === s);
      peg.classList.toggle('near', active === s);
      peg.classList.toggle('tuned', tuned.has(s));
      neck.querySelector(`[data-string="${s}"]`).classList.toggle('active', active === s);
    }
  }

  function showHint(text, kind = 'info') {
    hint.textContent = text;
    hint.classList.toggle('error', kind === 'error');
  }

  async function begin() {
    startBtn.disabled = true;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    } catch (e) {
      const known = { NotAllowedError: 'tuner.denied', NotFoundError: 'tuner.noMic' }[e.name];
      showHint(known ? t(known) : t('tuner.micError', { message: e.message }), 'error');
      return;
    } finally {
      startBtn.disabled = false;
    }
    if (!root.isConnected) return stream.getTracks().forEach((track) => track.stop());
    ctx = new AudioContext();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = opts.fftSize;
    src.connect(analyser);
    const data = new Float32Array(analyser.fftSize);
    startBtn.replaceChildren(icon('stop'), t('common.stop'));
    showHint(t('tuner.pluck'));
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
    lastString = goal.s;
    const cents = Math.round((midi - goal.midi) * 100);
    const nearest = Math.round(midi);
    noteEl.textContent = NAMES[((nearest % 12) + 12) % 12] + (Math.floor(nearest / 12) - 1);
    const shown = Math.max(-opts.meterCents, Math.min(opts.meterCents, cents));
    needle.style.transform = `rotate(${(shown / opts.meterCents) * SWING}deg)`;
    const inTune = Math.abs(cents) <= opts.inTuneCents;
    main.classList.add('has-reading');
    main.classList.toggle('in-tune', inTune);
    if (inTune) tuned.add(goal.s);
    centsEl.textContent = t('tuner.reading', { hz: f.toFixed(1), cents: `${cents > 0 ? '+' : ''}${cents}` });
    const string = { s: goal.s, name: goal.name };
    if (Math.abs(cents) > opts.farCents) showHint(t('tuner.tooFar', string));
    else if (inTune) showHint(t('tuner.inTune', string));
    else showHint(t(cents < 0 ? 'tuner.flat' : 'tuner.sharp', string));
    markStrings(goal.s);
  }

  function stop() {
    clearInterval(timer);
    stream?.getTracks().forEach((track) => track.stop());
    ctx?.close();
    stream = null;
    ctx = null;
    readings.length = 0;
    tuned.clear();
    main.classList.remove('has-reading', 'in-tune');
    noteEl.textContent = '';
    centsEl.textContent = '';
    showHint(t('tuner.start'));
    markStrings();
    startBtn.replaceChildren(icon('mic'), t('tuner.begin'));
  }

  markStrings();
  root.append(main);
  return stop;
}
