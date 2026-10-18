import {summarize, validDate, addDays} from './domain.mjs';

// Advice and actual diary entries deliberately have separate storage and authorship.
export function allPlans(care) {
  return [...(care?.plans || []).map(p => ({...p, kind:'plans'})),
    ...(care?.patientPlans || []).map(p => ({...p, kind:'patientPlans'}))];
}
export function currentPlans(care) {
  const plans=allPlans(care);
  return plans.filter(p => p.status!=='draft' && !plans.some(n => n.kind===p.kind && n.previousId===p.id && n.status!=='draft'));
}
export function planFeedback(care, plan) {
  return (care?.feedback || []).filter(f => f.planId===plan.id && (f.planKind || 'plans')===plan.kind).at(-1);
}
export function observePlan(vault, actualStart, windowDays=28, now=new Date().toISOString()) {
  if (!validDate(actualStart) || ![7,28].includes(windowDays)) throw Error('invalid_observation');
  // The start date must be a patient-reported actual start, never an inferred prescription date.
  return {
    actualStart,windowDays,
    before:summarize(vault,addDays(actualStart,-windowDays),addDays(actualStart,-1),now),
    after:summarize(vault,actualStart,addDays(actualStart,windowDays-1),now)
  };
}
