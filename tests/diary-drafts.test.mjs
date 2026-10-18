import test from 'node:test';
import assert from 'node:assert/strict';
import {createDraftStore,draftRegistryKey} from '../public/diary-drafts.mjs';

function storage(seed={}){const values=new Map(Object.entries(seed));return {fail:false,async get(k){return structuredClone(values.get(k)??null);},async put(k,v){if(this.fail)throw new Error('quota');values.set(k,structuredClone(v));},async remove(k){values.delete(k);}};}
function locks(){const chain=new Map(),held=new Set();return {request(name,options,callback){const task=typeof options==='function'?options:callback;if(options?.ifAvailable&&held.has(name))return Promise.resolve(task(null));const run=(chain.get(name)||Promise.resolve()).catch(()=>{}).then(async()=>{held.add(name);try{return await task({name});}finally{held.delete(name);}});chain.set(name,run);return run;}};}
const draft=(operationId,date,notes)=>({uid:'user',operationId,date,changed:true,day:{date,notes}});

test('drafts: independent tab drafts survive concurrent save and removal of only one draft',async()=>{
 const database=storage(),shared=locks(),a=createDraftStore({storage:database,locks:shared}),b=createDraftStore({storage:database,locks:shared});
 await Promise.all([a.save('user',draft('a','2026-10-15','Unsubmitted A')),b.save('user',draft('b','2026-10-16','B'))]);
 await b.remove('user','b');const retained=await a.list('user');assert.equal(retained.length,1);assert.equal(retained[0].day.notes,'Unsubmitted A');
 const reopened=createDraftStore({storage:database,locks:shared});assert.deepEqual(await reopened.list('user'),retained);
});

test('drafts: legacy migration is durable and quota failure never removes the original',async()=>{
 const legacy=draft('legacy','2026-10-15','Existing draft'),database=storage({'unified-draft-user':legacy}),store=createDraftStore({storage:database,locks:locks()});database.fail=true;
 await assert.rejects(store.migrate('user'),/quota/);assert.deepEqual(await database.get('unified-draft-user'),legacy);
 database.fail=false;await store.migrate('user');assert.equal(await database.get('unified-draft-user'),null);assert.deepEqual((await database.get(draftRegistryKey('user'))).drafts.legacy,legacy);
});

test('drafts: editor lease detects another active tab and releases on exit',async()=>{
 const store=createDraftStore({storage:storage(),locks:locks()}),release=await store.claim('user','a');assert.equal(typeof release,'function');
 assert.equal(await store.claim('user','a'),null);const second=await store.claim('user','b');assert.equal(typeof second,'function');release();second();
 await new Promise(resolve=>setImmediate(resolve));const recovered=await store.claim('user','a');assert.equal(typeof recovered,'function');recovered();
});

test('drafts: ownership, unsupported browser and quota errors cannot replace another saved draft',async()=>{
 const database=storage(),store=createDraftStore({storage:database,locks:locks()});await store.save('user',draft('a','2026-10-15','Keep'));
 await assert.rejects(store.save('other',draft('b','2026-10-16','Wrong account')),/reauthSameAccount/);
 const unsupported=createDraftStore({storage:database,locks:null});await assert.rejects(unsupported.save('user',draft('b','2026-10-16','No lock')),/storageLockUnavailable/);
 database.fail=true;await assert.rejects(store.save('user',draft('a','2026-10-15','Replacement')),/quota/);assert.equal((await store.list('user'))[0].day.notes,'Keep');
});
