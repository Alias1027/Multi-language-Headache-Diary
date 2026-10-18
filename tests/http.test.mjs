import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';import os from 'node:os';import path from 'node:path';import http from 'node:http';import {createApp} from '../server/main.mjs';
test('Full HTTP flow: registration, mock verification, entries, report, scoped sharing, access controls',async t=>{
  const dir=mkdtempSync(path.join(os.tmpdir(),'headache-http-')),app=createApp({directory:dir,port:0,schedule:false});const port=await app.listen(),origin='http://127.0.0.1:'+port;let cookie='',csrf='';
  t.after(async()=>{await app.close();rmSync(dir,{recursive:true,force:true});});
  async function call(url,body,extra={}){const r=await fetch(origin+url,{method:body===undefined?'GET':'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json','X-CSRF-Token':csrf,...extra},body:body===undefined?undefined:JSON.stringify(body)});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,data:await r.json(),headers:r.headers};}
  assert.equal((await call('/api/state')).status,401);
  assert.equal((await call('/api/register',{email:'case@example.invalid',password:'synthetic-test-password'})).status,201);
  let s=await call('/api/state');csrf=s.data.csrf;assert.equal(s.data.user.verified,false);
  const code=(await call('/api/mailbox')).data.verification;assert.equal((await call('/api/verify',{code})).status,200);
  assert.equal((await call('/api/settings',{language:'zh',reportLanguage:'ar',timezone:'Asia/Shanghai',enrolled:'2026-09-01',reminder:{enabled:false,time:'20:00'}})).status,200);
  const record={kind:'days',record:{preventiveTaken:'not_applicable',dailyImpact:'unknown',id:'daily-1',revision:0,date:'2026-09-01',headache:'yes',acute:'unknown'},operationId:'op-1'};
  assert.equal((await call('/api/records',record,{'X-CSRF-Token':'bad'})).status,403);
  assert.equal((await call('/api/records',record,{Origin:'https://evil.example'})).status,403);
  assert.equal((await call('/api/records',record)).status,200);
  assert.equal((await call('/api/records',record)).data.duplicate,true);
  assert.equal((await call('/api/report',{from:'2026-09-01',to:'2026-09-28',language:'ar'})).data.summary.headacheDays,1);
  assert.equal((await call('/api/share',{from:'2026-09-01',to:'2026-09-28',language:'ar'})).status,400);
  assert.equal((await call('/api/consent',{active:true,frequency:'weekly',scope:'summary',expires:'2099-01-01'})).status,200);
  await call('/api/share',{from:'2026-09-01',to:'2026-09-28',language:'ar'});await call('/api/process',{});
  const receipts=(await call('/api/receipts')).data.receipts;assert.equal(receipts.length,1);
  const p=await call('/api/packet?id='+receipts[0].transfer_id);assert.equal(p.data.alg,'A256GCM');assert.equal(p.data.key,undefined);
  const fhir=await call('/api/export?format=fhir');assert.equal(fhir.data.entry[0].resource.resourceType,'QuestionnaireResponse');
  const firstCookie=cookie;await call('/api/demo',{});const second=await call('/api/state');csrf=second.data.csrf;assert.equal((await call('/api/packet?id='+receipts[0].transfer_id)).status,404);assert.equal((await call('/api/receipts')).data.receipts.length,0);
  const shell=await fetch(origin+'/');assert.match(shell.headers.get('content-security-policy'),/frame-ancestors 'none'/);assert.equal(shell.status,200);const badHost=await new Promise(resolve=>{http.get(origin+'/api/health',{headers:{Host:'attacker.test'}},r=>{r.resume();resolve(r.statusCode);});});assert.equal(badHost,403);
  cookie=firstCookie;csrf=(await call('/api/state')).data.csrf;await call('/api/logout',{});assert.equal((await call('/api/state')).status,401);
});
