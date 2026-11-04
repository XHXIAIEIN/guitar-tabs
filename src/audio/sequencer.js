// Lookahead scheduler: pulls bars from a source and schedules their sounds slightly ahead of time,
// then hands each item's UI payload back on the animation frame when it becomes audible.
import { config } from '../core/config.js';
import { audioContext, outputLatency } from './context.js';
import { dampAll } from './guitar.js';

/**
 * A bar from a source: { ticks, beatTicks, bpm?, items: [{ tick, sound?(time), ui? }] } sorted by tick.
 * `bpm` on a bar changes the tempo from that bar on.
 */
export class Sequencer {
  constructor() {
    this.timer = 0;
    this.raf = 0;
    this.queue = [];
    this.bar = null;
    this.run = 0;
  }

  get running() {
    return this.timer !== 0;
  }

  /** @param source { next(): bar | null } @param onUi called with each item's ui payload; `{ end: true }` after the last bar */
  start(source, bpm, onUi, onTempo = () => {}) {
    this.stop();
    const c = audioContext();
    this.source = source;
    this.bpm = bpm;
    this.onUi = onUi;
    this.onTempo = onTempo;
    this.barStart = c.currentTime + 0.08;
    this.lastTick = 0;
    this.lastTime = this.barStart;
    this.enter(source.next());
    this.timer = setInterval(() => this.pump(), config.audio.sequencer.intervalMs);
    this.pump();
    const run = ++this.run;
    const frame = () => {
      const now = audioContext().currentTime - outputLatency();
      while (this.queue.length && this.queue[0].t <= now) {
        const { ui } = this.queue.shift();
        this.onUi(ui);
        if (run !== this.run || !this.timer) return; // onUi stopped or restarted the sequencer
      }
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  enter(bar) {
    this.bar = bar;
    this.index = 0;
    this.lastTick = 0;
    this.lastTime = this.barStart;
    if (bar?.bpm && bar.bpm !== this.bpm) {
      this.bpm = bar.bpm;
      this.onTempo(this.bpm);
    }
  }

  spt() {
    return 60 / (this.bpm * this.bar.beatTicks);
  }

  pump() {
    const horizon = audioContext().currentTime + config.audio.sequencer.lookaheadSec;
    while (this.bar) {
      const items = this.bar.items;
      if (this.index >= items.length) {
        this.barStart += this.bar.ticks * this.spt();
        if (this.barStart > horizon) {
          // keep the bar end as the anchor so the next bar starts exactly on time
          this.barStart -= this.bar.ticks * this.spt();
          return;
        }
        const next = this.source.next();
        if (!next) {
          this.queue.push({ t: this.barStart, ui: { end: true } });
          this.bar = null;
          return;
        }
        this.enter(next);
        continue;
      }
      const item = items[this.index];
      const t = this.barStart + item.tick * this.spt();
      if (t > horizon) return;
      item.sound?.(t);
      if (item.ui !== undefined) this.queue.push({ t, ui: item.ui });
      this.lastTick = item.tick;
      this.lastTime = t;
      this.index++;
    }
  }

  /** Changes the tempo from the next unscheduled item on, keeping the already scheduled ones. */
  setBpm(bpm) {
    this.bpm = bpm;
    if (this.bar) this.barStart = this.lastTime - this.lastTick * this.spt();
  }

  stop() {
    if (!this.timer) return;
    clearInterval(this.timer);
    cancelAnimationFrame(this.raf);
    this.timer = 0;
    this.raf = 0;
    this.queue = [];
    this.bar = null;
    dampAll();
  }
}
