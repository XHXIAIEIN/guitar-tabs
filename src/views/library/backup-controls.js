// Export and import of backup files, at the foot of the song list.
import { t } from '../../core/i18n.js';
import { h } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { toast } from '../../ui/toast.js';
import { exportData, importData } from '../../state/backup.js';

export function backupControls(onImported) {
  const fileInput = h('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: onImport });

  function onExport() {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: t('library.backupFile', { date: new Date().toISOString().slice(0, 10) }) });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function onImport() {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    try {
      const n = importData(await file.text());
      toast(t('library.imported', { count: n }));
      onImported();
    } catch (e) {
      toast(t('library.importFailed', { reason: e instanceof SyntaxError ? t('library.invalidJson') : e.message }));
    }
  }

  return h('footer', { class: 'lib-foot' },
    h('button', { class: 'btn small', type: 'button', onclick: onExport }, icon('download'), t('library.export')),
    h('button', { class: 'btn small', type: 'button', onclick: () => fileInput.click() }, icon('upload'), t('library.import')),
    fileInput,
    h('span', { class: 'muted' }, t('library.backupHint')),
  );
}
