import { t } from '../i18n';
import { escapeHtml as esc } from '../notation/svg';
import { icon } from './icons';
import { button, errorPanel, globalInputs, textButton } from './controls';
export interface LibraryEntry { id: string; title: string; group: string }
export function libraryPage(entries: LibraryEntry[]): string {
  const groups = [...new Set(entries.map(entry => entry.group))];
  const songs = groups.map(group => {
    const items = entries.filter(entry => entry.group === group);
    return `<section class="library-group"><header class="group-heading"><h2 class="group-title">${esc(group || t('library'))}</h2><span aria-hidden="true">${String(items.length).padStart(2,'0')}</span></header><div class="song-list">${items.map((entry,index) => `<button class="song" data-song="${esc(entry.id)}"><span class="song-number" aria-hidden="true">${String(index+1).padStart(2,'0')}</span><span class="song-title">${esc(entry.title)}</span>${icon('arrow')}</button>`).join('')}</div></section>`;
  }).join('');
  return `<main class="library-page"><header class="library-header"><div class="brand">${icon('score')}<span>${t('app')}</span></div>${button('settings','settings')}</header>${errorPanel()}<div class="library-intro"><h1>${t('library')}</h1><p>${t('libraryGreeting')}</p></div><div class="library-actions">${textButton('new','newScore','class="primary-action"')}${textButton('import','import')}${textButton('restore','restore')}</div><div class="library-groups">${songs || `<div class="empty-state">${icon('score')}<p>${t('empty')}</p></div>`}</div>${globalInputs()}</main>`;
}
