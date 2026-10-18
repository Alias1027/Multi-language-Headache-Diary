import {assessmentIssues,dayAssessmentIssues,ASSESSMENT_FIELDS} from './episode-assessment.mjs';
export const RULE_VERSION = '0.1.0';
import {LANGUAGES,GLOSSARY_VERSION} from './locale-registry.mjs';
export {LANGUAGES};
export const CODES = {
  location: ['left','right','bilateral','forehead','temple','behind_eye','back_head','whole_head'],
  quality: ['pulsating','pressing','stabbing','burning','other'],
  symptoms: ['nausea','vomiting','photophobia','phonophobia','aura','tearing','nasal','aggravated_activity'],
  triggers: ['stress','poor_sleep','caffeine','alcohol','missed_meal','menstruation','weather','exercise'],
  drugClass: ['simple_analgesic','nsaid','triptan','combination','opioid','gepant','other'],
  impact: ['none','limited','unable','unknown'],
};
const formatters = new Map();
export function dateAt(value, zone = 'Asia/Shanghai') {
  if (!formatters.has(zone)) formatters.set(zone, new Intl.DateTimeFormat('en-CA', {timeZone:zone, year:'numeric', month:'2-digit', day:'2-digit'}));
  const p = Object.fromEntries(formatters.get(zone).formatToParts(new Date(value)).map(x=>[x.type,x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
export function validDate(d) { return typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(Date.parse(d)) && new Date(d).toISOString().slice(0,10) === d; }
export function addDays(date, n) { return new Date(Date.parse(date+'T12:00:00Z')+n*86400000).toISOString().slice(0,10); }
export function dates(from, to) {
  if (!validDate(from) || !validDate(to) || from > to || Date.parse(to)-Date.parse(from)>731*86400000) throw new Error('invalid_period');
  const out=[]; for(let d=from;d<=to;d=addDays(d,1)) out.push(d); return out;
}
// First instant belonging to a civil date. This also handles 23/25 hour DST days.
export function boundary(date, zone) {
  let low = Date.parse(date+'T00:00:00Z')-36*3600000, high=low+72*3600000;
  while(high-low>1) { const mid=Math.floor((low+high)/2); if(dateAt(mid,zone)<date) low=mid; else high=mid; }
  return high;
}
export function previousPeriod(kind, now, zone) {
  const today = dateAt(now,zone);
  if(kind==='monthly') { const first=today.slice(0,7)+'-01', end=addDays(first,-1); return {from:end.slice(0,7)+'-01',to:end}; }
  const weekday=(new Date(today+'T12:00:00Z').getUTCDay()+6)%7;
  const end=addDays(today,-weekday-1); return {from:addDays(end,-6),to:end};
}
export function emptyVault(now = new Date().toISOString()) {
  return {schema:1, revision:0, enrolled:dateAt(now), timezone:'Asia/Shanghai', language:'zh', reportLanguage:'zh', reportLanguageMode:'interface', synthetic:false,
    days:[], episodes:[], medications:[], preventives:[], operations:[], consent:null, reminder:{enabled:false,time:'20:00'}, reports:[], jobs:[], notifications:[]};
}
function ensure(ok, code='invalid_record') { if(!ok) throw new Error(code); }
function str(v,max=200) { ensure(typeof v==='string' && v.length<=max); return v; }
function time(v) { ensure(typeof v==='string' && validDate(v.slice(0,10)) && /^\d{4}-\d\d-\d\dT(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)$/.test(v) && Number.isFinite(Date.parse(v))); return new Date(v).toISOString(); }
function select(v,allowed) { ensure(allowed.includes(v));return v; }
function list(v,allowed) { ensure(Array.isArray(v) && v.length<=allowed.length && v.every(x=>allowed.includes(x)));return [...new Set(v)]; }
function pain(v) { if(v==null || v==='')return null; ensure(Number.isInteger(Number(v)) && Number(v)>=0 && Number(v)<=10);return Number(v); }
export function validate(kind,r,now=new Date().toISOString()) {
  ensure(r && typeof r==='object'); const base={id:str(r.id,100),revision:Number(r.revision)||0,notes:str(r.notes||'',2000)};
  ensure(Number.isInteger(base.revision)&&base.revision>=0);
  ensure(/^[a-zA-Z0-9_-]{1,100}$/.test(base.id));
  if(r.sourceVoiceId){ensure(/^[a-zA-Z0-9_-]{1,100}$/.test(r.sourceVoiceId)&&Number.isInteger(r.sourceVoiceRevision)&&r.sourceVoiceRevision>0);Object.assign(base,{sourceVoiceId:r.sourceVoiceId,sourceVoiceRevision:r.sourceVoiceRevision});}
  if(kind==='days') {
    ensure(validDate(r.date));
    ensure(!dayAssessmentIssues(r).length,'invalid_day_assessment');
    return {...base,dayAssessmentVersion:1,dailyImpact:r.dailyImpact,date:r.date,headache:select(r.headache,['yes','no','unknown']),acute:select(r.acute,['yes','no','unknown']),exposures:list(r.exposures||[],CODES.triggers),exposuresComplete:!!r.exposuresComplete,migraine:select(r.migraine||'unknown',['yes','no','unknown']),migraineSource:'patient',preventiveTaken:select(r.preventiveTaken||'unknown',['yes','no','not_applicable','unknown'])};
  }
  if(kind==='episodes') {
    ensure(Array.isArray(r.quality)&&r.quality.length>0,'invalid_episode_quality');
    const reportedDurationMinutes=r.reportedDurationMinutes==null||r.reportedDurationMinutes===''?null:Number(r.reportedDurationMinutes);
    ensure(reportedDurationMinutes===null||Number.isFinite(reportedDurationMinutes)&&reportedDurationMinutes>0&&reportedDurationMinutes<=43200);
    Object.assign(base,{reportedDurationMinutes,reportedFrequency:str(r.reportedFrequency||'',250)});
    const start=time(r.start),end=r.end?time(r.end):null; ensure(!end||end>start,'end_before_start'); ensure(Date.parse(start)<=Date.parse(now)+60000&&(!end||Date.parse(end)<=Date.parse(now)+60000),'future_record');
    ensure(!assessmentIssues(r).length,'invalid_episode_assessment');
    Object.assign(base,{assessmentVersion:1,...Object.fromEntries(ASSESSMENT_FIELDS.map(k=>[k,r[k]]))});
    return {...base,start,end,endStatus:end?'ended':select(r.endStatus||'ongoing',['ongoing','unknown']),intensity:pain(r.intensity),location:list(r.location||[],CODES.location),quality:list(r.quality||[],CODES.quality),symptoms:list(r.symptoms||[],CODES.symptoms),suspectedTriggers:list(r.suspectedTriggers||[],CODES.triggers),impact:select(r.impact||'unknown',CODES.impact),precision:select(r.precision||'exact',['exact','estimated']),originalTimezone:str(r.originalTimezone||'Asia/Shanghai'),type:select(r.type||'attack',['attack','background','exacerbation'])};
  }
  if(kind==='medications') {
    base.responseNote=str(r.responseNote||'',500);
    const at=time(r.at); ensure(Date.parse(at)<=Date.parse(now)+60000,'future_record'); const dose=Number(r.dose);ensure(Number.isFinite(dose)&&dose>0&&dose<100000); let followup=null;
    if(r.followup)ensure(!!r.followup.at,'followup_time_required');
    if(r.followup?.at) followup={at:time(r.followup.at),painFree:select(r.followup.painFree,['yes','no','unknown']),functionRecovered:select(r.followup.functionRecovered||'unknown',['yes','no','unknown'])};
    ensure(!followup||followup.at>=at,'followup_before_dose');ensure(!followup||Date.parse(followup.at)<=Date.parse(now)+60000,'future_record');
    return {...base,at,name:str(r.name,120),dose,unit:select(r.unit,['mg','mcg','mL','tablet','spray','other']),drugClass:select(r.drugClass,CODES.drugClass),beforePain:pain(r.beforePain),followup,rescue:!!r.rescue,recurrence:select(r.recurrence||'unknown',['no','24h','48h','unknown']),adverse:str(r.adverse||'',500),originalTimezone:str(r.originalTimezone||'Asia/Shanghai')};
  }
  if(kind==='preventives') {
    ensure(validDate(r.start)&&(!r.end||validDate(r.end)&&r.end>=r.start));
    return {...base,name:str(r.name,120),regimen:str(r.regimen,250),start:r.start,end:r.end||null,reason:str(r.reason||'',300),adverse:str(r.adverse||'',500)};
  }
  throw new Error('invalid_kind');
}
export function applyRecord(vault,kind,input,operationId,now=new Date().toISOString()) {
  ensure(/^[a-zA-Z0-9_-]{1,100}$/.test(operationId||''));
  if(vault.operations.includes(operationId)) return {duplicate:true,revision:vault.revision};
  const r=validate(kind,input,now), records=vault[kind];
  const old=records.find(x=>x.id===r.id);
  ensure((old?.revision||0)===r.revision,'revision_conflict');
  if(kind==='days') ensure(!records.some(x=>x.date===r.date&&x.id!==r.id),'date_conflict');
  const eventDate=kind==='days'?r.date:kind==='preventives'?r.start:dateAt(r.start||r.at,vault.timezone);
  ensure(eventDate>=vault.enrolled && eventDate<=dateAt(now,vault.timezone),'outside_enrollment');
  Object.assign(r,{revision:r.revision+1,createdAt:old?.createdAt||now,updatedAt:now,late:dateAt(old?.createdAt||now,vault.timezone)>eventDate});
  if(old) records[records.indexOf(old)]=r; else records.push(r);
  vault.revision++; vault.operations.push(operationId);
  return {record:r,revision:vault.revision};
}
function unionMinutes(intervals) {
  intervals.sort((a,b)=>a[0]-b[0]);let total=0,end=-Infinity;
  for(const [s,e] of intervals){total+=Math.max(0,e-Math.max(s,end));end=Math.max(e,end);}return Math.round(total/60000*10)/10;
}
export function summarize(v,from,to,now=new Date().toISOString()) {
  const zone=v.timezone, all=dates(from,to),today=dateAt(now,zone), eligible=all.filter(d=>d>=v.enrolled&&d<today);
  const lo=boundary(eligible[0]||from,zone), hi=eligible.length?boundary(addDays(eligible.at(-1),1),zone):lo,nowMs=Date.parse(now);
  const relevant=eligible.length?v.episodes.filter(e=>Date.parse(e.start)<hi && (e.end?Date.parse(e.end):e.endStatus==='ongoing'?nowMs:Date.parse(e.start)+1)>lo):[];
  const episodeDays=new Set();
  for(const e of relevant) for(const d of eligible){const start=Date.parse(e.start),end=e.end?Date.parse(e.end):e.endStatus==='ongoing'?nowMs:start+1;if(start<boundary(addDays(d,1),zone)&&end>boundary(d,zone))episodeDays.add(d);}
  const ds=v.days.filter(d=>eligible.includes(d.date)),known=ds.filter(d=>d.headache!=='unknown');
  const positives=new Set(ds.filter(d=>d.headache==='yes').map(d=>d.date));for(const d of episodeDays)positives.add(d);
  const conflicts=ds.filter(d=>d.headache==='no'&&episodeDays.has(d.date)).map(d=>d.date);
  const meds=v.medications.filter(m=>eligible.includes(dateAt(m.at,zone))), medDays=new Set(meds.map(m=>dateAt(m.at,zone)));
  const medConflicts=ds.filter(d=>d.acute==='no'&&medDays.has(d.date)).map(d=>d.date);
  const medKnown=new Set(ds.filter(d=>d.acute!=='unknown').map(d=>d.date));for(const d of medDays)medKnown.add(d);
  const clinicalKnown=new Set(known.map(d=>d.date));for(const d of episodeDays)clinicalKnown.add(d);
  const byClass=Object.fromEntries(CODES.drugClass.map(c=>[c,new Set(meds.filter(m=>m.drugClass===c).map(m=>dateAt(m.at,zone))).size]));
  const response={eligible:meds.length,inWindow:0,painFree:0,notPainFree:0,missing:0,outsideWindow:0,functionRecovered:0,functionKnown:0};
  for(const m of meds){ if(!m.followup||m.followup.painFree==='unknown'){response.missing++;continue;}const minutes=(Date.parse(m.followup.at)-Date.parse(m.at))/60000; if(minutes<90||minutes>150){response.outsideWindow++;continue;} response.inWindow++; if(m.followup.painFree==='yes')response.painFree++;else response.notPainFree++; }
  for(const m of meds){if(!m.followup)continue;const minutes=(Date.parse(m.followup.at)-Date.parse(m.at))/60000;if(minutes>=90&&minutes<=150&&['yes','no'].includes(m.followup.functionRecovered)){response.functionKnown++;if(m.followup.functionRecovered==='yes')response.functionRecovered++;}}
  const completed=relevant.filter(e=>e.end);const intensities=relevant.map(e=>e.intensity).filter(x=>x!==null&&x!==undefined);
  return {ruleVersion:RULE_VERSION,from,to,timezone:zone,eligibleDays:eligible.length,excludedDays:all.length-eligible.length,
    statusDays:known.length,coverage:eligible.length?Math.round(known.length/eligible.length*1000)/10:null,unknownDays:eligible.length-known.length,
    clinicalKnownDays:clinicalKnown.size,headacheDays:positives.size,episodeInferredDays:[...episodeDays].filter(d=>!known.some(x=>x.date===d)),conflicts,medConflicts,
    episodes:relevant.filter(e=>e.start>=new Date(lo).toISOString()&&e.start<new Date(hi).toISOString()).length,carriedIn:relevant.filter(e=>Date.parse(e.start)<lo).length,
    ongoing:relevant.filter(e=>!e.end&&e.endStatus==='ongoing').length,unknownEnds:relevant.filter(e=>!e.end&&e.endStatus==='unknown').length,
    completedDurations:completed.map(e=>({id:e.id,minutes:(Date.parse(e.end)-Date.parse(e.start))/60000})),
    completedUnionMinutes:unionMinutes(completed.map(e=>[Math.max(lo,Date.parse(e.start)),Math.min(hi,Date.parse(e.end))])),
    acuteDays:new Set([...medDays,...ds.filter(d=>d.acute==='yes').map(d=>d.date)]).size,acuteStatusDays:medKnown.size,medicationEvents:meds.length,byClass,response,
    maxIntensity:intensities.length?Math.max(...intensities):null,averageIntensity:intensities.length?Math.round(intensities.reduce((a,b)=>a+b,0)/intensities.length*10)/10:null,
    lateDays:ds.filter(d=>d.late).length,impact:Object.fromEntries(CODES.impact.map(c=>[c,relevant.filter(e=>e.impact===c).length])),
    adverseEffects:meds.filter(m=>m.adverse).map(m=>({name:m.name,at:m.at,text:m.adverse})),
    patientMigraineDays:ds.filter(d=>d.migraine==='yes').length,exposureDays:ds.filter(d=>d.exposuresComplete).length,
    dailyImpact:{...Object.fromEntries(CODES.impact.map(c=>[c,ds.filter(d=>d.dailyImpact===c).length])),unanswered:eligible.length-ds.filter(d=>CODES.impact.includes(d.dailyImpact)).length},
    preventiveAdherence:{yes:ds.filter(d=>d.preventiveTaken==='yes').length,no:ds.filter(d=>d.preventiveTaken==='no').length,unknown:eligible.length-ds.filter(d=>['yes','no','not_applicable'].includes(d.preventiveTaken)).length},
    calendar:eligible.map(date=>({date,status:ds.find(d=>d.date===date)?.headache||'unknown',episode:episodeDays.has(date),medication:medDays.has(date),conflict:conflicts.includes(date)})),
    preventives:v.preventives.filter(p=>p.start<=to&&(!p.end||p.end>=from))};
}
export function createReport(v,from,to,language,now=new Date().toISOString()) {
  ensure(LANGUAGES.includes(language));const count=dates(from,to).length, prevTo=addDays(from,-1),prevFrom=addDays(from,-count);
  return {id:crypto.randomUUID(),version:v.reports.length+1,sourceRevision:v.revision,createdAt:now,language,glossaryVersion:GLOSSARY_VERSION,synthetic:v.synthetic,summary:summarize(v,from,to,now),previous:summarize(v,prevFrom,prevTo,now)};
}
export function toFHIR(v,subject='synthetic-patient') {
  return {resourceType:'Bundle',type:'collection',meta:{tag:[{system:'urn:headache-diary:mode',code:v.synthetic?'synthetic':'experimental'}]},entry:v.days.map(d=>({resource:{resourceType:'QuestionnaireResponse',id:d.id,status:'completed',subject:{identifier:{system:'urn:headache-diary:local',value:subject}},authored:d.updatedAt,item:[{linkId:'date',answer:[{valueDate:d.date}]},{linkId:'headache',answer:[{valueCoding:{system:'urn:headache-diary:status',code:d.headache}}]},{linkId:'acute-medication',answer:[{valueCoding:{system:'urn:headache-diary:status',code:d.acute}}]}]}}))};
}
