import { DEFAULT_DISPLAY, type DisplaySettings } from './display';
import { getLocale, setLocale, type Locale } from '../i18n';
const KEY = 'guitar-tabs.preferences.v1';
export interface Preferences { locale: Locale; display: DisplaySettings }
export function readPreferences(): Preferences {
  const defaults = { locale: getLocale(), display: structuredClone(DEFAULT_DISPLAY) };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (!saved || !['zh', 'en'].includes(saved.locale)) return defaults;
    setLocale(saved.locale);
    defaults.locale = saved.locale;
    const d = saved.display;
    if (d && typeof d.left?.tab === 'boolean' && typeof d.left?.string === 'boolean' && typeof d.left?.pitch === 'boolean' && typeof d.right?.string === 'boolean' && typeof d.right?.pitch === 'boolean'
      && ['uniform', 'graded'].includes(d.lineWeight) && Number.isFinite(d.scale) && d.scale >= .7 && d.scale <= 1.6 && Number.isFinite(d.stringGap) && d.stringGap >= 14 && d.stringGap <= 26 && d.noteSize === 22) defaults.display = d;
  } catch { /* Use readable defaults when preferences are unavailable. */ }
  return defaults;
}
export function savePreferences(preferences: Preferences): void { localStorage.setItem(KEY, JSON.stringify(preferences)); }
