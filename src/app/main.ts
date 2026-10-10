import '../ui/styles.css';
import { CANDIDATES } from '../settings/display';
import { ScoreWorkerClient } from '../workers/client';
import { sample } from '../library/builtins';
import { renderBar } from '../notation/svg';
import type { TabScore } from '../score/model';
import type { BarLayout } from '../notation/layout';

const root = document.querySelector<HTMLDivElement>('#app')!;
root.innerHTML = `<main class="comparison"><header class="intro"><h1>吉他曲谱本</h1><p>两版手机界面候选 · 同一份六弦谱</p></header><div class="candidates"></div><details class="format-lab"><summary>曲谱格式验证</summary><label for="source">alphaTex</label><textarea id="source" spellcheck="false"></textarea><div class="lab-actions"><button id="parse">载入曲谱</button><button id="write" disabled>写回并重读</button><button id="retry">重试计算</button></div><output id="result" aria-live="polite">正在载入样例…</output></details></main>`;
function phone(candidate: 'a' | 'b'): string {
  const spacious = candidate === 'b';
  return `<article class="candidate" data-candidate="${candidate}"><div class="candidate-title"><h2>${candidate.toUpperCase()} · ${spacious ? '宽松练习' : '紧凑谱本'}</h2><span>静态稿</span></div><section class="phone ${candidate}"><div class="status"><span>9:41</span><span>▰ ▰ ▰</span></div><header class="score-header"><span class="back" aria-hidden="true">‹</span><h3>小星星</h3><span class="saved" aria-label="已保存">✓</span><span class="more" aria-hidden="true">···</span></header><div class="score-meta"><span>4/4</span><span>♩ = 88</span><span class="reading">阅读</span></div><div class="sheet"><div class="loading">正在载入曲谱…</div></div><div class="practice"><span class="play" aria-hidden="true">▶</span><span class="progress"><i></i></span><span class="speed">0.8×</span><span class="loop" aria-hidden="true">↻</span></div><div class="input-tools"><div class="input-top"><span>第 2 小节 · 第 1 拍 · 1 弦</span><span class="history" aria-hidden="true">↶　↷</span></div><div class="durations"><span>𝅝</span><span>𝅗𝅥</span><span class="active">♩</span><span>♪</span><span>♬</span><span>·</span><span>⌒</span><span>休止</span></div><div class="fret-input"><span class="fret-current">5</span><span class="insert">插入</span><span class="delete">⌫</span></div><div class="keypad">${Array.from({ length: 10 }, (_, n) => `<span>${n}</span>`).join('')}</div></div><div class="home-indicator"></div></section><details class="settings-preview"><summary>显示设置预览</summary><div class="settings-panel"><h3>谱面显示</h3><div><span>左侧标签</span><b>弦号</b></div><div><span>右侧标签</span><b>${spacious ? '隐藏' : '音名'}</b></div><div><span>弦线粗细</span><b>${spacious ? '按弦区分' : '统一细线'}</b></div><div><span>谱面大小</span><b>− ━━━●━━ ＋</b></div></div></details></article>`;
}
document.querySelector('.candidates')!.innerHTML = phone('a') + phone('b');
const client = new ScoreWorkerClient();
const input = document.querySelector<HTMLTextAreaElement>('#source')!;
const output = document.querySelector<HTMLOutputElement>('#result')!;
const write = document.querySelector<HTMLButtonElement>('#write')!;
input.value = sample.text;
let current: TabScore | undefined;
let version = 0;
let evidence: Record<string, unknown> = {};
const stateElement = document.createElement('script');
stateElement.type = 'application/json'; stateElement.id = 'verification-state'; root.append(stateElement);
function setEvidence(state: Record<string, unknown>) { evidence = { ...evidence, ...state }; stateElement.textContent = JSON.stringify(evidence); }
async function load(): Promise<void> {
  const requestVersion = ++version;
  client.setVersion(requestVersion);
  write.disabled = true;
  current = undefined;
  output.value = '正在读取曲谱…';
  try {
    const reply = await client.request({ kind: 'parse', text: input.value });
    if (requestVersion !== version) return;
    current = reply.result as TabScore;
    setEvidence({ worker: reply.worker, version, title: current.title, score: current, parseMs: reply.elapsedMs, error: null });
    const score = current;
    for (const candidate of ['a', 'b'] as const) {
      const settings = CANDIDATES[candidate];
      const layoutReply = await client.request({ kind: 'layout', score, width: 354, settings, bars: score.bars.slice(0, 3).map(bar => bar.id) });
      if (requestVersion !== version) return;
      const layouts = layoutReply.result as BarLayout[];
      document.querySelector(`[data-candidate="${candidate}"] .sheet`)!.innerHTML = score.bars.slice(0, 3).map((bar, i) => renderBar(bar, layouts[i], score.tuning, settings, i, true, i === 1 ? { tick: 0, string: 1 } : undefined)).join('');
    }
    output.value = `已读取「${score.title}」· ${score.bars.length} 小节 · 计算在线程中完成`;
    write.disabled = false;
  } catch (error) {
    if (requestVersion !== version) return;
    const message = error instanceof Error ? error.message : String(error);
    output.value = message;
    setEvidence({ error: message });
  }
}
document.querySelector('#parse')!.addEventListener('click', () => void load());
document.querySelector('#retry')!.addEventListener('click', () => { client.retry(); void load(); });
write.addEventListener('click', async () => {
  if (!current) return;
  const requestVersion = version;
  const score = current;
  write.disabled = true;
  output.value = '正在写回曲谱…';
  try {
    const reply = await client.request({ kind: 'export', score });
    if (requestVersion !== version) return;
    input.value = reply.result as string;
    setEvidence({ exportWorker: reply.worker, exportMs: reply.elapsedMs });
    await load();
  } catch (error) {
    if (requestVersion !== version) return;
    output.value = error instanceof Error ? error.message : String(error);
    write.disabled = false;
  }
});
window.addEventListener('pagehide', () => client.dispose());
void load();
