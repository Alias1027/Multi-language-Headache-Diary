// Candidate acceptance only fills drafts. It never creates a medication event.
const arrayFields=new Set(['location','quality','symptoms','suspectedTriggers']);
export function selectedVoiceFields(evidence, selected) {
  const fields={days:{},episodes:{},medications:{}};
  for (const [i,item] of evidence.entries()) {
    if (!selected.has(i)) continue;
    if (!Object.hasOwn(fields,item.kind)) throw Error('invalid_voice_candidate');
    const target=fields[item.kind];
    if (arrayFields.has(item.field)) {
      target[item.field]??=[];
      if (!target[item.field].includes(item.value)) target[item.field].push(item.value);
    } else {
      if (Object.hasOwn(target,item.field) && target[item.field]!==item.value) throw Error('invalid_voice_candidate');
      target[item.field]=item.value;
    }
  }
  return fields;
}

// Conservative bilingual guard, not a clinical classifier. Ambiguous advice remains text.
export function medicationIsAdvice(text) {
  return /建议|医嘱|处方|打算|计划|准备|将要|应该|曾经|以前|上个月|去年|recommend|advis(?:e|ed)|prescrib|told me|plan(?:ned|ning)? to|will take|going to take|should take|used to|last (?:year|month)/i.test(text);
}
