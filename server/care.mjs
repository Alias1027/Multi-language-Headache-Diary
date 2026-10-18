import {randomUUID} from 'node:crypto';
import {seal,unseal} from './storage.mjs';
import {validDate,dateAt} from './core.mjs';

const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const text=(value,max=2000)=>{if(typeof value!=='string'||value.length>max)fail('invalid_care_text');return value.trim();};
const choice=(value,values)=>{if(!values.includes(value))fail('invalid_care_value');return value;};
const date=value=>{if(!validDate(value))fail('invalid_care_date');return value;};
export function prepareCare(store){store.db.exec('CREATE TABLE IF NOT EXISTS care_records (patient_id TEXT PRIMARY KEY,body TEXT NOT NULL)');}
export function careContext(store,actor){
  if(actor.profile.role!=='clinician')return {actor,patient:actor,role:'patient'};
  const patient=store.get(actor.profile.patientId);
  if(!patient?.vault.synthetic||!actor.vault.synthetic||patient.profile.clinicianId!==actor.id)fail('care_access_denied',403);
  return {actor,patient,role:'clinician'};
}
export function ensureDemoPair(store,patient){
  if(!patient.vault.synthetic||patient.profile.role==='clinician')fail('care_demo_only',403);
  let clinician=patient.profile.clinicianId&&store.get(patient.profile.clinicianId);
  if(!clinician){
    const id=store.createUser('clinician-'+randomUUID()+'@example.invalid',randomUUID(),{synthetic:true},true);
    clinician=store.get(id);Object.assign(clinician.profile,{role:'clinician',patientId:patient.id,displayName:'Demo clinician'});store.save(clinician);
    patient.profile.clinicianId=id;store.save(patient);
  }
  if(clinician.profile.patientId!==patient.id||clinician.profile.role!=='clinician')fail('care_access_denied',403);
  return clinician;
}
export function loadCare(store,id){const row=store.db.prepare('SELECT body FROM care_records WHERE patient_id=?').get(id);const c=row?unseal(row.body,store.key,id+':care'):{revision:0,assessments:[],followups:[],plans:[],feedback:[],history:[],operations:[]};c.patientPlans??=[];return c;}
export function viewCare(store,context){
  const c=loadCare(store,context.patient.id),out=structuredClone(c);delete out.operations;
  if(context.role==='patient'){
    out.assessments=out.assessments.filter(r=>r.status==='confirmed');out.plans=out.plans.filter(r=>r.status==='confirmed');
    out.followups=out.followups.filter(r=>r.status!=='draft');delete out.history;
  }
  return {...out,role:context.role,patientId:context.patient.id,sourceRevision:context.patient.vault.revision};
}
export function saveCare(store,context,body){
  const {patient,actor,role}=context,c=loadCare(store,patient.id),kind=body.kind;
  if(role!=='clinician'&&!['feedback','patientPlans'].includes(kind))fail('care_access_denied',403);
  if(role==='clinician'&&['feedback','patientPlans'].includes(kind))fail('care_access_denied',403);
  if(!['assessments','followups','plans','patientPlans','feedback'].includes(kind))fail('invalid_care_kind');
  if(!/^[a-zA-Z0-9-]{8,100}$/.test(body.operationId||''))fail('invalid_care_operation');
  if(c.operations.includes(actor.id+':'+body.operationId))return {ok:true,duplicate:true,care:viewCare(store,context)};
  if(body.revision!==c.revision)fail('revision_care_conflict',409);
  if(c.history.length>=1000||c[kind].length>=500)fail('care_limit',409);
  const input=body.record||{},now=new Date().toISOString(),old=input.id&&c[kind].find(r=>r.id===input.id);
  if(input.id&&!old)fail('care_not_found',404);
  if(old&&(old.status==='confirmed'||['feedback','patientPlans'].includes(kind)))fail('care_amend_required',409);
  let r={id:old?.id||randomUUID(),authorId:actor.id,author:role==='clinician'?'Demo clinician':'Patient',createdAt:old?.createdAt||now,updatedAt:now};
  if(kind==='assessments'){
    const report=patient.vault.reports.find(x=>x.id===input.reportId);if(!report)fail('invalid_care_report');
    r={...r,reportId:report.id,report:structuredClone(report),status:choice(input.status,['draft','confirmed']),summary:text(input.summary),response:text(input.response||''),functionNote:text(input.functionNote||''),questions:text(input.questions||''),patientMessage:text(input.patientMessage||'')};
    if(!r.summary)fail('invalid_care_required');
  }
  if(kind==='plans'){
    r={...r,status:choice(input.status,['draft','confirmed']),change:choice(input.change,['start','adjust','continue','stop']),medication:text(input.medication,120),dose:text(input.dose||'',120),route:text(input.route||'',80),frequency:text(input.frequency||'',160),start:date(input.start),end:input.end?date(input.end):null,instructions:text(input.instructions||''),reason:text(input.reason||'',1000),assessmentId:input.assessmentId||null};
    if(!r.medication||r.end&&r.end<r.start)fail('invalid_care_plan');
    if(r.assessmentId&&!c.assessments.some(x=>x.id===r.assessmentId&&x.status==='confirmed'))fail('invalid_care_assessment');
    if(r.status==='confirmed'&&(!r.reason||r.change!=='stop'&&(!r.dose||!r.route||!r.frequency)))fail('invalid_care_required');
    r.simulated=true;r.observationFocus=text(input.observationFocus||'');r.reviewDate=input.reviewDate?date(input.reviewDate):null;
  }
  if(kind==='patientPlans'){
    // Patient transcription is never promoted to clinician confirmation.
    r={...r,status:'recorded',source:'patient_reported',change:choice(input.change,['start','adjust','continue','stop']),medication:text(input.medication,120),dose:text(input.dose||'',120),route:text(input.route||'',80),frequency:text(input.frequency||'',160),start:input.start?date(input.start):null,end:input.end?date(input.end):null,instructions:text(input.instructions||''),reason:text(input.reason||'',1000),sourceNote:text(input.sourceNote||'',1000),observationFocus:text(input.observationFocus||''),reviewDate:input.reviewDate?date(input.reviewDate):null};
    if(!r.medication||!r.sourceNote||r.start&&r.end&&r.end<r.start)fail('invalid_care_required');
  }
  if(['plans','assessments','patientPlans'].includes(kind)){
    r.previousId=input.previousId||null;r.amendReason=text(input.amendReason||'',1000);
    if(r.previousId){
      const prev=c[kind].find(x=>x.id===r.previousId&&(x.status==='confirmed'||kind==='patientPlans'));if(!prev||prev.id===r.id||!r.amendReason)fail('invalid_care_amendment');
      if((r.status==='confirmed'||kind==='patientPlans')&&c[kind].some(x=>(x.status==='confirmed'||kind==='patientPlans')&&x.previousId===r.previousId&&x.id!==r.id))fail('revision_care_conflict',409);
    }
    if(r.status==='confirmed')r.confirmedAt=now;
  }
  if(kind==='followups'){
    if(old&&old.status!=='draft'&&input.status==='draft')fail('invalid_care_retraction');
    r={...r,status:choice(input.status,['draft','scheduled','completed','unreachable','postponed','cancelled']),due:date(input.due),method:choice(input.method,['phone','video','clinic']),focus:text(input.focus),outcome:text(input.outcome||''),completedAt:input.completedAt||null,ownerId:actor.id};
    if(!r.focus)fail('invalid_care_required');
    if(r.completedAt&&(!Number.isFinite(Date.parse(r.completedAt))||Date.parse(r.completedAt)>Date.now()+60000))fail('invalid_care_date');
    if(r.status==='completed'&&(!r.completedAt||!r.outcome))fail('invalid_care_required');
    if(r.status!=='completed')r.completedAt=null;
  }
  if(kind==='feedback'){
    const planKind=choice(input.planKind||'plans',['plans','patientPlans']);
    const plan=c[planKind].find(x=>x.id===input.planId&&(planKind==='patientPlans'||x.status==='confirmed'));
    if(!plan||c[planKind].some(x=>x.previousId===plan.id&&x.status!=='draft'))fail('invalid_care_plan');
    const actualStart=input.actualStart?date(input.actualStart):null;
    const status=choice(input.status,['read','started','not_started','difficulty']);
    if(actualStart&&(actualStart>dateAt(now,patient.vault.timezone)||status==='read'||status==='not_started'))fail('invalid_care_date');
    r={...r,planId:input.planId,planKind,status,actualStart,perceivedChange:choice(input.perceivedChange||'not_assessed',['not_assessed','better','same','worse','uncertain']),difficultyReason:choice(input.difficultyReason||'none',['none','forgot','unavailable','side_effects','unclear','other']),adverseNote:text(input.adverseNote||'',1000),note:text(input.note||'',1000)};
    if(status!=='difficulty'&&r.difficultyReason!=='none')fail('invalid_care_value');
  }
  if(old)c[kind][c[kind].indexOf(old)]=r;else c[kind].push(r);
  c.revision++;c.history.push({kind,record:structuredClone(r),previous:old||null,revision:c.revision,at:now,actorId:actor.id});c.operations.push(actor.id+':'+body.operationId);
  store.db.prepare('INSERT INTO care_records VALUES (?,?) ON CONFLICT(patient_id) DO UPDATE SET body=excluded.body').run(patient.id,seal(c,store.key,patient.id+':care'));
  store.audit(patient.id,'care_'+kind+'_saved');return {ok:true,id:r.id,care:viewCare(store,context)};
}
