// App configuration from config/app.json. It is empty until boot, so modules read it when they run, not when they load.

export const config = {};

export function setConfig(values) {
  Object.assign(config, values);
}

/** Fetches a JSON file; `path` is relative to the site root. */
export async function fetchJson(path) {
  const res = await fetch(new URL(`../../${path}`, import.meta.url));
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

export async function loadConfig() {
  setConfig(await fetchJson('config/app.json'));
}
