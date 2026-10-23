let sequence=0;
const calls=new Map();
globalThis.nativeResult=(id,result)=>{const p=calls.get(id);if(!p)return;calls.delete(id);result.ok?p.resolve(result.value):p.reject(new Error(result.error||'nativeError'));};
export function native(method,args={}){return new Promise((resolve,reject)=>{if(!globalThis.AndroidBridge){reject(new Error('androidOnly'));return;}const id=String(++sequence);calls.set(id,{resolve,reject});AndroidBridge.call(id,method,JSON.stringify(args));});}
export const storage={get:key=>native('get',{key}),put:(key,value)=>native('put',{key,value}),remove:key=>native('remove',{key}),all:()=>native('all'),replace:value=>native('replace',{value})};
// Only one trusted WebView exists in the Android activity; the native executor
// serializes database writes. Web Locks additionally protect shared JS tasks.
export const locks=globalThis.navigator?.locks;
