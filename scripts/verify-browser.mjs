import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, unlink, rmdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const out = new URL('../.tmp/browser/',import.meta.url), fixtures = new URL('../scores/__browser-fixture/',import.meta.url);
const production=process.env.PRODUCTION==='1', created=[];
await mkdir(out,{recursive:true});
if(!production){
  await mkdir(new URL('Group/Bundle/',fixtures),{recursive:true});await mkdir(new URL('Other/',fixtures),{recursive:true});
  for(const path of ['Group/song.atex','Group/song.svg','Group/Bundle/notes.atex','Group/Bundle/preview.svg','Other/song.atex']){
    const text=path.endsWith('.svg')?'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40"><text x="5" y="20">Preview</text></svg>':'\\title "'+(path.includes('Bundle')?'Bundle title':path.startsWith('Other')?'Other title':'Grouped title')+'" \\tempo 60 \\ts (4 4) 0.1.1 |';
    const url=new URL(path,fixtures);await writeFile(url,text,{flag:'wx'});created.push(url);
  }
}
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio']});
const context=await browser.newContext({viewport:{width:390,height:844},locale:'en-US',hasTouch:true,isMobile:true});
const page=await context.newPage(), errors=[], workers=[], report={};
page.on('pageerror',e=>errors.push(e.message));page.on('worker',w=>workers.push(w.url()));
const song=stem=>page.locator('[data-song="'+stem+'"],[data-song$="/'+stem+'"]');
const state=()=>page.locator('#verification-state').textContent().then(JSON.parse);
const a=name=>page.locator('[data-action="'+name+'"]:visible').first();
const ready=()=>page.waitForFunction(()=>document.querySelector('.tab-bar')&&JSON.parse(document.querySelector('#verification-state').textContent).score,undefined,{timeout:15000});
const close=async()=>{if(await page.locator('dialog[open]').count())await page.locator('dialog[open] [data-action="close-dialog"]').click();};
const upload=async(name,text)=>{await page.locator('#import-file').setInputFiles({name,mimeType:'text/plain',buffer:Buffer.from(text)});await ready();};
try{
  await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5193');await song('twinkle-star').waitFor();const twinkleId=await song('twinkle-star').getAttribute('data-song');
  assert.equal((await state()).locale,'en');assert.equal(await page.locator('h1').textContent(),'Guitar songbook');
  if(!production){
    assert.ok((await page.locator('.group-title').allTextContents()).includes('__browser-fixture/Group'));
    await page.locator('[data-song="__browser-fixture/Group/Bundle/notes"]').tap();await ready();assert.equal(await page.locator('h1').textContent(),'Bundle title');
    await a('settings').click();await a('source-preview').click();await page.locator('.source-preview').waitFor();
    await page.waitForFunction(()=>document.querySelector('.source-preview').naturalWidth>0);await close();await a('back').click();
    await page.locator('[data-song="__browser-fixture/Other/song"]').click();await ready();assert.equal(await page.locator('h1').textContent(),'Other title');await a('back').click();
    report.folders={group:true,bundleWithDifferentNames:true,duplicateBasenames:true};
  }
  await song('twinkle-star').tap();await ready();assert.equal((await state()).notationWorker.worker,true);
  await page.screenshot({path:fileURLToPath(new URL('verify-browser__mobile-read.png',out))});
  await a('mode').tap();await page.locator('.fret').first().tap();assert.equal((await state()).selection.string,3);
  await page.locator('#fret').fill('12');await page.locator('#fret').press('Tab');
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#verification-state').textContent).score.bars[0].beats[0].notes[0].fret===12);
  await a('undo').tap();assert.equal((await state()).score.bars[0].beats[0].notes[0].fret,0);
  await a('redo').tap();assert.equal((await state()).score.bars[0].beats[0].notes[0].fret,12);
  await page.locator('#sheet').focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('7');
  assert.ok((await state()).score.bars[0].beats[0].notes.some(n=>n.string===4&&n.fret===7));
  await page.keyboard.press('Delete');assert.equal((await state()).score.bars[0].beats[0].notes.length,1);
  await page.locator('.fret').first().tap();await a('rest').tap();assert.equal((await state()).score.bars[0].beats[0].notes.length,0);await a('undo').tap();
  await page.locator('[data-duration="8"]').tap();assert.equal((await state()).score.bars[0].beats[0].duration,8);
  await a('dot').tap();assert.equal((await state()).score.bars[0].beats[0].dots,1);await a('undo').tap();await a('undo').tap();
  await a('insert').tap();assert.equal((await state()).score.bars[0].beats.length,5);await a('undo').tap();
  await page.waitForFunction(()=>!JSON.parse(document.querySelector('#verification-state').textContent).saving);
  const persisted=(await state()).score;report.selectionMs=(await state()).selectionMs;assert.ok(report.selectionMs<100);
  await page.reload();await song('twinkle-star').tap();await ready();assert.deepEqual((await state()).score,persisted);
  await a('settings').click();const exported=page.waitForEvent('download');await a('export').click();const tex=await readFile(await(await exported).path(),'utf8');
  const backed=page.waitForEvent('download');await a('backup').click();const backup=await readFile(await(await backed).path(),'utf8');await close();
  await upload('roundtrip.atex',tex);await page.waitForFunction(key=>JSON.parse(document.querySelector('#verification-state').textContent).id!==key,twinkleId);assert.equal((await state()).score.bars[0].beats[0].notes[0].fret,12);
  await page.locator('#restore-file').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(backup)});
  await song('twinkle-star').waitFor();await song('twinkle-star').tap();await ready();assert.deepEqual((await state()).score,persisted);
  await page.locator('#import-file').setInputFiles({name:'invalid.atex',mimeType:'text/plain',buffer:Buffer.from('\\ts (4 4) 999.1.1')});await page.locator('#error').waitFor({state:'visible'});assert.deepEqual((await state()).score,persisted);await a('dismiss').click();
  await a('settings').click();await page.locator('#language').selectOption('zh');assert.equal((await state()).locale,'zh');
  await page.locator('#scale').fill('1.2');await page.locator('#spacing').fill('22');await page.locator('[data-label="right.pitch"]').check();await close();
  await page.reload();await song('twinkle-star').click();await ready();assert.equal((await state()).locale,'zh');assert.equal((await state()).display.stringGap,22);
  await a('settings').click();await page.locator('#language').selectOption('en');await page.locator('#scale').fill('1');await page.locator('#spacing').fill('18');await close();
  await a('play').tap();await page.waitForFunction(()=>JSON.parse(document.querySelector('#verification-state').textContent).playback.playing);await page.waitForTimeout(150);
  assert.ok((await state()).audio.queuedVoices>0);assert.equal((await state()).playbackWorker.worker,true);assert.ok(await page.locator('.playhead.active').count()>0);
  await a('play').tap();assert.equal((await state()).audio.queuedVoices,0);await a('play').tap();await page.waitForFunction(()=>JSON.parse(document.querySelector('#verification-state').textContent).playback.playing);
  await a('stop').tap();assert.equal((await state()).audio.queuedVoices,0);
  await a('practice').tap();await page.locator('#end-bar').fill('1');await page.locator('#loop').check();await page.locator('#speed').selectOption('1.5');await a('from-here').tap();
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#verification-state').textContent).playback.playing);await page.locator('#seek').fill('850');await page.waitForTimeout(800);assert.ok((await state()).playback.position<2.67);await a('stop').tap();
  await a('play').tap();await page.waitForFunction(()=>JSON.parse(document.querySelector('#verification-state').textContent).playback.playing);await a('back').tap();assert.equal((await state()).audio.queuedVoices,0);
  await song('little-bee').tap();await ready();await a('play').tap();await page.waitForFunction(()=>JSON.parse(document.querySelector('#verification-state').textContent).playback.playing);
  await a('mode').tap();await page.locator('.fret').first().tap();await page.locator('[data-digit="5"]').tap();assert.equal((await state()).audio.queuedVoices,0);
  report.playback={realWorker:true,highlight:true,pauseStopSeekLoop:true,switchAndEditCancel:true};
  await a('back').click();await a('new').click();await page.locator('#new-title').fill('New fixture');await page.locator('#create-score').click();await ready();assert.equal((await state()).editing,true);
  await page.locator('[data-digit="9"]').tap();assert.equal((await state()).score.bars[0].beats[0].notes[0].fret,9);
  const long='\\title "Long fixture" \\tempo 300 \\ts (4 4) '+Array.from({length:200},()=> '0.1.4 2.2.4 3.3.4 4.4.4 |').join(' ');
  const start=Date.now();await upload('long.atex',long);await page.waitForFunction(()=>JSON.parse(document.querySelector('#verification-state').textContent).score?.bars.length===200);
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#verification-state').textContent).renderedBars>0);
  assert.ok((await state()).renderedBars<30);report.longScore={elapsedMs:Date.now()-start,renderedBars:(await state()).renderedBars,bars:200};
  await a('play').tap();await page.waitForFunction(()=>JSON.parse(document.querySelector('#verification-state').textContent).playback.playing);await page.locator('#sheet').evaluate(el=>el.scrollTop=el.scrollHeight/2);await page.waitForTimeout(150);
  assert.ok((await state()).renderedBars<30);await a('settings').click();await page.locator('#scale').fill('1.4');await close();await page.waitForTimeout(150);assert.ok((await state()).renderedBars<30);await a('stop').tap();
  await a('mode').tap();await page.locator('.tab-bar').first().tap({position:{x:45,y:60}});report.longScore.selectionMs=(await state()).selectionMs;assert.ok(report.longScore.selectionMs<100);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:fileURLToPath(new URL('verify-browser__mobile-edit.png',out))});
  if(!production){
    report.recordedAudio=await page.evaluate(async()=>{const {scheduleReference}=await import('/src/playback/audio/reference.ts');const audio=new OfflineAudioContext(1,44100,44100);scheduleReference(audio,69,0,.5,false,()=>{});const samples=(await audio.startRendering()).getChannelData(0);let energy=0,tail=0;for(let i=0;i<samples.length;i++){energy+=samples[i]**2;if(i>30000)tail+=samples[i]**2;}return{rms:Math.sqrt(energy/samples.length),tail};});
    assert.ok(report.recordedAudio.rms>.005);assert.equal(report.recordedAudio.tail,0);
    report.staleWorker=await page.evaluate(async()=>{const{ScoreWorkerClient,StaleTaskError}=await import('/src/workers/client.ts');const w=new ScoreWorkerClient();w.setVersion(1);const old=w.request({kind:'parse',text:'0.1.1'}).catch(e=>e instanceof StaleTaskError);w.setVersion(2);const fresh=await w.request({kind:'parse',text:'2.1.1'});const cancelled=await old;w.dispose();return{cancelled,fret:fresh.result.bars[0].beats[0].notes[0].fret,worker:fresh.worker};});
    assert.deepEqual(report.staleWorker,{cancelled:true,fret:2,worker:true});
  }else{
    await page.waitForFunction(()=>navigator.serviceWorker.controller,undefined,{timeout:15000});await page.waitForTimeout(300);await context.setOffline(true);await page.reload();await song('twinkle-star').click();await ready();assert.equal((await state()).score.bars.length,12);report.offline=true;
  }
  assert.deepEqual(errors,[]);report.errors=errors;report.workers=workers;report.passed=true;
  await writeFile(new URL('verify-browser__'+(production?'production':'report')+'.json',out),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(error){
  console.error(JSON.stringify({errors,body:await page.locator('body').innerText(),url:page.url()}));
  await page.screenshot({path:fileURLToPath(new URL('verify-browser__failure.png',out))});throw error;
}finally{
  await browser.close();for(const path of created)await unlink(path);
  if(created.length)for(const folder of ['Group/Bundle/','Group/','Other/',''])await rmdir(new URL(folder,fixtures));
}
