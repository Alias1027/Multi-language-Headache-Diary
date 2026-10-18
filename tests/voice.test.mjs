import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {extractVoice} from '../public/voice-parser.mjs';
import {validate,emptyVault,applyRecord,summarize} from '../server/core.mjs';
import {createApp} from '../server/main.mjs';
import {voiceProviderFromEnv,MAX_AUDIO_BYTES,readVoice,writeVoice} from '../server/voice.mjs';

test('Voice: Chinese and English give equivalent core candidates with exact source evidence',()=>{
  const zh=extractVoice('今天头痛，左侧太阳穴跳痛，疼痛6分，持续了2小时，每周3次，恶心，没有呕吐，可能熬夜导致，服用了布洛芬200毫克，2小时后仍有疼痛。');
  const en=extractVoice('I have a headache, left temple, throbbing, pain 6/10. It lasted 2 hours, 3 attacks per week, nausea, no vomiting, possibly poor sleep, I took ibuprofen 200 mg, 2 hours later still pain.',{language:'en'});
  for(const x of [zh,en]){assert.deepEqual(x.fields.episodes.location,['left','temple']);assert.deepEqual(x.fields.episodes.quality,['pulsating']);assert.deepEqual(x.fields.episodes.symptoms,['nausea']);assert.equal(x.fields.episodes.intensity,6);assert.equal(x.fields.episodes.reportedDurationMinutes,120);assert.deepEqual(x.fields.episodes.suspectedTriggers,['poor_sleep']);assert.equal(x.fields.medications.dose,200);assert.equal(x.fields.medications.unit,'mg');assert.ok(x.fields.medications.responseNote);assert.equal(x.fields.episodes.start,undefined);assert.equal(x.fields.medications.followup,undefined);for(const e of x.evidence)assert.ok(x.unclassifiedText.includes(e.quote));}
});
test('Voice: negations, uncertainty, other person and conflicting day status stay conservative',()=>{
  const a=extractVoice('没有恶心和呕吐，但怕光。不是左侧，是右侧。没吃布洛芬。');assert.deepEqual(a.fields.episodes.symptoms,['photophobia']);assert.deepEqual(a.fields.episodes.location,['right']);assert.deepEqual(a.fields.medications,{});
  const b=extractVoice('No nausea or vomiting, but sensitive to light. Not left, but right. Never took ibuprofen.',{language:'en'});assert.deepEqual(b.fields.episodes.symptoms,['photophobia']);assert.deepEqual(b.fields.episodes.location,['right']);assert.deepEqual(b.fields.medications,{});
  assert.deepEqual(extractVoice('妈妈左侧跳痛').fields.episodes,{});assert.equal(extractVoice('今天没有头痛，今天头痛').fields.days.headache,undefined);
  assert.equal(extractVoice('Maybe pain 6/10, perhaps left side',{language:'en'}).fields.episodes.intensity,undefined);
});
test('Voice: multiple drugs, dose ranges, intensity changes, missing and invalid doses are not invented',()=>{
  assert.equal(extractVoice('服用了布洛芬200毫克，服用了舒马曲坦50毫克').fields.medications.name,undefined);
  assert.equal(extractVoice('I took ibuprofen 200-400 mg',{language:'en'}).fields.medications.dose,undefined);
  assert.equal(extractVoice('I took ibuprofen',{language:'en'}).fields.medications.dose,undefined);
  assert.equal(extractVoice('疼痛6分，疼痛3分').fields.episodes.intensity,undefined);
  assert.equal(extractVoice('疼痛16分').fields.episodes.intensity,undefined);
  assert.equal(extractVoice('服用了布洛芬0.2克').fields.medications.dose,200);
  assert.throws(()=>extractVoice('x'.repeat(5001)),/invalid_voice_text/);
  assert.throws(()=>extractVoice('test',{language:'fr'}),/invalid_voice_text/);
});
test('Voice: reported duration remains separate from calculated completed duration; provenance and response retained',()=>{
  const v=emptyVault('2026-09-01T00:00:00Z');
  applyRecord(v,'episodes',{durationStatus:'from_times',frequencyStatus:'unknown',symptomsStatus:'none',triggersStatus:'none',impact:'unknown',precision:'estimated',type:'attack',durationStatus:'reported',frequencyStatus:'reported',id:'v-ep',revision:0,quality:['pulsating'],start:'2026-09-02T00:00:00Z',endStatus:'unknown',reportedDurationMinutes:120,reportedFrequency:'每周3次',sourceVoiceId:'voice-1',sourceVoiceRevision:2},'op','2026-09-05T00:00:00Z');
  assert.equal(v.episodes[0].reportedDurationMinutes,120);assert.equal(v.episodes[0].sourceVoiceId,'voice-1');assert.equal(summarize(v,'2026-09-01','2026-09-04','2026-09-05T00:00:00Z').completedUnionMinutes,0);
  assert.throws(()=>validate('episodes',{...v.episodes[0],reportedDurationMinutes:-1}),/invalid_record/);
  assert.throws(()=>validate('episodes',{...v.episodes[0],sourceVoiceRevision:0}),/invalid_record/);
  assert.equal(validate('medications',{id:'m',revision:0,at:'2026-09-01T00:00:00Z',name:'ibuprofen',dose:200,unit:'mg',drugClass:'nsaid',responseNote:'2 hours later still pain'}).responseNote,'2 hours later still pain');
});

function wav(){const b=Buffer.alloc(32044);b.write('RIFF',0);b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(b.length-44,40);return b;}
async function fixture(t,provider){
  const dir=mkdtempSync(path.join(os.tmpdir(),'headache-voice-')),app=createApp({directory:dir,port:0,schedule:false,asrProvider:provider||{available:false,name:'not configured'}});const port=await app.listen(),origin='http://127.0.0.1:'+port;let cookie='',csrf='';
  t.after(async()=>{await app.close();rmSync(dir,{recursive:true,force:true});});
  async function call(route,body,extra={}){const audio=Buffer.isBuffer(body);const r=await fetch(origin+route,{method:body===undefined?'GET':'POST',headers:{Cookie:cookie,Origin:origin,'X-CSRF-Token':csrf,'Content-Type':audio?'audio/wav':'application/json',...extra},body:body===undefined?undefined:audio?body:JSON.stringify(body)});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,headers:r.headers,data:r.headers.get('content-type')?.includes('application/json')?await r.json():Buffer.from(await r.arrayBuffer())};}
  await call('/api/demo',{});const user=(await call('/api/state')).data;csrf=user.csrf;
  return {app,dir,origin,uid:user.user.id,call,async account(){await call('/api/demo',{});csrf=(await call('/api/state')).data.csrf;},get cookie(){return cookie;}};
}
test('Voice HTTP: original bytes round-trip, encrypted at rest, authenticated access, limits and logical deletion',async t=>{
  const {app,dir,origin,uid,call,account}=await fixture(t);const audio=wav();audio.write('SYNTHETIC_AUDIO_SECRET',100);
  assert.equal((await call('/api/voice/config')).data.available,false);
  const route='/api/voice/upload?id=voice-one&language=zh';
  assert.equal((await call(route,audio,{'X-CSRF-Token':'bad'})).status,403);
  assert.equal((await fetch(origin+route,{method:'POST',body:audio})).status,401);
  assert.equal((await call(route,audio,{Origin:'https://other.invalid'})).status,403);
  assert.equal((await call(route,audio)).status,201);
  assert.equal((await call(route,audio)).data.duplicate,true);
  assert.equal((await call(route,Buffer.from(audio).fill(1,150,155))).status,400);
  assert.deepEqual((await call('/api/voice/audio?id=voice-one')).data,audio);
  assert.match((await call('/api/voice/audio?id=voice-one&download=1')).headers.get('content-disposition'),/attachment/);
  assert.equal((await call('/api/voice/upload?id=bad&language=zh',Buffer.alloc(40))).status,400);
  const container=Buffer.alloc(32);container.write('ftyp',4);assert.equal((await call('/api/voice/upload?id=m4a&language=zh',container,{'Content-Type':'audio/x-m4a'})).status,201);
  assert.equal((await call('/api/voice/upload?id=large&language=zh',Buffer.alloc(MAX_AUDIO_BYTES+1))).status,413);
  assert.equal((await call('/api/voice/transcribe',{id:'voice-one',revision:1})).data.error,'asr_not_configured');
  const n=(await call('/api/voice/note',{id:'voice-one',revision:1,language:'zh',text:'VOICE_TEXT_SECRET 左侧跳痛'})).data.note;
  assert.equal(n.revision,2);assert.equal(n.audio,undefined);
  assert.equal((await call('/api/voice/note',{id:'voice-one',revision:1,language:'zh',text:'stale'})).status,409);
  const exported=(await call('/api/export')).data;assert.equal(exported.vault.voice_notes,undefined);assert.ok(!JSON.stringify(exported).includes('VOICE_TEXT_SECRET'));
  const raw=app.store.db.prepare('SELECT body FROM voice_notes').get().body;
  assert.ok(!raw.includes('VOICE_TEXT_SECRET'));assert.ok(!raw.includes(audio.toString('base64')));
  app.store.db.exec('PRAGMA wal_checkpoint(FULL)');assert.ok(!readFileSync(path.join(dir,'diary.sqlite')).includes(Buffer.from('VOICE_TEXT_SECRET')));
  await account();assert.equal((await call('/api/voice/audio?id=voice-one')).status,404);assert.equal((await call('/api/voice/notes')).data.notes.length,0);assert.equal((await call('/api/voice/delete',{id:'voice-one',revision:2})).status,404);
  assert.ok(readVoice(app.store,uid,'voice-one'));
});
test('Voice HTTP: ASR original retained, edits reviewed, saved fields traced, deletion preserves existing diary edits',async t=>{
  let count=0;const {call}=await fixture(t,{available:true,name:'TEST FAKE',async transcribe(note){assert.ok(note.audio);return {text:++count===1?'left temple pain 6/10':'left pain 5/10',language:note.language,model:'test-fixture-not-a-model'};}});
  await call('/api/voice/upload?id=voice-asr&language=en',wav());
  const before=(await call('/api/state')).data.vault;
  let n=(await call('/api/voice/transcribe',{id:'voice-asr',revision:1})).data.note;assert.equal(n.originalTranscript,'left temple pain 6/10');assert.deepEqual((await call('/api/state')).data.vault,before);
  n=(await call('/api/voice/note',{id:n.id,revision:n.revision,language:'en',text:'corrected text'})).data.note;
  n=(await call('/api/voice/transcribe',{id:n.id,revision:n.revision})).data.note;assert.equal(n.originalTranscript,'left temple pain 6/10');assert.equal(n.text,'left pain 5/10');
  const record={preventiveTaken:'not_applicable',dailyImpact:'unknown',id:'voice-linked',revision:0,date:'2026-09-29',headache:'yes',acute:'unknown',sourceVoiceId:n.id,sourceVoiceRevision:n.revision};
  assert.equal((await call('/api/records',{kind:'days',record,operationId:'voice-save'})).status,200);
  assert.equal((await call('/api/voice/delete',{id:n.id,revision:n.revision})).status,200);
  assert.equal((await call('/api/voice/audio?id='+n.id)).status,404);
  assert.equal((await call('/api/records',{kind:'days',record:{...record,revision:1,notes:'edited after audio deletion'},operationId:'voice-edit'})).status,200);
  assert.equal((await call('/api/records',{kind:'days',record:{...record,id:'new-link'},operationId:'voice-new'})).status,409);
});
test('Voice HTTP: delayed transcription cannot overwrite a concurrent edit',async t=>{
  let entered,release;const started=new Promise(r=>entered=r),blocked=new Promise(r=>release=r);
  const {call}=await fixture(t,{available:true,name:'TEST',async transcribe(){entered();await blocked;return {text:'delayed',language:'en',model:'fixture'};}});
  await call('/api/voice/upload?id=slow&language=en',wav());const pending=call('/api/voice/transcribe',{id:'slow',revision:1});await started;
  await call('/api/voice/note',{id:'slow',revision:1,language:'en',text:'manual correction'});release();assert.equal((await pending).status,409);assert.equal((await call('/api/voice/notes')).data.notes[0].text,'manual correction');
});
test('Voice HTTP: deletion during recognition cannot recreate audio; invalid model responses preserve original',async t=>{
  let entered,release;const started=new Promise(r=>entered=r),blocked=new Promise(r=>release=r);
  const {call}=await fixture(t,{available:true,name:'TEST',async transcribe(note){if(note.id==='invalid')return {text:'bad',language:'fr',model:'fixture'};entered();await blocked;return {text:'delayed',language:'en',model:'fixture'};}});
  await call('/api/voice/upload?id=invalid&language=en',wav());assert.equal((await call('/api/voice/transcribe',{id:'invalid',revision:1})).status,502);assert.deepEqual((await call('/api/voice/audio?id=invalid')).data,wav());
  await call('/api/voice/upload?id=deleted&language=en',wav());const pending=call('/api/voice/transcribe',{id:'deleted',revision:1});await started;
  assert.equal((await call('/api/voice/delete',{id:'deleted',revision:1})).status,200);release();assert.equal((await pending).status,409);assert.equal((await call('/api/voice/audio?id=deleted')).status,404);
});
test('Voice HTTP: quota bounds storage without changing prior audio',async t=>{
  const {app,uid,call}=await fixture(t);for(let i=0;i<100;i++)writeVoice(app.store,uid,{id:'quota-'+i,bytes:0,audio:null,text:'synthetic',createdAt:new Date().toISOString(),revision:1,language:'en'});
  assert.equal((await call('/api/voice/upload?id=excess&language=en',wav())).status,413);assert.equal((await call('/api/voice/note',{id:'excess',revision:0,language:'en',text:'synthetic'})).status,413);assert.equal((await call('/api/voice/notes')).data.notes.length,100);
});
test('Voice provider: loopback-only configuration and real multipart HTTP adapter contract',async t=>{
  assert.equal(voiceProviderFromEnv({}).available,false);for(const url of ['https://example.com/transcribe','http://evil.invalid/','http://user:pass@localhost/'])assert.throws(()=>voiceProviderFromEnv({HD_ASR_URL:url}));
  const server=http.createServer(async(req,res)=>{let bytes=Buffer.alloc(0);for await(const c of req)bytes=Buffer.concat([bytes,c]);assert.match(req.headers['content-type'],/multipart\/form-data; boundary=/);assert.ok(bytes.includes(Buffer.from('name="language"')));assert.ok(bytes.includes(Buffer.from('WAVEfmt ')));res.setHeader('Content-Type','application/json');res.end(JSON.stringify({text:'test transcript',language:'en',model:'contract-fixture'}));});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
  const provider=voiceProviderFromEnv({HD_ASR_URL:'http://127.0.0.1:'+server.address().port+'/transcribe'});
  const result=await provider.transcribe({id:'contract',audio:wav().toString('base64'),mime:'audio/wav',language:'en'});assert.equal(result.text,'test transcript');
});
