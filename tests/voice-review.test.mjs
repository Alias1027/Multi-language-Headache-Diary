import test from 'node:test';
import assert from 'node:assert/strict';
import {extractVoice} from '../public/voice-parser.mjs';
import {selectedVoiceFields} from '../public/voice-review.mjs';
import {validateCandidates,AI_CONTRACT} from '../server/ai-providers.mjs';

test('Advice and historical regimens cannot silently become actual medication candidates',()=>{
 for(const text of ['医生建议服用布洛芬200毫克。','打算服用布洛芬200毫克。','以前服用布洛芬200毫克。','My doctor advised taking ibuprofen 200 mg.','I used to take ibuprofen 200 mg.']){
  const result=extractVoice(text,{language:'en'});assert.deepEqual(result.fields.medications,{});assert.ok(result.warnings.includes('advice_not_actual'));
  const model=validateCandidates({contract:AI_CONTRACT,language:'en',items:[{kind:'medications',field:'dose',value:200,quote:'200'}]},text,'en','test');
  assert.deepEqual(model.fields.medications,{});assert.ok(model.warnings.includes('advice_not_actual'));
 }
 assert.equal(extractVoice('I took ibuprofen 200 mg.',{language:'en'}).fields.medications.dose,200);
});

test('Individual review excludes rejected values and does not infer missing dose or unit',()=>{
 const result=extractVoice('今天头痛，左侧太阳穴跳痛，服用了布洛芬200毫克。');
 const selected=new Set(result.evidence.map((_,i)=>i));
 for(const [i,item] of result.evidence.entries())if(item.field==='dose'||item.field==='unit'||item.field==='location'&&item.value==='temple')selected.delete(i);
 const before=JSON.stringify(result),fields=selectedVoiceFields(result.evidence,selected);
 assert.deepEqual(fields.episodes.location,['left']);assert.equal(fields.medications.dose,undefined);assert.equal(fields.medications.unit,undefined);assert.equal(fields.medications.name,'布洛芬');
 assert.deepEqual(selectedVoiceFields(result.evidence,new Set()),{days:{},episodes:{},medications:{}});assert.equal(JSON.stringify(result),before);
});
