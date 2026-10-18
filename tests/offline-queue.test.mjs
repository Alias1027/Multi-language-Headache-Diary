import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createOfflineQueue,JOURNAL_KEY,journalView} from '../public/offline-queue.mjs';
import {emptyVault,applyRecord} from '../public/domain.mjs';

const now='2026-10-18T10:00:00.000Z';
function storage(seed={}){const values=new Map(Object.entries(seed));return {fail:false,async get(k){return structuredClone(values.get(k)??null);},async put(k,v){if(this.fail)throw new Error('quota');values.set(k,structuredClone(v));},async clear(){values.clear();}};}
function locks(){const chain=new Map();return {request(name,task){const run=(chain.get(name)||Promise.resolve()).catch(()=>{}).then(task);chain.set(name,run);return run;}};}
function base(id='patient-a'){const vault=emptyVault(now);vault.enrolled='2026-09-01';return {user:{id,email:id+'@example.test'},vault,csrf:'test'};}
function batch(date,record={}){return {date,operationId:randomUUID(),records:[{kind:'days',record:{id:'day-'+date,revision:0,date,headache:'no',acute:'no',preventiveTaken:'not_applicable',dailyImpact:'none',...record}}]};}
function setup(seed={}){const store=storage(seed),lock=locks(),queue=createOfflineQueue({storage:store,locks:lock,now:()=>now});return {store,lock,queue};}
function server(initial){let current=structuredClone(initial);return {state:()=>structuredClone(current),async readState(){return structuredClone(current);},async send(url,data){if(current.vault.diaryBatches?.some(x=>x.id===data.operationId))return;for(const [i,r] of data.records.entries())applyRecord(current.vault,r.kind,r.record,data.operationId+'_'+i,now);(current.vault.diaryBatches??=[]).push({id:data.operationId});}};}

test('offline: consecutive days and same-day amendments survive reload and sync in order',async()=>{
 const x=setup(),initial=base();await x.queue.acceptState(initial);
 await x.queue.enqueue('diary-batch',batch('2026-10-15'),'patient-a');
 await x.queue.enqueue('diary-batch',batch('2026-10-16'),'patient-a');
 const first=x.queue.view().vault.days.find(d=>d.date==='2026-10-15');
 await x.queue.enqueue('diary-batch',batch('2026-10-15',{...first,notes:'Later correction'}),'patient-a');
 const second=createOfflineQueue({storage:x.store,locks:x.lock,now:()=>now});await second.load();
 assert.equal(second.snapshot().pending.length,3);assert.equal(second.view().vault.days.length,2);
 assert.equal(second.view().vault.days[0].revision,2);assert.equal(second.snapshot().baseState.vault.days.length,0);
 const remote=server(initial);assert.equal((await second.sync(remote)).status,'synced');
 assert.equal(remote.state().vault.days.length,2);assert.equal(remote.state().vault.days[0].notes,'Later correction');assert.equal(second.snapshot().pending.length,0);
});

test('offline: lost write acknowledgement replays same ID and body without a duplicate',async()=>{
 const x=setup(),initial=base();await x.queue.acceptState(initial);const data=batch('2026-10-15');await x.queue.enqueue('diary-batch',data,'patient-a');
 const remote=server(initial),bodies=[];let dropped=false;
 const transport={readState:remote.readState,send:async(url,body)=>{bodies.push(JSON.stringify(body));await remote.send(url,body);if(!dropped){dropped=true;throw Object.assign(new Error('network'),{network:true});}}};
 assert.equal((await x.queue.sync(transport)).status,'network');assert.equal(x.queue.snapshot().pending.length,1);
 assert.equal((await x.queue.sync(transport)).status,'synced');assert.equal(bodies[0],bodies[1]);assert.equal(remote.state().vault.days.length,1);
});

test('offline: lost read after commit preserves pending and avoids double optimistic revision',async()=>{
 const x=setup(),initial=base();await x.queue.acceptState(initial);await x.queue.enqueue('diary-batch',batch('2026-10-15'),'patient-a');
 const remote=server(initial);let reads=0;
 const result=await x.queue.sync({send:remote.send,readState:async()=>{if(++reads===2)throw Object.assign(new Error('network'),{network:true});return remote.readState();}});
 assert.equal(result.status,'network');assert.equal(x.queue.snapshot().pending.length,1);
 await x.queue.acceptState(remote.state());assert.equal(x.queue.view().vault.days[0].revision,1);
 assert.equal((await x.queue.sync(remote)).status,'synced');assert.equal(remote.state().vault.days[0].revision,1);
});

test('offline: expired authentication and different-account sessions preserve the journal',async()=>{
 const x=setup();await x.queue.acceptState(base());await x.queue.enqueue('diary-batch',batch('2026-10-15'),'patient-a');
 const expired=await x.queue.sync({readState:async()=>{throw Object.assign(new Error('login_required'),{status:401});},send:()=>assert.fail()});
 assert.equal(expired.status,'auth');assert.equal(x.queue.snapshot().pending[0].status,'auth');
 await x.queue.enqueue('diary-batch',batch('2026-10-16'),'patient-a');
 const wrong=await x.queue.sync({readState:async()=>base('patient-b'),send:()=>assert.fail()});
 assert.equal(wrong.status,'auth');assert.equal(x.queue.snapshot().baseState.user.id,'patient-a');assert.equal(x.queue.snapshot().pending.length,2);
 await assert.rejects(x.queue.enqueue('diary-batch',batch('2026-10-17'),'patient-b'),/reauthSameAccount/);
 assert.equal((await x.queue.sync(server(base()))).status,'synced');
});

test('offline: server conflicts and non-network errors are retained, never counted as synced',async()=>{
 const x=setup();await x.queue.acceptState(base());await x.queue.enqueue('diary-batch',batch('2026-10-15',{notes:'Keep local'}),'patient-a');
 const remote=base();applyRecord(remote.vault,'days',batch('2026-10-15',{notes:'Other device'}).records[0].record,'external',now);
 const result=await x.queue.sync({readState:async()=>remote,send:async()=>{throw Object.assign(new Error('revision_conflict'),{status:409});}});
 assert.equal(result.status,'conflict');assert.equal(x.queue.snapshot().pending.length,1);assert.equal(x.queue.view().vault.days[0].notes,'Keep local');assert.equal(x.queue.snapshot().baseState.vault.days[0].notes,'Other device');
 await x.queue.enqueue('diary-batch',batch('2026-10-16'),'patient-a');assert.equal(x.queue.snapshot().pending.length,2);
 const bad=await x.queue.sync({readState:async()=>remote,send:async()=>{throw Object.assign(new Error('invalid_record'),{status:400});}});
 assert.equal(bad.status,'error');assert.equal(x.queue.snapshot().pending.length,2);
});

test('offline: quota failure leaves durable state unchanged; no optimistic false save',async()=>{
 const x=setup();await x.queue.acceptState(base());x.store.fail=true;
 await assert.rejects(x.queue.enqueue('diary-batch',batch('2026-10-15'),'patient-a'),/quota/);
 assert.equal(x.queue.snapshot().pending.length,0);assert.equal((await x.store.get(JOURNAL_KEY)).pending.length,0);
});

test('offline: concurrent tabs reread under a shared lock; stale same-day edit is refused',async()=>{
 const x=setup();await x.queue.acceptState(base());const second=createOfflineQueue({storage:x.store,locks:x.lock,now:()=>now});await second.load();
 await Promise.all([x.queue.enqueue('diary-batch',batch('2026-10-15'),'patient-a'),second.enqueue('diary-batch',batch('2026-10-16'),'patient-a')]);
 await x.queue.load();assert.equal(x.queue.snapshot().pending.length,2);
 await assert.rejects(second.enqueue('diary-batch',batch('2026-10-15'),'patient-a'),/offlineRevisionConflict/);
 assert.equal((await x.store.get(JOURNAL_KEY)).pending.length,2);
});

test('offline: legacy queued records migrate with ownership; unsupported locks fail closed',async()=>{
 const initial=base(),data=batch('2026-10-15'),x=setup({state:initial,pending:[{type:'diary-batch',...data}]});await x.queue.load();
 assert.equal(x.queue.view().vault.days.length,1);assert.equal(x.queue.snapshot().pending[0].userId,'patient-a');
 await x.queue.enqueue('diary-batch',batch('2026-10-16'),'patient-a');assert.equal((await x.store.get(JOURNAL_KEY)).pending.length,2);
 const unsupported=createOfflineQueue({storage:x.store,locks:null});await unsupported.load();assert.equal(unsupported.canWrite(),false);
 await assert.rejects(unsupported.enqueue('diary-batch',batch('2026-10-17'),'patient-a'),/storageLockUnavailable/);
 assert.equal(unsupported.view().vault.days.length,2);
});

test('offline: failed reset cannot erase pending entries and duplicate IDs reject changed payload',async()=>{
 const x=setup();await x.queue.acceptState(base());const data=batch('2026-10-15');await x.queue.enqueue('diary-batch',data,'patient-a');
 await x.queue.enqueue('diary-batch',data,'patient-a');assert.equal(x.queue.snapshot().pending.length,1);
 const amended=structuredClone(data);amended.records[0].record.notes='Changed';await assert.rejects(x.queue.enqueue('diary-batch',amended,'patient-a'),/revision_batch_payload/);
 await assert.rejects(x.queue.reset(),/signoutPending/);assert.equal(x.queue.snapshot().pending.length,1);
});

test('offline: unsubmitted drafts block reset preflight and final clear without losing the account',async()=>{
 const x=setup();await x.queue.acceptState(base());let changed=true;
 x.store.assertClearable=async()=>{if(changed)throw new Error('signoutDrafts');};
 await assert.rejects(x.queue.assertResettable(),/signoutDrafts/);
 await assert.rejects(x.queue.reset(),/signoutDrafts/);
 assert.equal((await x.store.get(JOURNAL_KEY)).baseState.user.id,'patient-a');
 changed=false;await x.queue.assertResettable();changed=true;
 await assert.rejects(x.queue.reset(),/signoutDrafts/);
 assert.equal(x.queue.view().user.id,'patient-a');
 changed=false;await x.queue.reset();assert.equal(x.queue.view(),null);
});

test('offline: enqueue while a slow sync is in flight preserves both operations',async()=>{
 const x=setup(),initial=base();await x.queue.acceptState(initial);await x.queue.enqueue('diary-batch',batch('2026-10-15'),'patient-a');
 const remote=server(initial);let release,started;
 const waiting=new Promise(resolve=>{started=resolve;}),gate=new Promise(resolve=>{release=resolve;});let writes=0;
 const syncing=x.queue.sync({readState:remote.readState,send:async(url,body)=>{if(++writes===1){started();await gate;}return remote.send(url,body);}});
 await waiting;await x.queue.enqueue('diary-batch',batch('2026-10-16'),'patient-a');assert.equal(x.queue.snapshot().pending.length,2);release();
 assert.equal((await syncing).status,'synced');assert.equal(remote.state().vault.days.length,2);assert.equal(x.queue.snapshot().pending.length,0);
});

test('offline: invalid mixed batch rolls back locally and queued payload is immutable',async()=>{
 const x=setup();await x.queue.acceptState(base());const bad=batch('2026-10-15');bad.records.push({kind:'medications',record:{id:'med',revision:0,at:'2026-10-16T02:00:00Z',name:'Synthetic medicine',dose:1,unit:'mg',drugClass:'other'}});
 await assert.rejects(x.queue.enqueue('diary-batch',bad,'patient-a'),/invalid_diary_date/);assert.equal(x.queue.snapshot().pending.length,0);assert.equal(x.queue.view().vault.days.length,0);
 const good=batch('2026-10-15',{notes:'Confirmed'});await x.queue.enqueue('diary-batch',good,'patient-a');good.records[0].record.notes='Edited external object';assert.equal(x.queue.view().vault.days[0].notes,'Confirmed');
});

test('offline: a late stale refresh cannot erase a newer confirmed snapshot',async()=>{
 const x=setup(),initial=base();await x.queue.acceptState(initial);await x.queue.enqueue('diary-batch',batch('2026-10-15'),'patient-a');
 await x.queue.sync(server(initial));assert.equal(x.queue.snapshot().pending.length,0);await x.queue.acceptState(initial);
 assert.equal(x.queue.snapshot().baseState.vault.days.length,1);assert.equal(x.queue.view().vault.days[0].date,'2026-10-15');
});

test('offline: an incomplete server state after success cannot acknowledge a queued write',async()=>{
 const x=setup(),initial=base();await x.queue.acceptState(initial);await x.queue.enqueue('diary-batch',batch('2026-10-15'),'patient-a');
 const result=await x.queue.sync({readState:async()=>initial,send:async()=>({ok:true})});
 assert.equal(result.status,'network');assert.equal(x.queue.snapshot().pending.length,1);assert.equal(x.queue.view().vault.days.length,1);
});

