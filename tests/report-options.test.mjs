import test from 'node:test';
import assert from 'node:assert/strict';
import {reportLanguage,reportPeriod} from '../public/report-options.mjs';
import {createReport,emptyVault,validate} from '../public/domain.mjs';
import {createApp} from '../server/main.mjs';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('Report defaults follow UI language while fixed preferences preserve independent report language',()=>{
 const v={language:'zh',reportLanguage:'en'};
 for(const language of ['zh','en','es','fr','ru','ar'])assert.equal(reportLanguage(v,language),language);
 assert.equal(reportLanguage({...v,reportLanguageMode:'fixed'},'zh'),'en');
 const vault=emptyVault('2026-10-11T00:00:00Z');vault.enrolled='2026-09-01';
 const snapshot=createReport(vault,'2026-09-01','2026-09-28','en');
 assert.equal(reportLanguage(vault,'zh'),'zh');assert.equal(snapshot.language,'en');
});
test('Combined period control keeps calendar month, rolling 28 days and custom dates distinct',()=>{
 const now='2026-10-11T04:00:00Z',zone='Asia/Shanghai';
 assert.deepEqual(reportPeriod('month',now,zone),{from:'2026-09-01',to:'2026-09-30'});
 assert.deepEqual(reportPeriod('range28',now,zone),{from:'2026-09-13',to:'2026-10-10'});
 assert.deepEqual(reportPeriod('week',now,zone),{from:'2026-09-28',to:'2026-10-04'});
 assert.equal(reportPeriod('custom',now,zone),null);
 assert.deepEqual(reportPeriod('month','2024-03-10T00:00:00Z',zone),{from:'2024-02-01',to:'2024-02-29'});
});
test('Medication response without observation time is rejected instead of silently discarded',()=>{
 const r={id:'response-time',revision:0,name:'SYNTHETIC medication',at:'2026-09-01T10:00:00Z',dose:200,unit:'mg',drugClass:'other',followup:{at:null,painFree:'yes',functionRecovered:'unknown'}};
 assert.throws(()=>validate('medications',r),/followup_time_required/);
 assert.equal(validate('medications',{...r,followup:{...r.followup,at:'2026-09-01T12:00:00Z'}}).followup.painFree,'yes');
});
test('Language preference HTTP round-trip supports follow-interface, explicit fixed and old callers',async t=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'headache-report-options-')),app=createApp({directory:dir,port:0,schedule:false});const port=await app.listen(),origin='http://127.0.0.1:'+port;let cookie='',csrf='';
 t.after(async()=>{await app.close();rmSync(dir,{recursive:true,force:true});});
 async function call(url,body){const r=await fetch(origin+url,{method:body===undefined?'GET':'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json','X-CSRF-Token':csrf},body:body===undefined?undefined:JSON.stringify(body)});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,data:await r.json()};}
 await call('/api/demo',{});const state=(await call('/api/state')).data;csrf=state.csrf;const v=state.vault;
 const payload={language:'zh',reportLanguage:'en',timezone:v.timezone,enrolled:v.enrolled,reminder:v.reminder};
 assert.equal((await call('/api/settings',{...payload,reportLanguageMode:'interface'})).status,200);
 assert.equal(reportLanguage((await call('/api/state')).data.vault),'zh');
 assert.equal((await call('/api/settings',{...payload,reportLanguageMode:'fixed'})).status,200);
 assert.equal(reportLanguage((await call('/api/state')).data.vault),'en');
 assert.equal((await call('/api/settings',{...payload,reportLanguage:'fr'})).status,200);
 assert.equal(reportLanguage((await call('/api/state')).data.vault),'fr');
 assert.equal((await call('/api/settings',{...payload,reportLanguageMode:'invalid'})).status,400);
 assert.equal(reportLanguage((await call('/api/state')).data.vault),'fr');
});
