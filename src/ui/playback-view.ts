import type { PlaybackState } from '../playback';

export class PlaybackView {
  private state?: PlaybackState;
  private current?: HTMLElement;
  private manualUntil = 0;
  private readonly manualScroll = () => { this.manualUntil = performance.now() + 4000; };

  constructor(private sheet: HTMLElement) {
    for (const event of ['wheel', 'touchstart', 'pointerdown']) sheet.addEventListener(event, this.manualScroll, { passive: true });
  }

  update(state: PlaybackState): void {
    const previous = this.state;
    this.state = state;
    this.sheet.dataset.playback = state.status;
    if (previous && previous.barId === state.barId && previous.beatId === state.beatId && previous.status === state.status) return;
    this.clear();
    this.current = state.barId ? this.sheet.querySelector<HTMLElement>(`[data-bar="${CSS.escape(state.barId)}"]`) ?? undefined : undefined;
    this.paint();
    this.follow();
  }

  refresh(barId: string): void {
    if (barId !== this.state?.barId) return;
    this.current = this.sheet.querySelector<HTMLElement>(`[data-bar="${CSS.escape(barId)}"]`) ?? undefined;
    this.paint();
    this.follow();
  }

  reveal(): void {
    this.manualUntil = 0;
    this.follow();
  }

  dispose(): void {
    for (const event of ['wheel', 'touchstart', 'pointerdown']) this.sheet.removeEventListener(event, this.manualScroll);
    this.clear();
  }

  private clear(): void {
    this.current?.classList.remove('playing');
    this.current?.querySelectorAll('.active, .paused').forEach(el => el.classList.remove('active', 'paused'));
  }

  private paint(): void {
    const state = this.state;
    if (!this.current || !state || !['playing', 'paused'].includes(state.status)) return;
    this.current.classList.toggle('playing', state.playing);
    this.current.querySelectorAll<SVGElement>('[data-playing-beat]').forEach(el => {
      const matches = el.dataset.playingBeat === state.beatId;
      el.classList.toggle('active', matches && state.playing);
      el.classList.toggle('paused', matches && !state.playing);
    });
  }

  private follow(): void {
    if (!this.current || !this.state || !['playing', 'paused'].includes(this.state.status) || performance.now() < this.manualUntil) return;
    const row = this.current.closest<HTMLElement>('.score-row');
    if (!row) return;
    const sheetBounds = this.sheet.getBoundingClientRect(), rowBounds = row.getBoundingClientRect();
    const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    if (rowBounds.top < sheetBounds.top + 12 || rowBounds.bottom > sheetBounds.bottom - 12) {
      this.sheet.scrollTo({ top: Math.max(0, this.sheet.scrollTop + rowBounds.top - sheetBounds.top - this.sheet.clientHeight * .2), behavior });
    }
    const marker = this.current.querySelector<SVGElement>('.playhead.active, .playhead.paused');
    const bounds = (marker ?? this.current).getBoundingClientRect();
    if (bounds.left < rowBounds.left + 8 || bounds.right > rowBounds.right - 8) {
      row.scrollTo({ left: Math.max(0, row.scrollLeft + (bounds.left + bounds.right - rowBounds.left - rowBounds.right) / 2), behavior });
    }
  }
}
