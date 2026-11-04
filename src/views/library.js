// Song list: search, my songs, exercises, songs, the performance setlist and backup.
import { h, fill, icon, iconButton, toast } from '../ui/dom.js';
import { state, save, allEntries, parse, getEntry, exportData, importData } from '../store.js';
import { prettyKey, parseKey } from '../music/theory.js';

export function libraryView(root) {
  let query = '';
  const listEl = h('div', { class: 'lib-groups' });
  const setlistEl = h('section', { class: 'setlist' });
  const fileInput = h('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: onImport });

  root.append(
    h('div', { class: 'page' },
      h('header', { class: 'page-head' },
        h('h1', null, '曲谱'),
        h('div', { class: 'row gap-s' },
          h('a', { class: 'btn primary', href: '#/edit/new' }, icon('plus'), h('span', null, '新建曲谱')),
        ),
      ),
      h('input', { class: 'search', type: 'search', placeholder: '搜索曲名、作者、和弦…', 'aria-label': '搜索曲谱', oninput: (e) => { query = e.target.value.trim().toLowerCase(); renderList(); } }),
      setlistEl,
      listEl,
      h('footer', { class: 'lib-foot' },
        h('button', { class: 'btn small', type: 'button', onclick: onExport }, icon('download'), '导出备份'),
        h('button', { class: 'btn small', type: 'button', onclick: () => fileInput.click() }, icon('upload'), '导入备份'),
        fileInput,
        h('span', { class: 'muted' }, '曲谱只保存在这台设备的浏览器里，换设备前先导出备份。'),
      ),
    ),
  );

  function inSetlist(id) {
    return state.setlist.includes(id);
  }

  function toggleSetlist(id) {
    const i = state.setlist.indexOf(id);
    if (i >= 0) state.setlist.splice(i, 1);
    else state.setlist.push(id);
    save();
    renderSetlist();
    renderList();
  }

  function renderSetlist() {
    const ids = state.setlist.filter((id) => getEntry(id));
    if (!ids.length) {
      setlistEl.replaceChildren();
      setlistEl.hidden = true;
      return;
    }
    setlistEl.hidden = false;
    const move = (i, d) => {
      const [x] = state.setlist.splice(i, 1);
      state.setlist.splice(i + d, 0, x);
      save();
      renderSetlist();
    };
    setlistEl.replaceChildren(
      h('div', { class: 'section-head' },
        h('h2', null, '演出歌单'),
        h('a', { class: 'btn primary small', href: `#/perform/${ids[0]}?list` }, icon('stage'), '开始演出'),
      ),
      h('ol', { class: 'setlist-items' },
        ids.map((id, i) => {
          const song = parse(getEntry(id).text);
          return h('li', null,
            h('span', { class: 'set-no' }, i + 1),
            h('a', { href: `#/perform/${id}?list` }, song.meta.title),
            h('span', { class: 'spacer' }),
            iconButton('up', '上移', () => move(i, -1), { cls: 'small' + (i === 0 ? ' invisible' : '') }),
            iconButton('down', '下移', () => move(i, 1), { cls: 'small' + (i === ids.length - 1 ? ' invisible' : '') }),
            iconButton('close', '移出歌单', () => toggleSetlist(id), { cls: 'small' }),
          );
        }),
      ),
    );
  }

  function row(entry) {
    const song = parse(entry.text);
    const { meta } = song;
    const key = parseKey(meta.key);
    const added = inSetlist(entry.id);
    return h('li', { class: 'song-row' },
      h('a', { class: 'song-link', href: `#/song/${entry.id}` },
        h('strong', null, meta.title),
        h('span', { class: 'song-sub' },
          [meta.artist, entry.version?.name, key && `${prettyKey(key)} 调`, meta.time.join('/'), `♩${meta.bpm}`, meta.level].filter(Boolean).join(' · '),
          song.errors.length ? h('em', { class: 'bad' }, ` · ${song.errors.length} 处错误`) : null),
      ),
      h('button', { class: 'btn small ghost' + (added ? ' on' : ''), type: 'button', title: added ? '移出演出歌单' : '加入演出歌单', onclick: () => toggleSetlist(entry.id) },
        icon(added ? 'list' : 'plus'), h('span', null, added ? '已在歌单' : '歌单')),
    );
  }

  function renderList() {
    const entries = allEntries().filter((e) => {
      if (!query) return true;
      const s = parse(e.text);
      return [s.meta.title, s.meta.artist, ...s.chordsUsed].join(' ').toLowerCase().includes(query);
    });
    const groups = ['我的曲谱', '练习', '歌曲'];
    fill(listEl,
      ...groups.map((g) => {
        const items = entries.filter((e) => e.group === g);
        if (!items.length && (query || g !== '我的曲谱')) return null;
        return h('section', { class: 'lib-group' },
          h('h2', null, g),
          items.length
            ? h('ul', { class: 'song-list' }, items.map(row))
            : h('p', { class: 'empty' }, '还没有自己的曲谱。点「新建曲谱」写一首，或在任意曲谱里点「编辑」复制一份来改。'));
      }),
      entries.length ? null : h('p', { class: 'empty' }, `没有找到「${query}」。`),
    );
  }

  function onExport() {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `六弦本备份-${new Date().toISOString().slice(0, 10)}.json` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function onImport() {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    try {
      const n = importData(await file.text());
      toast(`已导入 ${n} 首曲谱`);
      renderSetlist();
      renderList();
    } catch (e) {
      toast(`导入失败：${e instanceof SyntaxError ? '文件不是有效的 JSON' : e.message}`);
    }
  }

  renderSetlist();
  renderList();
  return () => {};
}
