// App configuration from config/app.json. It is empty until boot, so modules read it when they run, not when they load.

export const config = {};

export function setConfig(values) {
  Object.assign(config, values);
}

async function fetchFile(path) {
  const res = await fetch(new URL(`../../${path}`, import.meta.url));
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res;
}

/** Fetches a JSON file; `path` is relative to the site root. */
export async function fetchJson(path) {
  return (await fetchFile(path)).json();
}

/** Fetches a text file; `path` is relative to the site root. */
export async function fetchText(path) {
  return (await fetchFile(path)).text();
}

export async function loadConfig() {
  setConfig(await fetchJson('config/app.json'));
}
