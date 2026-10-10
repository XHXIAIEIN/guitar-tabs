const paths: Record<string, string> = {
  back: '<path d="m14 6-6 6 6 6"/>',
  edit: '<path d="m16 3 5 5-12 12-6 1 1-6Z"/><path d="m13 6 5 5"/>',
  read: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  settings: '<path d="M4 6h16M4 12h16M4 18h16"/><path d="M8 3v6M16 9v6M10 15v6"/>',
  saved: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  saving: '<circle cx="12" cy="12" r="9" stroke-dasharray="3 4"/>',
  play: '<path d="m8 5 11 7-11 7Z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="1"/>',
  practice: '<path d="m17 2 4 4-4 4M21 6H7a4 4 0 0 0-4 4M7 22l-4-4 4-4M3 18h14a4 4 0 0 0 4-4"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  arrow: '<path d="M7 17 17 7M7 7h10v10"/>',
  score: '<path d="M3 4h18M3 7h18M3 10h18M3 13h18M3 16h18M3 19h18"/><circle cx="8" cy="10" r="2.5" fill="currentColor"/><circle cx="16" cy="16" r="2.5" fill="currentColor"/>',
  undo: '<path d="m7 5-4 4 4 4M3 9h10a7 7 0 0 1 7 7"/>',
  redo: '<path d="m17 5 4 4-4 4M21 9H11a7 7 0 0 0-7 7"/>',
  insert: '<path d="M12 5v14M5 12h14"/>',
  deleteNote: '<path d="m8 5-6 7 6 7h13V5Z"/><path d="m11 9 6 6M17 9l-6 6"/>',
  alert: '<path d="m12 3 10 18H2Z"/><path d="M12 9v5M12 17v.1"/>'
};
export function icon(name: string): string {
  return paths[name] ? `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>` : '';
}
