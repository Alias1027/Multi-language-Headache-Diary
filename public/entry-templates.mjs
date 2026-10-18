// Automatic first forms stay display-only until meaningful values are entered.
export function createEntryTemplate(kind){
  if(!['episodes','medications','preventives'].includes(kind))throw new Error('invalid_template_kind');
  return {id:crypto.randomUUID(),revision:0,_template:true};
}
export function isEmptyTemplate(kind,r){
  if(!r._template||r.revision||r.sourceVoiceId)return false;
  const keys=kind==='episodes'
    ?['start','end','intensity','location','quality','symptoms','suspectedTriggers','reportedDurationMinutes','reportedFrequency','durationStatus','frequencyStatus','symptomsStatus','triggersStatus','impact','precision','type','notes']
    :kind==='medications'?['name','at','dose','beforePain','responseNote','adverse','notes']:['name','regimen','start','end','reason','adverse','notes'];
  const hasValue=v=>Array.isArray(v)?v.length>0:typeof v==='string'?v.trim().length>0:v!==undefined&&v!==null;
  if(keys.some(k=>hasValue(r[k])))return false;
  if(kind==='episodes')return !r.endStatus||r.endStatus==='unknown';
  if(kind==='medications')return !(r.unit&&r.unit!=='mg'||r.drugClass&&r.drugClass!=='other'||r.rescue||r.recurrence&&r.recurrence!=='unknown'||r.followup?.at||r.followup?.painFree&&r.followup.painFree!=='unknown'||r.followup?.functionRecovered&&r.followup.functionRecovered!=='unknown');
  return true;
}
export function entriesToSave(kind,rows){
  return rows.filter(r=>!isEmptyTemplate(kind,r)).map(({_template,...record})=>record);
}
