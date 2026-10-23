import {approveClinician,saveGrant} from '../server/care-access.mjs';
import {careContext,ensureDemoPair,saveCare,loadCare} from '../server/care.mjs';
import {randomUUID} from 'node:crypto';
// Optional patient workflow regression; disposable synthetic records only.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtempSync,mkdirSync,rmSync,writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../server/main.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const output=process.argv[2]?path.resolve(process.argv[2]):null;
if(output)mkdirSync(output,{recursive:true});
const directory=mkdtempSync(path.join(os.tmpdir(),'headache-patient-browser-'));
const app=createApp({directory,port:0,schedule:false}),results=[],errors=[];
let browser;
try {
 const port=await app.listen(),origin='http://127.0.0.1:'+port;
 browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
 const page=await browser.newPage({viewport:{width:929,height:764}});
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto(origin);await page.locator('[data-action=demo]').click();await page.locator('.voice-launcher').waitFor();
 const initial=await page.evaluate(async()=> (await fetch('/api/state')).json());
 const save=async selector=>{
  const response=page.waitForResponse(r=>r.url().endsWith('/api/care/save')&&r.request().method()==='POST');
  await page.locator(selector+' button[type=submit]').first().click();const r=await response;assert.equal(r.status(),200,await r.text());const data=await r.json();await page.locator(selector+' button[type=submit]:not([disabled])').first().waitFor({state:'attached'});return data;
 };
 await page.locator('[data-page=advice]').click();await page.locator('[data-action=care-tab][data-tab=plans]').click();
 await page.locator('.care-editor > summary').click();
 await page.locator('#patient-plan-form [name=medication]').fill('Synthetic advice A');
 await page.locator('#patient-plan-form [name=sourceNote]').fill('Synthetic visit; patient transcription');
 await page.locator('#patient-plan-form [name=observationFocus]').fill('Headache days and activity');
 const own=await save('#patient-plan-form');assert.equal(own.care.patientPlans[0].status,'recorded');
 await page.locator('.feedback-form [name=status]').selectOption('started');
 await page.locator('.feedback-form [name=actualStart]').fill('2026-09-15');
 await page.locator('.feedback-form [name=perceivedChange]').selectOption('better');
 await save('.feedback-form');await page.locator('.plan-observation table').waitFor();
 results.push({check:'patient advice with source, actual start, feedback and observation'});
 await page.locator('[data-action=care-amend][data-kind=patientPlans]').click();
 await page.locator('#patient-plan-form [name=medication]').fill('Synthetic advice revised');
 await page.locator('#patient-plan-form [name=amendReason]').fill('Corrected patient transcription');
 const revision=await save('#patient-plan-form');assert.equal(revision.care.patientPlans.length,2);
 assert.equal(await page.locator('.feedback-form').count(),1);
 results.push({check:'patient amendment preserves original and only current advice accepts feedback'});
 // Seed a confirmed synthetic plan; the independent clinician browser suite
 // separately covers account approval, consent, review and confirmation.
 const patient=app.store.get(initial.user.id),clinician=approveClinician(app.store,ensureDemoPair(app.store,patient).id);
 saveGrant(app.store,patient,{code:clinician.profile.careCode,label:'Synthetic',days:30,consent:true});
 saveCare(app.store,careContext(app.store,clinician,patient.id),{kind:'plans',revision:loadCare(app.store,patient.id).revision,operationId:randomUUID(),record:{status:'confirmed',change:'start',medication:'Synthetic clinician plan',dose:'Demonstration only',route:'Demonstration only',frequency:'Demonstration only',start:'2026-09-15',reason:'Synthetic follow-up',observationFocus:'Function and symptoms'}});
 await page.locator('[data-action=care-refresh]').click();await page.waitForFunction(()=>document.querySelectorAll('.feedback-form').length===2);
 const forms=page.locator('.feedback-form');assert.equal(await forms.count(),2);
 await forms.first().locator('[name=status]').selectOption('difficulty');
 await forms.first().locator('[name=actualStart]').fill('2026-09-15');
 await forms.first().locator('[name=difficultyReason]').selectOption('unclear');
 await forms.first().locator('[name=note]').fill('Synthetic question for next visit');
 await save('.feedback-form:first-of-type');
 results.push({check:'clinician plan remains distinct; patient reports actual implementation'});
 for(const lang of ['zh','en','es','fr','ru','ar','hi','ur']){
  await page.locator('#language-switch').selectOption(lang);await page.waitForFunction(x=>document.documentElement.lang===x,lang);
  for(const width of [929,390]){
   await page.setViewportSize({width,height:764});
   assert.equal(await page.locator('html').getAttribute('dir'),['ar','ur'].includes(lang)?'rtl':'ltr');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'overflow '+lang+' '+width);
   assert.equal(await page.locator('.plan-observation table').count(),1);
   const text=await page.locator('.care-panel').innerText();assert.ok(!/undefined|\[object Object\]|patientReported|observationLimit|care_recorded/.test(text));
   if(output&&width===929){await page.locator('.care-tabs').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,'patient-plans-'+lang+'.png')});}
   results.push({check:'patient plan and observation layout',lang,width});
  }
 }
 const final=await page.evaluate(async()=> (await fetch('/api/state')).json());
 for(const key of ['days','episodes','medications','preventives'])assert.deepEqual(final.vault[key],initial.vault[key]);
 results.push({check:'advice and feedback never alter daily or actual medication records'});
 await page.setViewportSize({width:929,height:764});await page.locator('#language-switch').selectOption('en');
 await page.locator('[data-page=patient]').click();await page.locator('.voice-launcher').click();
 await page.locator('#voice-language').selectOption('en');
 await page.locator('#voice-text').fill('I took ibuprofen 200 mg.');
 await page.locator('[data-voice-action=organize]').click();await page.locator('.voice-candidate').first().waitFor();
 for(const field of ['Dose','Unit']){
  const row=page.locator('.data-table tr').filter({hasText:field});await row.locator('.voice-candidate').uncheck();
 }
 await page.locator('#voice-reviewed').check();await page.locator('[data-voice-action=fill-all]').click();
 await page.locator('.voice-dock-header button').click();
 const medication=page.locator('.diary-event[data-kind=medications]').first();
 assert.equal(await medication.locator('[name=name]').inputValue(),'ibuprofen');
 assert.equal(await medication.locator('[name=dose]').inputValue(),'');
 assert.equal(await medication.locator('[name=unit]').inputValue(),'');
 assert.equal(await medication.locator('[name=at]').inputValue(),'');
 assert.equal(await medication.locator('[name=unit]').getAttribute('required'),'');
 results.push({check:'reviewed voice excludes dose/unit, leaves actual time blank and requires explicit unit'});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:results.length,results,errors},null,2));
} catch(error){errors.push(error.message);process.exitCode=1;console.error(error.stack);}
finally {
 if(output)writeFileSync(path.join(output,'patient-browser-results.json'),JSON.stringify({passed:results.length,results,errors},null,2));
 await browser?.close();await app.close();rmSync(directory,{recursive:true,force:true});
}
