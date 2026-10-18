import {randomUUID} from 'node:crypto';
import {reportLanguage} from '../public/report-options.mjs';
import {seal,unseal} from './storage.mjs';
import {createReport,previousPeriod,dateAt} from './core.mjs';
export function authorized(v,now=Date.now()) {return v.consent?.active===true && Date.parse(v.consent.expires)>now && v.consent.institution==='mock-clinic';}
export function queueReport(store,user,from,to,language,now=new Date().toISOString()) {
  const v=user.vault;if(!authorized(v,Date.parse(now)))throw new Error('consent_required');
  if(v.jobs.some(j=>j.from===from&&j.to===to&&j.revision===v.revision&&j.consentId===v.consent.id&&!['cancelled','superseded'].includes(j.status)))return null;
  const report=createReport(v,from,to,language,now);v.reports.push(report);
  const job={id:randomUUID(),from,to,revision:v.revision,reportId:report.id,consentId:v.consent.id,status:'queued',attempts:0,nextAttempt:Date.parse(now),createdAt:now,scope:v.consent.scope};
  const details=job.scope==='details'?{
    days:v.days.filter(d=>d.date>=from&&d.date<=to),
    episodes:v.episodes.filter(e=>dateAt(e.start,v.timezone)<=to&&(!e.end||dateAt(e.end,v.timezone)>=from)),
    medications:v.medications.filter(m=>{const d=dateAt(m.at,v.timezone);return d>=from&&d<=to;})}:undefined;
  job.packet=seal({transferId:job.id,institution:'mock-clinic',patient:store.hash(user.id+':mock-clinic'),revision:job.revision,report,details},store.hospitalKey,'transfer:'+job.id);
  v.jobs.push(job);store.audit(user.id,'share_queued');return job;
}
export function correctSharedReports(store,user) {
  const v=user.vault,periods=new Map();
  for(const j of v.jobs)if(['delivered','queued','retry','needs_attention'].includes(j.status)&&j.revision<v.revision){periods.set(j.from+'/'+j.to,j);if(j.status!=='delivered')j.status='superseded';}
  if(authorized(v))for(const j of periods.values())queueReport(store,user,j.from,j.to,reportLanguage(v));
}
export function cancelPending(store,user) {for(const j of user.vault.jobs)if(['queued','retry'].includes(j.status)){j.status='cancelled';store.audit(user.id,'share_cancelled');}}
export function receive(store,job,packet,expectedPatient) {
  const p=unseal(packet,store.hospitalKey,'transfer:'+job.id);
  if(p.patient!==expectedPatient || p.institution!=='mock-clinic' || p.transferId!==job.id || p.revision!==job.revision)throw new Error('identity_mismatch');
  const existing=store.hospital.prepare('SELECT * FROM receipts WHERE transfer_id=?').get(job.id);
  if(existing){if(existing.patient_id!==expectedPatient||existing.revision!==job.revision)throw new Error('receipt_mismatch');return {id:job.id,at:existing.received_at,duplicate:true};}
  const at=new Date().toISOString();
  store.hospital.prepare('INSERT INTO receipts VALUES (?,?,?,?,?)').run(job.id,expectedPatient,p.revision,at,seal(p,store.hospitalKey,'receipt:'+job.id));
  return {id:job.id,at,duplicate:false};
}
export function processQueue(store,user,{now=Date.now(),fault=null,force=false,retryAttention=false}={}) {
  const v=user.vault;let changed=false;
  for(const j of v.jobs){
    if(!(retryAttention&&j.status==='needs_attention')&&!['queued','retry'].includes(j.status)||(!force&&j.nextAttempt>now))continue;
    changed=true;
    if(!authorized(v,now)||v.consent.id!==j.consentId||v.consent.scope!==j.scope){j.status='cancelled';store.audit(user.id,'share_blocked_consent');continue;}
    j.attempts++;
    try{
      if(fault==='offline')throw new Error('receiver_unavailable');
      const report=v.reports.find(r=>r.id===j.reportId);
      // Two local services share a provisioned recipient key; no key travels with the packet.
      const patient=store.hash(user.id+':mock-clinic');
      const receipt=receive(store,j,j.packet,patient);
      if(fault==='lost_ack')throw new Error('receipt_timeout');
      j.status='delivered';j.receipt=receipt;j.error=null;store.audit(user.id,'share_delivered');
      v.notifications.push({id:randomUUID(),kind:'report_ready',at:new Date(now).toISOString(),reportId:report.id,delivery:'mock_mailbox'});
    }catch(e){j.error=e.message;j.status=j.attempts>=5?'needs_attention':'retry';j.nextAttempt=now+Math.min(3600000,2**j.attempts*30000);store.audit(user.id,'share_'+j.status);}
  }
  return changed;
}
export function runSchedule(store,user,now=new Date().toISOString()) {
  const v=user.vault;if(!authorized(v,Date.parse(now)))return false;
  const p=previousPeriod(v.consent.frequency,now,v.timezone);
  if(p.to<v.enrolled)return false;
  const queued=queueReport(store,user,p.from,p.to,reportLanguage(v),now);
  const processed=processQueue(store,user,{now:Date.parse(now)});
  return Boolean(queued)||processed;
}
