import { t } from '../i18n';
import { escapeHtml as esc } from '../notation/svg';
import { icon } from './icons';
export function button(action: string, label: string, symbol?: string, extra = ''): string {
  return `<button type="button" data-action="${action}" aria-label="${esc(t(label))}" title="${esc(t(label))}" ${extra}>${icon(label) || symbol || esc(t(label))}</button>`;
}
export const textButton = (action: string, label: string, extra = ''): string =>
  `<button type="button" data-action="${action}" ${extra}>${esc(t(label))}</button>`;
export const dialogHeader = (label: string): string =>
  `<header><h2>${t(label)}</h2>${button('close-dialog', 'close')}</header>`;
export function errorPanel(): string {
  return `<div id="error" role="alert" hidden><span></span><div class="error-actions">${textButton('retry','retry')}${textButton('export','exportUnsaved')}${button('dismiss','close')}</div></div>`;
}
export function globalInputs(): string {
  return `<input type="file" id="import-file" accept=".atex,.xml,.musicxml,.gp,.gp3,.gp4,.gp5,.gpx,.gp7" hidden><input type="file" id="restore-file" accept=".json" hidden><dialog id="settings-dialog"></dialog><dialog id="new-dialog"></dialog><script type="application/json" id="verification-state"></script>`;
}
export function clockTime(seconds: number): string {
  const rounded = Math.max(0, Math.floor(seconds));
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`;
}
