// Tap-along timing test and tap latency calibration of the rhythm page.
import { config } from '../../core/config.js';
import { t } from '../../core/i18n.js';
import { h } from '../../ui/dom.js';
import { state, setSetting } from '../../state/store.js';
import { audioContext, outputLatency } from '../../audio/context.js';

/** Context time of a tap, aligned with what the listener hears. */
function tapTime(ev) {
  const c = audioContext();
  const ts = c.getOutputTimestamp?.();
  if (ts?.performanceTime) return ts.contextTime + (ev.timeStamp - ts.performanceTime) / 1000;
  return c.currentTime - outputLatency() - (performance.now() - ev.timeStamp) / 1000;
}

/**
 * @param o isPlaying(), play(onlyBeats), stop(), stepSeconds(): length of one grid step
 * @returns the elements to place, plus the calls the player makes while it runs
 */
export function createTapTest({ isPlaying, play, stop, stepSeconds }) {
  const opts = config.rhythm.tapTest;
  let test = null; // { expected: [{t, matched}], results: [] } while the tap test runs
  let calibrating = null;

  const tolerance = () => Math.min(opts.maxToleranceSec, stepSeconds() / 2);

  function onTap(ev) {
    ev.preventDefault?.();
    const run = test ?? calibrating;
    if (!run || !isPlaying()) return;
    const at = tapTime(ev);
    const offset = calibrating ? 0 : state.settings.tapOffset;
    const near = run.expected.filter((x) => !x.matched).sort((a, b) => Math.abs(a.t - at) - Math.abs(b.t - at))[0];
    if (!near || Math.abs(at - offset - near.t) > tolerance()) return;
    near.matched = true;
    run.results.push((at - offset - near.t) * 1000);
    tapPad.classList.remove('flash');
    void tapPad.offsetWidth; // restart the flash animation
    tapPad.classList.add('flash');
    if (test) renderResults();
    if (calibrating && run.results.length >= opts.calibrationTaps) stop();
  }

  const results = h('div', { class: 'tap-results' });
  const tapPad = h('button', { class: 'btn tap-pad', type: 'button', onpointerdown: onTap }, t('tapTest.pad'));

  function renderResults() {
    const r = test.results;
    const late = audioContext().currentTime - tolerance();
    const missed = test.expected.filter((x) => !x.matched && x.t < late).length;
    const good = r.filter((d) => Math.abs(d) <= opts.goodMs).length;
    const ok = r.filter((d) => Math.abs(d) > opts.goodMs && Math.abs(d) <= opts.okMs).length;
    const mean = r.length ? r.reduce((a, b) => a + b, 0) / r.length : 0;
    const ms = (v) => Math.abs(Math.round(v));
    results.replaceChildren(
      h('div', { class: 'tap-dots' }, r.slice(-opts.dotsShown).map((d) => h('span', { class: Math.abs(d) <= opts.goodMs ? 'good' : Math.abs(d) <= opts.okMs ? 'ok' : 'bad', title: t(d > 0 ? 'tapTest.late' : 'tapTest.early', { ms: ms(d) }), style: { '--x': `${Math.max(-1, Math.min(1, d / opts.dotScaleMs))}` } }))),
      h('p', null,
        t('tapTest.summary', { good, ok, bad: r.length - good - ok, missed }),
        r.length < opts.meanMinTaps ? '' : Math.abs(mean) < opts.meanFlatMs ? t('tapTest.even') : t(mean > 0 ? 'tapTest.overallLate' : 'tapTest.overallEarly', { ms: ms(mean) })),
    );
  }

  function startTest() {
    if (calibrating) return;
    test = { expected: [], results: [] };
    results.replaceChildren(h('p', { class: 'muted' }, t('tapTest.getReady')));
    play(false);
    testBtn.replaceChildren(t('tapTest.end'));
  }

  function finishTest() {
    renderResults();
    test = null;
    testBtn.replaceChildren(t('tapTest.begin'));
  }

  function startCalibration() {
    if (test) finishTest();
    calibrating = { expected: [], results: [] };
    results.replaceChildren(h('p', { class: 'muted' }, t('tapTest.calibrating', { taps: opts.calibrationTaps })));
    play(true);
  }

  function finishCalibration() {
    const r = calibrating.results.slice().sort((a, b) => a - b);
    calibrating = null;
    if (r.length < opts.calibrationMinTaps) return results.replaceChildren(h('p', { class: 'muted' }, t('tapTest.tooFew')));
    const median = r[Math.floor(r.length / 2)] / 1000;
    setSetting('tapOffset', median);
    offsetOut.textContent = `${Math.round(median * 1000)} ms`;
    results.replaceChildren(h('p', null, t('tapTest.calibrated', { ms: Math.round(median * 1000) })));
  }

  const testBtn = h('button', { class: 'btn', type: 'button', onclick: () => (test ? stop() : startTest()) }, t('tapTest.begin'));
  const calibrateBtn = h('button', { class: 'btn', type: 'button', onclick: startCalibration }, t('tapTest.calibrate'));
  const offsetOut = h('output', null, `${Math.round(state.settings.tapOffset * 1000)} ms`);

  return {
    tapPad,
    results,
    testBtn,
    calibrateBtn,
    offsetOut,
    onTap,
    active: () => !!(test || calibrating),
    expectStep: (time) => test?.expected.push({ t: time, matched: false }),
    expectBeat: (time) => calibrating?.expected.push({ t: time, matched: false }),
    finish() {
      if (test) finishTest();
      if (calibrating) finishCalibration();
    },
  };
}
