import {createHash} from 'node:crypto';
import {applyRecord,validDate,dateAt,boundary,addDays} from './core.mjs';
import {checkVoiceSource} from './voice.mjs';
import {correctSharedReports} from './sharing.mjs';

// Work on an isolated vault; only commit after every record and cross-record rule passes.
export function saveDiaryBatch(store,user,body,now=new Date().toISOString()) {
  const {operationId,date,records}=body;
  const fail=(code,status=400)=>{throw Object.assign(new Error(code),{status});};
  if(!/^[a-zA-Z0-9_-]{1,80}$/.test(operationId||'')||!validDate(date)||!Array.isArray(records)||!records.length||records.length>31)fail('invalid_diary_batch');
  const digest=createHash('sha256').update(JSON.stringify({date,records})).digest('hex');
  const previous=user.vault.diaryBatches?.find(x=>x.id===operationId);
  if(previous){if(previous.digest!==digest)fail('revision_batch_payload',409);return {duplicate:true,revision:user.vault.revision};}
  if(records.filter(x=>x?.kind==='days').length!==1||records.some(x=>!['days','episodes','medications','preventives'].includes(x?.kind)))fail('invalid_diary_batch');
  const next=structuredClone(user),v=next.vault,seen=new Set(),lo=boundary(date,v.timezone),hi=boundary(addDays(date,1),v.timezone);
  for(const [i,item] of records.entries()){
    const {kind,record}=item,key=kind+':'+record?.id;
    if(seen.has(key))fail('invalid_diary_batch');seen.add(key);
    checkVoiceSource(store,user.id,record||{},v[kind].find(r=>r.id===record?.id));
    const result=applyRecord(v,kind,record,operationId+'_'+i,now),r=result.record;
    if(!r)fail('revision_batch_payload',409);
    if(kind==='days'&&r.date!==date||kind==='medications'&&dateAt(r.at,v.timezone)!==date)fail('invalid_diary_date');
    if(kind==='episodes'&&!(Date.parse(r.start)<hi&&(r.end?Date.parse(r.end):r.endStatus==='ongoing'?Date.parse(now)+1:Date.parse(r.start)+1)>lo))fail('invalid_diary_date');
  }
  const day=v.days.find(r=>r.date===date);
  if(day.headache==='no'&&v.episodes.some(r=>Date.parse(r.start)<hi&&(r.end?Date.parse(r.end):r.endStatus==='ongoing'?Date.parse(now)+1:Date.parse(r.start)+1)>lo))fail('invalid_diary_headache_conflict');
  if(day.acute==='no'&&v.medications.some(r=>dateAt(r.at,v.timezone)===date))fail('invalid_diary_medication_conflict');
  (v.diaryBatches??=[]).push({id:operationId,digest});
  correctSharedReports(store,next);
  store.save(next,{history:true});
  store.audit(user.id,'diary_batch_saved');
  return {duplicate:false,revision:v.revision,count:records.length};
}
