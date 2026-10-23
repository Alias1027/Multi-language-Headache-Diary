import {careClient} from './care-http-helper.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {createApp} from '../server/main.mjs';
import {allPlans,currentPlans,planFeedback,observePlan} from '../public/care-observation.mjs';
import {loadCare} from '../server/care.mjs';
import {seal} from '../server/storage.mjs';
async function setup(t){
 const directory=mkdtempSync(path.join(os.tmpdir(),'headache-care-')),app=createApp({directory,port:0,schedule:false}),port=await app.listen(),origin='http://127.0.0.1:'+port;
 t.after(async()=>{await app.close();rmSync(directory,{recursive:true,force:true});});
 const {call,state,role,save}=careClient(app,origin);
 await call('/api/demo',{});const initial=await state();
 const report=(await call('/api/report',{from:'2026-09-01',to:'2026-09-28',language:'zh'})).data;
 const assessment={reportId:report.id,status:'confirmed',summary:'Synthetic clinician assessment'};
 const plan={status:'confirmed',change:'start',medication:'Synthetic treatment A',dose:'Demonstration only',route:'Demonstration route',frequency:'Demonstration frequency',start:'2026-10-11',reason:'Synthetic review'};
 return {app,call,state,role,save,initial,report,assessment,plan};
}
test('Care: real accounts cannot impersonate clinicians; role and patient selection are server controlled',async t=>{
 const x=await setup(t);assert.equal((await x.save('assessments',x.assessment)).status,403);
 await x.call('/api/register',{email:'ordinary@example.invalid',password:'test-long-password',role:'clinician'});assert.equal((await x.state()).user.role,'patient');assert.equal((await x.call('/api/demo/role',{role:'clinician'})).status,403);
 assert.equal((await x.call('/api/care/save',{kind:'plans'})).status,403);
});
test('Care: clinician can review only assigned patient and cannot modify diary, voice or sharing',async t=>{
 const x=await setup(t),doctor=await x.role('clinician');assert.equal(doctor.user.patientId,x.initial.user.id);assert.notEqual(doctor.user.id,x.initial.user.id);
 for(const url of ['/api/records','/api/settings','/api/consent','/api/voice/note'])assert.equal((await x.call(url,{})).status,403);
 assert.equal((await x.call('/api/voice/notes')).status,403);
 const res=await x.call('/api/care?patientId=someone-else');assert.equal(res.status,403);
 x.app.store.db.prepare('DELETE FROM care_grants WHERE patient_id=?').run(x.initial.user.id);assert.equal((await x.call('/api/care')).status,403);
});
test('Care: drafts remain private; confirmation binds immutable report and diary edits mark it stale',async t=>{
 const x=await setup(t);await x.role('clinician');const created=await x.save('assessments',{...x.assessment,status:'draft'});assert.equal(created.status,200);
 await x.role('patient');let c=(await x.call('/api/care')).data;assert.equal(c.assessments.length,0);assert.equal(c.history,undefined);
 await x.role('clinician');const confirmed=await x.save('assessments',{...x.assessment,id:created.data.id});assert.equal(confirmed.status,200);
 assert.equal((await x.save('assessments',{...x.assessment,id:created.data.id,summary:'Overwrite'})).status,409);
 await x.role('patient');const s=await x.state(),d=s.vault.days[0];assert.equal((await x.call('/api/records',{kind:'days',record:{...d,notes:'Later correction'},operationId:randomUUID()})).status,200);
 c=(await x.call('/api/care')).data;assert.deepEqual(c.assessments[0].report,x.report);assert.notEqual(c.sourceRevision,x.report.sourceRevision);
});
test('Care: amendments preserve original, require reason and reject competing confirmed successors',async t=>{
 const x=await setup(t);await x.role('clinician');const first=await x.save('assessments',x.assessment),id=first.data.id;
 assert.equal((await x.save('assessments',{...x.assessment,previousId:id})).status,400);
 const next=await x.save('assessments',{...x.assessment,summary:'Revised assessment',previousId:id,amendReason:'New information'});assert.equal(next.status,200);assert.equal(next.data.care.assessments[0].summary,x.assessment.summary);
 assert.equal((await x.save('assessments',{...x.assessment,previousId:id,amendReason:'Competing version'})).status,409);
 assert.equal(next.data.care.history.length,2);
});
test('Care: plans and patient acknowledgement never manufacture actual medication or adherence',async t=>{
 const x=await setup(t);await x.role('clinician');const p=await x.save('plans',x.plan);assert.equal(p.status,200);
 assert.equal((await x.save('feedback',{planId:p.data.id,status:'started'})).status,403);
 await x.role('patient');assert.equal((await x.save('feedback',{planId:p.data.id,status:'read',note:'Synthetic acknowledgement'})).status,200);
 assert.equal((await x.save('feedback',{planId:p.data.id,status:'difficulty',note:'Synthetic difficulty'})).status,200);
 const s=await x.state();assert.deepEqual(s.vault.medications,x.initial.vault.medications);assert.deepEqual(s.vault.preventives,x.initial.vault.preventives);assert.equal(s.vault.revision,x.initial.vault.revision);
 const c=(await x.call('/api/care')).data;assert.equal(c.feedback.length,2);assert.equal(c.plans[0].simulated,true);
});
test('Care: follow-up records actual completion, unsuccessful contact and revision history',async t=>{
 const x=await setup(t);await x.role('clinician');const f={due:'2026-10-12',method:'phone',focus:'Synthetic follow-up',status:'scheduled'};
 const p=await x.save('followups',f);assert.equal(p.status,200);
 assert.equal((await x.save('followups',{...f,id:p.data.id,status:'completed'})).status,400);
 const done=await x.save('followups',{...f,id:p.data.id,status:'completed',completedAt:'2026-09-29T01:00:00Z',outcome:'Synthetic outcome'});assert.equal(done.status,200);assert.equal(done.data.care.history[1].previous.status,'scheduled');
 assert.equal((await x.save('followups',{...f,id:p.data.id,status:'draft'})).status,400);
 await x.role('patient');assert.equal((await x.save('followups',f)).status,403);
});
test('Care: concurrent edits are rejected; replay is idempotent and CSRF is enforced',async t=>{
 const x=await setup(t);await x.role('clinician');const operationId=randomUUID();const p=await x.save('plans',x.plan,{revision:0,operationId});assert.equal(p.status,200);
 const repeat=await x.save('plans',x.plan,{revision:0,operationId});assert.equal(repeat.status,200);assert.equal(repeat.data.duplicate,true);assert.equal(repeat.data.care.plans.length,1);
 assert.equal((await x.save('plans',x.plan,{revision:0})).status,409);
 assert.equal((await x.call('/api/care/save',{}, {'X-CSRF-Token':'wrong'})).status,403);
});
test('Care: stored notes are encrypted, cross-account access fails and exports exclude drafts',async t=>{
 const x=await setup(t);await x.role('clinician');await x.save('assessments',{...x.assessment,status:'draft',summary:'PRIVATE_DRAFT_SENTINEL'});await x.save('plans',x.plan);
 const row=x.app.store.db.prepare('SELECT body FROM care_records WHERE patient_id=?').get(x.initial.user.id);assert.ok(!row.body.includes('PRIVATE_DRAFT_SENTINEL'));assert.ok(!row.body.includes('Synthetic treatment'));
 await x.role('patient');const exp=(await x.call('/api/export')).data;assert.equal(exp.care.assessments.length,0);assert.equal(exp.care.history,undefined);assert.equal(exp.care.plans.length,1);
 await x.call('/api/demo',{});await x.state();assert.equal((await x.call('/api/care')).data.plans.length,0);await x.role('clinician');assert.equal((await x.save('assessments',x.assessment)).status,400);
});
test('Care: malformed plans and future completion do not persist partial changes',async t=>{
 const x=await setup(t);await x.role('clinician');
 for(const plan of [{...x.plan,start:'2026-02-30'},{...x.plan,dose:''},{...x.plan,end:'2026-09-01'},{...x.plan,assessmentId:'unknown'}])assert.equal((await x.save('plans',plan)).status,400);
 assert.equal((await x.save('followups',{due:'2026-10-12',method:'phone',focus:'Test',status:'completed',completedAt:'2099-01-01T00:00:00Z',outcome:'Invalid'})).status,400);
 assert.equal((await x.call('/api/care')).data.revision,0);
});

test('Patient advice: authorship cannot be promoted, unknown doses remain blank and amendments preserve originals',async t=>{
 const x=await setup(t),record={change:'start',medication:'Synthetic advice',sourceNote:'Told by demo clinician at a synthetic visit',status:'confirmed',author:'Demo clinician'};
 const created=await x.save('patientPlans',record);assert.equal(created.status,200);
 const saved=created.data.care.patientPlans[0];assert.equal(saved.status,'recorded');assert.equal(saved.source,'patient_reported');assert.equal(saved.author,'Patient');assert.equal(saved.dose,'');assert.equal(saved.start,null);
 assert.equal((await x.save('patientPlans',{...record,id:saved.id})).status,409);
 assert.equal((await x.save('patientPlans',{...record,previousId:saved.id})).status,400);
 const revised=await x.save('patientPlans',{...record,previousId:saved.id,amendReason:'Corrected transcription',medication:'Corrected advice'});
 assert.equal(revised.status,200);assert.equal(revised.data.care.patientPlans[0].medication,'Synthetic advice');assert.equal(currentPlans(revised.data.care).length,1);
 assert.equal((await x.save('patientPlans',{...record,previousId:saved.id,amendReason:'Competing correction'})).status,409);
 await x.role('clinician');assert.equal((await x.save('patientPlans',record)).status,403);
 await x.role('patient');const exported=(await x.call('/api/export')).data;assert.equal(exported.care.patientPlans.length,2);
 await x.call('/api/demo',{});await x.state();assert.equal((await x.call('/api/care')).data.patientPlans.length,0);
 assert.equal((await x.save('feedback',{planId:saved.id,planKind:'patientPlans',status:'started'})).status,400);
});

test('Patient feedback: actual starts and effects are self-reported; diary remains unchanged',async t=>{
 const x=await setup(t);const first=await x.save('patientPlans',{change:'start',medication:'Synthetic advice',sourceNote:'Synthetic visit'}),planId=first.data.id;
 const record={planId,planKind:'patientPlans',status:'started',actualStart:'2026-09-15',perceivedChange:'better',adverseNote:'Synthetic observation'};
 const saved=await x.save('feedback',record);assert.equal(saved.status,200);
 assert.equal(planFeedback(saved.data.care,allPlans(saved.data.care)[0]).actualStart,record.actualStart);
 for(const invalid of [{...record,actualStart:'2099-01-01'},{...record,actualStart:'2026-02-30'},{...record,status:'read'},{...record,planKind:'plans'},{...record,difficultyReason:'forgot'}])assert.equal((await x.save('feedback',invalid)).status,400);
 assert.equal((await x.save('feedback',{...record,status:'difficulty',difficultyReason:'side_effects'})).status,200);
 const state=await x.state();assert.deepEqual(state.vault,x.initial.vault.reports.length?x.initial.vault:{...x.initial.vault,reports:state.vault.reports});
 assert.deepEqual(state.vault.medications,x.initial.vault.medications);assert.deepEqual(state.vault.preventives,x.initial.vault.preventives);
});

test('Old care records normalize in memory without rewriting their encrypted content',async t=>{
 const x=await setup(t);const legacy={revision:1,plans:[],assessments:[],followups:[],feedback:[],history:[],operations:[]};
 const body=seal(legacy,x.app.store.key,x.initial.user.id+':care');
 x.app.store.db.prepare('INSERT INTO care_records VALUES (?,?)').run(x.initial.user.id,body);
 assert.deepEqual(loadCare(x.app.store,x.initial.user.id).patientPlans,[]);
 assert.equal(x.app.store.db.prepare('SELECT body FROM care_records WHERE patient_id=?').get(x.initial.user.id).body,body);
});

test('Diary observations use actual starts, keep missing days unknown and exclude incomplete/future days',async t=>{
 const x=await setup(t),v={...structuredClone(x.initial.vault),enrolled:'2026-09-01'},original=JSON.stringify(v);
 const o=observePlan(v,'2026-09-15',28,'2026-09-20T12:00:00Z');
 assert.equal(o.before.eligibleDays,14);assert.equal(o.after.eligibleDays,5);assert.equal(o.before.from,'2026-08-18');assert.equal(o.after.to,'2026-10-12');
 assert.equal(o.after.unknownDays,o.after.eligibleDays-o.after.statusDays);
 assert.throws(()=>observePlan(v,null),/invalid_observation/);assert.throws(()=>observePlan(v,'2026-02-30'),/invalid_observation/);
 assert.equal(JSON.stringify(v),original);
});
