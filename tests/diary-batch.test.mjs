import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {createApp} from '../server/main.mjs';

async function setup(t){
 const directory=mkdtempSync(path.join(os.tmpdir(),'headache-batch-')),app=createApp({directory,port:0,schedule:false}),port=await app.listen(),origin='http://127.0.0.1:'+port;
 t.after(async()=>{await app.close();rmSync(directory,{recursive:true,force:true});});
 let cookie='',csrf='';
 async function call(url,body,headers={}){const r=await fetch(origin+url,{method:body===undefined?'GET':'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json','X-CSRF-Token':csrf,...headers},body:body===undefined?undefined:JSON.stringify(body)});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,data:await r.json()};}
 async function state(){const r=await call('/api/state');csrf=r.data.csrf;return r.data;}
 await call('/api/demo',{});const initial=await state();
 const date='2026-09-29',day={kind:'days',record:{preventiveTaken:'not_applicable',dailyImpact:'unknown',id:'day-'+date,revision:0,date,headache:'yes',acute:'yes'}};
 const episode={kind:'episodes',record:{durationStatus:'from_times',frequencyStatus:'unknown',symptomsStatus:'none',triggersStatus:'none',impact:'unknown',precision:'estimated',type:'attack',id:randomUUID(),revision:0,start:'2026-09-29T01:00:00Z',end:'2026-09-29T02:00:00Z',intensity:6,quality:['pulsating']}};
 const med={kind:'medications',record:{id:randomUUID(),revision:0,at:'2026-09-29T01:10:00Z',name:'Synthetic medication',dose:200,unit:'mg',drugClass:'nsaid'}};
 const batch={date,records:[day,episode,med],operationId:randomUUID()};
 return {app,call,state,initial,batch,save:body=>call('/api/diary/batch',body||batch)};
}
test('Diary batch: status, episodes and doses commit together; replay is idempotent',async t=>{
 const x=await setup(t),before=x.initial.vault;const first=await x.save();assert.equal(first.status,200);assert.equal(first.data.count,3);
 const after=(await x.state()).vault;assert.equal(after.revision,before.revision+3);assert.equal(after.episodes.length,before.episodes.length+1);assert.equal(after.medications.length,before.medications.length+1);
 assert.equal((await x.save()).data.duplicate,true);assert.deepEqual((await x.state()).vault,after);
 assert.equal((await x.save({...x.batch,records:[x.batch.records[0]]})).status,409);
 assert.equal((await x.call('/api/export')).data.vault.diaryBatches,undefined);
});
test('Diary batch: an invalid later dose rolls back every entry, revision and operation',async t=>{
 const x=await setup(t),body=structuredClone(x.batch);body.records[2].record.dose=0;assert.equal((await x.save(body)).status,400);assert.deepEqual((await x.state()).vault,x.initial.vault);
 body.records[2].record.dose=100;assert.equal((await x.save(body)).status,200);
});
test('Diary batch: stale revision cannot partially update the daily state',async t=>{
 const x=await setup(t);assert.equal((await x.save()).status,200);const saved=(await x.state()).vault;
 const body=structuredClone(x.batch);body.operationId=randomUUID();body.records[0].record={...saved.days.find(d=>d.date===body.date),notes:'Should not persist'};
 assert.equal((await x.save(body)).status,409);assert.deepEqual((await x.state()).vault,saved);
});
test('Diary batch: no headache does not imply no medication; unknown stays unknown',async t=>{
 const x=await setup(t),body=structuredClone(x.batch);body.records=[body.records[0],body.records[2]];body.records[0].record.headache='no';assert.equal((await x.save(body)).status,200);
 let day=(await x.state()).vault.days.find(d=>d.date===body.date);assert.equal(day.headache,'no');assert.equal(day.acute,'yes');
 const next={date:'2026-09-30',operationId:randomUUID(),records:[{kind:'days',record:{preventiveTaken:'not_applicable',dailyImpact:'unknown',id:'day-2026-09-30',revision:0,date:'2026-09-30',headache:'no',acute:'unknown'}}]};assert.equal((await x.save(next)).status,200);day=(await x.state()).vault.days.find(d=>d.date===next.date);assert.equal(day.acute,'unknown');
});
test('Diary batch: contradictory statuses and dates rejected without partial writes',async t=>{
 const x=await setup(t);
 for(const [field,value,error] of [['headache','no','invalid_diary_headache_conflict'],['acute','no','invalid_diary_medication_conflict']]){const body=structuredClone(x.batch);body.records[0].record[field]=value;const r=await x.save(body);assert.equal(r.status,400);assert.equal(r.data.error,error);assert.deepEqual((await x.state()).vault,x.initial.vault);}
 const wrong=structuredClone(x.batch);wrong.records[2].record.at='2026-09-28T01:10:00Z';assert.equal((await x.save(wrong)).data.error,'invalid_diary_date');assert.deepEqual((await x.state()).vault,x.initial.vault);
});
test('Diary batch: cross-midnight ongoing episode can be updated without duplication',async t=>{
 const x=await setup(t),body=structuredClone(x.batch);body.records=body.records.slice(0,2);body.records[0].record.acute='unknown';body.records[1].record.start='2026-09-28T15:00:00Z';body.records[1].record.end='2026-09-29T01:00:00Z';assert.equal((await x.save(body)).status,200);
 const saved=(await x.state()).vault,ep=saved.episodes.find(e=>e.id===body.records[1].record.id),day=saved.days.find(d=>d.date===body.date);
 assert.equal((await x.save({date:body.date,operationId:randomUUID(),records:[{kind:'days',record:day},{kind:'episodes',record:{...ep,intensity:4}}]})).status,200);
 const after=(await x.state()).vault;assert.equal(after.episodes.length,saved.episodes.length);assert.equal(after.episodes.find(e=>e.id===ep.id).intensity,4);
 // End exactly at midnight has no overlap with the next day.
 const midnight=structuredClone(x.batch);midnight.operationId=randomUUID();midnight.records[0].record=after.days.find(d=>d.date===body.date);midnight.records[1].record.id=randomUUID();midnight.records[1].record.end='2026-09-28T16:00:00Z';midnight.records[1].record.start='2026-09-28T15:00:00Z';assert.equal((await x.save(midnight)).data.error,'invalid_diary_date');assert.deepEqual((await x.state()).vault,after);
});
test('Diary batch: voice references must belong to current user and match revision',async t=>{
 const x=await setup(t),body=structuredClone(x.batch);Object.assign(body.records[1].record,{sourceVoiceId:'not-a-note',sourceVoiceRevision:1});assert.equal((await x.save(body)).status,409);assert.deepEqual((await x.state()).vault,x.initial.vault);
 const note=(await x.call('/api/voice/note',{id:randomUUID(),revision:0,language:'en',text:'Synthetic voice note'})).data.note;Object.assign(body.records[1].record,{sourceVoiceId:note.id,sourceVoiceRevision:note.revision});assert.equal((await x.save(body)).status,200);
});
test('Diary batch: CSRF, clinician writes, duplicate record ids and oversized batch denied',async t=>{
 const x=await setup(t);assert.equal((await x.call('/api/diary/batch',x.batch,{'X-CSRF-Token':'wrong'})).status,403);
 assert.equal((await x.save({...x.batch,records:[...x.batch.records,x.batch.records[1]]})).status,400);
 assert.equal((await x.save({...x.batch,records:Array(32).fill(x.batch.records[0])})).status,400);
 assert.equal((await x.call('/api/demo/role',{role:'clinician'})).status,403);const actor=x.app.store.get(x.initial.user.id);actor.profile.role='clinician';x.app.store.save(actor);assert.equal((await x.save()).status,403);
});

test('Pain quality: omitted or empty quality cannot create an episode via either endpoint',async t=>{
 const x=await setup(t);
 for(const quality of [undefined,[]]){
   const body=structuredClone(x.batch);body.records[1].record.quality=quality;
   const res=await x.save(body);assert.equal(res.status,400);assert.equal(res.data.error,'invalid_episode_quality');
   const single=await x.call('/api/records',{kind:'episodes',record:body.records[1].record,operationId:randomUUID()});
   assert.equal(single.status,400);assert.equal(single.data.error,'invalid_episode_quality');
   assert.deepEqual((await x.state()).vault,x.initial.vault);
 }
});

test('Pain quality: one or several values accepted; clearing an existing episode is rejected atomically',async t=>{
 const x=await setup(t);x.batch.records[1].record.quality=['pulsating','pressing'];assert.equal((await x.save()).status,200);
 const saved=(await x.state()).vault,episode=saved.episodes.find(r=>r.id===x.batch.records[1].record.id),day=saved.days.find(r=>r.date===x.batch.date);
 assert.deepEqual(episode.quality,['pulsating','pressing']);
 const rejected=await x.save({date:x.batch.date,operationId:randomUUID(),records:[{kind:'days',record:{...day,notes:'Must roll back'}},{kind:'episodes',record:{...episode,quality:[]}}]});
 assert.equal(rejected.status,400);assert.equal(rejected.data.error,'invalid_episode_quality');assert.deepEqual((await x.state()).vault,saved);
 const corrected=await x.call('/api/records',{kind:'episodes',record:{...episode,quality:['pressing']},operationId:randomUUID()});assert.equal(corrected.status,200);
});

test('Required clinical answers: both APIs reject omitted assessments without partial writes',async t=>{
 const x=await setup(t);
 for(const [kind,field,code,index] of [['episodes','symptomsStatus','invalid_episode_assessment',1],['episodes','durationStatus','invalid_episode_assessment',1],['days','dailyImpact','invalid_day_assessment',0],['days','preventiveTaken','invalid_day_assessment',0]]){
  const body=structuredClone(x.batch);delete body.records[index].record[field];
  const batch=await x.save(body);assert.equal(batch.status,400);assert.equal(batch.data.error,code);
  const single=await x.call('/api/records',{kind,record:body.records[index].record,operationId:randomUUID()});assert.equal(single.status,400);assert.equal(single.data.error,code);
  assert.deepEqual((await x.state()).vault,x.initial.vault);
 }
 assert.equal((await x.save()).status,200);
 const saved=(await x.state()).vault;assert.equal(saved.days.find(d=>d.date===x.batch.date).dailyImpact,'unknown');
 const ep=saved.episodes.find(e=>e.id===x.batch.records[1].record.id),day=saved.days.find(d=>d.date===x.batch.date);
 const rejected=await x.save({date:x.batch.date,operationId:randomUUID(),records:[{kind:'days',record:{...day,notes:'Must roll back'}},{kind:'episodes',record:{...ep,symptomsStatus:'none',symptoms:['nausea']}}]});
 assert.equal(rejected.data.error,'invalid_episode_assessment');assert.deepEqual((await x.state()).vault,saved);
});
