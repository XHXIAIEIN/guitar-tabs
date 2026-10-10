const sources = import.meta.glob('../../scores/*.atex', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
export const builtins = Object.entries(sources).map(([path, text]) => ({
  id: path.split('/').at(-1)!.replace('.atex', ''), text,
  title: /\\title\s+"([^"]+)"/.exec(text)?.[1] ?? '未命名曲谱',
  source: '已核对谱面', tutorialChecked: true
}));
export const sample = builtins.find(score => score.id === 'twinkle-star')!;
