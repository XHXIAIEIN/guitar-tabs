// The library's import button: a panel that takes a downloaded score file or pasted text. A score with several
// tracks asks which one to take; the result is saved as a new song and opened in the editor.
import { t } from '../../core/i18n.js';
import { h } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { toast } from '../../ui/toast.js';
import { openPanel } from '../../ui/panel.js';
import { newSongId, parse, saveSong } from '../../state/songs.js';
import { ACCEPT, readScoreFile, readText } from '../../music/import/load-score.js';
import { scoreToAlphaTex } from '../../music/import/to-alphatex.js';

/** Resolves to the index of the track the user picks, or null when the panel is closed without a pick. */
function pickTrack(tracks) {
  return new Promise((resolve) => {
    let picked = null;
    const close = openPanel(t('import.pickTrack'),
      h('div', { class: 'stack' }, tracks.map(({ index, name }) =>
        h('button', { class: 'btn', type: 'button', onclick: () => { picked = index; close(); } }, t(name ? 'import.track' : 'import.trackUnnamed', { index: index + 1, name })))),
      { onclose: () => resolve(picked) });
  });
}

/** Saves song text as a new song and opens it in the editor. */
function save({ text, remarks }) {
  const id = newSongId();
  saveSong(id, text);
  const title = parse(text).meta.title;
  toast(remarks.length ? t('import.doneRemarks', { title, count: remarks.length }) : t('import.done', { title }));
  location.hash = `#/edit/${id}`;
}

export function importScoreButton() {
  const button = h('button', { class: 'btn', type: 'button', onclick: openImport }, icon('upload'), h('span', null, t('library.importScore')));

  function openImport() {
    const fileInput = h('input', { type: 'file', accept: ACCEPT, hidden: true, onchange: () => onFile(fileInput) });
    const paste = h('textarea', { class: 'paste-tab', rows: 12, spellcheck: false, placeholder: t('import.pastePlaceholder'), 'aria-label': t('import.pasteLabel') });
    const close = openPanel(t('library.importScore'), h('div', { class: 'stack' },
      h('div', { class: 'row gap-s' },
        h('button', { class: 'btn', type: 'button', onclick: () => fileInput.click() }, icon('upload'), h('span', null, t('import.chooseFile'))),
        h('span', { class: 'muted' }, t('import.fileTypes'))),
      fileInput,
      paste,
      h('div', { class: 'row gap-s' },
        h('button', { class: 'btn primary', type: 'button', onclick: onPaste }, t('import.convert'))),
    ), { wide: true });

    function onPaste() {
      try {
        const read = readText(paste.value, null);
        close();
        save(read);
      } catch (e) {
        toast(t('library.importFailed', { reason: e.message }));
      }
    }

    async function onFile() {
      const file = fileInput.files[0];
      if (!file) return;
      close();
      button.disabled = true;
      toast(t('import.loading', { name: file.name }));
      try {
        const read = await readScoreFile(file);
        // the user may have left the library while alphaTab loaded
        if (!button.isConnected) return;
        if (!read.score) return save(read);
        const index = read.tracks.length === 1 ? read.tracks[0].index : await pickTrack(read.tracks);
        if (index !== null) save(scoreToAlphaTex(read.score, index, file.name));
      } catch (e) {
        toast(t('library.importFailed', { reason: e.message }));
      } finally {
        button.disabled = false;
      }
    }
  }

  return button;
}
