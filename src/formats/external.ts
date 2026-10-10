import { importer, Settings } from '@coderline/alphatab';
import { fromAlphaScore, parseAlphaTex } from './alphatex';
import { ScoreError } from '../score/validate';
import { t } from '../i18n';
export function importExternal(data: Uint8Array, name: string) {
  const extension = name.split('.').at(-1)?.toLowerCase();
  if (extension === 'atex') return parseAlphaTex(new TextDecoder().decode(data));
  if (!['xml', 'musicxml', 'gp', 'gp3', 'gp4', 'gp5', 'gpx', 'gp7'].includes(extension ?? '')) throw new ScoreError([t('format.extension')]);
  let xmlTitle: string | undefined;
  if (extension === 'xml' || extension === 'musicxml') {
    const text = new TextDecoder().decode(data);
    const title = /<work-title\b[^>]*>([^<]*)<\/work-title>/i.exec(text)?.[1];
    if (title !== undefined) xmlTitle = title.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity: string) => {
      if (entity.startsWith('#')) return String.fromCodePoint(parseInt(entity.slice(entity[1].toLowerCase() === 'x' ? 2 : 1), entity[1].toLowerCase() === 'x' ? 16 : 10));
      return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" } as Record<string, string>)[entity.toLowerCase()];
    });
    const pitched = [...text.matchAll(/<note\b[^>]*>([\s\S]*?)<\/note>/gi)].filter(note => /<pitch\b/i.test(note[1]));
    if (!pitched.length || pitched.some(note => !/<string\b[^>]*>\s*[1-6]\s*<\/string>/i.test(note[1]) || !/<fret\b[^>]*>\s*\d+\s*<\/fret>/i.test(note[1]))) throw new ScoreError([t('format.xmlPositions')]);
  }
  const source = importer.ScoreLoader.loadScoreFromBytes(data, new Settings());
  // The MusicXML importer replaces ordinary title spaces with non-breaking spaces.
  if (xmlTitle !== undefined) source.title = xmlTitle;
  return fromAlphaScore(source);
}
