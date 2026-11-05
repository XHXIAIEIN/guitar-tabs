// Keyboard shortcuts of the song page.

/**
 * @param perform performance mode, where Enter plays and the up/down keys page through the score
 * @param a togglePlay, page(dir), moveCursor(delta), detach, dismiss, toggleLoop, nudgeBpm(dir), toggleMetronome
 */
export function songKeyHandler(perform, a) {
  return (e) => {
    if (e.target.closest?.('input, textarea, select, [contenteditable]') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (document.querySelector('.panel-wrap') && e.key !== ' ') return;
    const k = e.key;
    if (k === ' ' || (perform && k === 'Enter')) {
      e.preventDefault();
      a.togglePlay();
    } else if (perform && (k === 'PageDown' || k === 'ArrowDown')) {
      e.preventDefault();
      a.page(1);
    } else if (perform && (k === 'PageUp' || k === 'ArrowUp')) {
      e.preventDefault();
      a.page(-1);
    } else if (k === 'ArrowRight' || k === 'ArrowLeft') {
      e.preventDefault();
      a.moveCursor(k === 'ArrowRight' ? 1 : -1);
    } else if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(k)) a.detach(); // the browser scrolls the page
    else if (k === 'Escape') a.dismiss();
    else if (k === 'l' || k === 'L') a.toggleLoop();
    else if (k === '+' || k === '=') a.nudgeBpm(1);
    else if (k === '-') a.nudgeBpm(-1);
    else if (k === 'm' || k === 'M') a.toggleMetronome();
  };
}
