import test from 'node:test';
import assert from 'node:assert/strict';
import {validate,summarize,emptyVault} from '../server/core.mjs';
import {assessmentIssues,dayAssessmentIssues,assessmentText,renderAssessment,renderDayAssessment} from '../public/episode-assessment.mjs';
import {CODES} from '../public/domain.mjs';
const episode=()=>({id:'assessment-example',revision:0,start:'2026-09-01T01:00:00Z',end:'2026-09-01T02:00:00Z',quality:['pulsating'],durationStatus:'from_times',frequencyStatus:'unknown',symptomsStatus:'none',triggersStatus:'unknown',impact:'limited',precision:'estimated',type:'attack'});

test('Clinical assessment: every required answer must be present; explicit unknown is preserved',()=>{
  for(const field of ['durationStatus','frequencyStatus','symptomsStatus','triggersStatus','impact','precision','type']){
    for(const value of [undefined,'']){const r={...episode(),[field]:value};assert.throws(()=>validate('episodes',r),/invalid_episode_assessment/,field);}
  }
  const saved=validate('episodes',episode());assert.equal(saved.assessmentVersion,1);assert.equal(saved.symptomsStatus,'none');assert.equal(saved.triggersStatus,'unknown');assert.deepEqual(saved.symptoms,[]);assert.deepEqual(saved.suspectedTriggers,[]);
});
test('Clinical assessment: selected symptoms/triggers cannot contradict none or unknown',()=>{
  for(const [field,status] of [['symptoms','symptomsStatus'],['suspectedTriggers','triggersStatus']]){
    const value=field==='symptoms'?'nausea':'stress';
    for(const answer of ['none','unknown'])assert.throws(()=>validate('episodes',{...episode(),[field]:[value],[status]:answer}),/invalid_episode_assessment/);
    assert.throws(()=>validate('episodes',{...episode(),[status]:'present',[field]:[]}),/invalid_episode_assessment/);
    assert.equal(validate('episodes',{...episode(),[status]:'present',[field]:[value]})[status],'present');
  }
});
test('Clinical assessment: duration and frequency require answers without inventing an end time',()=>{
  const r={...episode(),end:null,endStatus:'unknown',durationStatus:'reported',reportedDurationMinutes:120,frequencyStatus:'reported',reportedFrequency:'Twice last week'};
  const saved=validate('episodes',r);assert.equal(saved.end,null);assert.equal(saved.reportedDurationMinutes,120);
  for(const more of [{reportedDurationMinutes:null},{reportedFrequency:'   '},{durationStatus:'unknown'},{frequencyStatus:'unknown'},{durationStatus:'from_times'},{durationStatus:'ongoing'}])assert.throws(()=>validate('episodes',{...r,...more}),/invalid_episode_assessment/);
  assert.equal(validate('episodes',{...episode(),end:null,endStatus:'ongoing',durationStatus:'ongoing'}).end,null);
  assert.equal(validate('episodes',{...episode(),end:null,endStatus:'unknown',durationStatus:'unknown'}).durationStatus,'unknown');
});
test('Daily assessment: no preventive treatment is valid, but missing answers are not',()=>{
  const d={id:'day-example',date:'2026-09-01',headache:'no',acute:'no',preventiveTaken:'not_applicable',dailyImpact:'none'};
  for(const key of ['preventiveTaken','dailyImpact'])for(const value of [undefined,''])assert.throws(()=>validate('days',{...d,[key]:value}),/invalid_day_assessment/);
  const saved=validate('days',d);assert.equal(saved.preventiveTaken,'not_applicable');assert.equal(saved.dailyImpact,'none');assert.equal(saved.dayAssessmentVersion,1);
  assert.equal(validate('days',{...d,preventiveTaken:'unknown',dailyImpact:'unknown'}).dailyImpact,'unknown');
});
test('Legacy unfilled lists stay unanswered in the editor; six-language required labels are available',()=>{
  for(const lang of ['zh','en','es','fr','ru','ar']){
    const t=k=>assessmentText(lang,k)||k,html=renderAssessment({symptoms:[],suspectedTriggers:[]},t,CODES),day=renderDayAssessment({},t);
    assert.ok(html.includes(t('assessmentTitle')));assert.ok(html.includes('data-assessment'));assert.ok(!html.includes('<details'));
    assert.ok(!html.includes('value="none" selected'));assert.ok(!html.includes('value="unknown" selected'));
    assert.ok(day.includes('name="preventiveTaken"'));assert.ok(day.includes('name="dailyImpact"'));assert.ok(assessmentText(lang,'preventionRequired'));
  }
  assert.ok(assessmentIssues({symptoms:[],suspectedTriggers:[]}).length);assert.equal(dayAssessmentIssues({}).length,2);
});

test('Daily impact summary distinguishes none, explicit unknown and unrecorded days',()=>{
 const v=emptyVault('2026-09-01T00:00:00Z');
 v.days=[{date:'2026-09-01',headache:'no',acute:'no',dailyImpact:'none'},{date:'2026-09-02',headache:'yes',acute:'unknown',dailyImpact:'unknown'},{date:'2026-09-03',headache:'yes',acute:'unknown'}];
 const s=summarize(v,'2026-09-01','2026-09-04','2026-09-05T12:00:00Z');
 assert.deepEqual(s.dailyImpact,{none:1,limited:0,unable:0,unknown:1,unanswered:2});
 assert.equal(s.headacheDays,2);assert.equal(s.statusDays,3);
});
