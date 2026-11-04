// JSON values in localStorage. Private browsing and blocked site data make localStorage throw;
// the app then runs in memory, so these functions report failure instead of raising it.

export function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

/** Returns false when the value could not be written (quota exceeded or storage blocked). */
export function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Asks the browser not to evict this site's data under storage pressure. Some browsers ask the user, so call it after a save the user made. */
export function requestDurableStorage() {
  navigator.storage?.persist?.();
}
