export interface SourceFile { path: string; text: string }
export interface CatalogEntry {
  id: string;
  path: string;
  title: string;
  text: string;
  group: string;
  previewPath?: string;
}
const parent = (path: string): string => path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
const base = (path: string): string => path.split('/').at(-1)!;
export function buildCatalog(files: SourceFile[], previews: string[]): CatalogEntry[] {
  const paths = files.map(file => file.path.replace(/\\/g, '/'));
  const svgPaths = previews.map(path => path.replace(/\\/g, '/'));
  return files.map((file, index) => {
    const path = paths[index], folder = parent(path);
    const siblings = paths.filter(path => parent(path) === folder);
    const images = svgPaths.filter(path => parent(path) === folder);
    const sameName = path.replace(/\.atex$/i, '.svg');
    const previewPath = images.includes(sameName) ? sameName : siblings.length === 1 && images.length === 1 ? images[0] : undefined;
    const bundle = !!folder && siblings.length === 1 && images.length > 0;
    const group = bundle ? parent(folder) : folder;
    let title = bundle ? base(folder) : base(path).replace(/\.atex$/i, '');
    const literal = /^[ \t]*\\title\s+("(?:[^"\\]|\\.)*")/m.exec(file.text)?.[1];
    if (literal) { try { title = JSON.parse(literal); } catch { /* Keep the file or folder title for the library. */ } }
    return { id: path.replace(/\.atex$/i, ''), path, title, text: file.text, group, previewPath };
  }).sort((a, b) => a.group.localeCompare(b.group) || a.path.localeCompare(b.path));
}
