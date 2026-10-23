import {emptyVault,applyRecord,dateAt,validate,validDate} from '../../public/domain.mjs';
import {createOfflineQueue,JOURNAL_KEY} from '../../public/offline-queue.mjs';
export const PROFILE_KEY='android-profile-v1';
const clone=x=>structuredClone(x);
export function httpsOrigin(value){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw new Error('httpsOnly');return u.origin;}
export function createEngine({storage,locks,now=()=>new Date().toISOString()}){
 const journalStorage={...storage,put:async(k,v)=>{if(k===JOURNAL_KEY){v=clone(v);delete v.baseState?.csrf;v.history??=[];for(const p of v.pending)if(!v.history.some(h=>h.operationId===p.operationId))v.history.push(clone(p));}return storage.put(k,v);}};
 const queue=createOfflineQueue({storage:journalStorage,locks,now});
 let profile;
 async function load(){profile=await storage.get(PROFILE_KEY);await queue.load();return profile;}
 async function initialize(language,timezone,enrolled){
  if(await storage.get(PROFILE_KEY))throw new Error('profileExists');
  new Intl.DateTimeFormat('en',{timeZone:timezone}).format();
  if(!validDate(enrolled)||enrolled>dateAt(now(),timezone))throw new Error('invalid_date');
  if(!['zh','en','es','fr','ru','ar','hi','ur'].includes(language))throw new Error('invalid_language');
  const id=crypto.randomUUID(),vault={...emptyVault(now()),language,reportLanguage:language,timezone,enrolled};
  profile={schema:1,id,language,binding:null,createdAt:now()};
  await storage.replace({[PROFILE_KEY]:profile,[JOURNAL_KEY]:{schema:2,baseState:{user:{id,role:'patient',email:''},vault},pending:[],history:[]}});await load();
 }
 async function bind(remote,origin){
  origin=httpsOrigin(origin);
  if(remote?.user?.role!=='patient')throw new Error('patientOnly');
  if(profile.binding&&(profile.binding.origin!==origin||profile.binding.userId!==remote.user.id))throw new Error('sameAccount');
  const j=queue.snapshot(),local=queue.view().vault;
  // Reauthentication must never downgrade the last confirmed server snapshot.
  // Pending local revisions remain separate and are checked against the server below.
  if(profile.binding&&j.baseState.vault.revision>remote.vault.revision)throw new Error('offlineRevisionConflict');
  if(j.pending.length&&(local.timezone!==remote.vault.timezone||local.enrolled<remote.vault.enrolled))throw new Error('dateConflict');
  const next=clone(j);next.baseState=clone(remote);delete next.baseState.csrf;
  next.pending.forEach(p=>{p.userId=remote.user.id;});
  const verify=clone(remote.vault);
  for(const item of next.pending){if(verify.diaryBatches?.some(b=>b.id===item.operationId))continue;for(const [i,row] of item.records.entries())applyRecord(verify,row.kind,row.record,item.operationId+'_'+i,item.queuedAt);}
  const all=await storage.all(),oldId=j.baseState.user.id;
  for(const key of Object.keys(all)){if(key==='diary-drafts-v2-'+oldId){const drafts=clone(all[key]);Object.values(drafts.drafts).forEach(d=>{d.uid=remote.user.id;});delete all[key];all['diary-drafts-v2-'+remote.user.id]=drafts;}}
  const linked={...profile,binding:{origin,userId:remote.user.id,email:remote.user.email,linkedAt:profile.binding?.linkedAt||now()}};
  await storage.replace({...all,[PROFILE_KEY]:linked,[JOURNAL_KEY]:next});await load();return linked;
 }
 async function save(batch){await queue.enqueue('diary-batch',batch,queue.view().user.id);return {queued:true};}
 async function sync(api){if(!profile.binding)throw new Error('linkFirst');return queue.sync({readState:async()=>{const s=await api('/api/state');if(s.user.id!==profile.binding.userId)throw new Error('sameAccount');return s;},send:(path,body)=>api(path,body)});}
 async function language(value){profile={...profile,language:value};await storage.put(PROFILE_KEY,profile);}
 return {load,initialize,bind,save,sync,language,view:()=>queue.view(),pending:()=>queue.snapshot().pending,profile:()=>clone(profile)};
}
export function validateSnapshot(s){
 if(!s||typeof s!=='object'||!s[PROFILE_KEY]||s[PROFILE_KEY].schema!==1)throw new Error('invalidBackup');
 const p=s[PROFILE_KEY],j=s[JOURNAL_KEY];
 if(!['zh','en','es','fr','ru','ar','hi','ur'].includes(p.language)||!j||j.schema!==2||!j.baseState?.user?.id||!Array.isArray(j.pending)||!Array.isArray(j.history))throw new Error('invalidBackup');
 if(p.binding){httpsOrigin(p.binding.origin);if(p.binding.userId!==j.baseState.user.id)throw new Error('invalidBackup');}
 if(j.baseState.user.role!=='patient')throw new Error('invalidBackup');
 const v=j.baseState.vault;new Intl.DateTimeFormat('en',{timeZone:v.timezone}).format();
 for(const kind of ['days','episodes','medications','preventives']){if(!Array.isArray(v[kind]))throw new Error('invalidBackup');for(const r of v[kind])validate(kind,r);}
 for(const item of j.pending){if(item.type!=='diary-batch'||item.userId!==j.baseState.user.id||!Array.isArray(item.records))throw new Error('invalidBackup');for(const row of item.records)validate(row.kind,row.record);}
 for(const key of Object.keys(s))if(key!==PROFILE_KEY&&key!==JOURNAL_KEY&&key!=='android-care-cache'&&!key.startsWith('diary-drafts-v2-')&&!key.startsWith('audio-'))throw new Error('invalidBackup');
 return clone(s);
}
