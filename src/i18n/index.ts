import { en } from './en';
import { zh } from './zh';
export type Locale = 'en' | 'zh';
export type MessageKey = keyof typeof en;
let locale: Locale = typeof navigator !== 'undefined' && navigator.language.startsWith('zh') ? 'zh' : 'en';
export const getLocale = (): Locale => locale;
export function setLocale(value: Locale): void { locale = value; }
export function t(key: MessageKey | string, params: Record<string, string | number> = {}): string {
  const messages = locale === 'zh' ? zh : en;
  return ((messages as Record<string, string>)[key] ?? key).replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? `{${name}}`));
}
