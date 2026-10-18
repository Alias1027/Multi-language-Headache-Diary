const clone=value=>structuredClone(value);
export const draftRegistryKey=uid=>'diary-drafts-v2-'+uid;
export function createDraftStore({storage,locks=globalThis.navigator?.locks}={}){
  const guarded=(uid,task)=>{if(!locks?.request)throw new Error('storageLockUnavailable');return locks.request('headache-diary-drafts-'+uid,task);};
  const read=async uid=>await storage.get(draftRegistryKey(uid))||{drafts:{}};
  async function migrate(uid){return guarded(uid,async()=>{const legacy=await storage.get('unified-draft-'+uid);if(!legacy)return;const bag=await read(uid);if(legacy.changed&&legacy.uid===uid){legacy.operationId||=crypto.randomUUID();bag.drafts[legacy.operationId]??=legacy;await storage.put(draftRegistryKey(uid),bag);}await storage.remove('unified-draft-'+uid);});}
  async function save(uid,draft){if(draft.uid!==uid||!draft.operationId)throw new Error('reauthSameAccount');return guarded(uid,async()=>{const bag=await read(uid);bag.drafts[draft.operationId]=clone(draft);await storage.put(draftRegistryKey(uid),bag);});}
  async function remove(uid,operationId){return guarded(uid,async()=>{const bag=await read(uid);delete bag.drafts[operationId];await storage.put(draftRegistryKey(uid),bag);});}
  async function list(uid){return Object.values((await read(uid)).drafts);}
  // Hold an editor lease for this page's lifetime. A duplicated tab must fork
  // the operation, so independent drafts never overwrite a shared key.
  async function claim(uid,operationId){
    if(!locks?.request)throw new Error('storageLockUnavailable');
    let ready;const result=new Promise(resolve=>{ready=resolve;});
    locks.request('headache-diary-editor-'+uid+'-'+operationId,{ifAvailable:true},async lock=>{
      if(!lock){ready(null);return;}
      await new Promise(release=>{ready(release);});
    }).catch(()=>ready(null));
    return result;
  }
  return {migrate,save,remove,list,claim};
}
