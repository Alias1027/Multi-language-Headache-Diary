// Test-only fixture: accounts are approved by direct operator access to an
// isolated store. Browser authentication and patient authorization use real APIs.
import {randomUUID} from 'node:crypto';
import {approveClinician} from '../server/care-access.mjs';
export function careClient(app,origin){
 let mode='patient',cookies={patient:'',clinician:''},tokens={patient:'',clinician:''},patientId='',doctor=null;
 async function call(url,body,headers={}){
  let endpoint=url;
  if(mode==='clinician'&&!url.startsWith('/api/clinician/')){
   endpoint='/api/clinician'+({'/api/state':'/patient','/api/care':'/patient','/api/care/save':'/save','/api/report':'/report'}[url.split('?')[0]]||url.slice(4));
   endpoint+='?patientId='+encodeURIComponent(new URL(url,origin).searchParams.get('patientId')||patientId);
  }
  const m=url.startsWith('/api/clinician/')?'clinician':mode;
  const r=await fetch(origin+endpoint,{method:body===undefined?'GET':'POST',headers:{Cookie:cookies[m],Origin:origin,'Content-Type':'application/json','X-CSRF-Token':tokens[m],...headers},body:body===undefined?undefined:JSON.stringify(body)});
  if(r.headers.get('set-cookie'))cookies[m]=r.headers.get('set-cookie').split(';')[0];let data=await r.json();
  if(endpoint.startsWith('/api/clinician/patient')&&url.split('?')[0]==='/api/care'&&r.ok)data=data.care;
  return {status:r.status,data};
 }
 async function state(){if(mode==='clinician'){const me=await call('/api/clinician/me');tokens.clinician=me.data.csrf;}const r=await call('/api/state');if(mode==='patient'&&r.status===200){tokens.patient=r.data.csrf;patientId=r.data.user.id;}return r.data;}
 async function role(value){
  mode='patient';await state();
  if(value==='clinician'){
   if(!doctor){const email='doctor-'+randomUUID()+'@example.invalid',password='Synthetic-password-080';await call('/api/clinician/register',{email,password,name:'Demo clinician'});doctor=approveClinician(app.store,app.store.findEmail(email).id);await call('/api/clinician/login',{email,password});}
   await call('/api/care/access',{code:doctor.profile.careCode,label:'Synthetic patient',days:30,consent:true});mode='clinician';
  }
  return state();
 }
 async function save(kind,record,options={}){
  let reviewId;
  if(mode==='clinician'&&record.status!=='draft'&&['assessments','plans','followups'].includes(kind)){
   const r=await call('/api/report',{from:'2026-09-01',to:'2026-09-28',language:'zh'});
   const reviewed=await call('/api/clinician/review?patientId='+patientId,{reportId:r.data.id,checks:{diary:true,feedback:true,summary:true}});reviewId=reviewed.data.id;
  }
  const c=(await call('/api/care')).data;return call('/api/care/save',{kind,record,revision:c.revision,reviewId,operationId:randomUUID(),...options});
 }
 return {call,state,role,save};
}
