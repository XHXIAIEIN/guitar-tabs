import { buildCatalog } from './catalog';
import { zh } from '../i18n/zh';
const sources = import.meta.glob('../../scores/**/*.atex', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const previews = import.meta.glob('../../scores/**/*.svg', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
const relative = (path: string) => path.replace('../../scores/', '');
export const builtins = buildCatalog(Object.entries(sources).map(([path, text]) => ({ path: relative(path), text })), Object.keys(previews).map(relative))
  .map(entry => {
    const key = ('song.' + entry.id.split('/').at(-1)) as keyof typeof zh;
    return { ...entry, translationKey: zh[key] === entry.title ? key : undefined,
      previewUrl: entry.previewPath ? previews['../../scores/' + entry.previewPath] : undefined };
  });
