import { Settings, importer, exporter, model } from '@coderline/alphatab';
import { beatTicks, type TabScore, type Duration } from '../score/model';
import { ScoreError, validateScore } from '../score/validate';

function readAlpha(text: string): model.Score {
  const reader = new importer.AlphaTexImporter();
  reader.logErrors = false;
  reader.initFromString(text, new Settings());
  const score = reader.readScore();
  const errors = [reader.lexerDiagnostics, reader.parserDiagnostics, reader.semanticDiagnostics]
    .flatMap(bag => bag.items).filter(item => item.severity === 2)
    .map(item => `第 ${item.start?.line ?? '?'} 行：${item.message}`);
  if (errors.length) throw new ScoreError(errors);
  const expectedTies = (reader.scoreNode?.bars ?? []).flatMap(bar => bar.beats.flatMap(beat => {
    const notes = (beat.notes?.notes ?? []).filter(note =>
      ('text' in note.noteValue && note.noteValue.text === '-') ||
      note.noteEffects?.properties.some(effect => ['t', '-'].includes(effect.property.text.toLowerCase())));
    return Array.from({ length: beat.beatMultiplierValue?.value ?? 1 }, () => notes).flat();
  }));
  const actualTies = score.tracks.flatMap(track => track.staves.flatMap(staff => staff.bars.flatMap(bar => bar.voices.flatMap(voice => voice.beats.flatMap(beat => beat.notes.filter(note => note.isTieDestination))))));
  if (expectedTies.length !== actualTies.length || expectedTies.some((note, i) => 'value' in note.noteValue && note.noteValue.value !== actualTies[i]?.fret)) throw new ScoreError(['延音需要前面的同弦同品起音。']);
  return score;
}

function assertSupported(score: model.Score): void {
  const issues: string[] = [];
  if (score.tracks.length !== 1 || score.tracks[0].staves.length !== 1) issues.push('当前支持单轨六弦谱，请先拆分轨道。');
  const staff = score.tracks[0]?.staves[0];
  if (!staff || staff.tuning.length !== 6 || staff.isPercussion) issues.push('请选择含弦号和品位的六弦谱。');
  if (staff?.capo || staff?.transpositionPitch) issues.push('变调夹或播放移调尚未支持。');
  if (score.artist || score.album || score.subTitle || score.words || score.music || score.copyright || score.instructions || score.notices || score.tab) issues.push('附加作者或曲谱说明尚未保存，请先移除这些元数据。');
  for (const [i, bar] of (staff?.bars ?? []).entries()) {
    const where = `第 ${i + 1} 小节`;
    const master = bar.masterBar;
    if (master.isRepeatStart || master.repeatCount || master.alternateEndings || master.isFreeTime || master.tripletFeel || master.section || master.syncPoints?.length) issues.push(`${where}含反复、自由拍、段落或同步标记。`);
    if (master.tempoAutomations.length > 1 || master.tempoAutomations.some(a => a.ratioPosition !== 0)) issues.push(`${where}含拍内变速。`);
    if (bar.voices.length !== 1) issues.push(`${where}含多声部。`);
    if (bar.simileMark || bar.sustainPedals.length) issues.push(`${where}含重复小节记号或踏板。`);
    for (const beat of bar.voices[0]?.beats ?? []) {
      if (beat.hasTuplet || beat.graceType || beat.hasWhammyBar || beat.fade || beat.isLegatoOrigin || beat.tap || beat.slap || beat.pop || beat.brushType || beat.pickStroke || beat.vibrato || beat.chordId || beat.text || beat.lyrics?.length || beat.fermata || beat.hasRasgueado || beat.isEmpty || beat.slashed || beat.deadSlapped || beat.tremoloPicking || beat.crescendo || beat.golpe || beat.wahPedal || beat.barreFret >= 0 || beat.dynamics !== model.DynamicValue.F || beat.ottava !== model.Ottavia.Regular || beat.overrideDisplayDuration) issues.push(`${where}含尚未支持的拍组技法、文本或空拍。`);
      for (const note of beat.notes) {
        if (!note.isStringed) issues.push(`${where}缺少弦号和品位。`);
        if (note.hasBend || note.isDead || note.isGhost || note.isPalmMute || note.isLetRing || note.isStaccato || note.isHammerPullOrigin || note.slideInType || note.slideOutType || note.harmonicType || note.vibrato || note.isTrill || note.accentuated || note.isFingering || note.ornament || note.isLeftHandTapped || note.isSlurDestination || !note.isVisible || note.durationPercent !== 1 || note.dynamics !== model.DynamicValue.F) issues.push(`${where}含尚未支持的音符技法。`);
        if (note.isTieDestination && !note.tieOrigin) issues.push(`${where}延音没有起音。`);
      }
    }
  }
  if (issues.length) throw new ScoreError([...new Set(issues)]);
}

export function fromAlphaScore(source: model.Score): TabScore {
  assertSupported(source);
  let tempo = source.tempo;
  const score: TabScore = {
    schemaVersion: 1, title: source.title || '未命名曲谱', tempo,
    tuning: [...source.tracks[0].staves[0].tuning],
    bars: source.tracks[0].staves[0].bars.map((bar, i) => {
      const master = bar.masterBar;
      tempo = master.tempoAutomation?.value ?? tempo;
      let tick = 0;
      return { id: `bar-${i}`, meter: [master.timeSignatureNumerator, master.timeSignatureDenominator],
        tempo, key: bar.keySignature, minor: bar.keySignatureType === model.KeySignatureType.Minor,
        beats: bar.voices[0].beats.map((beat, j) => {
          const result = { id: `beat-${i}-${j}`, startTick: tick, duration: beat.duration as Duration, dots: beat.dots,
            notes: beat.notes.map(note => ({ string: 7 - note.string, fret: note.fret, tie: note.isTieDestination })) };
          tick += beatTicks(result);
          return result;
        }) };
    })
  };
  validateScore(score);
  return score;
}
export function parseAlphaTex(text: string): TabScore { return fromAlphaScore(readAlpha(text)); }

const keys = ['cb', 'gb', 'db', 'ab', 'eb', 'bb', 'f', 'c', 'g', 'd', 'a', 'e', 'b', 'f#', 'c#'];
function midiText(midi: number): string {
  return ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][midi % 12] + (Math.floor(midi / 12) - 1);
}
export function exportAlphaTex(score: TabScore): string {
  validateScore(score);
  const lines = [`\\title ${JSON.stringify(score.title)}`, `\\tempo ${score.tempo}`,
    `\\tuning (${score.tuning.map(midiText).join(' ')})`];
  for (const bar of score.bars) {
    lines.push(`\\ts (${bar.meter.join(' ')}) \\tempo ${bar.tempo} \\ks ${keys[bar.key + 7]}${bar.minor ? ' minor' : ''}`);
    lines.push(bar.beats.map(beat => {
      const content = beat.notes.length ? beat.notes.map(note => `${note.fret}.${note.string}${note.tie ? '{t}' : ''}`).join(' ') : 'r';
      return `${beat.notes.length > 1 ? `(${content})` : content}.${beat.duration}${beat.dots ? `{${'d'.repeat(beat.dots)}}` : ''}`;
    }).join(' ') + ' |');
  }
  // Use the vendor exporter as the canonical writer.
  return new exporter.AlphaTexExporter().exportToString(readAlpha(lines.join('\n')));
}
