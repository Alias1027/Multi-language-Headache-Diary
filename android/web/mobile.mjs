import {native,storage,locks} from './bridge.mjs';
import {createEngine,httpsOrigin,PROFILE_KEY} from './engine.mjs';
import {encryptBackup,decryptBackup} from './backup.mjs';
import {mobileText} from './strings.mjs';
import {languages,translate,direction} from '../../public/i18n.mjs';
import {createDiaryWorkspace,diaryText} from '../../public/diary-ui.mjs';
import {workspaceText} from '../../public/workspace-i18n.mjs';
import {accessText} from '../../public/care-access-i18n.mjs';
import {renderAccess} from '../../public/care-access-ui.mjs';
import {renderCare} from '../../public/care-ui.mjs';
import {dateAt} from '../../public/domain.mjs';
const app=document.querySelector('#mobile-app'),engine=createEngine({storage,locks}),diary=createDiaryWorkspace({storage,locks});
let lang='zh',page='diary',csrf='',connected=false,remote=null,care=null,careAt='',careTab='plans',careDraft=null,grants=null,lookup=null,busy=false;
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const T=k=>accessText(lang,k)??diaryText(lang,k)??workspaceText(lang,k)??translate(lang,k),M=k=>mobileText(lang,k)||T(k);
let statusTimer;const say=s=>{clearTimeout(statusTimer);document.querySelector('#mobile-status').textContent=s;if(s)statusTimer=setTimeout(()=>{document.querySelector('#mobile-status').textContent='';},12000);};
const button=(id,label)=>`<button type="button" data-mobile="${id}">${e(M(label))}</button>`;
const field=(name,label,type='text',value='',extra='')=>`<label>${e(label)}<input name="${name}" type="${type}" value="${e(value)}" ${extra}></label>`;
async function api(path,body){if(!connected&&!['/api/login','/api/register','/api/state'].includes(path))throw new Error('linkFirst');const r=await native('http',{path,body,csrf});if(r.status<200||r.status>=300)throw Object.assign(new Error(r.body?.error||'networkError'),{status:r.status});if(path==='/api/state')csrf=r.body.csrf;return r.body;}
async function loadCare(){care=await api('/api/care');grants=await api('/api/care/access');careAt=new Date().toISOString();await storage.put('android-care-cache',{care,grants,at:careAt});}
async function render(){
 const profile=engine.profile();document.documentElement.lang=lang;document.documentElement.dir=direction(lang);
 app.innerHTML=`<header class="mobile-head"><h1>${e(M('title'))}</h1><select id="mobile-language" aria-label="Language">${Object.entries(languages).map(([k,v])=>`<option value="${k}" ${k===lang?'selected':''}>${v}</option>`).join('')}</select></header><p class="native-note">Android 0.1.0 · ${e(T('lab'))}</p>`;
 if(!profile){const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;app.innerHTML+=`<section class="mobile-block"><p>${e(M('localHint'))}</p><form id="create-profile">${field('enrolled',T('enrolled'),'date',dateAt(Date.now(),zone),'required')}${field('zone',T('timezone'),'text',zone,'required')}<button class="primary">${e(M('start'))}</button></form></section>${backupHTML()}`;return;}
 app.innerHTML+=`<nav class="mobile-nav">${['diary','history','care','settings'].map(p=>`<button data-mobile="page" data-page="${p}" class="${page===p?'selected':''}">${e(M(p))}</button>`).join('')}</nav><p>${e(M('pending'))}: ${engine.pending().length}</p>`;
 if(page==='diary'){app.innerHTML+='<div id="diary-root"></div>';await diary.mount(app.querySelector('#diary-root'),{lang,t:T,state:engine.view,save:engine.save,onSaved:()=>render().then(()=>say(T('offlineSaved'))),canVoiceLeave:()=>true,mountVoice,download:()=>say(M('backup'))});}
 if(page==='history'){
  const v=engine.view().vault;app.innerHTML+=`<section class="mobile-block"><h2>${e(M('history'))}</h2>${v.days.length?v.days.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(d=>`<article class="mobile-record"><bdi>${e(d.date)}</bdi> · r${d.revision}<p>${e(T('headache'))}: ${e(T(d.headache))} · ${e(T('acute'))}: ${e(T(d.acute))}</p><p>${e(d.notes)}</p></article>`).join(''):`<p>${e(M('noData'))}</p>`}${['episodes','medications','preventives'].map(k=>`<h3>${e(T(k))} · ${v[k].length}</h3>${v[k].slice().reverse().map(r=>`<article class="mobile-record"><bdi>${e(r.start||r.at)}</bdi> · r${r.revision}<p>${e(r.name||T('episodes'))} ${e(r.regimen||r.dose||'')} ${e(r.unit||'')}</p><p>${e(r.notes)}</p></article>`).join('')}`).join('')}</section>`;
 }
 if(page==='settings'){const binding=profile.binding;app.innerHTML+=backupHTML()+`<section class="mobile-block"><h2>${e(M('connect'))}</h2><p>${e(M('networkHint'))}</p>${binding?`<p>${e(M('linked'))}: <bdi>${e(binding.email)}<br>${e(binding.origin)}</bdi></p>`:''}<p>${e(M('linkHint'))}</p><form id="login">${field('origin',M('service'),'url',binding?.origin||'','required placeholder="https://diary.example.org"')}${field('email',T('email'),'email',binding?.email||'','required autocomplete="username"')}${field('password',T('password'),'password','','required minlength="10" autocomplete="current-password"')}<label class="check"><input type="checkbox" name="register">${e(T('register'))}</label><button class="primary">${e(M('preview'))}</button></form>${remote?`<div class="notice"><p><bdi>${e(remote.user.email)}</bdi> · ${remote.vault.days.length} ${e(T('days'))}<br><bdi>${e(remote.vault.enrolled)} · ${e(remote.vault.timezone)}</bdi></p>${button('bind','confirmLink')}</div>`:''}<div class="actions">${button('sync','sync')}${button('logout','logout')}</div></section><section class="mobile-block"><h2>${e(T('accessTitle'))}</h2>${connected&&binding?renderAccess(grants,lookup,T):`<p>${e(T('onlineCareOnly'))}</p>`}</section>`;}
 if(page==='care'){app.innerHTML+=`<p>${e(M('cached'))}: <bdi>${e(careAt||'—')}</bdi></p><p>${e(T('onlineCareOnly'))}</p>${renderCare({care,state:engine.view(),tab:careTab,draft:careDraft,lang,t:T})}`;if(!connected)app.querySelectorAll('.care-panel form input,.care-panel form select,.care-panel form textarea,.care-panel form button').forEach(x=>x.disabled=true);}
}
function backupHTML({recoveryOnly=false}={}){return `<section class="mobile-block"><h2>${e(M(recoveryOnly?'restore':'backup'))}</h2>${recoveryOnly?'':`<p>${e(M('restoreHint'))}</p>`}<label>${e(M('password'))}<input id="backup-password" type="password" minlength="12" autocomplete="new-password"></label><p>${e(M('passwordHint'))}</p><div class="actions">${recoveryOnly?'':button('backup','backup')}${button('restore','restore')}${button('rollback','restorePrevious')}</div></section>`;}
let audioURLs=[];
async function mountVoice(el){audioURLs.forEach(u=>URL.revokeObjectURL(u));audioURLs=[];const recordings=Object.entries(await storage.all()).filter(([k])=>k.startsWith('audio-'));el.innerHTML=`<p>${e(M('recordHint'))}</p><div class="actions">${button('record','record')}${button('audio','pick')}</div><p>${recordings.length} · ${e(M('recordSaved'))}</p>${recordings.map(([,r])=>{const url=URL.createObjectURL(new Blob([Uint8Array.from(atob(r.data),c=>c.charCodeAt(0))],{type:r.mime}));audioURLs.push(url);return `<p><bdi>${e(r.at)} · ${Math.round(r.bytes/1024)} KB</bdi></p><audio controls preload="none" src="${url}"></audio>`;}).join('')}`;}
async function flushDiary(){if(!await diary.flush())throw new Error('saving');}
async function doSync(){if(!connected||!engine.profile()?.binding)throw new Error('linkFirst');await flushDiary();const result=await engine.sync(api);if(result.status!=='synced'){say(M('syncProblem')+' ('+result.error+')');return;}await loadCare();await render();say(M('syncOk'));}
async function action(event){const b=event.target.closest('[data-mobile],[data-action]');if(!b||busy)return;const m=b.dataset.mobile,a=b.dataset.action;busy=true;b.disabled=true;
 try{
  if(m==='page'){await flushDiary();page=b.dataset.page;await render();window.scrollTo(0,0);}
  else if(m==='record'||m==='audio'){await flushDiary();await native(m==='record'?'record':'audio');await render();diary.openVoice();say(M('recordSaved'));}
  else if(m==='backup'){await flushDiary();const password=document.querySelector('#backup-password').value,text=await encryptBackup(await storage.all(),password);await native('export',{text});document.querySelector('#backup-password').value='';say(M('backupDone'));}
  else if(m==='restore'){await flushDiary();const password=document.querySelector('#backup-password').value,text=await native('import'),snapshot=await decryptBackup(text,password);if(!confirm(M('restoreConfirm')))return;await native('restore',{value:snapshot});await resetAfterRestore();}
  else if(m==='rollback'){await flushDiary();if(!confirm(M('restoreConfirm')))return;await native('rollback');await resetAfterRestore();}
  else if(m==='bind'){
   if(!remote)throw new Error('linkFirst');const local=engine.view().vault;
   if(!remote.vault.days.length&&!remote.vault.episodes.length&&!remote.vault.medications.length&&!remote.vault.preventives.length){await api('/api/settings',{language:lang,reportLanguage:lang,reportLanguageMode:'interface',timezone:local.timezone,enrolled:local.enrolled,reminder:{enabled:false,time:'20:00'}});remote=await api('/api/state');}
   await flushDiary();await engine.bind(remote,remoteOrigin);diary.reset();remote=null;await doSync();
  }
  else if(m==='sync')await doSync();
  else if(m==='logout'){await native('disconnect');connected=false;csrf='';remote=null;await render();}
  else if(a==='care-tab'){careTab=b.dataset.tab;await render();}
  else if(a==='care-refresh'){await loadCare();await render();}
  else if(a==='revoke-doctor'){grants=await api('/api/care/access',{revoke:true,clinicianId:b.dataset.id});await render();}
  else if(a==='care-evidence'){const report=care.assessments.find(x=>x.id===b.dataset.id)?.report;say(report?JSON.stringify(report.summary):M('noData'));}
  else if(a==='care-amend'&&b.dataset.kind==='patientPlans'){careDraft=structuredClone(care.patientPlans.find(r=>r.id===b.dataset.id));careDraft.previousId=careDraft.id;delete careDraft.id;await render();} else if(a==='care-cancel'){careDraft=null;await render();}
 }catch(err){say(M('error')+' '+(T(err.message)===err.message?'('+err.message+')':T(err.message)));}finally{busy=false;if(b.isConnected)b.disabled=false;}
}
let remoteOrigin='';
app.addEventListener('click',action);
app.addEventListener('change',async ev=>{if(ev.target.id!=='mobile-language')return;const select=ev.target,next=select.value;if(busy){select.value=lang;return;}busy=true;try{await flushDiary();if(engine.profile())await engine.language(next);diary.reset();say('');lang=next;await render();}catch(err){select.value=lang;say(err.message==='saving'?T('saving'):M('error'));}finally{busy=false;}});
app.addEventListener('submit',async ev=>{
 if(ev.target.id==='unified-diary-form')return;ev.preventDefault();if(busy)return;busy=true;const f=ev.target,fd=new FormData(f),data=Object.fromEntries(fd),submit=f.querySelector('[type=submit],button');if(submit)submit.disabled=true;
 try{
  if(f.id==='create-profile'){await engine.initialize(lang,data.zone,data.enrolled);await render();}
  else if(f.id==='login'){await flushDiary();remote=null;connected=false;csrf='';remoteOrigin=httpsOrigin(data.origin);const binding=engine.profile().binding;if(binding&&binding.origin!==remoteOrigin)throw new Error('sameAccount');await native('connect',{origin:remoteOrigin});await api(fd.has('register')?'/api/register':'/api/login',{email:data.email,password:data.password});f.querySelector('[name=password]').value='';remote=await api('/api/state');if(remote.user.role!=='patient'||binding&&binding.userId!==remote.user.id){await native('disconnect');remote=null;throw new Error('sameAccount');}connected=true;await render();}
  else if(f.id==='doctor-lookup'){lookup={...await api('/api/care/lookup',{code:data.code}),code:data.code};await render();}
  else if(f.id==='doctor-grant'){grants=await api('/api/care/access',{code:f.dataset.code,label:data.label,days:Number(data.days),consent:fd.has('consent')});lookup=null;await render();}
  else if(f.id==='patient-plan-form'||f.classList.contains('feedback-form')){const kind=f.dataset.careKind||'feedback';if(f.dataset.previous)data.previousId=f.dataset.previous;if(kind==='feedback'){data.planId=f.dataset.plan;data.planKind=f.dataset.planKind||'plans';}const result=await api('/api/care/save',{kind,record:data,revision:care.revision,operationId:crypto.randomUUID()});care=result.care;careDraft=null;await loadCare();await render();say(T('saved'));}
 }catch(err){say(M('error')+' '+(T(err.message)===err.message?'('+err.message+')':T(err.message)));}finally{busy=false;if(submit?.isConnected)submit.disabled=false;}
});
async function resetAfterRestore(){await native('disconnect');connected=false;remote=null;csrf='';diary.reset();await engine.load();lang=engine.profile()?.language||lang;const cache=await storage.get('android-care-cache');care=cache?.care||null;grants=null;careAt=cache?.at||'';page='diary';await render();say(M('restoreDone'));}
try{await engine.load();lang=engine.profile()?.language||lang;const cache=await storage.get('android-care-cache');care=cache?.care||null;careAt=cache?.at||'';await render();}catch(err){app.innerHTML=`<section class="mobile-block"><h1>${e(M('title'))}</h1><p>${e(M(globalThis.AndroidBridge?'error':'nativeOnly'))}</p><p>${e(err.message)}</p></section>${globalThis.AndroidBridge?backupHTML({recoveryOnly:true}):''}`;}
