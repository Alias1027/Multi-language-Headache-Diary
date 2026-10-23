import {careClient} from './care-http-helper.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {buildCareSummary} from '../server/care-report.mjs';
import {createApp} from '../server/main.mjs';
import {createReport} from '../public/domain.mjs';
import {queueReport,runSchedule} from '../server/sharing.mjs';
import {unseal} from '../server/storage.mjs';

const period={from:'2026-09-01',to:'2026-09-28',language:'zh'};
const plan={status:'confirmed',change:'start',medication:'Synthetic treatment',dose:'Demonstration dose',route:'Demonstration route',frequency:'Demonstration schedule',start:'2026-09-15',reason:'Synthetic review'};
async function setup(t){
  const directory=mkdtempSync(path.join(os.tmpdir(),'headache-care-report-'));
  const app=createApp({directory,port:0,schedule:false}),port=await app.listen(),origin='http://127.0.0.1:'+port;
  t.after(async()=>{await app.close();rmSync(directory,{recursive:true,force:true});});
  const {call,state,role,save:saveResult}=careClient(app,origin);
  await call('/api/demo',{});const initial=await state();
  async function save(kind,record){const r=await saveResult(kind,record);assert.equal(r.status,200,JSON.stringify(r.data));return r.data;}
  async function report(){const result=await call('/api/report',period);assert.equal(result.status,200);return result.data;}
  return {app,call,state,initial,role,save,report};
}

test('Care report whitelist excludes drafts, orphan feedback, future entries and recursive/private fields',()=>{
  const stamp='2026-09-01T00:00:00Z',entry={id:'p1',createdAt:stamp,updatedAt:stamp,authorId:'PRIVATE_AUTHOR',ownerId:'PRIVATE_OWNER',status:'confirmed',medication:'Published',report:{secret:'PRIVATE_NESTED'},extra:'PRIVATE_EXTRA'};
  const care={revision:8,plans:[entry,{...entry,id:'draft',status:'draft'},{...entry,id:'future',createdAt:'2099-01-01T00:00:00Z'},{...entry,id:'future-confirmed',confirmedAt:'2099-01-01T00:00:00Z'}],patientPlans:[{...entry,id:'patient',status:'recorded',sourceNote:'Patient transcription'}],assessments:[{...entry,id:'a1',summary:'Confirmed assessment'}, {...entry,id:'a-draft',status:'draft'}],followups:[{...entry,id:'f1',status:'completed',outcome:'Completed'}, {...entry,id:'f-draft',status:'draft'}],feedback:[
    {...entry,id:'fb1',planId:'p1',status:'started',note:'First'},
    {...entry,id:'fb2',planKind:'patientPlans',planId:'patient',status:'difficulty',note:'Second'},
    {...entry,id:'fb3',planId:'draft',status:'started'},
    {...entry,id:'fb4',planId:'absent',status:'started'},
    {...entry,id:'fb5',planId:'p1',status:'draft'}
  ],history:[{secret:'PRIVATE_HISTORY'}],operations:['PRIVATE_OPERATION']};
  const summary=buildCareSummary(care,'2026-10-18T00:00:00Z');
  assert.equal(summary.schemaVersion,1);assert.equal(summary.scope,'published-history-as-of-generation');assert.equal(summary.sourceRevision,8);
  assert.deepEqual(summary.plans.map(p=>p.id),['p1','patient']);assert.deepEqual(summary.feedback.map(f=>f.id),['fb1','fb2']);
  assert.equal(summary.feedback[0].planKind,'plans');assert.equal(summary.feedback[0].provenance,'patient_reported');
  assert.equal(summary.plans[0].provenance,'simulated_clinician');assert.equal(summary.plans[1].provenance,'patient_reported');
  assert.deepEqual(summary.assessments.map(a=>a.id),['a1']);assert.deepEqual(summary.followups.map(f=>f.id),['f1']);
  assert.ok(!JSON.stringify(summary).includes('PRIVATE_'));assert.equal(summary.assessments[0].report,undefined);
  care.plans[0].medication='Changed later';care.feedback[0].note='Changed later';
  assert.equal(summary.plans[0].medication,'Published');assert.equal(summary.feedback[0].note,'First');
  assert.deepEqual(buildCareSummary({},stamp).plans,[]);assert.throws(()=>buildCareSummary({},'invalid'),/invalid_care_summary_time/);
});

test('Generated summary retains every feedback and amended plan as a separate immutable snapshot',async t=>{
  const x=await setup(t);await x.role('clinician');const first=await x.save('plans',plan);
  await x.role('patient');
  await x.save('feedback',{planId:first.id,status:'read',note:'Read original plan'});
  await x.save('feedback',{planId:first.id,status:'started',actualStart:'2026-09-15',perceivedChange:'better',note:'Early improvement'});
  const earlier=await x.report(),earlierCopy=structuredClone(earlier);
  await x.save('feedback',{planId:first.id,status:'difficulty',actualStart:'2026-09-15',perceivedChange:'worse',difficultyReason:'side_effects',adverseNote:'Later symptom',note:'Later feedback'});
  await x.role('clinician');const revised=await x.save('plans',{...plan,change:'adjust',dose:'Revised demonstration dose',previousId:first.id,amendReason:'Review of patient feedback'});
  await x.role('patient');await x.save('feedback',{planId:revised.id,status:'not_started',note:'New plan pending'});
  const patient=await x.save('patientPlans',{change:'continue',medication:'Patient-transcribed advice',sourceNote:'Synthetic visit'});
  await x.save('feedback',{planId:patient.id,planKind:'patientPlans',status:'read',note:'Patient advice read'});
  const current=await x.report();assert.equal(current.careSummary.plans.length,3);assert.equal(current.careSummary.feedback.length,5);
  assert.equal(current.careSummary.plans.find(p=>p.id===revised.id).previousId,first.id);
  assert.equal(current.careSummary.plans.find(p=>p.id===revised.id).amendReason,'Review of patient feedback');
  assert.equal(current.careSummary.feedback.filter(f=>f.planId===first.id).length,3);
  assert.equal(current.careSummary.capturedAt,current.createdAt);assert.equal(current.careSummary.sourceRevision,(await x.call('/api/care')).data.revision);
  // Historical care is intentionally independent of the September diary window.
  assert.ok(current.careSummary.feedback.every(f=>f.createdAt>period.to));
  const state=await x.state();assert.deepEqual(state.vault.reports.find(r=>r.id===earlier.id),earlierCopy);
  for(const key of ['days','episodes','medications','preventives','revision'])assert.deepEqual(state.vault[key],x.initial.vault[key]);
});

test('Doctor-generated reports stay safe for patient export and flatten assessment report links',async t=>{
  const x=await setup(t);const initialReport=await x.report();await x.role('clinician');
  await x.save('plans',{...plan,status:'draft',medication:'PRIVATE_DRAFT_PLAN'});
  await x.save('assessments',{reportId:initialReport.id,status:'draft',summary:'PRIVATE_DRAFT_ASSESSMENT'});
  await x.save('followups',{status:'draft',due:'2026-10-19',method:'phone',focus:'PRIVATE_DRAFT_FOLLOWUP'});
  await x.save('plans',plan);
  await x.save('followups',{status:'scheduled',due:'2026-10-19',method:'phone',focus:'Published follow-up'});
  for(let i=0;i<5;i++){
    const source=await x.report();
    await x.save('assessments',{reportId:source.id,status:'confirmed',summary:'Published assessment '+i,response:'Patient-reported effect'});
  }
  const report=await x.report(),serialized=JSON.stringify(report);
  assert.equal(report.careSummary.assessments.length,5);assert.equal(report.careSummary.plans.length,1);assert.equal(report.careSummary.followups.length,1);
  assert.ok(!serialized.includes('PRIVATE_DRAFT'));assert.ok(!serialized.includes('authorId'));assert.ok(!serialized.includes('ownerId'));
  assert.ok(report.careSummary.assessments.every(a=>typeof a.reportId==='string'&&!Object.hasOwn(a,'report')));
  assert.ok(serialized.length<30000,'Flattened report appendix must not recursively embed older reports');
  await x.role('patient');const exported=(await x.call('/api/export')).data;
  assert.deepEqual(exported.vault.reports.find(r=>r.id===report.id),report);assert.ok(!JSON.stringify(exported).includes('PRIVATE_DRAFT'));
});

test('Care summary is patient-scoped and old diary-only reports are not retroactively changed',async t=>{
  const x=await setup(t),user=x.app.store.get(x.initial.user.id);
  const legacy=createReport(user.vault,period.from,period.to,period.language);user.vault.reports.push(legacy);x.app.store.save(user);
  await x.save('patientPlans',{change:'start',medication:'ACCOUNT_ONE_ONLY',sourceNote:'Synthetic visit'});
  const own=await x.report();assert.equal(own.careSummary.plans[0].medication,'ACCOUNT_ONE_ONLY');
  assert.deepEqual((await x.state()).vault.reports.find(r=>r.id===legacy.id),legacy);
  await x.call('/api/demo',{});await x.state();await x.role('clinician');
  const other=await x.report();assert.deepEqual(other.careSummary.plans,[]);assert.deepEqual(other.careSummary.feedback,[]);
  assert.ok(!JSON.stringify(other).includes('ACCOUNT_ONE_ONLY'));
});

test('Existing manual and scheduled sharing remain diary-only even after generating a care report',async t=>{
  const x=await setup(t);await x.save('patientPlans',{change:'start',medication:'CARE_NOT_CONSENTED_FOR_SHARING',sourceNote:'Synthetic visit'});await x.report();
  const user=x.app.store.get(x.initial.user.id),now='2026-10-18T12:00:00Z';
  user.vault.consent={id:'test-consent',active:true,institution:'mock-clinic',scope:'details',frequency:'weekly',expires:'2099-01-01T00:00:00Z'};
  const job=queueReport(x.app.store,user,period.from,period.to,period.language,now);
  const packet=unseal(job.packet,x.app.store.hospitalKey,'transfer:'+job.id);
  assert.equal(packet.report.careSummary,undefined);assert.ok(!JSON.stringify(packet).includes('CARE_NOT_CONSENTED_FOR_SHARING'));
  assert.ok(runSchedule(x.app.store,user,now));
  for(const sent of user.vault.jobs){
    const transfer=unseal(sent.packet,x.app.store.hospitalKey,'transfer:'+sent.id);
    assert.equal(transfer.report.careSummary,undefined);assert.ok(!JSON.stringify(transfer).includes('CARE_NOT_CONSENTED_FOR_SHARING'));
  }
});
