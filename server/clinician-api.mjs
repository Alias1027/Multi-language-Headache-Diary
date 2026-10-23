import {randomUUID} from 'node:crypto';
import {checkPassword} from './storage.mjs';
import {sessionCookie} from './deployment.mjs';
import {careContext,viewCare,saveCare,loadCare} from './care.mjs';
import {createReport} from './core.mjs';
import {buildCareSummary} from './care-report.mjs';
import {clinicianActive,authorizedPatients,clinicalVault,recordReview,requireReview} from './care-access.mjs';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
export async function clinicianAPI({store,req,res,url,json,deployment,attempts,address}){
 const route=url.pathname.slice('/api/clinician'.length),publicAuth=['/login','/register'].includes(route)&&req.method==='POST';
 const token=req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('hd_clinician='))?.slice(13),session=store.authenticate(token),actor=session&&store.get(session.user_id);
 if(!publicAuth&&(!session||actor?.profile.role!=='clinician'))return json(401,{error:'login_required'});
 if(!publicAuth&&req.method!=='GET'&&req.headers['x-csrf-token']!==session.csrf)return json(403,{error:'invalid_csrf'});
 let body={};if(req.method==='POST'){let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>262144)fail('body_too_large',413);chunks.push(chunk);}try{body=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}catch{fail('invalid_json');}}
 const cookie=(value,age)=>sessionCookie(value,deployment,age).replace(/^hd_session=/,'hd_clinician=');
 if(publicAuth){
  const key='clinician:'+address,a=attempts.get(key)||{n:0,reset:Date.now()+60000};if(a.reset<Date.now()){a.n=0;a.reset=Date.now()+60000;}a.n++;attempts.set(key,a);if(a.n>20)fail('try_later',429);
  const email=String(body.email||'').trim().toLowerCase(),password=String(body.password||'');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||password.length<12||password.length>128)fail('invalid_credentials_format');
  const existing=store.findEmail(email);
  if(route==='/register'){
   if(existing)fail('email_exists',409);const name=String(body.name||'').trim();if(!name||name.length>80)fail('invalid_care_text');
   const id=store.createUser(email,password,{synthetic:false},false),u=store.get(id);Object.assign(u.profile,{role:'clinician',displayName:name,clinicianApproved:false});store.save(u);store.audit(id,'clinician_approval_requested');return json(201,{ok:true,pending:true});
  }
  if(!existing||!checkPassword(password,existing.password))fail('invalid_credentials',401);
  const u=store.get(existing.id);if(u.profile.role!=='clinician')fail('care_access_denied',403);if(!clinicianActive(u))fail('clinician_pending',403);
  if(session&&actor?.profile.role==='clinician')store.logout(token);
  const s=store.session(u.id);res.setHeader('Set-Cookie',cookie(s.token));store.audit(u.id,'clinician_logged_in');return json(200,{ok:true});
 }
 if(route==='/logout'&&req.method==='POST'){store.logout(token);res.setHeader('Set-Cookie',cookie('',0));return json(200,{ok:true});}
 if(!clinicianActive(actor))fail('clinician_pending',403);
 if(route==='/me'&&req.method==='GET')return json(200,{user:{id:actor.id,name:actor.profile.displayName,role:'clinician',code:actor.profile.careCode},csrf:session.csrf,patients:authorizedPatients(store,actor)});
 if(!['/patient','/report','/review','/save'].includes(route))fail('care_access_denied',403);
 const context=careContext(store,actor,url.searchParams.get('patientId')),patient=context.patient,care=loadCare(store,patient.id);
 if(route==='/patient'&&req.method==='GET')return json(200,{user:{id:actor.id,role:'clinician',patientId:patient.id},vault:clinicalVault(patient.vault),care:viewCare(store,context)});
 if(route==='/report'&&req.method==='POST'){
  const r=createReport(patient.vault,body.from,body.to,body.language);r.careSummary=buildCareSummary(care,r.createdAt);patient.vault.reports.push(r);store.save(patient);return json(200,r);
 }
 if(route==='/review'&&req.method==='POST')return json(200,recordReview(store,context,care,body));
 if(route==='/save'&&req.method==='POST'){
  const input={...body,record:{...body.record}};
  if(!['assessments','plans','followups'].includes(body.kind))fail('care_access_denied',403);
  if(input.record.status!=='draft'){
   const review=requireReview(store,context,care,body.reviewId);

   input.record.reviewedAt=review.at;input.record.reviewId=review.id;input.record.reviewedReportId=review.reportId;
  }
  return json(200,saveCare(store,context,input));
 }
 return json(404,{error:'not_found'});
}
