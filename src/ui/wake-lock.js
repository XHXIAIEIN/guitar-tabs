// Screen wake lock, shared by every view that plays or performs.

let lock = null;
let wanted = 0;

async function acquire() {
  if (!('wakeLock' in navigator) || lock || !wanted || document.visibilityState !== 'visible') return;
  try {
    lock = await navigator.wakeLock.request('screen');
    lock.addEventListener('release', () => (lock = null));
  } catch {
    // Refused (battery saver, iframe without permission): the screen may sleep, nothing else breaks.
  }
}
document.addEventListener('visibilitychange', acquire);

/** Keeps the screen on while at least one holder wants it. Returns the release function. */
export function holdScreen() {
  wanted++;
  acquire();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--wanted === 0) lock?.release();
  };
}
