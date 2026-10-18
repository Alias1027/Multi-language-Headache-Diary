import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {catalogs,languages,uiText,translate,direction} from '../public/i18n.mjs';
import {LANGUAGES,CODES,createReport} from '../public/domain.mjs';
import {syntheticVault} from '../server/fixtures.mjs';
import {reportLanguage} from '../public/report-options.mjs';
import {diaryText} from '../public/diary-ui.mjs';
import {voiceText,voiceEvidenceValue} from '../public/voice-ui.mjs';
import {workspaceText} from '../public/workspace-i18n.mjs';
import {assessmentText} from '../public/episode-assessment.mjs';
import {createApp} from '../server/main.mjs';

test('Eight complete catalogs have matching namespaces and keys without UI-language fallback',()=>{
 assert.deepEqual(LANGUAGES,['zh','en','es','fr','ru','ar','hi','ur']);
 assert.deepEqual(Object.keys(languages),LANGUAGES);
 for(const lang of LANGUAGES)for(const [group,base] of Object.entries(catalogs.en)){
  assert.deepEqual(Object.keys(catalogs[lang][group]).sort(),Object.keys(base).sort(),lang+':'+group);
  for(const key of Object.keys(base)){const value=uiText(lang,group,key);assert.equal(value,catalogs[lang][group][key]);assert.ok(value.trim());assert.ok(!/undefined|\[object Object\]/.test(value));}
 }
 for(const lang of ['hi','ur']){
  assert.match(translate(lang,'app'),lang==='hi'?/\p{Script=Devanagari}/u:/\p{Script=Arabic}/u);
  assert.notEqual(translate(lang,'yes'),translate(lang,'no'));assert.notEqual(translate(lang,'unknown'),translate(lang,'no'));
  assert.notEqual(translate(lang,'left'),translate(lang,'right'));
  for(const key of Object.values(CODES).flat())assert.notEqual(translate(lang,key),key);
 }
});
test('Patient, clinician, clinical assessment and voice labels all resolve in each selected UI language',()=>{
 for(const lang of LANGUAGES)for(const [g,fn] of [['diary',diaryText],['workspace',workspaceText],['assessment',assessmentText],['voice',voiceText]]){
  for(const key of Object.keys(catalogs.en[g]))assert.equal(fn(lang,key),catalogs[lang][g][key]);
  assert.equal(fn(lang,'__missing__'),undefined);
 }
 assert.equal(direction('hi'),'ltr');assert.equal(direction('ur'),'rtl');assert.equal(direction('ar'),'rtl');assert.equal(direction('en'),'ltr');
});
test('Hindi and Urdu report choices preserve numerical facts, identifiers and original free text',()=>{
 const v=syntheticVault(),original=JSON.stringify(v),now='2026-10-13T00:00:00Z';
 const ref=createReport(v,'2026-09-01','2026-09-28','en',now).summary;
 for(const lang of LANGUAGES){assert.equal(reportLanguage(v,lang),lang);const report=createReport(v,'2026-09-01','2026-09-28',lang,now);assert.equal(report.language,lang);assert.equal(report.glossaryVersion,'0.2.0');assert.deepEqual(report.summary,ref);}
 assert.equal(JSON.stringify(v),original);
 assert.equal(reportLanguage({...v,reportLanguageMode:'fixed',reportLanguage:'ur'},'hi'),'ur');
});
test('Every local translation module is included in the offline shell cache',()=>{
 const source=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');
 for(const lang of LANGUAGES)assert.ok(source.includes("'/locales/"+lang+".mjs'"),lang);
 assert.ok(source.includes("'/locale-registry.mjs'"));
});
test('New UI languages round-trip through settings and reports without silently expanding speech support',async t=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'headache-eight-locales-'));
 const app=createApp({directory:dir,port:0,schedule:false}),port=await app.listen(),origin='http://127.0.0.1:'+port;
 t.after(async()=>{await app.close();rmSync(dir,{recursive:true,force:true});});let cookie='',csrf='';
 const call=async(url,body)=>{const r=await fetch(origin+url,{method:body===undefined?'GET':'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json','X-CSRF-Token':csrf},body:body===undefined?undefined:JSON.stringify(body)});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,data:await r.json()};};
 await call('/api/demo',{});const initial=(await call('/api/state')).data;csrf=initial.csrf;const v=initial.vault;
 for(const language of ['hi','ur']){
  assert.equal((await call('/api/settings',{language,reportLanguage:language,reportLanguageMode:'interface',timezone:v.timezone,enrolled:v.enrolled,reminder:v.reminder})).status,200);
  const current=(await call('/api/state')).data.vault;assert.equal(current.language,language);assert.equal(reportLanguage(current),language);
  const report=await call('/api/report',{from:'2026-09-01',to:'2026-09-28',language});assert.equal(report.status,200);assert.equal(report.data.language,language);
 }
 assert.deepEqual((await call('/api/voice/config')).data.languages,['zh','en']);
 assert.equal((await call('/api/voice/note',{id:'unsupported-hi',revision:0,language:'hi',text:'सिरदर्द'})).status,400);
 assert.equal((await call('/api/voice/notes')).data.notes.length,0);
});


test('RTL ranges retain number order and voice free text is never translated as an enum',()=>{
 for(const language of ['ar','ur']){
  assert.ok(translate(language,'response').includes('\u206690–150\u2069'));
  for(const rows of Object.values(catalogs[language]))for(const text of Object.values(rows))assert.equal((text.match(/\u2066/g)||[]).length,(text.match(/\u2069/g)||[]).length);
 }
 for(const language of LANGUAGES){assert.equal(voiceEvidenceValue(language,{field:'name',value:'left'}),'left');assert.equal(voiceEvidenceValue(language,{field:'responseNote',value:'unknown'}),'unknown');assert.equal(voiceEvidenceValue(language,{field:'location',value:'left'}),translate(language,'left'));}
});
