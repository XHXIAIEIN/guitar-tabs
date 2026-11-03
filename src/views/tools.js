// Tools: a standalone metronome and a microphone tuner with reference tones.
import { h, icon, segmented, toggle, stepper, holdScreen, iconButton } from '../ui/dom.js';
import { Sequencer } from '../audio/sequencer.js';
import { meter, beatAccent } from '../music/format.js';
import { resumeAudio, click, pluck } from '../audio/engine.js';
import { TUNING } from '../music/theory.js';

export function toolsView(root, tab = 'metronome') {
  const body = h('div');
  let cleanup = () => {};
  const show = (t) => {
    cleanup();
    body.replaceChildren();
    history.replaceState(null, '', `#/tools/${t}`);
    cleanup = (t === 'tuner' ? tuner : metronome)(body);
  };
  root.append(
    h('div', { class: 'page' },
      h('header', { class: 'page-head' }, h('h1', null, '工具'), segmented([['metronome', '节拍器'], ['tuner', '调音器']], tab, show)),
      body,
    ),
  );
  show(tab);
  return () => cleanup();
}

const SUBDIVISIONS = { 1: '无', 2: '八分', 3: '三连音', 4: '十六分' };

function metronome(root) {
  const seq = new Sequencer();
  let bpm = 80;
  let time = [4, 4];
  let sub = 1;
  let accent = true;
  let release = null;
  const big = h('output', { class: 'tempo-big' }, bpm);
  const slider = h('input', { type: 'range', min: 30, max: 260, value: bpm, 'aria-label': '速度', oninput: () => setBpm(+slider.value) });
  const dots = h('div', { class: 'metro-dots' });
  const playBtn = h('button', { class: 'btn primary big', type: 'button', onclick: () => (seq.running ? stop() : start()) });

  function setBpm(v) {
    bpm = Math.max(30, Math.min(260, Math.round(v)));
    big.textContent = bpm;
    slider.value = bpm;
    if (seq.running) seq.setBpm(bpm);
  }

  function renderDots(on = -1) {
    const m = meter(time);
    dots.replaceChildren(...Array.from({ length: m.beats }, (_, k) => h('i', { class: (k === on ? 'on ' : '') + (beatAccent(k, m) && accent ? 'accent' : '') })));
  }

  async function start() {
    await resumeAudio();
    if (!root.isConnected) return;
    const m = meter(time);
    const source = {
      next() {
        const items = [];
        for (let k = 0; k < m.beats; k++) {
          const level = accent ? beatAccent(k, m) : 1;
          items.push({ tick: k * m.beatTicks, sound: (t) => click(t, level === 0 ? 1 : level), ui: k });
          for (let j = 1; j < sub; j++) items.push({ tick: k * m.beatTicks + (j * m.beatTicks) / sub, sound: (t) => click(t, 0) });
        }
        return { ticks: m.barTicks, beatTicks: m.beatTicks, items };
      },
    };
    seq.start(source, bpm, (k) => renderDots(k));
    release ??= holdScreen();
    playBtn.replaceChildren(icon('stop'), '停止');
  }

  function stop() {
    seq.stop();
    release?.();
    release = null;
    renderDots();
    playBtn.replaceChildren(icon('play'), '开始');
  }

  const restart = () => {
    renderDots();
    if (seq.running) start();
  };
  const taps = [];
  const tap = () => {
    const now = performance.now();
    if (taps.length && now - taps[taps.length - 1] > 2000) taps.length = 0;
    taps.push(now);
    if (taps.length >= 3) {
      const r = taps.slice(-6);
      setBpm((60000 * (r.length - 1)) / (r[r.length - 1] - r[0]));
    }
  };
  function onKey(e) {
    if (e.key === ' ' && !e.target.closest('button, input, select')) {
      e.preventDefault();
      seq.running ? stop() : start();
    }
  }
  addEventListener('keydown', onKey);
  playBtn.replaceChildren(icon('play'), '开始');
  renderDots();
  root.append(
    h('section', { class: 'card stack metronome' },
      h('div', { class: 'tempo-row center' }, iconButton('minus', '减慢', () => setBpm(bpm - 1)), big, iconButton('plus', '加快', () => setBpm(bpm + 1))),
      slider,
      dots,
      h('div', { class: 'row wrap gap-s center' }, ...[60, 80, 100, 120].map((v) => h('button', { class: 'btn small', type: 'button', onclick: () => setBpm(v) }, v)), h('button', { class: 'btn small', type: 'button', onclick: tap }, '点击测速')),
      h('div', { class: 'row wrap gap-m' },
        h('label', { class: 'field-inline' }, '拍号', segmented([['2/4', '2/4'], ['3/4', '3/4'], ['4/4', '4/4'], ['6/8', '6/8']], '4/4', (v) => { time = v.split('/').map(Number); restart(); })),
        h('label', { class: 'field-inline' }, '细分', segmented(Object.entries(SUBDIVISIONS).map(([k, v]) => [+k, v]), sub, (v) => { sub = v; restart(); })),
        toggle('第一拍重音', accent, (v) => { accent = v; restart(); }),
      ),
    ),
    h('div', { class: 'center' }, playBtn),
  );
  return () => {
    seq.stop();
    release?.();
    removeEventListener('keydown', onKey);
  };
}

// ---------- tuner ----------

const STRINGS = [6, 5, 4, 3, 2, 1].map((s) => ({ s, midi: TUNING[s], name: ['', 'E', 'B', 'G', 'D', 'A', 'E'][s] + ['', '4', '3', '3', '3', '2', '2'][s] }));
const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

/** YIN pitch estimate in Hz, or null for silence or noise. Works on a 2× decimated copy to save CPU. */
export function detectPitch(input, sampleRate) {
  const n = input.length >> 1;
  const buf = new Float32Array(n);
  let rms = 0;
  for (let i = 0; i < n; i++) {
    buf[i] = (input[2 * i] + input[2 * i + 1]) / 2;
    rms += buf[i] * buf[i];
  }
  if (Math.sqrt(rms / n) < 0.008) return null;
  const sr = sampleRate / 2;
  const minLag = Math.floor(sr / 1000);
  const maxLag = Math.min(Math.floor(sr / 60), n >> 1);
  const W = n - maxLag;
  const d = new Float32Array(maxLag + 2);
  for (let tau = 1; tau <= maxLag + 1; tau++) {
    let sum = 0;
    for (let i = 0; i < W; i++) {
      const diff = buf[i] - buf[i + tau];
      sum += diff * diff;
    }
    d[tau] = sum;
  }
  let running = 0;
  const cm = new Float32Array(maxLag + 2);
  cm[0] = 1;
  for (let tau = 1; tau <= maxLag + 1; tau++) {
    running += d[tau];
    cm[tau] = running ? (d[tau] * tau) / running : 1;
  }
  let tau = -1;
  for (let t = minLag; t <= maxLag; t++) {
    if (cm[t] < 0.15) {
      while (t + 1 <= maxLag && cm[t + 1] < cm[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau < 0) return null;
  const a = cm[tau - 1];
  const b = cm[tau];
  const c = cm[tau + 1];
  const shift = (a - c) / (2 * (a - 2 * b + c)) || 0;
  return sr / (tau + shift);
}

function tuner(root) {
  let stream = null;
  let ctx = null;
  let timer = 0;
  let target = 'auto';
  const readings = [];
  const noteEl = h('div', { class: 'tuner-note' }, '–');
  const centsEl = h('div', { class: 'tuner-cents' }, ' ');
  const needle = h('i', { class: 'needle' });
  const meterEl = h('div', { class: 'tuner-meter' }, h('span', { class: 'zone' }), needle, h('small', { class: 'l' }, '低'), h('small', { class: 'r' }, '高'));
  const hint = h('p', { class: 'tuner-hint' }, '点「开始」并允许使用麦克风，然后单独弹一根空弦。');
  const startBtn = h('button', { class: 'btn primary big', type: 'button', onclick: () => (stream ? stop() : begin()) }, icon('mic'), '开始调音');
  const stringRow = h('div', { class: 'string-row' });

  function renderStrings(active) {
    stringRow.replaceChildren(
      h('button', { class: 'btn small' + (target === 'auto' ? ' on' : ''), type: 'button', onclick: () => { target = 'auto'; renderStrings(); } }, '自动'),
      ...STRINGS.map((st) =>
        h('button', { class: 'btn string-btn' + (target === st.s ? ' on' : '') + (active === st.s ? ' near' : ''), type: 'button', title: `${st.s} 弦 ${st.name}，点一下听标准音`,
          onclick: async () => {
            target = st.s;
            renderStrings();
            const c = await resumeAudio();
            pluck(c.currentTime + 0.03, st.s, st.midi, 0.9);
          } },
          h('strong', null, st.name.replace(/\d/, '')), h('small', null, `${st.s} 弦`))),
    );
  }

  async function begin() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    } catch (e) {
      hint.textContent = e.name === 'NotAllowedError' ? '没有拿到麦克风权限。请在浏览器地址栏的权限设置里允许麦克风，或者点下面的琴弦按钮听标准音、用耳朵调。' : `无法打开麦克风：${e.message}`;
      return;
    }
    if (!root.isConnected) return stream.getTracks().forEach((t) => t.stop());
    ctx = new AudioContext();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 4096;
    src.connect(analyser);
    const data = new Float32Array(analyser.fftSize);
    startBtn.replaceChildren(icon('stop'), '停止');
    hint.textContent = '弹一根空弦，让它自然延音。';
    timer = setInterval(() => {
      analyser.getFloatTimeDomainData(data);
      const f = detectPitch(data, ctx.sampleRate);
      if (!f || f < 60 || f > 1100) return;
      readings.push(f);
      if (readings.length > 5) readings.shift();
      show([...readings].sort((a, b) => a - b)[readings.length >> 1]);
    }, 70);
  }

  function show(f) {
    const midi = 69 + 12 * Math.log2(f / 440);
    let goal;
    if (target === 'auto') goal = STRINGS.reduce((best, st) => (Math.abs(st.midi - midi) < Math.abs(best.midi - midi) ? st : best));
    else goal = STRINGS.find((st) => st.s === target);
    const cents = Math.round((midi - goal.midi) * 100);
    const nearest = Math.round(midi);
    noteEl.textContent = NAMES[((nearest % 12) + 12) % 12] + (Math.floor(nearest / 12) - 1);
    const shown = Math.max(-50, Math.min(50, cents));
    needle.style.setProperty('--x', shown / 50);
    const inTune = Math.abs(cents) <= 5;
    meterEl.classList.toggle('in-tune', inTune);
    centsEl.textContent = `${f.toFixed(1)} Hz · ${cents > 0 ? '+' : ''}${cents} 音分`;
    if (Math.abs(cents) > 300) hint.textContent = `离 ${goal.s} 弦（${goal.name}）太远了，先确认弹的是哪根弦。`;
    else if (inTune) hint.textContent = `${goal.s} 弦（${goal.name}）准了 ✓`;
    else hint.textContent = cents < 0 ? `${goal.s} 弦偏低：慢慢拧紧弦钮（音变高）` : `${goal.s} 弦偏高：慢慢放松弦钮（音变低）`;
    renderStrings(goal.s);
  }

  function stop() {
    clearInterval(timer);
    stream?.getTracks().forEach((t) => t.stop());
    ctx?.close();
    stream = null;
    ctx = null;
    readings.length = 0;
    startBtn.replaceChildren(icon('mic'), '开始调音');
  }

  renderStrings();
  root.append(
    h('section', { class: 'card stack tuner' }, noteEl, meterEl, centsEl, hint),
    h('div', { class: 'center' }, startBtn),
    h('section', { class: 'card stack' },
      h('h2', null, '标准音（E A D G B E）'),
      h('p', { class: 'hint' }, '点琴弦听标准音，也能选定只调这一根弦。从 6 弦（最粗）调到 1 弦。'),
      stringRow,
    ),
  );
  return stop;
}
