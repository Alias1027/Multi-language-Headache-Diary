import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {APP_VERSION} from '../public/release.mjs';
const worker=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');
function harness({cached=new Map(),network=async()=>{throw Error('offline');},install=async()=>{},storageFull=false}={}){
  const handlers={},puts=[],deletes=[],matches=[];let skips=0;
  const self={location:{origin:'https://diary.example.invalid'},addEventListener:(name,fn)=>handlers[name]=fn,skipWaiting:()=>skips++,clients:{claim:async()=>{}}};
  const caches={open:async()=>({addAll:install,put:async(key,response)=>{if(storageFull)throw Error('QuotaExceededError');puts.push(key);cached.set(key,response);}}),match:async(key,options)=>{matches.push({key,options});return cached.get(key)?.clone();},keys:async()=>['headache-shell-0.6.1','headache-shell-'+APP_VERSION,'other-app-cache'],delete:async key=>deletes.push(key)};
  vm.runInNewContext(worker,{self,caches,fetch:network,URL,Response,AbortController,setTimeout:(fn)=>setTimeout(fn,20),clearTimeout});
  const get=(pathname,mode='cors')=>{let response;handlers.fetch({request:{url:'https://diary.example.invalid'+pathname,method:'GET',mode},respondWith:value=>response=value});return response;};
  return {handlers,get,puts,deletes,matches,skips:()=>skips};
}
test('Cached shell and locale return immediately without network or query-specific cache copies',async()=>{
  let requests=0;const h=harness({cached:new Map([['/index.html',new Response('shell')],['/locales/ur.mjs',new Response('urdu')]]),network:async()=>{requests++;throw Error('unexpected network');}});
  assert.equal(await (await h.get('/?v='+APP_VERSION,'navigate')).text(),'shell');
  assert.equal(await (await h.get('/locales/ur.mjs?cache=other')).text(),'urdu');
  assert.equal(requests,0);assert.equal(h.puts.length,0);
  assert.ok(h.matches.every(x=>x.options.cacheName==='headache-shell-'+APP_VERSION));
});
test('Uncached slow resource fails within bounded wait; API is never intercepted',async()=>{
  let aborted=false;const h=harness({network:async(request,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(Error('timeout'));},{once:true}))});
  const response=await h.get('/app.mjs');assert.equal(response.status,503);assert.equal(aborted,true);
  assert.equal(h.get('/api/state'),undefined);assert.equal(h.puts.length,0);
});
test('Only allowlisted successful nonredirected static assets enter cache',async()=>{
  const h=harness({network:async()=>new Response('asset')});
  await h.get('/app.mjs?first=1');await h.get('/unknown.txt');
  assert.deepEqual(h.puts,['/app.mjs']);
  const rejected=harness({network:async()=>new Response('unauthorized',{status:401})});await rejected.get('/app.mjs');assert.equal(rejected.puts.length,0);
});
test('Failed worker install preserves old cache and waits for old tabs on successful install',async()=>{
  const h=harness({install:async()=>{throw Error('network lost');}});let installPromise;
  h.handlers.install({waitUntil:p=>installPromise=p});await assert.rejects(installPromise,/network lost/);
  assert.deepEqual(h.deletes,[]);assert.equal(h.skips(),0);
  const ready=harness();ready.handlers.install({waitUntil:p=>installPromise=p});await installPromise;assert.equal(ready.skips(),0);
  let activation;ready.handlers.activate({waitUntil:p=>activation=p});await activation;
  assert.deepEqual(ready.deletes,['headache-shell-0.6.1']);assert.doesNotMatch(worker,/indexedDB|localStorage|sessionStorage/);
});
test('Storage pressure does not discard an otherwise successful static response',async()=>{
  const h=harness({storageFull:true,network:async()=>new Response('usable online module')});
  const response=await h.get('/app.mjs');assert.equal(response.status,200);assert.equal(await response.text(),'usable online module');assert.equal(h.puts.length,0);
});
test('Network time limit also covers a response body stalled after successful headers',async()=>{
  let aborted=false;
  const h=harness({network:async(request,{signal})=>({status:200,headers:new Headers(),arrayBuffer:()=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(Error('body timeout'));},{once:true}))})});
  const response=await h.get('/app.mjs');assert.equal(response.status,503);assert.equal(aborted,true);assert.equal(h.puts.length,0);
});
