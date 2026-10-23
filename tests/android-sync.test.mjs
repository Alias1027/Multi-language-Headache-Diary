import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createApp} from '../server/main.mjs';import {approveClinician} from '../server/care-access.mjs';
import {createEngine} from '../android/web/engine.mjs';
test('Android journal contract: offline records -> authorized doctor review -> confirmed advice -> patient feedback -> summary',async()=>{
 const folder=mkdtempSync(path.join(os.tmpdir(),'android-sync-synthetic-')),app=createApp({directory:folder,port:0,schedule:false});
 const origin='http://127.0.0.1:'+await app.listen();
 function client(){let cookie='',csrf='';return async(p,b)=>{const r=await fetch(origin+p,{method:b?'POST':'GET',headers:{Origin:origin,Cookie:cookie,'X-CSRF-Token':csrf,'Content-Type':'application/json'},body:b?JSON.stringify(b):undefined});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const value=await r.json();if(value.csrf)csrf=value.csrf;if(!r.ok)throw Object.assign(new Error(value.error),{status:r.status});return value;};}
 const patient=client(),doctor=client();let values={};const storage={get:async k=>structuredClone(values[k]??null),put:async(k,v)=>{values[k]=structuredClone(v);},remove:async k=>{delete values[k];},all:async()=>structuredClone(values),replace:async v=>{values=structuredClone(v);}};
 const engine=createEngine({storage,locks:{request:async(k,fn)=>fn()}});
 try{
  await engine.initialize('ur','Asia/Shanghai','2026-10-01');
  for(const day of ['2026-10-20','2026-10-21'])await engine.save({date:day,operationId:crypto.randomUUID(),records:[{kind:'days',record:{id:'day-'+day,revision:0,date:day,headache:'no',acute:'no',preventiveTaken:'not_applicable',dailyImpact:'none'}}]});
  await patient('/api/register',{email:'android-patient@example.invalid',password:'Synthetic-patient-123'});
  await patient('/api/state');
  await patient('/api/settings',{language:'ur',reportLanguage:'ur',reportLanguageMode:'interface',timezone:'Asia/Shanghai',enrolled:'2026-10-01',reminder:{enabled:false,time:'20:00'}});
  const remote=await patient('/api/state');await engine.bind(remote,'https://synthetic.example.invalid');assert.equal((await engine.sync(patient)).status,'synced');assert.equal(engine.pending().length,0);
  await doctor('/api/clinician/register',{email:'android-doctor@example.invalid',password:'Synthetic-doctor-123',name:'Synthetic Android reviewer'});approveClinician(app.store,app.store.findEmail('android-doctor@example.invalid').id);
  await doctor('/api/clinician/login',{email:'android-doctor@example.invalid',password:'Synthetic-doctor-123'});const me=await doctor('/api/clinician/me'),suffix='?patientId='+remote.user.id;
  await assert.rejects(doctor('/api/clinician/patient'+suffix),/care_authorization_required/);
  await patient('/api/care/access',{code:me.user.code,label:'Synthetic offline patient',days:7,consent:true});
  const seen=await doctor('/api/clinician/patient'+suffix);assert.equal(seen.vault.days.length,2);assert.equal(seen.vault.days[0].date,'2026-10-20');
  const report=await doctor('/api/clinician/report'+suffix,{from:'2026-10-01',to:'2026-10-22',language:'en'});
  const review=await doctor('/api/clinician/review'+suffix,{reportId:report.id,checks:{diary:true,feedback:true,summary:true}});
  const saved=await doctor('/api/clinician/save'+suffix,{kind:'plans',revision:seen.care.revision,operationId:crypto.randomUUID(),reviewId:review.id,record:{medication:'Synthetic plan only',dose:'Synthetic dose',route:'Synthetic route',frequency:'Synthetic frequency',change:'continue',start:'2026-10-22',reason:'Synthetic integration verification',status:'confirmed'}});
  const care=await patient('/api/care');assert.equal(care.plans.length,1);assert.equal(care.plans[0].id,saved.care.plans[0].id);
  await patient('/api/care/save',{kind:'feedback',revision:care.revision,operationId:crypto.randomUUID(),record:{planId:care.plans[0].id,planKind:'plans',status:'read',actualStart:'',perceivedChange:'not_assessed',difficultyReason:'none',adverseNote:'',note:'Synthetic Android feedback'}});
  const final=await doctor('/api/clinician/report'+suffix,{from:'2026-10-01',to:'2026-10-22',language:'en'});assert.equal(final.careSummary.feedback.length,1);assert.match(JSON.stringify(final.careSummary.feedback),/Synthetic Android feedback/);
  await patient('/api/care/access',{revoke:true,clinicianId:me.user.id});await assert.rejects(doctor('/api/clinician/patient'+suffix),/care_authorization_required/);
  assert.deepEqual((await patient('/api/state')).vault.days,engine.view().vault.days);
 }finally{await app.close();assert.ok(path.resolve(folder).startsWith(path.resolve(os.tmpdir())+path.sep));rmSync(folder,{recursive:true,force:true});}
});
