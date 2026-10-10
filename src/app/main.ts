import '../ui/styles.css';
import { builtins } from '../library/builtins';
import { EditorSession } from '../editor/session';
import { ScoreRepository } from '../storage/repository';
import { ScoreWorkerClient, StaleTaskError } from '../workers/client';
import { PlaybackWorkerClient } from '../workers/playback-client';
import { PlaybackTransport, type Timeline, type PlaybackState } from '../playback';
import { type TabScore, type Duration, barTicks, STANDARD_TUNING } from '../score/model';
import { readPreferences, savePreferences } from '../settings/preferences';
import { t, setLocale, getLocale } from '../i18n';
import { button, errorPanel, libraryPage, scorePage } from '../ui/templates';
import { escapeHtml as esc, renderBar } from '../notation/svg';
import { locate, type BarLayout } from '../notation/layout';

const root = document.querySelector<HTMLDivElement>('#app')!;
const repo = new ScoreRepository();
const worker = new ScoreWorkerClient();
const playerWorker = new PlaybackWorkerClient();
const prefs = readPreferences();
let editor: EditorSession | undefined;
let score: TabScore | undefined;
let id = '', version = 0, editing = false, saving = false;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let layoutTimer: ReturnType<typeof setTimeout> | undefined;
let observer: IntersectionObserver | undefined;
let resize: ResizeObserver | undefined;
const layouts = new Map<string, BarLayout>();
let layoutSerial = 0, gridTicks = 960, digitEntry = '', digitTime = 0;
let timeline: Timeline | undefined, timelineKey = '', playSerial = 0;
let errorText = '', selectionMs = 0, workerEvidence: unknown;
let pendingFile: File | undefined;
const transport = new PlaybackTransport({ onUpdate: playbackUpdate });
function title(key: string, text: string) {
  const source = builtins.find(item => item.id === key);
  return source?.translationKey && source.title === text ? t(source.translationKey) : text;
}
function readback() {
  const state = document.querySelector('#verification-state');
  if (state) state.textContent = JSON.stringify({ id, score, selection: editor?.selection, editing, version, saving,
    locale: getLocale(), display: prefs.display, selectionMs, error: errorText, notationWorker: workerEvidence,
    playbackWorker: playerWorker.lastReply, playback: transport.state, audio: transport.diagnostics,
    renderedBars: document.querySelectorAll('.bar-slot svg').length });
}
function showError(error: unknown) {
  if (error instanceof StaleTaskError || (error as Error)?.message === 'playback.cancelled') return;
  const e = error as { message?: string; params?: Record<string, number | string> };
  errorText = t(e.message ?? String(error), e.params);
  const panel = document.querySelector<HTMLElement>('#error');
  if (panel) { panel.hidden = false; panel.querySelector('span')!.textContent = errorText; }
  readback();
}
function clearError() { errorText = ''; const panel = document.querySelector<HTMLElement>('#error'); if (panel) panel.hidden = true; }
function stop() { playSerial++; playerWorker.cancel(); transport.stop(); }
function saveStatus() {
  const el = document.querySelector('#save-status');
  if (el) { el.textContent = saving ? '·' : '✓'; el.setAttribute('aria-label', t(saving ? 'saving' : 'saved')); }
}
function save(): boolean {
  if (!score || !id || !saving) return true;
  clearTimeout(saveTimer);
  try { repo.save(id, score); saving = false; saveStatus(); }
  catch (error) { document.querySelector('#save-status')?.setAttribute('aria-label', t('saveFailed')); showError(error); return false; }
  readback();
  return true;
}
function scheduleSave() { saving = true; saveStatus(); clearTimeout(saveTimer); saveTimer = setTimeout(save, 180); }
function library() {
  if (!save()) return;
  stop(); observer?.disconnect(); resize?.disconnect(); layouts.clear(); editor = undefined; score = undefined; id = '';
  const entries = builtins.map(item => ({ id: item.id, title: title(item.id, item.title), group: item.group }));
  try { for (const entry of repo.list()) {
    const item = { id: entry.id, title: title(entry.id, entry.score.title), group: builtins.find(item => item.id === entry.id)?.group ?? t('myScores') };
    const index = entries.findIndex(e => e.id === item.id);
    if (index < 0) entries.push(item); else entries[index] = item;
  }} catch (error) { errorText = t((error as Error).message); }
  root.innerHTML = libraryPage(entries);
  document.documentElement.lang = getLocale(); document.title = t('app');
  if (errorText) showError(errorText);
  bindControls(); readback();
}
async function open(key: string, supplied?: TabScore) {
  if (!save()) return;
  stop(); clearError(); const ownVersion = ++version; worker.setVersion(version); id = key;
  root.innerHTML = '<main class="library-page"><header class="topbar">' + button('back','back','‹') + '<h1>' + t('loading') + '</h1></header>' + errorPanel() + '<script type="application/json" id="verification-state"></script></main>';
  try {
    const stored = supplied ?? repo.load(key);
    const reply = stored ? undefined : await worker.request({ kind: 'parse', text: builtins.find(item => item.id === key)?.text ?? '' });
    if (ownVersion !== version) return;
    score = stored ?? reply?.result as TabScore;
    workerEvidence = reply && { worker: reply.worker, version: reply.version, elapsedMs: reply.elapsedMs };
    editor = new EditorSession(score); editing = false; digitEntry = ''; timeline = undefined; timelineKey = '';
    render();
  } catch (error) { if (ownVersion === version) showError(error); }
}
function render() {
  if (!score || !editor) return;
  observer?.disconnect(); resize?.disconnect();
  root.innerHTML = scorePage(title(id, score.title), editing, score.tempo, score.bars.length);
  document.querySelector('.score-meta span')!.textContent = score.bars[0].meter.join('/');
  document.documentElement.lang = getLocale(); document.title = title(id, score.title);
  bindControls(); tools();
  const sheet = document.querySelector<HTMLDivElement>('#sheet')!;
  resize = new ResizeObserver(() => { clearTimeout(layoutTimer); layoutTimer = setTimeout(() => void relayout(), 80); });
  resize.observe(sheet); void relayout(); readback();
}
async function relayout(changed?: string[]) {
  if (!score || !editor) return;
  const ownVersion = version, serial = ++layoutSerial;
  const sheet = document.querySelector<HTMLDivElement>('#sheet'); if (!sheet) return;
  try {
    const reply = await worker.request({ kind: 'layout-bars', bars: score.bars.filter(b => !changed || changed.includes(b.id)),
      width: Math.min(320 * prefs.display.scale, sheet.clientWidth - 16), settings: prefs.display });
    if (ownVersion !== version || serial !== layoutSerial || !score) return;
    workerEvidence = { worker: reply.worker, elapsedMs: reply.elapsedMs, version: reply.version };
    for (const layout of reply.result as BarLayout[]) layouts.set(layout.barId, layout);
    const current = [...sheet.querySelectorAll<HTMLElement>('.bar-slot')].map(e => e.dataset.bar).join('|');
    if (current !== score.bars.map(b => b.id).join('|')) {
      observer?.disconnect();
      sheet.innerHTML = score.bars.map(bar => '<div class="bar-slot" data-bar="' + esc(bar.id) + '" style="height:' + (layouts.get(bar.id)?.height ?? 185) + 'px"></div>').join('');
      observer = new IntersectionObserver(entries => {
        for (const item of entries) {
          const slot = item.target as HTMLElement;
          if (item.isIntersecting) { slot.dataset.visible = 'true'; draw(slot.dataset.bar!); }
          else { delete slot.dataset.visible; slot.innerHTML = ''; }
        }
        readback();
      }, { root: sheet, rootMargin: '350px' });
      sheet.querySelectorAll('.bar-slot').forEach(slot => observer!.observe(slot));
    } else for (const slot of sheet.querySelectorAll<HTMLElement>('.bar-slot')) {
      slot.style.height = (layouts.get(slot.dataset.bar!)?.height ?? 185) + 'px';
      if (slot.dataset.visible) draw(slot.dataset.bar!);
    }
    readback();
  } catch (error) { if (ownVersion === version) showError(error); }
}
function slot(key: string) { return [...document.querySelectorAll<HTMLElement>('.bar-slot')].find(e => e.dataset.bar === key); }
function draw(key: string) {
  if (!score || !editor) return;
  const el = slot(key), layout = layouts.get(key), index = score.bars.findIndex(b => b.id === key);
  if (!el || !layout || index < 0) return;
  el.innerHTML = renderBar(score.bars[index], layout, score.tuning, prefs.display, index, editing,
    editor.selection.barId === key ? editor.selection : undefined);
  el.classList.toggle('playing', transport.state.playing && transport.state.barId === key);
  el.querySelectorAll<SVGElement>('[data-playing-beat]').forEach(beat => beat.classList.toggle('active', transport.state.playing && beat.dataset.playingBeat === transport.state.beatId));
}
function tools() {
  if (!score || !editor) return;
  const el = document.querySelector('#editor-tools'); if (!el) return;
  const position = editor.selection, bar = score.bars.find(b => b.id === position.barId)!;
  const beat = bar.beats.find(b => b.startTick === position.tick);
  const fret = beat?.notes.find(n => n.string === position.string)?.fret;
  const durations = [1,2,4,8,16] as Duration[];
  el.innerHTML = '<div class="input-top"><span>' + t('position', {bar: score.bars.indexOf(bar)+1, beat: position.tick/(3840/bar.meter[1])+1, string: position.string}) + '</span><div>' + button('undo','undo','↶',editor.canUndo?'':'disabled') + button('redo','redo','↷',editor.canRedo?'':'disabled') + '</div></div><div class="durations">' +
    durations.map((d,i) => '<button data-duration="' + d + '" class="' + (beat?.duration===d?'active':'') + '" aria-label="' + t(['whole','half','quarter','eighth','sixteenth'][i]) + '">' + ['𝅝','𝅗𝅥','♩','♪','♬'][i] + '</button>').join('') + button('dot','dot','·') + button('tie','tie','⌒') + button('rest','rest') +
    '</div><div class="fret-input"><input id="fret" type="number" min="0" max="36" inputmode="numeric" aria-label="' + t('fret') + '" value="' + (fret??'') + '" placeholder="—"><select id="grid" aria-label="' + t('beatGrid') + '">' +
    [4,8,16].map(d=>'<option value="' + 3840/d + '" ' + (gridTicks===3840/d?'selected':'') + '>1/' + d + '</option>').join('') + '</select>' + button('insert','insert','+') + button('delete-note','deleteNote','⌫') +
    '</div><div class="keypad">' + Array.from({length:10},(_,n)=>'<button data-digit="' + n + '">' + n + '</button>').join('') + '</div>';
  el.querySelector('#fret')!.addEventListener('change', event => {
    const value = (event.target as HTMLInputElement).value;
    if (value !== '') change(() => editor!.setFret(Number(value)));
  });
  el.querySelector('#grid')!.addEventListener('change', event => gridTicks = Number((event.target as HTMLSelectElement).value));
}
function change(command: () => void) {
  if (!score || !editor) return;
  const before = score;
  try {
    command(); stop(); clearError(); score = editor.score; version++; worker.setVersion(version); timeline = undefined; timelineKey = '';
    const changed = score.bars.filter(b=>JSON.stringify(b)!==JSON.stringify(before.bars.find(old=>old.id===b.id))).map(b=>b.id);
    tools(); draw(editor.selection.barId); scheduleSave();
    clearTimeout(layoutTimer); layoutTimer = setTimeout(()=>void relayout(changed),45); readback();
  } catch(error) { showError(error); }
}
function digit(value: string) {
  const now = performance.now();
  digitEntry = now-digitTime < 850 && digitEntry.length<2 ? digitEntry+value : value; digitTime=now;
  if (Number(digitEntry)>36) digitEntry=value;
  change(()=>editor!.setFret(Number(digitEntry)));
}
function playbackUpdate(state: PlaybackState) {
  const el = document.querySelector<HTMLButtonElement>('[data-action="play"]');
  if (el) { el.textContent=state.playing?'Ⅱ':'▶'; el.setAttribute('aria-label',t(state.playing?'pause':'play')); }
  document.querySelectorAll('.bar-slot.playing').forEach(e=>e.classList.remove('playing'));
  if (state.playing && state.barId) slot(state.barId)?.classList.add('playing');
  document.querySelectorAll<SVGElement>('.playhead.active').forEach(e=>e.classList.remove('active'));
  if(state.playing&&state.barId)slot(state.barId)?.querySelectorAll<SVGElement>('[data-playing-beat]').forEach(e=>e.classList.toggle('active',e.dataset.playingBeat===state.beatId));
  const seek = document.querySelector<HTMLInputElement>('#seek');
  if (seek && timeline) seek.value=String(state.position/timeline.duration*1000);
  readback();
}
async function play(fromHere=false) {
  if (!score || !editor) return;
  const serial=++playSerial, ownVersion=version;
  const speed=Number(document.querySelector<HTMLSelectElement>('#speed')?.value??1);
  const loop=document.querySelector<HTMLInputElement>('#loop')?.checked??false;
  const range=loop?{startBar:Number(document.querySelector<HTMLInputElement>('#start-bar')!.value)-1,endBar:Number(document.querySelector<HTMLInputElement>('#end-bar')!.value)-1}:undefined;
  const key=JSON.stringify({version,speed,range});
  try {
    if (!timeline || timelineKey!==key) {
      const fresh=await playerWorker.build(score,version,speed,range);
      if (serial!==playSerial || ownVersion!==version) return;
      timeline=fresh; timelineKey=key;
    }
    const position=editor.selection;
    const beatId=score.bars.find(b=>b.id===position.barId)?.beats.find(b=>b.startTick===position.tick)?.id;
    const start=fromHere ? timeline.beats.find(b=>b.beatId===beatId)?.time??0 : transport.position;
    await transport.play(timeline,start>=timeline.duration?0:start,loop); readback();
  } catch(error) { if (serial===playSerial) showError(error); }
}
function download(name: string, text: string) {
  const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
  const link=document.createElement('a'); link.href=url; link.download=name; link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function exportScore() {
  if (!score) return; const ownVersion=version;
  try { const reply=await worker.request({kind:'export',score}); if(ownVersion===version) download(score!.title+'.atex',reply.result as string); }
  catch(error) { showError(error); }
}
function bindControls() {
  document.querySelector('#import-file')?.addEventListener('change',event=>{
    const file=(event.target as HTMLInputElement).files?.[0]; if(file) void importFile(file);
  });
  document.querySelector('#restore-file')?.addEventListener('change',async event=>{
    const file=(event.target as HTMLInputElement).files?.[0]; if(!file)return;
    try { if (!save()) return; repo.restore(await file.text()); clearError(); library(); } catch(error){showError(error);}
  });
  document.querySelector('#speed')?.addEventListener('change',()=>{const running=transport.state.playing;stop();timeline=undefined;if(running)void play();});
  document.querySelector('#seek')?.addEventListener('input',event=>{
    playSerial++;playerWorker.cancel();
    if(timeline)void transport.seek(Number((event.target as HTMLInputElement).value)/1000*timeline.duration).catch(showError);
  });
}
async function importFile(file: File) {
  if (!save()) return;
  pendingFile=file; stop();const ownVersion=++version;worker.setVersion(version);
  try {
    const reply=await worker.request({kind:'import',data:new Uint8Array(await file.arrayBuffer()),name:file.name});
    if(ownVersion!==version)return;
    const imported=reply.result as TabScore,key=crypto.randomUUID();
    repo.save(key,imported);pendingFile=undefined;await open(key,imported);
  }catch(error){if(ownVersion===version)showError(error);}
}
function settings() {
  const dialog=document.querySelector<HTMLDialogElement>('#settings-dialog');if(!dialog)return;
  const d=prefs.display;
  const check=(side:'left'|'right',key:'tab'|'string'|'pitch',label:string)=>'<label><input type="checkbox" data-label="'+side+'.'+key+'" '+((d[side] as unknown as Record<string,boolean>)[key]?'checked':'')+'>'+t(label)+'</label>';
  dialog.innerHTML='<header><h2>'+t('settings')+'</h2>'+button('close-dialog','close','×')+'</header><label class="setting-row">'+t('language')+'<select id="language"><option value="zh" '+(getLocale()==='zh'?'selected':'')+'>中文</option><option value="en" '+(getLocale()==='en'?'selected':'')+'>English</option></select></label><fieldset><legend>'+t('leftLabels')+'</legend>'+check('left','tab','TAB')+check('left','string','stringNumber')+check('left','pitch','pitch')+'</fieldset><fieldset><legend>'+t('rightLabels')+'</legend>'+check('right','string','stringNumber')+check('right','pitch','pitch')+'</fieldset><label class="setting-row">'+t('lineWeight')+'<select id="weight"><option value="uniform" '+(d.lineWeight==='uniform'?'selected':'')+'>'+t('uniform')+'</option><option value="graded" '+(d.lineWeight==='graded'?'selected':'')+'>'+t('graded')+'</option></select></label><label class="setting-row">'+t('size')+'<input id="scale" type="range" min=".7" max="1.6" step=".1" value="'+d.scale+'"></label><label class="setting-row">'+t('spacing')+'<input id="spacing" type="range" min="14" max="26" step="1" value="'+d.stringGap+'"></label><div class="settings-actions">'+(score?(builtins.find(item=>item.id===id)?.previewUrl?button('source-preview','sourcePreview'):'')+button('export','export')+button('copy-bar','copyBar')+button('add-bar','addBar')+button('delete-beat','deleteBeat'):'')+button('backup','backup')+button('import','import')+button('restore','restore')+'</div><p class="small-note">'+t('backupHelp')+'</p><p class="small-note">'+t('install')+'</p>';
  dialog.oninput=event=>{
    const input=event.target as HTMLInputElement;
    if(input.id==='language'){
      prefs.locale=input.value as 'zh'|'en';setLocale(prefs.locale);
      try{savePreferences(prefs);}catch(error){showError(error);}
      if(score)render();else library();settings();return;
    }
    if(input.dataset.label){const[side,key]=input.dataset.label.split('.') as ['left'|'right','string'|'pitch'];(d[side] as unknown as Record<string,boolean>)[key]=input.checked;}
    if(input.id==='weight')d.lineWeight=input.value as 'uniform'|'graded';
    if(input.id==='scale')d.scale=Number(input.value);
    if(input.id==='spacing')d.stringGap=Number(input.value);
    try{savePreferences(prefs);}catch(error){showError(error);}
    void relayout();readback();
  };
  dialog.showModal();
}
function newScore() {
  const dialog=document.querySelector<HTMLDialogElement>('#new-dialog')!;
  dialog.innerHTML='<form><header><h2>'+t('newScore')+'</h2>'+button('close-dialog','close','×')+'</header><label>'+t('title')+'<input id="new-title" required value="'+esc(t('untitled'))+'"></label><button id="create-score">'+t('newScore')+'</button></form>';
  dialog.querySelector('form')!.addEventListener('submit',event=>{
    event.preventDefault();const name=(dialog.querySelector('#new-title') as HTMLInputElement).value.trim();if(!name)return;
    const created:TabScore={schemaVersion:1,title:name,tempo:60,tuning:[...STANDARD_TUNING],bars:[{id:crypto.randomUUID(),meter:[4,4],tempo:60,key:0,minor:false,beats:[{id:crypto.randomUUID(),startTick:0,duration:1,dots:0,notes:[]}]}]};
    const key=crypto.randomUUID();
    try{repo.save(key,created);dialog.close();void open(key,created).then(()=>{editing=true;render();});}catch(error){showError(error);}
  });
  dialog.showModal();
}
root.addEventListener('pointerdown',event=>{
  const svg=(event.target as Element).closest<SVGSVGElement>('.tab-bar');if(!svg||!editor)return;
  const key=svg.closest<HTMLElement>('.bar-slot')!.dataset.bar!,layout=layouts.get(key)!;
  const rect=svg.getBoundingClientRect(),start=performance.now(),previous=editor.selection;
  editor.select(locate(layout,(event.clientX-rect.left)/rect.width*layout.width,(event.clientY-rect.top)/rect.height*layout.height,editing?gridTicks:undefined));
  digitEntry='';digitTime=0;if(previous.barId!==key)draw(previous.barId);draw(key);tools();selectionMs=performance.now()-start;readback();
});
root.addEventListener('click',event=>{
  const target=(event.target as Element).closest<HTMLElement>('button');if(!target)return;
  if(target.dataset.song){void open(target.dataset.song);return;}
  if(target.dataset.digit){digit(target.dataset.digit);return;}
  if(target.dataset.duration){change(()=>editor!.setDuration(Number(target.dataset.duration) as Duration));return;}
  const action=target.dataset.action;
  const commands:Record<string,()=>void>={undo:()=>editor!.undo(),redo:()=>editor!.redo(),dot:()=>editor!.toggleDot(),tie:()=>editor!.toggleTie(),rest:()=>editor!.setRest(),insert:()=>editor!.insertBeat(),'delete-note':()=>editor!.deleteNote(),'delete-beat':()=>editor!.deleteBeat(),'copy-bar':()=>editor!.copyBar(),'add-bar':()=>editor!.addBar()};
  if(action&&commands[action]){document.querySelector<HTMLDialogElement>('dialog[open]')?.close();change(commands[action]);return;}
  switch(action){
    case 'back':version++;worker.setVersion(version);library();break;
    case 'mode':stop();editing=!editing;render();break;
    case 'settings':settings();break;
    case 'close-dialog':document.querySelector<HTMLDialogElement>('dialog[open]')?.close();break;
    case 'new':newScore();break;
    case 'play':if(transport.state.playing){playSerial++;playerWorker.cancel();transport.pause();}else void play();break;
    case 'stop':stop();break;
    case 'practice':{const el=document.querySelector<HTMLElement>('#practice-panel')!;el.hidden=!el.hidden;break;}
    case 'from-here':stop();void play(true);break;
    case 'dismiss':clearError();break;
    case 'retry':worker.retry();playerWorker.retry();if(pendingFile)void importFile(pendingFile);else if(score){save();void relayout();}else if(id)void open(id);break;
    case 'export':void exportScore();break;
    case 'source-preview': {
      const source = builtins.find(item => item.id === id);
      const dialog = document.querySelector<HTMLDialogElement>('#settings-dialog');
      if (source?.previewUrl && dialog) {
        if (dialog.open) dialog.close();
        dialog.innerHTML = '<header><h2>' + t('sourcePreview') + '</h2>' + button('close-dialog','close','×') + '</header><img class="source-preview" src="' + esc(source.previewUrl) + '" alt="' + esc(source.title) + '">';
        dialog.showModal();
      }
      break;
    }
    case 'backup':try{if(save())download('guitar-library.json',repo.backup());}catch(error){showError(error);}break;
    case 'import':document.querySelector<HTMLDialogElement>('dialog[open]')?.close();document.querySelector<HTMLInputElement>('#import-file')?.click();break;
    case 'restore':document.querySelector<HTMLDialogElement>('dialog[open]')?.close();document.querySelector<HTMLInputElement>('#restore-file')?.click();break;
  }
});
window.addEventListener('keydown',event=>{
  if(!editor||!score||!editing||(event.target as Element).matches('input,select,textarea'))return;
  if(event.ctrlKey||event.metaKey){if(event.key.toLowerCase()==='z'){event.preventDefault();change(()=>event.shiftKey?editor!.redo():editor!.undo());}else if(event.key.toLowerCase()==='y'){event.preventDefault();change(()=>editor!.redo());}return;}
  if(/^\d$/.test(event.key)){event.preventDefault();digit(event.key);}
  if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();change(()=>editor!.deleteNote());}
  if(event.key.startsWith('Arrow')){
    event.preventDefault();const position=editor.selection,bar=score.bars.find(b=>b.id===position.barId)!;
    if(event.key==='ArrowUp')position.string=Math.max(1,position.string-1);
    if(event.key==='ArrowDown')position.string=Math.min(6,position.string+1);
    if(event.key==='ArrowLeft')position.tick=Math.max(0,position.tick-gridTicks);
    if(event.key==='ArrowRight')position.tick=Math.min(barTicks(bar)-gridTicks,position.tick+gridTicks);
    editor.select(position);digitEntry='';digitTime=0;draw(position.barId);tools();readback();
  }
});
window.addEventListener('pagehide',()=>{save();stop();});
library();
if(import.meta.env.PROD&&'serviceWorker'in navigator)void navigator.serviceWorker.register('/sw.js').catch(()=>{});
