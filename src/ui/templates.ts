import { t } from '../i18n';
import { escapeHtml as esc } from '../notation/svg';
export function button(action: string, label: string, symbol?: string, extra = ''): string {
  return `<button type="button" data-action="${action}" aria-label="${esc(t(label))}" title="${esc(t(label))}" ${extra}>${symbol ?? esc(t(label))}</button>`;
}
export function errorPanel(): string { return `<div id="error" role="alert" hidden><span></span>${button('retry', 'retry')}${button('export', 'exportUnsaved')}${button('dismiss', 'close', '×')}</div>`; }
export function globalInputs(): string {
  return `<input type="file" id="import-file" accept=".atex,.xml,.musicxml,.gp,.gp3,.gp4,.gp5,.gpx,.gp7" hidden><input type="file" id="restore-file" accept=".json" hidden><dialog id="settings-dialog"></dialog><dialog id="new-dialog"></dialog><script type="application/json" id="verification-state"></script>`;
}
export function libraryPage(entries: { id: string; title: string; group: string }[]): string {
  const groups = [...new Set(entries.map(entry => entry.group))];
  const songs = groups.map(group => `${group ? `<h2 class="group-title">${esc(group)}</h2>` : ''}${entries.filter(entry => entry.group === group).map(entry => `<button class="song" data-song="${esc(entry.id)}"><span>${esc(entry.title)}</span><span aria-hidden="true">›</span></button>`).join('')}`).join('');
  return `<main class="library-page"><header class="topbar"><h1>${t('app')}</h1>${button('settings', 'settings', '⚙')}</header>${errorPanel()}<div class="library-actions">${button('new', 'newScore', '+ ' + t('newScore'))}${button('import', 'import')}${button('restore', 'restore')}</div><div class="song-list">${songs || `<p>${t('empty')}</p>`}</div>${globalInputs()}</main>`;
}
export function scorePage(title: string, editing: boolean, tempo: number, bars: number): string {
  return `<main class="score-page"><header class="topbar">${button('back', 'back', '‹')}<h1 id="score-title">${esc(title)}</h1><span id="save-status" role="status" aria-label="${t('saved')}">✓</span>${button('mode', editing ? 'read' : 'edit')}${button('settings', 'settings', '⚙')}</header>${errorPanel()}<div class="score-meta"><span>4/4</span><span>♩ = ${tempo}</span></div><div id="sheet" tabindex="0" aria-label="${esc(t('library'))}"></div><div class="transport">${button('play', 'play', '▶')}${button('stop', 'stop', '■')}<input id="seek" type="range" min="0" max="1000" value="0" aria-label="${t('fromHere')}"><select id="speed" aria-label="${t('speed')}">${[.5,.75,1,1.25,1.5].map(v => `<option value="${v}" ${v === 1 ? 'selected' : ''}>${v}×</option>`).join('')}</select>${button('practice', 'practice', '↻')}</div><div id="practice-panel" hidden><label>${t('startBar')}<input id="start-bar" type="number" min="1" max="${bars}" value="1"></label><label>${t('endBar')}<input id="end-bar" type="number" min="1" max="${bars}" value="${bars}"></label><label><input id="loop" type="checkbox">${t('loop')}</label>${button('from-here', 'fromHere')}</div><div id="editor-tools" ${editing ? '' : 'hidden'}></div>${globalInputs()}</main>`;
}
