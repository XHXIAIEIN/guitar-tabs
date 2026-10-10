import test from 'node:test';
import assert from 'node:assert/strict';
import { importer, exporter } from '@coderline/alphatab';
import { importExternal } from '../src/formats/external.ts';
import { musicalContent } from '../src/score/model.ts';
import { fromAlphaScore } from '../src/formats/alphatex.ts';

const xml = `<?xml version="1.0" encoding="utf-8"?>
<score-partwise version="4.0"><work><work-title>XML fixture</work-title></work><part-list><score-part id="P1"><part-name>Guitar</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>4</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>TAB</sign><line>5</line></clef><staff-details><staff-lines>6</staff-lines>${['E2','A2','D3','G3','B3','E4'].map((n,i)=>`<staff-tuning line="${i+1}"><tuning-step>${n[0]}</tuning-step><tuning-octave>${n[1]}</tuning-octave></staff-tuning>`).join('')}</staff-details></attributes><direction><sound tempo="60"/></direction><note><pitch><step>E</step><octave>4</octave></pitch><duration>16</duration><type>whole</type><notations><technical><string>1</string><fret>0</fret></technical></notations></note></measure></part></score-partwise>`;
test('plain MusicXML with explicit six-string positions imports through alphaTab', () => {
  const score = importExternal(new TextEncoder().encode(xml), 'sample.musicxml');
  assert.equal(score.title, 'XML fixture');
  assert.equal(score.bars.length, 1);
  assert.equal(score.bars[0].beats[0].notes[0].string, 1);
  assert.equal(score.bars[0].beats[0].notes[0].fret, 0);
});
test('MusicXML missing string and fret is rejected before assignment', () => {
  assert.throws(() => importExternal(new TextEncoder().encode(xml.replace('<string>1</string><fret>0</fret>', '')), 'sample.xml'));
});
test('Guitar Pro 7 fixture preserves supported musical content', () => {
  const source = importer.ScoreLoader.loadAlphaTex(String.raw`\title "GP fixture" \tempo 60 \ts (4 4) (0.1 12.2).2 (0.1{t} 12.2{t}).4 r.4`);
  const data = new exporter.Gp7Exporter().export(source);
  assert.deepEqual(musicalContent(importExternal(data, 'sample.gp')), musicalContent(fromAlphaScore(source)));
});
