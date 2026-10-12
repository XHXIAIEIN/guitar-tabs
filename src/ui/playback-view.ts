import type { PlaybackState } from '../playback';

interface PlaybackViewOptions {
  following?: boolean;
  onFollowingChange?: (following: boolean) => void;
}

export class PlaybackView {
  private state?: PlaybackState;
  private current?: HTMLElement;
  private followingPlayback: boolean;
  private disposed = false;
  private followedRow?: HTMLElement;
  private pointer?: { id: number; x: number; y: number };
  private readonly wheel = (event: WheelEvent) => { if (event.deltaX || event.deltaY) this.detach(); };
  private readonly touchMove = () => this.detach();
  private readonly pointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    this.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    const bounds = this.sheet.getBoundingClientRect();
    if (event.clientX >= bounds.left + this.sheet.clientWidth && this.sheet.offsetWidth > this.sheet.clientWidth) this.detach();
  };
  private readonly pointerMove = (event: PointerEvent) => {
    if (!event.buttons) { this.pointer = undefined; return; }
    if (this.pointer?.id === event.pointerId && Math.hypot(event.clientX - this.pointer.x, event.clientY - this.pointer.y) > 8) this.detach();
  };
  private readonly pointerEnd = () => { this.pointer = undefined; };
  private readonly keyDown = (event: KeyboardEvent) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) {
      queueMicrotask(() => { if (!event.defaultPrevented) this.detach(); });
    }
  };

  constructor(private sheet: HTMLElement, private options: PlaybackViewOptions = {}) {
    this.followingPlayback = options.following ?? true;
    sheet.dataset.following = String(this.followingPlayback);
    sheet.addEventListener('wheel', this.wheel, { passive: true });
    sheet.addEventListener('touchmove', this.touchMove, { passive: true });
    sheet.addEventListener('pointerdown', this.pointerDown, { passive: true });
    sheet.addEventListener('pointermove', this.pointerMove, { passive: true });
    sheet.addEventListener('pointerup', this.pointerEnd, { passive: true });
    sheet.addEventListener('pointercancel', this.pointerEnd, { passive: true });
    sheet.addEventListener('keydown', this.keyDown);
  }
  get following(): boolean { return this.followingPlayback; }

  update(state: PlaybackState): void {
    const previous = this.state;
    const wrapped = previous?.playing && state.playing && state.position < previous.position;
    this.state = state;
    this.sheet.dataset.playback = state.status;
    if (state.status === 'stopped' || state.status === 'ended') {
      this.setFollowing(true); this.followedRow = undefined;
    }
    if (previous && previous.barId === state.barId && previous.beatId === state.beatId && previous.status === state.status) return;
    this.clear();
    this.current = state.barId ? this.sheet.querySelector<HTMLElement>(`[data-bar="${CSS.escape(state.barId)}"]`) ?? undefined : undefined;
    this.paint();
    this.follow(!!wrapped);
  }

  refresh(barId: string): void {
    if (barId !== this.state?.barId) return;
    this.current = this.sheet.querySelector<HTMLElement>(`[data-bar="${CSS.escape(barId)}"]`) ?? undefined;
    this.paint();
    this.follow();
  }

  reveal(): void {
    this.setFollowing(true);
    this.follow(true);
  }

  dispose(): void {
    this.disposed = true;
    this.sheet.removeEventListener('wheel', this.wheel);
    this.sheet.removeEventListener('touchmove', this.touchMove);
    this.sheet.removeEventListener('pointerdown', this.pointerDown);
    this.sheet.removeEventListener('pointermove', this.pointerMove);
    this.sheet.removeEventListener('pointerup', this.pointerEnd);
    this.sheet.removeEventListener('pointercancel', this.pointerEnd);
    this.sheet.removeEventListener('keydown', this.keyDown);
    this.pointer = undefined;
    this.clear();
  }

  private setFollowing(value: boolean): void {
    if (this.followingPlayback === value) return;
    this.followingPlayback = value;
    this.sheet.dataset.following = String(value);
    this.options.onFollowingChange?.(value);
  }

  private detach(): void {
    if (this.disposed || !this.state || !['playing', 'paused'].includes(this.state.status) || !this.followingPlayback) return;
    this.setFollowing(false);
    this.sheet.scrollTo({ top: this.sheet.scrollTop, behavior: 'auto' });
    this.followedRow?.scrollTo({ left: this.followedRow.scrollLeft, behavior: 'auto' });
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

  private follow(force = false): void {
    if (!this.current || !this.state || !['playing', 'paused'].includes(this.state.status) || !this.followingPlayback) return;
    const row = this.current.closest<HTMLElement>('.score-row');
    if (!row) return;
    const sheetBounds = this.sheet.getBoundingClientRect(), rowBounds = row.getBoundingClientRect();
    const behavior = force || matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    if (force || row !== this.followedRow || rowBounds.top < sheetBounds.top + 12 || rowBounds.bottom > sheetBounds.bottom - 12) {
      this.sheet.scrollTo({ top: Math.max(0, this.sheet.scrollTop + rowBounds.top - sheetBounds.top - this.sheet.clientHeight * .25), behavior });
    }
    this.followedRow = row;
    const marker = this.current.querySelector<SVGElement>('.playhead.active, .playhead.paused');
    const bounds = (marker ?? this.current).getBoundingClientRect();
    if (force || bounds.left < rowBounds.left + 8 || bounds.right > rowBounds.right - 8) {
      row.scrollTo({ left: Math.max(0, row.scrollLeft + (bounds.left + bounds.right - rowBounds.left - rowBounds.right) / 2), behavior });
    }
  }
}
