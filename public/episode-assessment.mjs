import {uiText} from './i18n.mjs';
// Required answers describe what is known; an explicit unknown is not a missing answer.
export const ASSESSMENT_FIELDS=['durationStatus','frequencyStatus','symptomsStatus','triggersStatus'];
export function dayAssessmentIssues(r){
  const issues=[];
  if(!['yes','no','not_applicable','unknown'].includes(r.preventiveTaken))issues.push({field:'preventiveTaken',key:'answerRequired'});
  if(!['none','limited','unable','unknown'].includes(r.dailyImpact))issues.push({field:'dailyImpact',key:'answerRequired'});
  return issues;
}
export function assessmentIssues(r){
  const issues=[];
  const issue=(field,key='answerRequired')=>issues.push({field,key});
  if(!['reported','from_times','ongoing','unknown'].includes(r.durationStatus))issue('durationStatus');
  else if(r.durationStatus==='reported'&&!(Number(r.reportedDurationMinutes)>0&&Number(r.reportedDurationMinutes)<=43200))issue('reportedDurationMinutes','durationNeeded');
  else if(r.durationStatus==='from_times'&&!(r.start&&r.end&&Date.parse(r.end)>Date.parse(r.start)))issue('durationStatus','timesNeeded');
  else if(r.durationStatus==='ongoing'&&(r.end||r.endStatus!=='ongoing'))issue('durationStatus','ongoingNeeded');
  else if(r.durationStatus==='unknown'&&r.reportedDurationMinutes!=null&&r.reportedDurationMinutes!=='')issue('durationStatus','answerConflict');
  if(!['reported','unknown'].includes(r.frequencyStatus))issue('frequencyStatus');
  else if(r.frequencyStatus==='reported'&&!(typeof r.reportedFrequency==='string'&&r.reportedFrequency.trim()))issue('reportedFrequency','frequencyNeeded');
  else if(r.frequencyStatus==='unknown'&&String(r.reportedFrequency||'').trim())issue('frequencyStatus','answerConflict');
  for(const [status,field] of [['symptomsStatus','symptoms'],['triggersStatus','suspectedTriggers']]){
    if(!['present','none','unknown'].includes(r[status]))issue(status);
    else if(r[status]==='present'&&!r[field]?.length)issue(field,'selectDetails');
    else if(r[status]!=='present'&&r[field]?.length)issue(status,'answerConflict');
  }
  if(!['none','limited','unable','unknown'].includes(r.impact))issue('impact');
  if(!['exact','estimated'].includes(r.precision))issue('precision');
  if(!['attack','background','exacerbation'].includes(r.type))issue('type');
  return issues;
}

export const assessmentText=(lang,key)=>uiText(lang,'assessment',key);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function renderDayAssessment(r,T){
  const select=(name,values)=>`<div class="field"><label>${esc(T(name))} <span class="quality-required">${esc(T('required'))}</span><select name="${name}" aria-required="true"><option value="">${esc(T('choose'))}</option>${values.map(v=>`<option value="${v}" ${v===r[name]?'selected':''}>${esc(T(v==='unknown'?'answerUnknown':v))}</option>`).join('')}</select></label><p class="field-error" data-assessment-error="${name}" role="alert" hidden></p></div>`;
  return `<div data-day-assessment class="form-grid">${select('preventiveTaken',['not_applicable','yes','no','unknown'])}${select('dailyImpact',['none','limited','unable','unknown'])}</div>`;
}

export function renderAssessment(r,T,codes){
  const error=name=>`<p class="field-error" data-assessment-error="${name}" role="alert" hidden></p>`;
  const select=(name,values,value='',optionLabels={})=>`<div class="field"><label>${esc(T(name))} <span class="quality-required">${esc(T('required'))}</span><select name="${name}" aria-required="true"><option value="">${esc(T('choose'))}</option>${values.map(v=>`<option value="${v}" ${v===value?'selected':''}>${esc(T(optionLabels[v]||v))}</option>`).join('')}</select></label>${error(name)}</div>`;
  const input=(name,type,opts='')=>`<div class="field"><label>${esc(T(name))}<input name="${name}" type="${type}" value="${esc(r[name]??'')}" ${opts}></label>${name==='reportedFrequency'?`<small>${esc(T('frequencyHint'))}</small>`:''}${error(name)}</div>`;
  const chips=(name,values)=>`<fieldset class="full"><legend>${esc(T(name))}</legend><div class="chips">${values.map(v=>`<label class="chip"><input type="checkbox" name="${name}" value="${v}" ${r[name]?.includes(v)?'checked':''}>${esc(T(v))}</label>`).join('')}</div>${error(name)}</fieldset>`;
  // Only infer positive answers from existing details. Empty legacy lists never mean None.
  const duration=r.durationStatus||(r.reportedDurationMinutes?'reported':r.end?'from_times':'');
  const frequency=r.frequencyStatus||(r.reportedFrequency?.trim()?'reported':'');
  const states={present:'answerPresent',none:'answerNone',unknown:'answerUnknown'};
  return `<section class="episode-assessment" data-assessment><h4>${esc(T('assessmentTitle'))}</h4><p class="muted">${esc(T('assessmentHint'))}</p><div class="form-grid">
    ${select('durationStatus',['from_times','reported','ongoing','unknown'],duration,{reported:'durationReported',ongoing:'durationOngoing',unknown:'answerUnknown'})}
    ${input('reportedDurationMinutes','number','min="0.01" max="43200" step="any"')}
    ${select('frequencyStatus',['reported','unknown'],frequency,{reported:'frequencyReported',unknown:'answerUnknown'})}${input('reportedFrequency','text','maxlength="250"')}
    <div class="full">${select('symptomsStatus',['present','none','unknown'],r.symptomsStatus||(r.symptoms?.length?'present':''),states)}</div>${chips('symptoms',codes.symptoms)}
    <div class="full">${select('triggersStatus',['present','none','unknown'],r.triggersStatus||(r.suspectedTriggers?.length?'present':''),states)}</div>${chips('suspectedTriggers',codes.triggers)}
    ${select('impact',codes.impact,r.impact,{unknown:'answerUnknown'})}${select('precision',['exact','estimated'],r.precision)}${select('type',['attack','background','exacerbation'],r.type)}
    <label class="field full">${esc(T('additionalNotes'))}<textarea name="notes" maxlength="2000">${esc(r.notes||'')}</textarea></label>
    </div></section>`;
}
export function readAssessment(scope){
  const r={};for(const el of scope.querySelectorAll('[name]')){
    if(['symptoms','suspectedTriggers'].includes(el.name)){r[el.name]??=[];if(el.checked)r[el.name].push(el.value);}
    else if(el.type!=='checkbox'&&el.type!=='radio')r[el.name]=el.value;
  }return r;
}
export function checkAssessment(root,T,focus=true){
  let first;for(const section of root.querySelectorAll('[data-assessment],[data-day-assessment]')){
    const scope=section.closest('[data-kind],form[data-record-kind]');
    if(scope.dataset.templateEmpty==='true')continue;
    const issues=(section.hasAttribute('data-day-assessment')?dayAssessmentIssues:assessmentIssues)(readAssessment(scope));section.dataset.checked='true';
    for(const hint of section.querySelectorAll('[data-assessment-error]')){hint.hidden=true;hint.textContent='';}
    for(const el of section.querySelectorAll('[aria-invalid]'))el.removeAttribute('aria-invalid');
    for(const {field,key} of issues){const hint=section.querySelector(`[data-assessment-error="${field}"]`);hint.textContent=T(key);hint.hidden=false;for(const el of section.querySelectorAll(`[name="${field}"]`))el.setAttribute('aria-invalid','true');first??=section.querySelector(`[name="${field}"]`);}
  }
  if(first&&focus){first.scrollIntoView({block:'center'});first.focus({preventScroll:true});}return !first;
}
export function updateAssessment(target,T){
  const scope=target.closest('[data-kind],form[data-record-kind]');if(!scope)return;
  const mappings={reportedDurationMinutes:'durationStatus',reportedFrequency:'frequencyStatus',symptoms:'symptomsStatus',suspectedTriggers:'triggersStatus'};
  const status=mappings[target.name];
  if(status&&(target.type==='checkbox'?target.checked:target.value.trim()))scope.querySelector(`[name="${status}"]`).value=target.type==='checkbox'?'present':'reported';
  if(scope.querySelector('[data-assessment][data-checked],[data-day-assessment][data-checked]'))checkAssessment(scope,T,false);
}
