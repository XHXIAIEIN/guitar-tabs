// Entry point: loads the configuration, the saved state, the language and the built-in scores, then starts the app.
import { config, fetchJson, fetchText, loadConfig } from '../core/config.js';
import { loadLocale, t } from '../core/i18n.js';
import { loadScores } from '../state/songs.js';
import { initState, onSave, saveFailed, state } from '../state/store.js';
import { applyTheme } from '../ui/theme.js';
import { toast } from '../ui/toast.js';
import { setVolume } from '../audio/context.js';
import { AudioLoadError, loadSamples } from '../audio/samples.js';
import { createShell } from './shell.js';
import { startRouter } from './router.js';

function applyDocumentText(locale) {
  document.documentElement.lang = locale;
  document.title = t('app.title');
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('app.description'));
  document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content', t('app.name'));
}

function watchSaveFailure() {
  let warned = false;
  onSave(() => {
    if (saveFailed && !warned) {
      warned = true;
      toast(t('errors.saveFailed'));
    }
  });
}

async function start() {
  await loadConfig();
  initState();
  applyDocumentText(await loadLocale(state.settings.locale ?? config.i18n.defaultLocale));
  await loadScores(fetchJson, fetchText);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  watchSaveFailure();
  setVolume('metronome', state.settings.volMetronome);
  setVolume('guitar', state.settings.volGuitar);
  applyTheme();
  startRouter(createShell(document.getElementById('app')));
  // A failed preload is not reported here: resumeGuitar() loads again when guitar sound starts.
  loadSamples().catch(() => {});
  // Play buttons call resumeGuitar() without a catch; a failed load ends up here
  addEventListener('unhandledrejection', (e) => {
    if (!(e.reason instanceof AudioLoadError)) return;
    e.preventDefault();
    toast(e.reason.message);
  });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('service worker registration failed', e));
  }
}

start();
