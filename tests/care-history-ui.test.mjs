import test from 'node:test';
import assert from 'node:assert/strict';
import {renderCare,renderFeedbackHistory} from '../public/care-ui.mjs';
import {careHistoryLabels,careHistoryText} from '../public/care-history-i18n.mjs';
import {LANGUAGES} from '../public/locale-registry.mjs';
import {translate,uiText} from '../public/i18n.mjs';
import {emptyVault} from '../public/domain.mjs';

const translator=lang=>key=>uiText(lang,'workspace',key)??translate(lang,key);
const plan={id:'plan-original',kind:'plans',status:'confirmed',medication:'Synthetic A',change:'start',start:'2020-01-01',createdAt:'2020-01-01T08:00:00.000Z',updatedAt:'2020-01-01T08:00:00.000Z',author:'Demo clinician'};
const feedback=(id,fields={})=>({id,planId:plan.id,planKind:'plans',status:'started',actualStart:'2020-01-02',perceivedChange:'better',difficultyReason:'none',adverseNote:'Synthetic adverse note '+id,note:'Synthetic feedback '+id,createdAt:'2020-01-03T08:00:00.000Z',...fields});
const care=(fields={})=>({revision:4,sourceRevision:0,assessments:[],plans:[plan],patientPlans:[],followups:[],history:[],feedback:[],...fields});

test('feedback history retains every response under its exact plan kind and sorts newest first without mutation',()=>{
 const entries=[feedback('later',{createdAt:'2020-01-05T08:00:00Z'}),feedback('earlier'),feedback('other-kind',{planKind:'patientPlans'}),feedback('other-plan',{planId:'elsewhere'})];
 const input=care({feedback:entries}),before=structuredClone(input);
 const html=renderFeedbackHistory(input,plan,{lang:'en',t:translator('en')});
 assert.equal((html.match(/class="feedback-entry"/g)||[]).length,2);
 assert.equal((html.match(/class="feedback-entry" open/g)||[]).length,1);
 assert.ok(html.indexOf('Synthetic feedback later')<html.indexOf('Synthetic feedback earlier'));
 assert.ok(html.includes('Synthetic adverse note later')&&html.includes('Synthetic adverse note earlier'));
 assert.ok(html.includes('2020-01-02'));
 assert.ok(!html.includes('Synthetic feedback other-kind')&&!html.includes('Synthetic feedback other-plan'));
 assert.ok(html.includes('does not imply clinician confirmation'));
 assert.ok(!html.includes('<form')&&!html.includes('data-action='));
 const reportHTML=renderFeedbackHistory(input,plan,{lang:'en',t:translator('en'),expanded:true});
 assert.equal((reportHTML.match(/class="feedback-entry" open/g)||[]).length,2);
 assert.deepEqual(input,before);
});

test('legacy feedback without a plan kind remains visible only with the clinician plan; missing values stay explicitly unknown',()=>{
 const old={id:'legacy',planId:plan.id,status:'read',createdAt:'not-a-date',note:'Original legacy text'};
 const input=care({feedback:[old]});
 const html=renderFeedbackHistory(input,{id:plan.id},{lang:'en',t:translator('en')});
 assert.ok(html.includes('Original legacy text')&&html.includes('Not provided'));
 assert.ok(!html.includes('Invalid Date')&&!html.includes('undefined'));
 const patientPlan=renderFeedbackHistory(input,{id:plan.id,kind:'patientPlans'},{lang:'en',t:translator('en')});
 assert.ok(patientPlan.includes('No patient feedback for this plan version.'));
 assert.ok(!patientPlan.includes('Original legacy text'));
});

test('feedback text and coded values are escaped rather than rendered as executable markup',()=>{
 const html=renderFeedbackHistory(care({feedback:[feedback('unsafe',{note:'<img src=x onerror="alert(1)">',adverseNote:'<script>bad()</script>',status:'<svg onload=bad()>',actualStart:'<video>'})]}),plan,{lang:'en',t:translator('en')});
 assert.ok(html.includes('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'));
 assert.ok(html.includes('&lt;script&gt;bad()&lt;/script&gt;'));
 assert.ok(!/<(?:img|script|svg|video)\b/.test(html));
});

test('patient and doctor can inspect old-version feedback and the predecessor link while only the current version accepts feedback',()=>{
 const newer={...plan,id:'plan-amended',previousId:plan.id,amendReason:'Recorded dose clarified',change:'adjust',createdAt:'2020-01-04T08:00:00Z',updatedAt:'2020-01-04T08:00:00Z'};
 const input=care({plans:[plan,newer],feedback:[feedback('old-note'),feedback('new-note',{planId:newer.id,createdAt:'2020-01-05T08:00:00Z'})]});
 for(const role of ['patient','clinician']){
  const html=renderCare({care:input,state:{user:{role},vault:emptyVault()},tab:'plans',lang:'en',t:translator('en')});
  assert.ok(html.includes('Synthetic feedback old-note')&&html.includes('Synthetic feedback new-note'));
  assert.ok(html.includes('Recorded dose clarified'));
  assert.ok(html.includes('href="#care-plan-plans-plan-original"'));
  assert.ok(html.includes('id="care-plan-plans-plan-original"'));
  assert.ok(!html.includes('class="feedback-form" data-plan="plan-original"'));
  assert.equal(html.includes('class="feedback-form" data-plan="plan-amended"'),role==='patient');
 }
});

test('all eight languages have equivalent history labels and accessible per-entry summaries',()=>{
 const keys=Object.keys(careHistoryLabels.en).sort();
 for(const lang of LANGUAGES){
  assert.deepEqual(Object.keys(careHistoryLabels[lang]).sort(),keys,lang);
  for(const key of keys)assert.ok(typeof careHistoryText(lang,key)==='string'&&careHistoryText(lang,key).length,lang+':'+key);
  const html=renderFeedbackHistory(care({feedback:[feedback('one')]}),plan,{lang,t:translator(lang)});
  assert.ok(html.includes(careHistoryText(lang,'feedbackHistory')),lang);
  assert.ok(html.includes('<summary>')&&html.includes('<bdi>'),lang);
  assert.ok(!html.includes('undefined')&&!html.includes('care_started')&&!html.includes('feedbackState'),lang);
 }
});

test('a hidden predecessor is named as unavailable rather than linked to a missing or different plan kind',()=>{
 const amended={...plan,id:'new',previousId:'same-id',amendReason:'Original unavailable'};
 const input=care({plans:[amended],patientPlans:[{...plan,id:'same-id',kind:'patientPlans',status:'recorded',author:'Patient'}]});
 const html=renderCare({care:input,state:{user:{role:'patient'},vault:emptyVault()},tab:'plans',lang:'en',t:translator('en')});
 assert.ok(html.includes('Previous plan version is not available'));
 assert.ok(!html.includes('href="#care-plan-patientPlans-same-id"'));
});
