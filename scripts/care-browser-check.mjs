// Optional care workflow regression. All accounts and records are disposable synthetic data.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../server/main.mjs';
import {LANGUAGES,direction} from '../public/locale-registry.mjs';
import {careReportText} from '../public/care-report-ui.mjs';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const output=process.argv[2]?path.resolve(process.argv[2]):null;
if(output)mkdirSync(output,{recursive:true});
const directory=mkdtempSync(path.join(os.tmpdir(),'headache-care-browser-'));
const app=createApp({directory,port:0,schedule:false}),results=[],errors=[];
let browser,page;

try {
 const port=await app.listen(),origin='http://127.0.0.1:'+port;
 browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
 page=await browser.newPage({viewport:{width:929,height:764},acceptDownloads:true});
 page.on('pageerror',error=>errors.push(error.message));
 page.on('dialog',dialog=>dialog.accept());
 const apiState=()=>page.evaluate(async()=> (await fetch('/api/state')).json());
 const getCare=()=>page.evaluate(async()=> (await fetch('/api/care')).json());
 const card=(kind,id)=>page.locator('#care-plan-'+kind+'-'+id);
 async function submit(selector){
  const response=page.waitForResponse(r=>r.url().endsWith('/api/care/save')&&r.request().method()==='POST');
  await page.locator(selector+' button[type=submit]').first().click();
  const r=await response;assert.equal(r.status(),200,await r.text());return r.json();
 }
 async function report(language='en'){
  await page.locator('#report-form [name=from]').fill('2026-09-01');
  await page.locator('#report-form [name=to]').fill('2026-09-28');
  await page.locator('#report-language').selectOption(language);
  const response=page.waitForResponse(r=>r.url().endsWith('/api/report')&&r.request().method()==='POST');
  await page.locator('#report-form button[type=submit]').click();
  const r=await response;assert.equal(r.status(),200,await r.text());const data=await r.json();
  await page.waitForFunction(({language,createdAt})=>{
   const paper=document.querySelector('#report-paper');return paper?.lang===language&&paper.textContent.includes(createdAt);
  },{language,createdAt:data.createdAt});
  return data;
 }
 async function downloadReport(){
  const pending=page.waitForEvent('download');await page.locator('[data-action=download-report]').click();
  const download=await pending;assert.equal(download.suggestedFilename(),'headache-report.json');
  return JSON.parse(readFileSync(await download.path(),'utf8'));
 }
 async function switchRole(role){
  await page.locator('[data-action=switch-role]').click();
  if(role==='patient'){
   await page.locator('.voice-launcher').waitFor();await page.locator('[data-page=report]').click();
  }
  await page.locator(`[data-action=switch-role][data-role=${role==='patient'?'clinician':'patient'}]`).waitFor();
  await page.locator('[data-action=care-tab][data-tab=plans]').click();
 }
 async function sendFeedback(kind,id,values){
  const selector=`#care-plan-${kind}-${id} .feedback-form`;
  const form=page.locator(selector);
  const oldCount=await card(kind,id).locator('.feedback-entry').count();
  for(const [key,value] of Object.entries(values)){
   const input=form.locator(`[name=${key}]`);
   if(['status','perceivedChange','difficultyReason'].includes(key))await input.selectOption(value);else await input.fill(value);
  }
  const data=await submit(selector);
  await page.waitForFunction(({id,kind,count})=>document.querySelectorAll(`#care-plan-${kind}-${id} .feedback-entry`).length===count,{id,kind,count:oldCount+1});
  return data;
 }

 await page.goto(origin);await page.locator('[data-action=demo]').click();await page.locator('.voice-launcher').waitFor();
 const initial=await apiState();
 await page.locator('#language-switch').selectOption('en');
 await page.locator('[data-page=report]').click();await page.locator('[data-action=care-tab][data-tab=plans]').click();
 await page.locator('.care-editor > summary').click();
 await page.locator('#patient-plan-form [name=medication]').fill('Synthetic patient advice A');
 await page.locator('#patient-plan-form [name=sourceNote]').fill('Synthetic clinic conversation transcribed by patient');
 await page.locator('#patient-plan-form [name=observationFocus]').fill('Headache days, function and tolerability');
 const own=await submit('#patient-plan-form'),ownId=own.id;await card('patientPlans',ownId).waitFor();
 await sendFeedback('patientPlans',ownId,{status:'started',actualStart:'2026-09-15',perceivedChange:'better',difficultyReason:'none',adverseNote:'First patient-reported tolerability note',note:'FIRST historical subjective response'});
 await sendFeedback('patientPlans',ownId,{status:'difficulty',actualStart:'2026-09-15',perceivedChange:'worse',difficultyReason:'side_effects',adverseNote:'Second patient-reported tolerability note',note:'SECOND historical subjective response'});
 const oldEntry=card('patientPlans',ownId).locator('.feedback-entry').nth(1);
 assert.equal(await oldEntry.getAttribute('open'),null);await oldEntry.locator('summary').click();
 assert.ok((await oldEntry.innerText()).includes('FIRST historical subjective response'));
 assert.ok((await oldEntry.innerText()).includes('First patient-reported tolerability note'));
 assert.ok((await oldEntry.innerText()).includes('2026-09-15'));
 assert.ok((await oldEntry.innerText()).includes('Better'));
 assert.ok((await card('patientPlans',ownId).locator('.feedback-entry').first().innerText()).includes('SECOND historical subjective response'));
 results.push({check:'patient can expand each historical feedback with original effect, start, note and adverse report'});

 await switchRole('clinician');
 assert.equal(await page.locator('.feedback-form').count(),0);
 await card('patientPlans',ownId).locator('.feedback-entry').nth(1).locator('summary').click();
 assert.ok((await card('patientPlans',ownId).innerText()).includes('FIRST historical subjective response'));
 await page.locator('#care-form [name=medication]').fill('Synthetic clinician plan B');
 for(const key of ['dose','route','frequency'])await page.locator(`#care-form [name=${key}]`).fill('Synthetic '+key+' only');
 await page.locator('#care-form [name=start]').fill('2026-09-18');
 await page.locator('#care-form [name=reason]').fill('Synthetic diary follow-up');
 await page.locator('#care-form [name=status]').selectOption('confirmed');
 const original=await submit('#care-form'),originalId=original.id;await card('plans',originalId).waitFor();
 await switchRole('patient');
 await sendFeedback('plans',originalId,{status:'started',actualStart:'2026-09-18',perceivedChange:'same',difficultyReason:'none',adverseNote:'Original plan tolerability',note:'ORIGINAL plan response retained'});
 await switchRole('clinician');
 await page.locator(`[data-action=care-amend][data-kind=plans][data-id="${originalId}"]`).click();
 await page.locator('#care-form [name=change]').selectOption('adjust');
 await page.locator('#care-form [name=dose]').fill('Synthetic adjusted dose only');
 await page.locator('#care-form [name=amendReason]').fill('AMENDMENT rationale preserved');
 await page.locator('#care-form [name=status]').selectOption('confirmed');
 const amended=await submit('#care-form'),amendedId=amended.id;await card('plans',amendedId).waitFor();
 await switchRole('patient');
 assert.equal(await card('plans',originalId).locator('.feedback-form').count(),0);
 assert.equal(await card('plans',amendedId).locator('.feedback-form').count(),1);
 assert.ok((await card('plans',originalId).innerText()).includes('ORIGINAL plan response retained'));
 await sendFeedback('plans',amendedId,{status:'difficulty',actualStart:'2026-09-20',perceivedChange:'uncertain',difficultyReason:'unclear',adverseNote:'Revised plan tolerability',note:'REVISED plan response retained'});
 const predecessor=card('plans',amendedId).locator(`a[href="#care-plan-plans-${originalId}"]`);
 await predecessor.click();assert.equal(new URL(page.url()).hash,'#care-plan-plans-'+originalId);
 results.push({check:'clinician plan amendment keeps predecessor, reason and correctly linked feedback; superseded plan cannot accept new feedback'});

 const snapshot=await report();
 assert.equal(snapshot.careSummary.plans.length,3);assert.equal(snapshot.careSummary.feedback.length,4);
 assert.ok(snapshot.careSummary.plans.some(p=>p.previousId===originalId&&p.id===amendedId));
 assert.equal(await page.locator('#report-paper .report-care-plan').count(),3);
 assert.equal(await page.locator('#report-paper .feedback-entry').count(),4);
 const snapshotCopy=structuredClone(snapshot);
 assert.deepEqual(await downloadReport(),snapshotCopy);
 assert.ok((await page.locator('#report-paper').textContent()).includes('AMENDMENT rationale preserved'));
 assert.equal(await page.locator('#report-paper form, #report-paper input, #report-paper textarea, #report-paper select').count(),0);
 results.push({check:'clinical summary and JSON download include all published versions, amendments and patient feedback without editable controls'});

 await sendFeedback('patientPlans',ownId,{status:'started',actualStart:'2026-09-15',perceivedChange:'better',difficultyReason:'none',adverseNote:'Third tolerability report',note:'THIRD feedback added after report'});
 await page.locator('.report-controls [role=status]').waitFor();
 assert.ok((await page.locator('.report-controls [role=status]').innerText()).includes(careReportText('en','careReportStale')));
 assert.deepEqual(await downloadReport(),snapshotCopy);
 const retained=(await apiState()).vault.reports.find(r=>r.id===snapshot.id);assert.deepEqual(retained,snapshotCopy);
 assert.ok(!(await page.locator('#report-paper').textContent()).includes('THIRD feedback added after report'));
 const regenerated=await report();assert.equal(regenerated.careSummary.feedback.length,5);
 assert.equal(await page.locator('.report-controls [role=status]').count(),0);
 assert.ok((await page.locator('#report-paper').textContent()).includes('THIRD feedback added after report'));
 results.push({check:'new feedback marks current report stale; stored and downloaded old snapshot remain immutable until regeneration'});

 await switchRole('clinician');
 let latestReport;
 for(const lang of LANGUAGES){
  await page.locator('#language-switch').selectOption(lang);await page.waitForFunction(value=>document.documentElement.lang===value,lang);
  latestReport=await report(lang);
  assert.equal(latestReport.careSummary.feedback.length,5);
  for(const width of [929,390,320]){
   await page.setViewportSize({width,height:764});
   assert.equal(await page.locator('html').getAttribute('dir'),direction(lang));
   assert.equal(await page.locator('#report-paper').getAttribute('dir'),direction(lang));
   const layout=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
   assert.ok(layout.scrollWidth<=layout.width,`horizontal overflow ${lang} ${width}: ${JSON.stringify(layout)}`);
   const text=await page.locator('.clinical-layout').textContent();
   assert.ok(!/undefined|\[object Object\]|care_started|feedbackState|feedbackHistory|careReportScope|patientReported|observationLimit/.test(text),`raw translation ${lang} ${width}`);
   assert.ok(text.includes(careReportText(lang,'careReportTitle')),lang);
   if(output&&width===390){await page.locator('.report-care').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,'care-report-'+lang+'-390.png')});}
   results.push({check:'published care report and doctor workspace layout',lang,width});
  }
 }

 await page.setViewportSize({width:929,height:764});await page.locator('#language-switch').selectOption('en');
 latestReport=await report('en');
 const statesBefore=await page.locator('#report-paper details').evaluateAll(nodes=>nodes.map(node=>node.open));
 assert.ok(statesBefore.some(open=>!open));
 await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
 assert.ok((await page.locator('#report-paper details').evaluateAll(nodes=>nodes.map(node=>node.open))).every(Boolean));
 assert.ok(await page.locator('#report-paper .feedback-entry').filter({hasText:'FIRST historical subjective response'}).isVisible());
 await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));
 assert.deepEqual(await page.locator('#report-paper details').evaluateAll(nodes=>nodes.map(node=>node.open)),statesBefore);
 await page.emulateMedia({media:'print'});
 assert.equal(await page.locator('.care-column').isVisible(),false);
 assert.equal(await page.locator('.report-controls').isVisible(),false);
 assert.equal(await page.locator('#report-paper form, #report-paper input, #report-paper textarea').count(),0);
 await page.emulateMedia({media:'screen'});
 results.push({check:'beforeprint expands historical report content, afterprint restores state, and print CSS hides editable workspace'});

 assert.deepEqual(await downloadReport(),latestReport);
 const final=await apiState(),finalCare=await getCare();
 for(const key of ['days','episodes','medications','preventives'])assert.deepEqual(final.vault[key],initial.vault[key]);
 assert.equal(finalCare.feedback.length,5);assert.equal(finalCare.plans.length,2);assert.equal(finalCare.patientPlans.length,1);
 assert.equal(finalCare.plans.find(p=>p.id===amendedId).previousId,originalId);
 results.push({check:'care-only workflow preserves all daily status, headache, actual medication and preventive diary data'});
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:results.length,results,errors},null,2));
}catch(error){
 errors.push(error.message);process.exitCode=1;console.error(error.stack);
 if(output&&page)await page.screenshot({path:path.join(output,'care-browser-failure.png'),fullPage:false}).catch(()=>{});
}finally{
 if(output)writeFileSync(path.join(output,'care-browser-results.json'),JSON.stringify({passed:results.length,results,errors},null,2));
 await browser?.close();await app.close();rmSync(directory,{recursive:true,force:true});
}
