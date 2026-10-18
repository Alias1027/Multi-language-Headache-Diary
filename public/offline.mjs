let dbPromise;
function db(){return dbPromise??=new Promise((resolve,reject)=>{const q=indexedDB.open('headache-diary-private',1);q.onupgradeneeded=()=>q.result.createObjectStore('private');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});}
async function request(mode,action){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('private',mode),r=action(tx.objectStore('private'));tx.oncomplete=()=>resolve(r?.result);tx.onerror=()=>reject(tx.error);});}
async function key(){let k=await request('readonly',s=>s.get('key'));if(!k){k=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);await request('readwrite',s=>s.put(k,'key'));}return k;}
export const localVault={
  async put(name,value){const iv=crypto.getRandomValues(new Uint8Array(12)),k=await key();const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(name)},k,new TextEncoder().encode(JSON.stringify(value)));await request('readwrite',s=>s.put({iv,data},name));},
  async get(name){const e=await request('readonly',s=>s.get(name));if(!e)return null;const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:e.iv,additionalData:new TextEncoder().encode(name)},await key(),e.data);return JSON.parse(new TextDecoder().decode(bytes));},
  async remove(name){await request('readwrite',s=>s.delete(name));},
  async clear(){await request('readwrite',s=>s.clear());}
};
