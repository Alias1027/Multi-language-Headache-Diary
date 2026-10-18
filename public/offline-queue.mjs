import {applyRecord,dateAt,boundary,addDays,validDate} from './domain.mjs';

export const JOURNAL_KEY='offline-journal-v2';
const clone=value=>structuredClone(value);
const records=item=>item.type==='diary-batch'?item.records:[{kind:item.kind,record:item.record}];
const payload=item=>item.type==='diary-batch'?{date:item.date,records:item.records,operationId:item.operationId}:{kind:item.kind,record:item.record,operationId:item.operationId};
const isApplied=(vault,item)=>item.type==='diary-batch'?(vault.diaryBatches||[]).some(x=>x.id===item.operationId):(vault.operations||[]).includes(item.operationId);
const operation=(item,index)=>item.type==='diary-batch'?item.operationId+'_'+index:item.operationId;
const failure=(message,status)=>Object.assign(new Error(message),{status});

// Derive a view; never persist optimistic data as the last server snapshot.
export function journalView(journal){
  if(!journal?.baseState)return null;
  const state=clone(journal.baseState),v=state.vault;
  for(const item of journal.pending){
    if(item.userId!==state.user.id||isApplied(v,item))continue;
    for(const [index,{kind,record}] of records(item).entries()){
      try{applyRecord(v,kind,record,operation(item,index),item.queuedAt);}
      catch{
        // A server-side conflict must not hide the patient's unsynced values.
        // Preserve the local revision chain; sync never automatically rebases it.
        const r=clone(record),rows=v[kind];
        if(!rows)continue;r.revision=(Number(r.revision)||0)+1;
        if(kind==='days')v.days=v.days.filter(x=>x.date!==r.date||x.id===r.id);
        const target=v[kind],at=target.findIndex(x=>x.id===r.id);
        if(at<0)target.push(r);else target[at]=r;
        v.revision++;
      }
    }
  }
  return state;
}

function checkLocal(v,item,now){
  const rows=records(item);
  if(!/^[a-zA-Z0-9_-]{1,80}$/.test(item.operationId||''))throw failure('invalid_diary_batch');
  if(item.type==='diary-batch'&&(!validDate(item.date)||rows.length<1||rows.length>31||rows.filter(r=>r.kind==='days').length!==1))throw failure('invalid_diary_batch');
  const seen=new Set();
  for(const [i,{kind,record}] of rows.entries()){
    if(!['days','episodes','medications','preventives'].includes(kind))throw failure('invalid_kind');
    const key=kind+':'+record.id;if(seen.has(key))throw failure('invalid_diary_batch');seen.add(key);
    try{applyRecord(v,kind,record,operation(item,i),now);}catch(err){if(['revision_conflict','date_conflict'].includes(err.message))throw failure('offlineRevisionConflict',409);throw err;}
  }
  if(item.type!=='diary-batch')return;
  const lo=boundary(item.date,v.timezone),hi=boundary(addDays(item.date,1),v.timezone);
  const overlaps=r=>Date.parse(r.start)<hi&&(r.end?Date.parse(r.end):r.endStatus==='ongoing'?Date.parse(now)+1:Date.parse(r.start)+1)>lo;
  for(const {kind,record} of rows){
    if(kind==='days'&&record.date!==item.date||kind==='medications'&&dateAt(record.at,v.timezone)!==item.date||kind==='episodes'&&!overlaps(record))throw failure('invalid_diary_date');
  }
  const day=v.days.find(r=>r.date===item.date);
  if(day.headache==='no'&&v.episodes.some(overlaps))throw failure('invalid_diary_headache_conflict');
  if(day.acute==='no'&&v.medications.some(r=>dateAt(r.at,v.timezone)===item.date))throw failure('invalid_diary_medication_conflict');
}

// Every mutation rereads the encrypted envelope inside an origin-wide lock.
// Without cross-tab locking, fail safely instead of losing another tab's work.
export function createOfflineQueue({storage,locks=globalThis.navigator?.locks,now=()=>new Date().toISOString()}={}){
  let snapshot={schema:2,baseState:null,pending:[]};
  const locked=task=>{if(!locks?.request)throw failure('storageLockUnavailable');return locks.request('headache-diary-journal',task);};
  async function read(){
    const stored=await storage.get(JOURNAL_KEY);if(stored)return stored;
    const baseState=await storage.get('state'),old=await storage.get('pending')||[];
    return {schema:2,baseState,pending:old.map(item=>({...item,type:item.type||'record',userId:item.userId||baseState?.user?.id,queuedAt:item.queuedAt||now(),status:item.status||'pending'}))};
  }
  async function write(next){await storage.put(JOURNAL_KEY,next);snapshot=clone(next);return snapshot;}
  async function mutate(fn){return locked(async()=>{const next=await read(),result=await fn(next);await write(next);return result;});}
  async function load(){snapshot=clone(await read());return clone(snapshot);}
  async function acceptState(state){return mutate(j=>{
    if(j.baseState&&j.baseState.user.id!==state.user.id)throw failure('reauthSameAccount',401);
    if(j.pending.some(p=>p.userId!==state.user.id))throw failure('reauthSameAccount',401);
    if(j.baseState?.user.id===state.user.id&&j.baseState.vault.revision>state.vault.revision){j.baseState.csrf=state.csrf;return;}
    j.baseState=clone(state);
  });}
  async function enqueue(type,data,userId){return mutate(j=>{
    if(!j.baseState||j.baseState.user.id!==userId||j.pending.some(p=>p.userId!==userId))throw failure('reauthSameAccount',401);
    const item={...clone(data),type,userId,queuedAt:now(),status:'pending'},old=j.pending.find(p=>p.operationId===item.operationId);
    if(old){if(JSON.stringify(payload(old))!==JSON.stringify(payload(item)))throw failure('revision_batch_payload',409);return;}
    checkLocal(journalView(j).vault,item,item.queuedAt);j.pending.push(item);
  });}
  async function sync({readState,send}){
    if(!locks?.request)return {status:'error',error:'storageLockUnavailable'};
    return locks.request('headache-diary-sync',async()=>{
      let item;
      try{
        const latest=await readState();await acceptState(latest);
        while(true){
          await load();item=snapshot.pending[0];if(!item)return {status:'synced'};
          if(item.userId!==snapshot.baseState.user.id)throw failure('reauthSameAccount',401);
          await send(item.type==='diary-batch'?'/api/diary/batch':'/api/records',clone(payload(item)));
          // If acknowledgement or the following read is lost, keep the same ID
          // and body. The server's idempotency record makes the retry safe.
          const confirmed=await readState();
          if(confirmed.user.id!==item.userId)throw failure('reauthSameAccount',401);
          if(!isApplied(confirmed.vault,item))throw Object.assign(new Error('network_response_incomplete'),{network:true});
          await mutate(j=>{if(j.baseState?.user.id!==item.userId)throw failure('reauthSameAccount',401);if(j.baseState.vault.revision<=confirmed.vault.revision)j.baseState=clone(confirmed);j.pending=j.pending.filter(p=>p.operationId!==item.operationId);});
        }
      }catch(err){
        const status=err.network?'network':err.status===401||err.status===403?'auth':err.status===409?'conflict':'error';
        try{await mutate(j=>{const first=j.pending.find(p=>p.operationId===item?.operationId)||j.pending[0];if(first){first.status=status==='network'?'pending':status;first.error=err.message;}});}catch(storageError){return {status:'error',error:'offlineSaveFailed',cause:storageError};}
        return {status,error:err.message};
      }
    });
  }
  async function clear(userId){await mutate(j=>{if(j.pending.some(p=>p.userId!==userId))throw failure('reauthSameAccount',401);j.pending=[];});}
  async function checkReset(){const j=await read();if(j.pending.length)throw failure('signoutPending');await storage.assertClearable?.();}
  async function assertResettable(){return locked(checkReset);}
  async function reset(){await locked(async()=>{await checkReset();await storage.clear();snapshot={schema:2,baseState:null,pending:[]};});}
  return {load,acceptState,enqueue,sync,clear,reset,assertResettable,canWrite:()=>!!locks?.request,snapshot:()=>clone(snapshot),view:()=>journalView(snapshot)};
}
