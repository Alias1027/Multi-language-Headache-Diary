import test from 'node:test';
import assert from 'node:assert/strict';
import {createEntryTemplate,isEmptyTemplate,entriesToSave} from '../public/entry-templates.mjs';
import {validate} from '../public/domain.mjs';

test('Default empty forms never add episodes or preventive regimens to a submission',()=>{
  const episode={...createEntryTemplate('episodes'),start:null,end:null,intensity:null,endStatus:'unknown',quality:[],symptoms:[],suspectedTriggers:[],precision:'',type:'',notes:'  ',originalTimezone:'Asia/Shanghai'};
  const preventive={...createEntryTemplate('preventives'),name:'',regimen:'',start:'',end:null,notes:''};
  assert.deepEqual(entriesToSave('episodes',[episode]),[]);assert.deepEqual(entriesToSave('preventives',[preventive]),[]);
  assert.ok(isEmptyTemplate('episodes',episode));assert.ok(isEmptyTemplate('preventives',preventive));
});
test('Partly filled forms including zero pain and date-only regimens are retained for validation',()=>{
  for(const more of [{intensity:0},{quality:['pulsating']},{endStatus:'ongoing'},{symptomsStatus:'none'},{notes:'Patient text'}]){
    const r={...createEntryTemplate('episodes'),...more},saved=entriesToSave('episodes',[r]);assert.equal(saved.length,1);assert.equal(saved[0]._template,undefined);assert.throws(()=>validate('episodes',saved[0]));
  }
  for(const more of [{name:'SYNTHETIC medication'},{start:'2026-09-01'},{reason:'Stopped due to discomfort'}]){
    const saved=entriesToSave('preventives',[{...createEntryTemplate('preventives'),...more}]);assert.equal(saved.length,1);assert.throws(()=>validate('preventives',saved[0]));
  }
});
test('Existing records, explicit additions and voice sources cannot be discarded as blank placeholders',()=>{
  for(const r of [{id:'existing',revision:1,_template:true},{id:'explicit',revision:0},{...createEntryTemplate('episodes'),sourceVoiceId:'voice-note',sourceVoiceRevision:1}]){
    assert.equal(entriesToSave('episodes',[r]).length,1);assert.ok(!isEmptyTemplate('episodes',r));
  }
  const r={...createEntryTemplate('preventives'),name:'SYNTHETIC A',regimen:'Example only',start:'2026-09-01'};
  assert.equal(validate('preventives',entriesToSave('preventives',[r])[0]).name,'SYNTHETIC A');
  assert.equal(r._template,true); // Preparing a payload never changes the encrypted draft.
});

test('Default medication controls do not invent a dose; partial and explicit answers stay active',()=>{
 const r={...createEntryTemplate('medications'),name:'',at:null,dose:null,beforePain:null,unit:'mg',drugClass:'other',recurrence:'unknown',rescue:false,followup:null,notes:''};
 assert.deepEqual(entriesToSave('medications',[r]),[]);
 for(const more of [{name:'SYNTHETIC A'},{beforePain:0},{dose:0},{at:'2026-09-01T10:00:00Z'},{unit:'tablet'},{drugClass:'nsaid'},{rescue:true},{recurrence:'no'},{followup:{at:null,painFree:'yes',functionRecovered:'unknown'}}]){
  const saved=entriesToSave('medications',[{...r,...more}]);assert.equal(saved.length,1);assert.throws(()=>validate('medications',saved[0]));
 }
 const complete={...r,name:'SYNTHETIC A',at:'2026-09-01T10:00:00Z',dose:200};
 assert.equal(validate('medications',entriesToSave('medications',[complete])[0]).dose,200);
});
test('Empty medication filtering never removes historical, explicit or voice-linked dose drafts',()=>{
 for(const r of [{...createEntryTemplate('medications'),revision:1},{id:'explicit-dose',revision:0},{...createEntryTemplate('medications'),sourceVoiceId:'synthetic-voice'}])assert.equal(entriesToSave('medications',[r]).length,1);
});
