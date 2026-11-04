// Text editor for songs with live preview, error list, autosave and a key row for phone keyboards.
import { h, icon, iconButton, segmented, toast, openPanel } from '../ui/dom.js';
import { state, getEntry, parse, saveSong, deleteSong, newSongId } from '../store.js';
import { renderScore } from '../render/score.js';
import { pretty, parseKey, jianpuTonic } from '../music/theory.js';
import { notFound } from './song.js';

const TEMPLATE = `title: 新曲谱
artist:
key: C
bpm: 80
time: 4/4
// 弹唱谱：和弦和歌词各占一行，用 | 分隔小节，上下对齐
strum: q D e D U r U D U

# 主歌
chord: | C        | Am       | F        | G . C .  |
lyric: | 第一小节 | 第二小节 | 第三小节 | 第四小节 |

# 旋律
chord: | C                 | G             |
tab:   | q 5/3 4/2 3/0 2/1 | 2/0 2/3 h 1/0 |
lyric: | 一二三四          | 五六七        |
`;

export const SYNTAX_HELP = `
<h3>开头的信息</h3>
<p><code>title:</code> 曲名 · <code>artist:</code> 作者 · <code>key:</code> 调（C、G、Eb、Am）· <code>capo:</code> 变调夹品位 · <code>bpm:</code> 速度 · <code>time:</code> 拍号（4/4、3/4、6/8）· <code>strum:</code> 弹唱的节奏型 · <code>pickup:</code> 弱起拍数 · <code>level:</code> 难度 · <code>note:</code> 练习说明。也可以写中文：标题、调、变调夹、速度、拍号、节奏型。</p>
<h3>段落和三种行</h3>
<p><code># 主歌</code> 开始一个新段落。<code>chord:</code> 和弦行、<code>tab:</code> 六线谱行、<code>lyric:</code> 歌词行写在一起成为一组，用 <code>|</code> 分隔小节，同一组里第几个小节就对应第几个小节。</p>
<h3>和弦</h3>
<p><code>C</code> 占整小节；<code>C G</code> 平分小节；<code>C . G .</code> 每个记号占一拍，<code>.</code> 表示延续。</p>
<h3>六线谱</h3>
<table>
<tr><td><code>w h q e s</code></td><td>全音符、二分、四分、八分、十六分音符。写一次后一直有效，直到写新的时值</td></tr>
<tr><td><code>q. e.</code></td><td>附点（时值 × 1.5）</td></tr>
<tr><td><code>e3</code></td><td>三连音（3 个 e3 占一拍）</td></tr>
<tr><td><code>5/3</code></td><td>5 弦 3 品（1 弦是最细的弦）</td></tr>
<tr><td><code>5/3+2/1</code></td><td>同时弹的几个音</td></tr>
<tr><td><code>4/x</code></td><td>闷音（只出打击声）</td></tr>
<tr><td><code>r</code></td><td>休止</td></tr>
<tr><td><code>D U X</code></td><td>下扫、上扫、切音（扫当前和弦）</td></tr>
</table>
<p>例：<code>tab: | q 5/3 e 4/2 4/0 h 3/0 |</code> 一小节 4 拍：四分 + 两个八分 + 二分。</p>
<h3>歌词</h3>
<p>六线谱有音符时，歌词按顺序对到音符上：汉字一字一音，英文按空格和 <code>-</code> 分；<code>_</code> 表示这个音不唱新字（拖腔）。没有音符时，歌词整段显示在小节下面。</p>
<h3>其他</h3>
<p><code>//</code> 开头的行是注释。空行把行组分开。</p>`;

export function editorView(root, id) {
  const entry = id === 'new' ? null : getEntry(id);
  if (id !== 'new' && !entry) return notFound(root);
  let songId = entry && !entry.builtin ? id : null;
  const initial = entry?.text ?? TEMPLATE;
  let savedText = songId ? initial : null;
  let timer = 0;
  let renderedWidth = 0;

  const gutter = h('div', { class: 'gutter', 'aria-hidden': 'true' });
  const ta = h('textarea', { class: 'code', spellcheck: false, autocapitalize: 'off', autocomplete: 'off', wrap: 'off', 'aria-label': '曲谱文本' });
  ta.value = initial;
  const status = h('span', { class: 'save-status' });
  const preview = h('div', { class: 'score' });
  const problems = h('div', { class: 'problems', 'aria-live': 'polite' });
  const openBtn = iconButton('play', '打开', () => (location.hash = `#/song/${songId}`), { text: true });
  const deleteBtn = iconButton('trash', '删除', onDelete, { text: true });
  const keys = ['|', '/', '+', '.', 'q', 'e', 'h', 's', 'r', 'D', 'U', 'chord: ', 'tab: ', 'lyric: ', '# '];

  const wrap = h('div', { class: 'editor' },
    h('section', { class: 'editor-pane' },
      h('div', { class: 'code-wrap' }, gutter, ta),
      h('div', { class: 'key-row', role: 'toolbar', 'aria-label': '常用符号' }, keys.map((k) => h('button', { class: 'btn small mono', type: 'button', onmousedown: (e) => e.preventDefault(), onclick: () => insert(k) }, k.trim()))),
      problems,
    ),
    h('section', { class: 'preview-pane' }, preview),
  );

  root.append(
    h('div', { class: 'editor-page' },
      h('header', { class: 'topbar' },
        iconButton('back', '返回', () => (history.length > 1 ? history.back() : (location.hash = '#/'))),
        h('div', { class: 'top-title' }, h('strong', null, entry?.builtin ? `编辑副本：${parse(initial).meta.title}` : '编辑曲谱'), status),
        h('div', { class: 'top-actions' },
          segmented([['edit', '编辑'], ['preview', '预览']], 'edit', (v) => wrap.classList.toggle('show-preview', v === 'preview'), 'narrow-only'),
          iconButton('help', '写法说明', () => openPanel('曲谱写法', h('div', { class: 'help', html: SYNTAX_HELP }), { wide: true }), { text: true }),
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
        width, scale: 0.95, show: state.settings.show, chordLabel: pretty,
        tonic: jianpuTonic(song.melody, parseKey(song.meta.key), song.meta.jianpu),
        stringLabels: state.settings.stringLabels, stringWidth: state.settings.stringWidth,
      });
    }
    const list = [...song.errors.map((e) => ({ ...e, kind: '错误' })), ...song.warnings.map((e) => ({ ...e, kind: '提醒' }))].sort((a, b) => a.line - b.line);
    problems.replaceChildren(
      list.length
        ? h('ul', null, list.map((p) => h('li', { class: p.kind === '错误' ? 'bad' : 'warn' },
            h('button', { class: 'btn link', type: 'button', onclick: () => selectLine(p.line) }, `第 ${p.line} 行`), ` ${p.kind}：${p.message}`)))
        : h('p', { class: 'ok' }, `没有问题 · ${song.bars.length} 个小节`),
    );
  }

  function persist() {
    const text = ta.value;
    if (text === savedText) return;
    if (!songId) {
      songId = newSongId();
      history.replaceState(null, '', `#/edit/${songId}`);
      if (entry?.builtin) toast('已复制到「我的曲谱」，原曲谱保持不变');
    }
    saveSong(songId, text);
    savedText = text;
    status.textContent = '已自动保存';
    updateButtons();
  }

  function updateButtons() {
    openBtn.disabled = !songId;
    deleteBtn.hidden = !songId;
    if (!songId) status.textContent = entry?.builtin ? '修改后自动另存为我的曲谱' : '输入后自动保存';
  }

  function onInput() {
    updateGutter();
    status.textContent = '正在输入…';
    clearTimeout(timer);
    timer = setTimeout(() => {
      renderPreview();
      persist();
    }, 350);
  }

  function onDelete() {
    const title = parse(ta.value).meta.title;
    clearTimeout(timer);
    savedText = ta.value; // nothing left to save when the view closes
    const restore = deleteSong(songId);
    location.hash = '#/';
    toast(`已删除「${title}」`, ['撤销', restore]);
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
