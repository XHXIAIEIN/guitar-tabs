import { config } from '../core/config.js';
import { state } from '../state/store.js';

/** Applies the saved theme: 'auto' follows the system, 'light' / 'dark' override it. */
export function applyTheme() {
  const theme = state.settings.theme;
  if (theme === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  const dark = theme === 'dark' || (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', config.theme.color[dark ? 'dark' : 'light']);
}
