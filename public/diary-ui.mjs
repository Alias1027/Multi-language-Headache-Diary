import {uiText} from './i18n.mjs';
import {createEntryTemplate,isEmptyTemplate,entriesToSave} from './entry-templates.mjs';
import {assessmentText,renderAssessment,renderDayAssessment,checkAssessment,updateAssessment} from './episode-assessment.mjs';
import {CODES,dateAt,boundary,addDays} from './domain.mjs';
import {localVault} from './offline.mjs';
import {createDraftStore} from './diary-drafts.mjs';

export const diaryText=(lang,key)=>uiText(lang,'diary',key);
export function checkPainQuality(root,message,focus=true){const groups=[...root.querySelectorAll('[data-quality-group]')];let first;for(const group of groups){if(group.closest('[data-template-empty="true"]'))continue;const missing=!group.querySelector('input[name=quality]:checked'),hint=group.querySelector('[data-quality-error]');hint.hidden=!missing;hint.textContent=missing?message:'';for(const input of group.querySelectorAll('input')){if(missing)input.setAttribute('aria-invalid','true');else input.removeAttribute('aria-invalid');}if(missing&&!first)first=group;}if(first&&focus){first.scrollIntoView({block:'center'});first.querySelector('input')?.focus({preventScroll:true});}return !first;}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const localTime=s=>{if(!s)return '';const d=new Date(s);return Number.isFinite(+d)?new Date(+d-d.getTimezoneOffset()*60000).toISOString().slice(0,16):'';};
const toISO=s=>s&&Number.isFinite(Date.parse(s))?new Date(s).toISOString():null;

export function createDiaryWorkspace({storage=localVault,locks=globalThis.navigator?.locks}={}){
  let voiceOpen=false,voiceRecording=false,host,ctx,draft,loadedUser=null,writing=Promise.resolve(),saveTimer,saving=false,status='',legacy=[],storedDrafts=[],releaseEditor=null;
  const draftStore=createDraftStore({storage,locks});
  const T=k=>assessmentText(ctx.lang,k)??diaryText(ctx.lang,k)??ctx.t(k),vault=()=>ctx.state().vault,today=()=>dateAt(Date.now(),vault().timezone);
  const uid=()=>ctx.state().user.id;
  const pointer=()=> 'active-diary-draft-'+uid();
  async function selectDraft(next){releaseEditor?.();releaseEditor=await draftStore.claim(uid(),next.operationId);if(!releaseEditor){next=structuredClone(next);next.operationId=crypto.randomUUID();releaseEditor=await draftStore.claim(uid(),next.operationId);}if(!releaseEditor)throw new Error('storageLockUnavailable');draft=next;sessionStorage.setItem(pointer(),draft.operationId);if(draft.changed)await draftStore.save(uid(),draft);storedDrafts=await draftStore.list(uid());}
  async function removeDraft(){await draftStore.remove(uid(),draft.operationId);storedDrafts=await draftStore.list(uid());}
  const fresh=date=>({uid:ctx.state().user.id,date,day:structuredClone(vault().days.find(d=>d.date===date)||{id:'day-'+date,revision:0,date,headache:'unknown',acute:'unknown',migraine:'unknown',preventiveTaken:'',dailyImpact:''}),episodes:[],medications:[],preventives:[],voiceIds:[],voiceReviewed:false,changed:false,operationId:crypto.randomUUID()});
  const btn=(a,label,attrs='')=>`<button type="button" data-diary-action="${a}" ${attrs}>${esc(T(label))}</button>`;
  const field=(name,type,value='',opts='')=>`<label class="field">${esc(T(name))}<input name="${name}" type="${type}" value="${esc(value??'')}" ${opts}></label>`;
  const select=(name,values,value)=>`<label class="field">${esc(T(name))}<select name="${name}">${values.map(v=>`<option value="${v}" ${v===(value||'unknown')?'selected':''}>${esc(T(name==='unit'&&['tablet','spray','other'].includes(v)?'unit_'+v:v))}</option>`).join('')}</select></label>`;
  const check=(name,checked,label=name)=>`<label class="check"><input name="${name}" type="checkbox" ${checked?'checked':''}>${esc(T(label))}</label>`;
  const chips=(name,values,selected=[])=>`<fieldset class="full" ${name==='quality'?'data-quality-group':''}><legend>${esc(T(name))}${name==='quality'?` <span class="quality-required">${esc(T('qualityRequired'))}</span>`:''}</legend><div class="chips">${values.map(v=>`<label class="chip"><input name="${name}" value="${v}" type="checkbox" ${selected.includes(v)?'checked':''}>${esc(T(v))}</label>`).join('')}</div>${name==='quality'?'<p data-quality-error class="field-error" role="alert" hidden></p>':''}</fieldset>`;
  const notes=r=>`<label class="field full">${esc(T('notes'))}<textarea dir="auto" name="notes" maxlength="2000">${esc(r.notes||'')}</textarea></label>`;
  const choice=(name,value)=>`<fieldset class="day-choice"><legend>${esc(T(name))}</legend><div class="status-choices">${['no','yes','unknown'].map(v=>`<label><input type="radio" name="${name}" value="${v}" ${value===v?'checked':''}><span>${esc(T(v))}</span></label>`).join('')}</div></fieldset>`;
  function overlap(r){const lo=boundary(draft.date,vault().timezone),hi=boundary(addDays(draft.date,1),vault().timezone);return Date.parse(r.start)<hi&&(r.end?Date.parse(r.end):r.endStatus==='ongoing'?Date.now()+1:Date.parse(r.start)+1)>lo;}
  function existing(kind){return vault()[kind].filter(r=>kind==='episodes'?overlap(r):dateAt(r.at,vault().timezone)===draft.date).filter(r=>!draft[kind].some(d=>d.id===r.id));}
  function existingHTML(kind){const rows=existing(kind);return rows.length?`<details class="existing-events"><summary>${esc(T('existing'))} · ${rows.length}</summary>${rows.map(r=>`<div class="row"><div><strong>${esc(kind==='episodes'?T('episodes'):r.name)}</strong><small>${esc(new Date(r.start||r.at).toLocaleString(ctx.lang))}${kind==='episodes'?' · '+esc(T(r.end?'ended':r.endStatus)):' · '+r.dose+' '+esc(T(r.unit))}</small></div>${btn('update','updateExisting',`data-kind="${kind}" data-id="${esc(r.id)}"`)}</div>`).join('')}</details>`:'';}
  function eventHTML(kind,r,i){
    const top=`<div class="entry-heading"><h3>${esc(T(kind==='episodes'?'episodes':kind==='medications'?'medications':'preventiveTab'))} · ${i+1}${r.revision?` <span class="badge">${esc(T('revised'))}</span>`:''}</h3>${btn('remove',r._template?'resetEntry':'removeEntry',`class="smallbutton" data-kind="${kind}" data-index="${i}"`)}</div>${r._template?`<p class="muted">${esc(T('emptyEntryHint'))}</p>`:''}${r.sourceVoiceId?`<p class="notice">${esc(T('voiceSource'))}</p>`:''}`;
    let fields='';
    if(kind==='episodes')fields=`<div class="form-grid">${field('start','datetime-local',localTime(r.start),'required')}${field('end','datetime-local',localTime(r.end))}${field('intensity','number',r.intensity,'min="0" max="10" step="1"')}${select('endStatus',['ongoing','unknown'],r.endStatus||'unknown')}${chips('location',CODES.location,r.location)}${chips('quality',CODES.quality,r.quality)}</div>${renderAssessment(r,T,CODES)}`;
    if(kind==='medications')fields=`<div class="form-grid">${field('name','text',r.name,'required maxlength="120" list="unified-known-medicines"')}${field('at','datetime-local',localTime(r.at),'required')}${field('dose','number',r.dose,'required min="0.001" max="99999" step="any"')}${r.sourceVoiceId&&!r.unit?`<label class="field">${esc(T('unit'))}<select name="unit" required><option value="">${esc(T('choose'))}</option>${['mg','mcg','mL','tablet','spray','other'].map(u=>`<option value="${u}">${esc(T(['tablet','spray','other'].includes(u)?'unit_'+u:u))}</option>`).join('')}</select></label>`:select('unit',['mg','mcg','mL','tablet','spray','other'],r.unit||'mg')}${select('drugClass',CODES.drugClass,r.drugClass||'other')}${field('beforePain','number',r.beforePain,'min="0" max="10" step="1"')}</div><details><summary>${esc(T('followup'))}</summary><div class="form-grid">${field('followupAt','datetime-local',localTime(r.followup?.at))}${select('painFree',['unknown','yes','no'],r.followup?.painFree)}${select('functionRecovered',['unknown','yes','no'],r.followup?.functionRecovered)}${select('recurrence',['unknown','no','24h','48h'],r.recurrence)}${check('rescue',r.rescue)}${field('responseNote','text',r.responseNote,'maxlength="500"')}${field('adverse','text',r.adverse,'maxlength="500"')}${notes(r)}</div></details>`;
    if(kind==='preventives')fields=`<div class="form-grid">${field('name','text',r.name,'required maxlength="120"')}${field('regimen','text',r.regimen,'required maxlength="250"')}${field('startDate','date',r.start||(r._template?'':draft.date),'required')}${field('endDate','date',r.end)}${field('reason','text',r.reason,'maxlength="300"')}${field('adverse','text',r.adverse,'maxlength="500"')}${notes(r)}</div>`;
    const empty=isEmptyTemplate(kind,r);fields=fields.replace(/ required(?=[ >])/g,empty?' data-entry-required':' required data-entry-required');
    return `<fieldset class="diary-event" data-kind="${kind}" data-index="${i}" data-template-empty="${empty}">${top}${fields}</fieldset>`;
  }
  function render(){
    if(!host?.isConnected)return;const d=draft.day,locked=false;
    if(!locked&&d.headache!=='yes')draft.episodes=draft.episodes.filter(r=>!isEmptyTemplate('episodes',r));
    if(!locked&&d.headache==='yes'&&!draft.episodes.length)draft.episodes.push(createEntryTemplate('episodes'));
    if(!locked&&d.acute!=='yes')draft.medications=draft.medications.filter(r=>!isEmptyTemplate('medications',r));
    if(!locked&&d.acute==='yes'&&!draft.medications.length)draft.medications.push(createEntryTemplate('medications'));
    if(!locked&&!draft.preventives.length)draft.preventives.push(createEntryTemplate('preventives'));
    host.innerHTML=`${storedDrafts.some(d=>d.changed&&d.operationId!==draft.operationId)?`<details class="notice draft-recovery" open><summary>${esc(T('recoveredDrafts'))}</summary><p>${esc(T('draftRecoveryHint'))}</p>${storedDrafts.filter(d=>d.changed&&d.operationId!==draft.operationId).map(d=>`<div class="row"><div><bdi>${esc(d.date)}</bdi><div class="actions">${btn('recover-draft','recoverDraft',`data-operation="${esc(d.operationId)}"`)}${btn('discard-draft','discardDraft',`class="smallbutton" data-operation="${esc(d.operationId)}"`)}</div></div></div>`).join('')}</details>`:''}<form id="unified-diary-form"><fieldset ${locked?'disabled':''}><section class="card unified-diary" id="unified-day"><div class="diary-heading"><div><span class="eyebrow">${esc(T('daily'))}</span><h2>${esc(T('statusTitle'))}</h2></div><label class="field diary-date">${esc(T('entryDate'))}<input name="diaryDate" type="date" min="${vault().enrolled}" max="${today()}" value="${draft.date}" required></label></div><p class="muted">${esc(T(draft.date===today()?'todayNote':'unknownNote'))}</p><fieldset data-kind="days"><div class="form-grid">${choice('headache',d.headache)}${choice('acute',d.acute)}</div><div class="daily-information"><div class="form-grid">${select('migraine',['unknown','yes','no'],d.migraine)}${chips('exposures',CODES.triggers,d.exposures)}${check('exposuresComplete',d.exposuresComplete)}${notes(d)}</div><p class="muted">${esc(T('noCause'))}</p></div></fieldset>

      <section class="diary-section" id="unified-episodes"><p class="muted">${esc(T('inputTimezone'))} <bdi>${esc(Intl.DateTimeFormat().resolvedOptions().timeZone)}</bdi>${vault().timezone!==Intl.DateTimeFormat().resolvedOptions().timeZone?" · "+esc(vault().timezone):""}</p><div class="entry-heading"><h2>${esc(T('episodeTitle'))}</h2><span class="badge">${esc(T(d.headache))}</span></div>${d.headache==='yes'||draft.episodes.length||existing('episodes').length?`<p class="muted">${esc(T('ongoingHint'))}</p>${existingHTML('episodes')}${draft.episodes.map((r,i)=>eventHTML('episodes',r,i)).join('')}${btn('add','addEpisode','data-kind="episodes"')}`:`<p class="muted">${esc(T('detailsLater'))}</p>`}</section>
      <section class="diary-section" id="unified-medications"><div class="entry-heading"><h2>${esc(T('medicineTitle'))}</h2><span class="badge">${esc(T(d.acute))}</span></div>${d.acute==='yes'||draft.medications.length||existing('medications').length?`${existingHTML('medications')}${draft.medications.map((r,i)=>eventHTML('medications',r,i)).join('')}${btn('add','addMedicine','data-kind="medications"')}`:`<p class="muted">${esc(T('detailsLater'))}</p>`}<datalist id="unified-known-medicines">${[...new Set(vault().medications.map(m=>m.name))].map(n=>`<option value="${esc(n)}"></option>`).join('')}</datalist></section>
      <section class="diary-section preventive-assessment"><h2>${esc(T('preventionRequired'))}</h2><p class="muted">${esc(T('preventionRequiredHint'))}</p><fieldset data-kind="days">${renderDayAssessment(d,T)}</fieldset><p class="muted">${esc(T('preventionHint'))}</p>${draft.preventives.map((r,i)=>eventHTML('preventives',r,i)).join('')}${btn('add','addPreventive','data-kind="preventives"')}</section>
      ${draft.voiceIds.length?`<div class="notice">${check('voiceReviewed',draft.voiceReviewed,'voiceDateCheck')}</div>`:''}
      <p id="diary-status" role="status" aria-live="polite">${esc(status)}</p>
      ${legacy.length?`<details><summary>${esc(T('legacy'))}</summary><div class="actions">${legacy.map(task=>`<button type="button" data-action="legacy-task" data-task="${task}">${esc(T(task))}</button>`).join('')}</div></details>`:''}
      <div class="actions draft-tools">${btn('clear','clearAll','class="smallbutton"')}${btn('export','exportDraft','class="smallbutton"')}</div></section></fieldset>
      <div class="diary-savebar"><button type="submit" class="primary" ${locked||saving?'disabled':''}>${esc(T(saving?'saving':'saveAll'))}</button></div></form>
<button type="button" class="voice-launcher primary${voiceRecording?' recording-button':''}" data-diary-action="voice-toggle" aria-label="${esc(T('voiceLauncher')+(voiceRecording?' · '+T('voiceRecording'):''))}" aria-controls="diary-voice-panel" aria-expanded="${voiceOpen}" ${locked?'disabled':''}><span class="voice-launcher-label" aria-hidden="true">${esc(T('voiceLauncher'))}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/></svg><span class="voice-recording-dot" aria-hidden="true"></span><span class="voice-launcher-status" aria-hidden="true">${esc(T('voiceRecording'))}</span></button>
<aside id="diary-voice-panel" class="voice-dock" role="region" aria-labelledby="diary-voice-title" ${voiceOpen&&!locked?'':'hidden'}><header class="voice-dock-header"><h2 id="diary-voice-title">${esc(T('voiceLauncher'))}</h2>${btn('voice-close','voiceMinimize','class="smallbutton"')}</header><nav class="voice-jumps" aria-label="${esc(T('voiceJump'))}">${[['unified-day','voiceDay'],['unified-episodes','voiceEpisode'],['unified-medications','voiceMedicine']].map(([target,label])=>btn('voice-jump',label,`class="smallbutton" data-target="${target}"`)).join('')}</nav><div class="voice-dock-body"><p class="muted">${esc(T('voiceHint'))}</p><div id="voice-root"></div></div></aside>`;
    host.onclick=action;host.oninput=input;host.onchange=change;host.onsubmit=submit;host.onkeydown=ev=>{if(ev.key==='Escape'&&voiceOpen&&ev.target.closest('.voice-dock')){ev.stopPropagation();voiceOpen=false;updateVoiceVisibility();}};
    if(!locked)ctx.mountVoice(host.querySelector('#voice-root'),fillVoice,activity=>{voiceRecording=activity.recording;const launcher=host.querySelector('.voice-launcher');if(launcher){launcher.setAttribute('aria-label',T('voiceLauncher')+(voiceRecording?' · '+T('voiceRecording'):''));launcher.classList.toggle('recording-button',voiceRecording);}}).catch(err=>say(T(err.message)===err.message?ctx.t('error'):T(err.message)));
  }
  function updateVoiceVisibility(){const panel=host?.querySelector('.voice-dock'),launcher=host?.querySelector('.voice-launcher');if(!panel||!launcher)return;panel.hidden=!voiceOpen;launcher.setAttribute('aria-expanded',String(voiceOpen));if(voiceOpen)panel.querySelector('button')?.focus({preventScroll:true});else launcher.focus({preventScroll:true});}
  function say(message){status=message;const p=host?.querySelector('#diary-status');if(p)p.textContent=message;}
  function capture(){
    if(!host?.querySelector('#unified-diary-form'))return;
    for(const fs of host.querySelectorAll('fieldset[data-kind]')){
      const kind=fs.dataset.kind,r=kind==='days'?draft.day:draft[kind][Number(fs.dataset.index)],values={};if(!r)continue;
      for(const el of fs.querySelectorAll('[name]')){if(el.type==='radio'){if(el.checked)values[el.name]=el.value;}else if(el.type==='checkbox'){if(['location','quality','symptoms','suspectedTriggers','exposures'].includes(el.name)){values[el.name]??=[];if(el.checked)values[el.name].push(el.value);}else values[el.name]=el.checked;}else values[el.name]=el.value;}
      for(const n of ['intensity','beforePain','dose','reportedDurationMinutes'])if(n in values)values[n]=values[n]===''?null:Number(values[n]);
      if(kind==='episodes'){values.start=toISO(values.start);values.end=toISO(values.end);values.originalTimezone=Intl.DateTimeFormat().resolvedOptions().timeZone;}
      if(kind==='medications'){values.at=toISO(values.at);values.followup=values.followupAt||values.painFree!=='unknown'||values.functionRecovered!=='unknown'?{at:toISO(values.followupAt),painFree:values.painFree,functionRecovered:values.functionRecovered}:null;values.originalTimezone=Intl.DateTimeFormat().resolvedOptions().timeZone;fs.querySelector('[name=followupAt]').required=!!values.followup;delete values.followupAt;delete values.painFree;delete values.functionRecovered;}
      if(kind==='preventives'){values.start=values.startDate;values.end=values.endDate||null;delete values.startDate;delete values.endDate;}
      Object.assign(r,values);
      if(kind!=='days'){const empty=isEmptyTemplate(kind,r);fs.dataset.templateEmpty=String(empty);for(const input of fs.querySelectorAll('[data-entry-required]'))input.required=!empty;if(empty){for(const hint of fs.querySelectorAll('.field-error'))hint.hidden=true;for(const el of fs.querySelectorAll('[aria-invalid]'))el.removeAttribute('aria-invalid');}}
    }
    draft.voiceReviewed=!!host.querySelector('[name="voiceReviewed"]')?.checked;
  }
  async function persist(){clearTimeout(saveTimer);if(!draft)return;const snapshot=structuredClone(draft),userId=uid();writing=writing.catch(()=>{}).then(()=>draftStore.save(userId,snapshot));try{await writing;}catch(err){say(T('offlineSaveFailed'));throw err;}}
  function mark(){draft.changed=true;clearTimeout(saveTimer);saveTimer=setTimeout(()=>persist().then(()=>say(T('draftKept'))).catch(()=>{}),200);}
  function input(ev){if(ev.target.closest('#voice-root')||ev.target.name==='diaryDate')return;updateAssessment(ev.target,T);capture();if(ev.target.name==='quality')checkPainQuality(ev.target.closest('[data-kind]'),T('invalid_episode_quality'),false);mark();}
  async function change(ev){
    if(!host.contains(ev.target)||ev.target.closest('#voice-root'))return;
    if(ev.target.name==='diaryDate'){
      const date=ev.target.value;if(!ev.target.checkValidity()||!date){ev.target.value=draft.date;return;}
      capture();if(draft.changed&&!confirm(T('switchDate'))){ev.target.value=draft.date;return;}
      if(!ctx.canVoiceLeave()){ev.target.value=draft.date;return;}
      const fields=host.querySelector('#unified-diary-form > fieldset');fields.disabled=true;
      try{clearTimeout(saveTimer);await writing.catch(()=>{});await removeDraft();await selectDraft(fresh(date));status='';render();await persist();}
      catch(err){say(T('offlineSaveFailed'));if(fields.isConnected)fields.disabled=false;}
      return;
    }
    if(['headache','acute'].includes(ev.target.name)){capture();mark();await persist();if(ctx.canVoiceLeave())render();}
  }
  async function action(ev){
    const b=ev.target.closest('[data-diary-action]');if(!b||saving)return;ev.stopPropagation();const a=b.dataset.diaryAction,kind=b.dataset.kind;
    if(a==='voice-toggle'||a==='voice-close'){voiceOpen=a==='voice-close'?false:!voiceOpen;updateVoiceVisibility();return;}
    if(a==='voice-jump'){host.querySelector('#'+b.dataset.target)?.scrollIntoView({block:'start',behavior:'instant'});return;}
    capture();
    try{
      if(a==='export'){ctx.download('diary-draft.json',draft);return;}
      if(!ctx.canVoiceLeave())return;
      if(a==='clear'){if(!confirm(T('clearConfirm')))return;clearTimeout(saveTimer);await writing.catch(()=>{});await removeDraft();await selectDraft(fresh(draft.date));status='';render();return;}
      if(a==='recover-draft'){if(draft.changed&&!confirm(T('switchDate')))return;const candidate=(await draftStore.list(uid())).find(d=>d.operationId===b.dataset.operation);if(!candidate)return;clearTimeout(saveTimer);await writing.catch(()=>{});await removeDraft();await selectDraft(candidate);status='';render();return;}
      if(a==='discard-draft'){if(!confirm(T('clearConfirm')))return;const release=await draftStore.claim(uid(),b.dataset.operation);if(!release){say(T('draftRecoveryHint'));return;}try{await draftStore.remove(uid(),b.dataset.operation);}finally{release();}storedDrafts=await draftStore.list(uid());render();return;}
      if(a==='add'){
        const blank=draft[kind].findIndex(r=>isEmptyTemplate(kind,r));if(blank>=0){host.querySelector(`[data-kind="${kind}"][data-index="${blank}"] input`)?.focus();return;}
        if(['episodes','medications','preventives'].reduce((n,k)=>n+entriesToSave(k,draft[k]).length,0)>=30)return;
        const time=draft.date===today()?new Date().toISOString():null;
        draft[kind].push({id:crypto.randomUUID(),revision:0,...(kind==='episodes'?{start:time,endStatus:'ongoing'}:kind==='medications'?{at:time}: {start:draft.date})});
        if(kind==='episodes')draft.day.headache='yes';if(kind==='medications')draft.day.acute='yes';
      }
      if(a==='remove'){draft[kind].splice(Number(b.dataset.index),1);}
      if(a==='update'){draft[kind]=draft[kind].filter(r=>!isEmptyTemplate(kind,r));draft[kind].push(structuredClone(vault()[kind].find(r=>r.id===b.dataset.id)));if(kind==='episodes')draft.day.headache='yes';if(kind==='medications')draft.day.acute='yes';}
      draft.changed=true;await persist();render();if(a==='add'||a==='update')host.querySelector(`[data-kind="${kind}"][data-index="${draft[kind].length-1}"] input`)?.focus();
    }catch(err){say(T(err.message)===err.message?ctx.t('error'):T(err.message));}
  }
  async function fillVoice(fields,note){
    capture();if(draft.voiceIds.includes(note.id)){say(T('voiceAlready'));return;}
    if(draft.changed&&!confirm(T('voiceMerge')))return;
    const source={sourceVoiceId:note.id,sourceVoiceRevision:note.revision,notes:note.text.slice(0,2000)};
    if(Object.keys(fields.days||{}).length)Object.assign(draft.day,fields.days,source);
    if(Object.keys(fields.episodes||{}).length){draft.episodes=draft.episodes.filter(r=>!isEmptyTemplate('episodes',r));draft.episodes.push({id:crypto.randomUUID(),revision:0,...fields.episodes,...source,start:null,end:null,endStatus:'unknown',precision:'estimated'});draft.day.headache='yes';}
    if(Object.keys(fields.medications||{}).length){draft.medications=draft.medications.filter(r=>!isEmptyTemplate('medications',r));draft.medications.push({id:crypto.randomUUID(),revision:0,...fields.medications,...source,at:null});draft.day.acute='yes';}
    draft.voiceIds.push(note.id);draft.voiceReviewed=false;draft.changed=true;status=T('voiceAdded');await persist();render();host.querySelector('#unified-episodes')?.scrollIntoView({block:'start'});
  }
  async function submit(ev){
    ev.preventDefault();ev.stopPropagation();if(saving||!ctx.canVoiceLeave())return;capture();
    if(!checkPainQuality(host,T('invalid_episode_quality'))){say(T('invalid_episode_quality'));await persist();return;}
    if(!checkAssessment(host,T)){say(T('completeRequired'));await persist();return;}
    if(draft.voiceIds.length&&!draft.voiceReviewed){say(T('voiceDateCheck'));host.querySelector('[name="voiceReviewed"]')?.focus();return;}
    saving=true;const button=host.querySelector('[type="submit"]'),fields=host.querySelector('#unified-diary-form > fieldset');button.disabled=true;fields.disabled=true;say(T('saving'));
    try{
      await persist();const records=[{kind:'days',record:{...draft.day,date:draft.date}},...['episodes','medications','preventives'].flatMap(kind=>entriesToSave(kind,draft[kind]).map(record=>({kind,record})))];
      const result=await ctx.save({date:draft.date,records,operationId:draft.operationId});
      clearTimeout(saveTimer);await writing;
      await removeDraft();await selectDraft(fresh(draft.date));
      status=T(result.queued?'offlineSaved':'savedAll');saving=false;ctx.onSaved();
    }catch(err){say(T(err.message)===err.message?ctx.t('error'):T(err.message));saving=false;if(button.isConnected)button.disabled=false;if(fields.isConnected)fields.disabled=false;}
  }
  return {
    text:diaryText,
    async mount(element,context){host=element;ctx=context;host.innerHTML=`<p>${esc(T('loading'))}</p>`;const uid=ctx.state().user.id;if(loadedUser!==uid||!draft){loadedUser=uid;await draftStore.migrate(uid);storedDrafts=await draftStore.list(uid);const remembered=sessionStorage.getItem(pointer()),candidate=storedDrafts.find(d=>d.operationId===remembered)||storedDrafts.find(d=>d.changed);await selectDraft(candidate||fresh(today()));}if(!draft.changed){await removeDraft();await selectDraft(fresh(draft.date));}storedDrafts=await draftStore.list(uid);legacy=[];for(const [form,task] of [['daily-form','daily'],['episode-form','episodes'],['med-form','medications'],['preventive-form','medications']])if(await storage.get('draft-'+form))legacy.push(task);legacy=[...new Set(legacy)];render();},
    async flush(){if(saving)return false;if(host?.isConnected&&draft?.changed){capture();await persist();}return true;},
    openVoice(){voiceOpen=true;updateVoiceVisibility();},
    reset(){voiceOpen=false;voiceRecording=false;clearTimeout(saveTimer);releaseEditor?.();releaseEditor=null;draft=null;loadedUser=null;status='';storedDrafts=[];},
    dirty(){return !!draft?.changed;}
  };
}

