// Text editor for songs with live preview, error list, autosave and a key row for phone keyboards.
import { config } from '../../core/config.js';
import { t } from '../../core/i18n.js';
import { h } from '../../ui/dom.js';
import { iconButton, segmented } from '../../ui/controls.js';
import { openPanel } from '../../ui/panel.js';
import { toast } from '../../ui/toast.js';
import { state } from '../../state/store.js';
import { deleteSong, getEntry, newSongId, parse, saveSong } from '../../state/songs.js';
import { renderScore } from '../../render/score/score.js';
import { parseKey } from '../../music/key.js';
import { jianpuTonic } from '../../music/jianpu.js';
import { pretty } from '../../music/pitch.js';
import { notFound } from '../not-found.js';

export function editorView(root, id) {
  const entry = id === 'new' ? null : getEntry(id);
  if (id !== 'new' && !entry) return notFound(root);
  let songId = entry && !entry.builtin ? id : null;
  const initial = entry?.text ?? t('editor.template');
  let savedText = songId ? initial : null;
  let timer = 0;
  let renderedWidth = 0;

  const gutter = h('div', { class: 'gutter', 'aria-hidden': 'true' });
  const ta = h('textarea', { class: 'code', spellcheck: false, autocapitalize: 'off', autocomplete: 'off', wrap: 'off', 'aria-label': t('editor.textLabel') });
  ta.value = initial;
  const status = h('span', { class: 'save-status' });
  const preview = h('div', { class: 'score' });
  const problems = h('div', { class: 'problems', 'aria-live': 'polite' });
  const openBtn = iconButton('play', t('editor.open'), () => (location.hash = `#/song/${songId}`), { text: true });
  const deleteBtn = iconButton('trash', t('editor.delete'), onDelete, { text: true });

  const wrap = h('div', { class: 'editor' },
    h('section', { class: 'editor-pane' },
      h('div', { class: 'code-wrap' }, gutter, ta),
      h('div', { class: 'key-row', role: 'toolbar', 'aria-label': t('editor.keysLabel') }, config.editor.keys.map((k) => h('button', { class: 'btn small mono', type: 'button', onmousedown: (e) => e.preventDefault(), onclick: () => insert(k) }, k.trim()))),
      problems,
    ),
    h('section', { class: 'preview-pane' }, preview),
  );

  root.append(
    h('div', { class: 'editor-page' },
      h('header', { class: 'topbar' },
        iconButton('back', t('common.back'), () => (history.length > 1 ? history.back() : (location.hash = '#/'))),
        h('div', { class: 'top-title' }, h('strong', null, entry?.builtin ? t('editor.copyTitle', { title: parse(initial).meta.title }) : t('editor.title')), status),
        h('div', { class: 'top-actions' },
          segmented([['edit', t('editor.modeEdit')], ['preview', t('editor.modePreview')]], 'edit', (v) => wrap.classList.toggle('show-preview', v === 'preview'), 'narrow-only'),
          iconButton('help', t('editor.helpButton'), () => openPanel(t('editor.helpTitle'), h('div', { class: 'help', html: t('editor.help') }), { wide: true }), { text: true }),
          openBtn,
          deleteBtn,
        ),
      ),
      wrap,
    ),
  );

  function insert(text) {
    ta.focus();
    ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end');
    onInput();
  }

  function updateGutter() {
    const n = ta.value.split('\n').length;
    if (gutter.dataset.lines !== String(n)) {
      gutter.textContent = Array.from({ length: n }, (_, i) => i + 1).join('\n');
      gutter.dataset.lines = n;
    }
    gutter.scrollTop = ta.scrollTop;
  }

  function selectLine(n) {
    const lines = ta.value.split('\n');
    const start = lines.slice(0, n - 1).reduce((a, l) => a + l.length + 1, 0);
    wrap.classList.remove('show-preview');
    ta.focus();
    ta.setSelectionRange(start, start + (lines[n - 1]?.length ?? 0));
    const lh = parseFloat(getComputedStyle(ta).lineHeight) || 20;
    ta.scrollTop = Math.max(0, (n - 4) * lh);
    updateGutter();
  }

  function renderPreview() {
    const song = parse(ta.value);
    const width = Math.floor(preview.clientWidth);
    renderedWidth = width;
    if (width) {
      renderScore(preview, song, {
        width, scale: config.editor.previewScale, show: state.settings.show, chordLabel: pretty,
        tonic: jianpuTonic(song.melody, parseKey(song.meta.key), song.meta.jianpu),
        stringLabels: state.settings.stringLabels, stringWidth: state.settings.stringWidth,
      });
    }
    const list = [...song.errors.map((e) => ({ ...e, kind: 'error' })), ...song.warnings.map((e) => ({ ...e, kind: 'warning' }))].sort((a, b) => a.line - b.line);
    problems.replaceChildren(
      list.length
        ? h('ul', null, list.map((p) => h('li', { class: p.kind === 'error' ? 'bad' : 'warn' },
            h('button', { class: 'btn link', type: 'button', onclick: () => selectLine(p.line) }, t('common.line', { line: p.line })), ` ${t(`editor.problem.${p.kind}`, { message: p.message })}`)))
        : h('p', { class: 'ok' }, t('editor.noProblems', { bars: song.bars.length })),
    );
  }

  function persist() {
    const text = ta.value;
    if (text === savedText) return;
    if (!songId) {
      songId = newSongId();
      history.replaceState(null, '', `#/edit/${songId}`);
      if (entry?.builtin) toast(t('editor.copied'));
    }
    saveSong(songId, text);
    savedText = text;
    status.textContent = t('editor.saved');
    updateButtons();
  }

  function updateButtons() {
    openBtn.disabled = !songId;
    deleteBtn.hidden = !songId;
    if (!songId) status.textContent = entry?.builtin ? t('editor.savesAsCopy') : t('editor.savesOnInput');
  }

  function onInput() {
    updateGutter();
    status.textContent = t('editor.typing');
    clearTimeout(timer);
    timer = setTimeout(() => {
      renderPreview();
      persist();
    }, config.editor.autosaveMs);
  }

  function onDelete() {
    const title = parse(ta.value).meta.title;
    clearTimeout(timer);
    savedText = ta.value; // nothing left to save when the view closes
    const restore = deleteSong(songId);
    location.hash = '#/';
    toast(t('editor.deleted', { title }), [t('common.undo'), restore]);
  }

  function onKey(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      clearTimeout(timer);
      renderPreview();
      persist();
    }
  }

  ta.addEventListener('input', onInput);
  ta.addEventListener('scroll', () => (gutter.scrollTop = ta.scrollTop));
  addEventListener('keydown', onKey);
  const ro = new ResizeObserver(() => {
    if (Math.floor(preview.clientWidth) !== renderedWidth) renderPreview();
  });
  ro.observe(preview);
  updateGutter();
  updateButtons();
  renderPreview();

  return () => {
    clearTimeout(timer);
    if (ta.value !== (savedText ?? initial)) persist();
    ro.disconnect();
    removeEventListener('keydown', onKey);
  };
}
