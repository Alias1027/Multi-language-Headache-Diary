import test from 'node:test';
import assert from 'node:assert/strict';
import {renderCareReport,careReportText,planVersion} from '../public/care-report-ui.mjs';
import {workspaceText} from '../public/workspace-i18n.mjs';
import {translate,languages} from '../public/i18n.mjs';
const summary={schemaVersion:1,sourceRevision:3,capturedAt:'2026-10-18T01:00:00Z',plans:[{id:'p1',kind:'patientPlans',status:'recorded',medication:'First <script>alert(1)</script>',change:'start',sourceNote:'Visit & transcription',createdAt:'2026-10-15T01:00:00Z'},{id:'p2',kind:'patientPlans',previousId:'p1',amendReason:'Corrected original',status:'recorded',medication:'Second plan',change:'adjust',createdAt:'2026-10-16T01:00:00Z'}],feedback:[{id:'f1',planId:'p1',planKind:'patientPlans',status:'started',perceivedChange:'better',actualStart:'2026-10-15',adverseNote:'First adverse',note:'First feedback',createdAt:'2026-10-15T02:00:00Z'},{id:'f2',planId:'p1',planKind:'patientPlans',status:'difficulty',difficultyReason:'unclear',perceivedChange:'uncertain',note:'Later <img src=x>',createdAt:'2026-10-16T02:00:00Z'}],assessments:[{summary:'Confirmed assessment',questions:'Next visit?',updatedAt:'2026-10-17T00:00:00Z'}],followups:[{status:'scheduled',due:'2026-10-19',method:'clinic',focus:'Function'}]};
test('care plan versions follow their own amendment chain, never another medication or missing predecessor',()=>{
 const a={id:'a',kind:'plans'},b={id:'b',kind:'plans'},a2={id:'a2',kind:'plans',previousId:'a'},missing={id:'lost',kind:'plans',previousId:'absent'},cycle={id:'loop',kind:'plans',previousId:'loop'};
 const plans=[a,b,a2,missing,cycle];assert.equal(planVersion(plans,b),1);assert.equal(planVersion(plans,a2),2);assert.equal(planVersion(plans,missing),null);assert.equal(planVersion(plans,cycle),null);assert.equal(planVersion(plans,undefined),null);
});
test('care report: eight languages retain both plan versions, all feedback, provenance and original text safely',()=>{
 for(const lang of Object.keys(languages)){
  const t=k=>workspaceText(lang,k)??translate(lang,k),html=renderCareReport({careSummary:summary},{lang,t});
  for(const value of ['First feedback','Later &lt;img src=x&gt;','First adverse','Corrected original','Confirmed assessment','Next visit?'])assert.ok(html.includes(value),lang+' '+value);
  assert.ok(html.includes(careReportText(lang,'careReportScope')));
  assert.ok(html.includes(t('patientReported')));
  assert.ok(!/<script>|<img|undefined|\[object Object\]/.test(html));
  assert.ok(html.indexOf('Later &lt;img')<html.indexOf('First feedback'));
 }
});
test('care report: old reports distinguish a missing snapshot from an empty current snapshot',()=>{
 const t=k=>k;
 assert.ok(renderCareReport({}, {lang:'en',t}).includes('older or shared report'));
 const empty=renderCareReport({careSummary:{...summary,plans:[],feedback:[],assessments:[],followups:[]}},{lang:'en',t});
 assert.ok(empty.includes('No published plans'));assert.ok(!empty.includes('older or shared report'));
});
test('care report: feedback dates use the report timezone rather than the viewing device',()=>{
 const t=k=>workspaceText('en',k)??translate('en',k);
 const r={summary:{timezone:'America/Los_Angeles'},careSummary:{...summary,feedback:[{...summary.feedback[0],createdAt:'2026-10-15T02:00:00Z'}]}};
 const html=renderCareReport(r,{lang:'en',t});
 assert.ok(html.includes(new Date('2026-10-15T02:00:00Z').toLocaleString('en',{timeZone:'America/Los_Angeles',timeZoneName:'short'})));
});
