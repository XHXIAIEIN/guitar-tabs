import { t } from '../i18n';
import type { EditorSession } from '../editor/session';
import type { Duration, TabScore } from '../score/model';
import { button } from './controls';
const durations: { value: Duration; label: string; symbol: string }[] = [
  {value:1,label:'whole',symbol:'𝅝'}, {value:2,label:'half',symbol:'𝅗𝅥'}, {value:4,label:'quarter',symbol:'♩'},
  {value:8,label:'eighth',symbol:'♪'}, {value:16,label:'sixteenth',symbol:'♬'}
];
export function editorTools(score: TabScore, editor: EditorSession, gridTicks: number): string {
  const position=editor.selection, bar=score.bars.find(b=>b.id===position.barId)!;
  const beat=bar.beats.find(b=>b.startTick===position.tick);
  const fret=beat?.notes.find(n=>n.string===position.string)?.fret;
  return `<div class="input-top"><span>${t('position',{bar:score.bars.indexOf(bar)+1,beat:position.tick/(3840/bar.meter[1])+1,string:position.string})}</span><div>${button('undo','undo',undefined,editor.canUndo?'':'disabled')}${button('redo','redo',undefined,editor.canRedo?'':'disabled')}</div></div><div class="durations">${durations.map(d=>`<button data-duration="${d.value}" class="${beat?.duration===d.value?'active':''}" aria-label="${t(d.label)}" aria-pressed="${beat?.duration===d.value}">${d.symbol}</button>`).join('')}${button('dot','dot','·')}${button('tie','tie','⌒')}${button('rest','rest')}</div><div class="fret-input"><label class="fret-field"><input id="fret" type="number" min="0" max="36" inputmode="numeric" aria-label="${t('fret')}" value="${fret??''}" placeholder="—"><span>${t('fret')}</span></label><select id="grid" aria-label="${t('beatGrid')}">${[4,8,16].map(d=>`<option value="${3840/d}" ${gridTicks===3840/d?'selected':''}>1/${d}</option>`).join('')}</select>${button('insert','insert')}${button('delete-note','deleteNote')}</div><div class="keypad">${Array.from({length:10},(_,n)=>`<button data-digit="${n}">${n}</button>`).join('')}</div>`;
}
