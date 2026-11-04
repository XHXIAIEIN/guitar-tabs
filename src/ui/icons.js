// The app's line icons on a 24 × 24 grid.

const ICONS = {
  play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" stroke="none"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" stroke="none"/>',
  restart: '<path d="M6 5v14"/><path d="M19 5.5 9.5 12l9.5 6.5z" fill="currentColor" stroke="none"/>',
  loop: '<path d="M17 2.5 20.5 6 17 9.5"/><path d="M3.5 11.5V10a4 4 0 0 1 4-4h13"/><path d="M7 21.5 3.5 18 7 14.5"/><path d="M20.5 12.5V14a4 4 0 0 1-4 4h-13"/>',
  metronome: '<path d="M9 3h6l4 18H5z"/><path d="m12 16 5.5-9"/><path d="M7.2 14h9.6"/>',
  guitar: '<circle cx="7.5" cy="16.5" r="3.5"/><path d="M11 13 20 4"/><path d="m17.5 3 3.5 3.5"/><circle cx="7.5" cy="16.5" r="0.8" fill="currentColor"/>',
  sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  edit: '<path d="M4 20h4L19.5 8.5a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m14 6 4 4"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  stage: '<rect x="9" y="2.5" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5v4"/>',
  library: '<path d="M5 4h4v16H5zM10 4h4v16h-4z"/><path d="m15.5 4.8 3.8-1 4 15.4-3.8 1z" transform="translate(-2 0)"/>',
  chord: '<path d="M5 4h14M5 10h14M5 16h14M5 4v17M12 4v17M19 4v17"/><circle cx="5" cy="13" r="2.4" fill="currentColor" stroke="none"/><circle cx="12" cy="13" r="2.4" fill="currentColor" stroke="none"/>',
  rhythm: '<path d="M8 18V5l10-2v13"/><circle cx="5.5" cy="18" r="2.5"/><circle cx="15.5" cy="16" r="2.5"/>',
  tuner: '<path d="M8 3v7a4 4 0 0 0 8 0V3"/><path d="M12 14v7"/><path d="M9 21h6"/>',
  note: '<path d="M12 18V4c.5 3 2.2 4.4 4 5.6 1.4 1 2 2.6 1.5 4.4"/><ellipse cx="8.8" cy="18" rx="3.2" ry="2.6" fill="currentColor" transform="rotate(-20 8.8 18)"/>',
  speed: '<path d="M4.2 18a9 9 0 1 1 15.6 0"/><path d="m12 13.5 4-5"/><circle cx="12" cy="13.5" r="1.6" fill="currentColor"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/>',
  next: '<path d="m6 5.5 9.5 6.5L6 18.5z" fill="currentColor" stroke="none"/><path d="M18.5 5v14"/>',
  up: '<path d="m6 15 6-6 6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  arrowUp: '<path d="M12 20V4"/><path d="m6 10 6-6 6 6"/>',
  arrowDown: '<path d="M12 4v16"/><path d="m6 14 6 6 6-6"/>',
  locate: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  download: '<path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>',
  upload: '<path d="M12 15V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6"/><circle cx="12" cy="17" r="0.6" fill="currentColor"/>',
  sound: '<path d="M4 9.5v5h3.5L12 19V5L7.5 9.5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
};

export function icon(name, cls = '') {
  const span = document.createElement('span');
  span.className = 'icon ' + cls;
  span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
  return span;
}
