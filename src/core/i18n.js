// UI text from lang/<file>.json. It is empty until boot, so modules call t() when they run, not when they load.
import { config, fetchJson } from './config.js';

const messages = new Map();
let active = '';

/** Adds a catalog under dotted keys. An array is a multi-line text, one item per line. */
function addCatalog(node, prefix = '') {
  for (const [key, value] of Object.entries(node)) {
    const path = prefix + key;
    if (Array.isArray(value)) messages.set(path, value.join('\n'));
    else if (typeof value === 'object') addCatalog(value, `${path}.`);
    else messages.set(path, value);
  }
}

/** Replaces all messages. Later catalogs override earlier ones, so a partial translation keeps the rest in the first. */
export function setMessages(...catalogs) {
  messages.clear();
  for (const catalog of catalogs) addCatalog(catalog);
}

/** Loads the default language plus `locale` on top of it; an unknown locale means the default. Returns the active code. */
export async function loadLocale(locale) {
  const { defaultLocale, locales } = config.i18n;
  active = locales[locale] ? locale : defaultLocale;
  const codes = active === defaultLocale ? [defaultLocale] : [defaultLocale, active];
  setMessages(...(await Promise.all(codes.map((code) => fetchJson(`lang/${locales[code].file}.json`)))));
  return active;
}

export const currentLocale = () => active;

/** The message for `key`, with each {name} replaced from `params`. */
export function t(key, params) {
  const text = messages.get(key);
  if (text === undefined) throw new Error(`missing message: ${key}`);
  return params ? text.replace(/\{(\w+)\}/g, (whole, name) => (name in params ? params[name] : whole)) : text;
}
