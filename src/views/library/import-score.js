// The library's import button: reads a downloaded score file, asks which track to take when it has several, saves the
// result as a new song and opens it in the editor.
import { t } from '../../core/i18n.js';
import { h } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { toast } from '../../ui/toast.js';
import { openPanel } from '../../ui/panel.js';
import { newSongId, parse, saveSong } from '../../state/songs.js';
import { ACCEPT, readScoreFile } from '../../music/import/load-score.js';
import { scoreToAlphaTex } from '../../music/import/to-alphatex.js';

/** Resolves to the index of the track the user picks, or null when the panel is closed without a pick. */
function pickTrack(tracks) {
  return new Promise((resolve) => {
    let picked = null;
    const close = openPanel(t('import.pickTrack'),
      h('div', { class: 'stack' }, tracks.map(({ index, name }) =>
        h('button', { class: 'btn', type: 'button', onclick: () => { picked = index; close(); } }, t('import.track', { index: index + 1, name })))),
      { onclose: () => resolve(picked) });
  });
}

export function importScoreButton() {
  const fileInput = h('input', { type: 'file', accept: ACCEPT, hidden: true, onchange: onPick });
  const button = h('button', { class: 'btn', type: 'button', onclick: () => fileInput.click() }, icon('upload'), h('span', null, t('library.importScore')));

  async function onPick() {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    button.disabled = true;
    toast(t('import.loading', { name: file.name }));
    try {
      const read = await readScoreFile(file);
      // the user may have left the library while alphaTab loaded
      if (!button.isConnected) return;
      let { text } = read;
      let remarks = [];
      if (read.score) {
        const index = read.tracks.length === 1 ? read.tracks[0].index : await pickTrack(read.tracks);
        if (index === null) return;
        ({ text, remarks } = scoreToAlphaTex(read.score, index, file.name));
      }
      const id = newSongId();
      saveSong(id, text);
      const title = parse(text).meta.title;
      toast(remarks.length ? t('import.doneRemarks', { title, count: remarks.length }) : t('import.done', { title }));
      location.hash = `#/edit/${id}`;
    } catch (e) {
      toast(t('library.importFailed', { reason: e.message }));
    } finally {
      button.disabled = false;
    }
  }

  return [button, fileInput];
}
