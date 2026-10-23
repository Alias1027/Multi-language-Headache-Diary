import {randomBytes,randomUUID} from 'node:crypto';
import {seal,unseal} from './storage.mjs';
const fail=(message,status=403)=>{throw Object.assign(new Error(message),{status});};
export function prepareAccess(store){store.db.exec(`CREATE TABLE IF NOT EXISTS care_grants (patient_id TEXT,clinician_id TEXT,body TEXT NOT NULL,PRIMARY KEY(patient_id,clinician_id)); CREATE TABLE IF NOT EXISTS care_reviews (id TEXT PRIMARY KEY,patient_id TEXT,clinician_id TEXT,body TEXT NOT NULL);`);}
export function clinicianActive(actor){return actor?.profile.role==='clinician'&&actor.profile.clinicianApproved===true;}
export function approveClinician(store,id,active=true){
 const actor=store.get(id);if(actor?.profile.role!=='clinician')fail('care_access_denied');
 actor.profile.clinicianApproved=active;
 actor.profile.careCode??=randomBytes(12).toString('hex');
 store.save(actor);store.db.prepare('DELETE FROM sessions WHERE user_id=?').run(id);store.audit(id,active?'clinician_approved':'clinician_suspended');return actor;
}
export function grantRows(store,patientId){return store.db.prepare('SELECT * FROM care_grants WHERE patient_id=?').all(patientId).map(r=>unseal(r.body,store.key,r.patient_id+':grant:'+r.clinician_id));}
export function activeGrant(store,patientId,clinicianId){
 const row=store.db.prepare('SELECT body FROM care_grants WHERE patient_id=? AND clinician_id=?').get(patientId,clinicianId);
 const g=row&&unseal(row.body,store.key,patientId+':grant:'+clinicianId);
 if(!g?.active||Date.parse(g.expiresAt)<=Date.now())fail('care_authorization_required');return g;
}
export function doctorByCode(store,code){
 if(typeof code!=='string'||!/^\w{24}$/.test(code))fail('care_code_invalid',400);
 const doctor=store.db.prepare('SELECT id FROM users').all().map(r=>store.get(r.id)).find(u=>clinicianActive(u)&&u.profile.careCode===code);
 if(!doctor)fail('care_code_invalid',400);return doctor;
}
export function accessView(store,patient){return grantRows(store,patient.id).map(g=>({...g,clinicianName:store.get(g.clinicianId)?.profile.displayName||'',active:g.active&&Date.parse(g.expiresAt)>Date.now()}));}
export function saveGrant(store,patient,body){
 if(body.revoke){const g=grantRows(store,patient.id).find(g=>g.clinicianId===body.clinicianId);if(!g)fail('care_authorization_required');g.active=false;g.revokedAt=new Date().toISOString();write(g);store.audit(patient.id,'clinician_access_revoked');return accessView(store,patient);}
 const doctor=doctorByCode(store,body.code);
 const label=String(body.label||'').trim(),days=Number(body.days);
 if(body.consent!==true||!label||label.length>80||![7,30,90].includes(days))fail('care_consent_required',400);
 const g={id:randomUUID(),patientId:patient.id,clinicianId:doctor.id,label,active:true,scope:'diary-reports-care',grantedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+days*864e5).toISOString()};
 write(g);store.audit(patient.id,'clinician_access_granted');return accessView(store,patient);
 function write(g){store.db.prepare('INSERT INTO care_grants VALUES (?,?,?) ON CONFLICT(patient_id,clinician_id) DO UPDATE SET body=excluded.body').run(patient.id,g.clinicianId,seal(g,store.key,patient.id+':grant:'+g.clinicianId));}
}
export function authorizedPatients(store,actor){
 if(!clinicianActive(actor))fail('clinician_pending');
 return store.db.prepare('SELECT patient_id FROM care_grants WHERE clinician_id=?').all(actor.id).flatMap(r=>{try{const g=activeGrant(store,r.patient_id,actor.id);return [{id:g.patientId,label:g.label,expiresAt:g.expiresAt}];}catch{return [];}});
}
// Explicit allowlist: no contacts, sharing credentials, audit, recordings or jobs.
export function clinicalVault(v){const keys=['schemaVersion','revision','synthetic','timezone','language','reportLanguage','reportLanguageMode','enrolled','days','episodes','medications','preventives','reports'];return Object.fromEntries(keys.filter(k=>Object.hasOwn(v,k)).map(k=>[k,structuredClone(v[k])]));}
export function reviewFingerprint(store,patient,care){return store.hash(JSON.stringify([patient.vault.revision,care.feedback,care.patientPlans]));}
export function recordReview(store,context,care,body){
 const {patient,actor}=context,report=patient.vault.reports.find(r=>r.id===body.reportId);
 if(!report||report.sourceRevision!==patient.vault.revision||report.careSummary?.sourceRevision!==care.revision)fail('care_review_stale',409);
 if(!['diary','feedback','summary'].every(k=>body.checks?.[k]===true))fail('care_review_required',400);
 const g=activeGrant(store,patient.id,actor.id),r={id:randomUUID(),patientId:patient.id,clinicianId:actor.id,author:actor.profile.displayName,grantId:g.id,reportId:report.id,diaryRevision:patient.vault.revision,careRevision:care.revision,feedbackIds:care.feedback.map(f=>f.id),fingerprint:reviewFingerprint(store,patient,care),at:new Date().toISOString()};
 store.db.prepare('INSERT INTO care_reviews VALUES (?,?,?,?)').run(r.id,patient.id,actor.id,seal(r,store.key,r.id+':review'));store.audit(patient.id,'clinician_review_completed');return r;
}
export function requireReview(store,context,care,id){
 const row=store.db.prepare('SELECT body FROM care_reviews WHERE id=? AND patient_id=? AND clinician_id=?').get(id||'',context.patient.id,context.actor.id);
 const r=row&&unseal(row.body,store.key,id+':review'),g=activeGrant(store,context.patient.id,context.actor.id);
 if(!r)fail('care_review_required',400);
 if(r.grantId!==g.id||r.fingerprint!==reviewFingerprint(store,context.patient,care))fail('care_review_stale',409);return r;
}
