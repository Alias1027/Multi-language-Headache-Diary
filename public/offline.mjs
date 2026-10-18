let dbPromise;
function db(){return dbPromise??=new Promise((resolve,reject)=>{const q=indexedDB.open('headache-diary-private',1);q.onupgradeneeded=()=>q.result.createObjectStore('private');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});}
async function request(mode,action){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('private',mode),r=action(tx.objectStore('private'));tx.oncomplete=()=>resolve(r?.result);tx.onerror=tx.onabort=()=>reject(tx.error||new Error('offlineSaveFailed'));});}
async function key(){let k=await request('readonly',s=>s.get('key'));if(k)return k;const candidate=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']),d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('private','readwrite'),store=tx.objectStore('private'),get=store.get('key');get.onsuccess=()=>{k=get.result||candidate;if(!get.result)store.put(k,'key');};tx.oncomplete=()=>resolve(k);tx.onerror=tx.onabort=()=>reject(tx.error);});}
function guarded(task,write=false){if(globalThis.navigator?.locks?.request)return navigator.locks.request('headache-diary-private-storage',task);if(write)throw new Error('storageLockUnavailable');return task();}
async function readValue(name){const e=await request('readonly',s=>s.get(name));if(!e)return null;const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:e.iv,additionalData:new TextEncoder().encode(name)},await key(),e.data);return JSON.parse(new TextDecoder().decode(bytes));}
async function assertClearable(){for(const name of await request('readonly',s=>s.getAllKeys())){if(typeof name!=='string')continue;if(name.startsWith('diary-drafts-v2-')){const bag=await readValue(name);if(Object.values(bag?.drafts||{}).some(d=>d.changed))throw new Error('signoutDrafts');}else if(name.startsWith('unified-draft-')){if((await readValue(name))?.changed)throw new Error('signoutDrafts');}}}
export const localVault={
  async put(name,value){return guarded(async()=>{const iv=crypto.getRandomValues(new Uint8Array(12)),k=await key();const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(name)},k,new TextEncoder().encode(JSON.stringify(value)));await request('readwrite',s=>s.put({iv,data},name));},true);},
  async get(name){return guarded(()=>readValue(name));},
  async remove(name){return guarded(()=>request('readwrite',s=>s.delete(name)),true);},
  async assertClearable(){return guarded(assertClearable);},
  async clear(){return guarded(async()=>{await assertClearable();return request('readwrite',s=>s.clear());},true);}
};
