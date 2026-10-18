// A patient-visible report appendix. Do not copy internal care objects: assessments
// contain older reports and would recursively embed the entire report history.
const fields={
  plans:['id','status','change','medication','dose','route','frequency','start','end','instructions','reason','assessmentId','sourceNote','observationFocus','reviewDate','previousId','amendReason','createdAt','updatedAt','confirmedAt'],
  feedback:['id','planId','status','actualStart','perceivedChange','difficultyReason','adverseNote','note','createdAt','updatedAt'],
  assessments:['id','reportId','status','summary','response','functionNote','questions','patientMessage','previousId','amendReason','createdAt','updatedAt','confirmedAt'],
  followups:['id','status','due','method','focus','outcome','completedAt','createdAt','updatedAt']
};
const pick=(record,keys)=>Object.fromEntries(keys.filter(key=>Object.hasOwn(record,key)&&
  (record[key]===null||['string','number','boolean'].includes(typeof record[key]))).map(key=>[key,record[key]]));
const records=(care,kind)=>Array.isArray(care?.[kind])?care[kind]:[];
const atOrBefore=(record,now)=>record&&typeof record.id==='string'&&record.id.length>0&&
  Number.isFinite(Date.parse(record.createdAt))&&Date.parse(record.createdAt)<=now&&
  (!record.confirmedAt||Number.isFinite(Date.parse(record.confirmedAt))&&Date.parse(record.confirmedAt)<=now);

/** Published care history as of generation; diary-period filters do not apply. */
export function buildCareSummary(care,now=new Date().toISOString()) {
  const timestamp=Date.parse(now);
  if(!Number.isFinite(timestamp))throw new Error('invalid_care_summary_time');
  const published=(kind,statuses)=>records(care,kind).filter(r=>atOrBefore(r,timestamp)&&statuses.includes(r.status));
  const plans=[
    ...published('plans',['confirmed']).map(r=>({...pick(r,fields.plans),kind:'plans',provenance:'simulated_clinician'})),
    ...published('patientPlans',['recorded']).map(r=>({...pick(r,fields.plans),kind:'patientPlans',provenance:'patient_reported'}))
  ];
  const planIds=new Set(plans.map(r=>r.kind+':'+r.id));
  const feedback=published('feedback',['read','started','not_started','difficulty'])
    .filter(r=>planIds.has((r.planKind||'plans')+':'+r.planId))
    .map(r=>({...pick(r,fields.feedback),planKind:r.planKind||'plans',provenance:'patient_reported'}));
  return {
    schemaVersion:1,scope:'published-history-as-of-generation',capturedAt:new Date(timestamp).toISOString(),
    sourceRevision:Number.isSafeInteger(care?.revision)&&care.revision>=0?care.revision:0,
    plans,feedback,
    assessments:published('assessments',['confirmed']).map(r=>({...pick(r,fields.assessments),provenance:'simulated_clinician'})),
    followups:published('followups',['scheduled','completed','unreachable','postponed','cancelled'])
      .map(r=>({...pick(r,fields.followups),provenance:'simulated_clinician'}))
  };
}
