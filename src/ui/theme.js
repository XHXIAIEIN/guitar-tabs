import { state } from '../store.js';

/** Applies the saved theme: 'auto' follows the system, 'light' / 'dark' override it. */
export function applyTheme() {
  const t = state.settings.theme;
  if (t === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#151412' : '#f5f2ea');
}
