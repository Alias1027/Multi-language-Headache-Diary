import test from 'node:test';
import assert from 'node:assert/strict';
import {requestJSON} from '../public/network.mjs';

test('JSON request returns successful responses and preserves HTTP rejection status',async t=>{
  let current=new Response('{"ok":true}');t.mock.method(globalThis,'fetch',async()=>current);
  assert.deepEqual(await requestJSON('/api/test'),{ok:true});
  for(const status of [401,403,409,429,500]){
    current=new Response('{"error":"synthetic_rejection"}',{status});
    await assert.rejects(requestJSON('/api/test'),e=>e.status===status&&e.message==='synthetic_rejection'&&!e.network);
  }
  current=new Response('<html>unavailable</html>',{status:503});
  await assert.rejects(requestJSON('/api/test'),e=>e.status===503&&!e.network);
});
test('JSON request treats missing transport or incomplete successful response as retryable ambiguity',async t=>{
  const mock=t.mock.method(globalThis,'fetch',async()=>{throw new TypeError('offline');});
  await assert.rejects(requestJSON('/api/test'),e=>e.network===true&&e.message==='network_unavailable');
  mock.mock.mockImplementation(async()=>new Response('{"incomplete":'));
  await assert.rejects(requestJSON('/api/test'),e=>e.network===true&&e.message==='network_response_incomplete');
});
test('JSON request bounds stalled requests and aborts without retrying the write itself',async t=>{
  let requests=0,signal;
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    requests++;signal=options.signal;
    return new Promise((resolve,reject)=>{signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true});});
  });
  await assert.rejects(requestJSON('/api/test',{method:'POST',body:'{"operationId":"stable"}'},20),e=>e.network===true&&e.message==='network_timeout');
  assert.equal(signal.aborted,true);assert.equal(requests,1);
});
