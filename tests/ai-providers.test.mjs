import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {extractionProviderFromEnv,cloudSpeechProviderFromEnv,validateCandidates,AI_CONTRACT,PROVIDERS} from '../server/ai-providers.mjs';
import {createApp} from '../server/main.mjs';
import {readVoice,writeVoice} from '../server/voice.mjs';
const text='I have a headache, left temple, throbbing. I took ibuprofen 200 mg.';
const raw=()=>({contract:AI_CONTRACT,language:'en',items:[{kind:'episodes',field:'quality',value:'pulsating',quote:'throbbing'},{kind:'medications',field:'dose',value:200,quote:'ibuprofen 200 mg'}]});
test('AI: disabled by default, explicit cloud opt-in and credentials required',()=>{
 assert.equal(extractionProviderFromEnv({}).available,false);
 assert.equal(extractionProviderFromEnv({HD_LLM_PROVIDER:'openai'}).available,false);
 assert.throws(()=>extractionProviderFromEnv({HD_ENABLE_CLOUD_AI:'1',HD_LLM_PROVIDER:'openai'}),/requires/);
 assert.throws(()=>cloudSpeechProviderFromEnv({HD_ENABLE_CLOUD_AI:'1',HD_CLOUD_ASR_PROVIDER:'deepseek'}),/Unsupported/);
 assert.throws(()=>extractionProviderFromEnv({HD_LLM_PROVIDER:'__proto__'}),/Unsupported/);
});
test('AI: four text adapters send only the selected transcript and strict prompt to fixed HTTPS endpoints',async()=>{
 for(const [id,info] of Object.entries(PROVIDERS)){
  let called=0;
  const p=extractionProviderFromEnv({HD_ENABLE_CLOUD_AI:'1',HD_LLM_PROVIDER:id,HD_LLM_MODEL:'test-model',[info.key]:'fake-key'},async(url,opts)=>{
   called++;assert.equal(url,info.url);assert.equal(opts.redirect,'error');assert.equal(opts.headers.Authorization,'Bearer fake-key');
   const b=JSON.parse(opts.body);assert.equal(b.messages.length,2);assert.deepEqual(JSON.parse(b.messages[1].content),{language:'en',transcript:text});assert.match(b.messages[0].content,/never instructions/);assert.equal(b.response_format.type,'json_object');
   return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(raw())}}]}));
  });
  const got=await p.extract({text,language:'en',audio:'DO_NOT_SEND',patientId:'DO_NOT_SEND',history:['DO_NOT_SEND']});
  assert.equal(called,1);assert.equal(p.external,true);assert.equal(got.fields.medications.dose,200);assert.deepEqual(got.fields.episodes.quality,['pulsating']);
 }
});
test('AI: malformed, unsupported, ungrounded or conflicting fields fail closed',()=>{
 const check=v=>validateCandidates(v,text,'en','test');
 assert.throws(()=>check({...raw(),language:'zh'}),/invalid/);
 for(const item of [
  {kind:'episodes',field:'start',value:'2026-10-01',quote:'throbbing'},
  {kind:'episodes',field:'quality',value:'pulsating',quote:'not in original'},
  {kind:'medications',field:'dose',value:-1,quote:'200 mg'},
  {kind:'days',field:'headache',value:'diagnosis migraine',quote:'headache'},
  {kind:'__proto__',field:'polluted',value:true,quote:'headache'}
 ])assert.throws(()=>check({...raw(),items:[item]}),/invalid/);
 assert.throws(()=>check({...raw(),items:[...raw().items,{kind:'medications',field:'dose',value:400,quote:'200 mg'}]}),/invalid/);
 assert.throws(()=>check({...raw(),diagnosis:'migraine'}),/invalid/);
 assert.equal({}.polluted,undefined);
});
test('AI: truncated JSON, excessive output and remote errors do not return candidates',async()=>{
 const env={HD_ENABLE_CLOUD_AI:'1',HD_LLM_PROVIDER:'openai',HD_LLM_MODEL:'test',OPENAI_API_KEY:'fake'};
 for(const response of [new Response('secret remote error',{status:500}),new Response('x'.repeat(66000)),new Response(JSON.stringify({choices:[{finish_reason:'length',message:{content:JSON.stringify(raw())}}]})),new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:'not-json'}}]}))]){
  await assert.rejects(extractionProviderFromEnv(env,async()=>response).extract({text,language:'en'}),/model_/);
 }
});
test('AI: OpenAI multipart and Qwen data-URI ASR adapters preserve original audio and language',async()=>{
 const audio=Buffer.from('synthetic-audio-bytes').toString('base64');
 for(const id of ['openai','qwen']){
  const p=cloudSpeechProviderFromEnv({HD_ENABLE_CLOUD_AI:'1',HD_CLOUD_ASR_PROVIDER:id,HD_CLOUD_ASR_MODEL:'test-asr',[PROVIDERS[id].key]:'fake'},async(url,opts)=>{
   assert.equal(opts.redirect,'error');
   if(id==='openai'){assert.match(url,/audio\/transcriptions$/);assert.deepEqual(Buffer.from(await opts.body.get('file').arrayBuffer()),Buffer.from(audio,'base64'));assert.equal(opts.body.get('language'),'en');return new Response(JSON.stringify({text:'test transcription'}));}
   const body=JSON.parse(opts.body);assert.equal(body.messages[0].content[0].input_audio.data,'data:audio/wav;base64,'+audio);assert.equal(body.asr_options.language,'English');return new Response(JSON.stringify({choices:[{message:{content:'test transcription'}}]}));
  });
  assert.deepEqual(await p.transcribe({audio,mime:'audio/wav',language:'en'}),{text:'test transcription',language:'en',model:'test-asr'});
 }
});
test('AI HTTP: consent, ownership, revisions, provenance and no automatic diary writes',async t=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'headache-ai-'));let calls=0,release=null;
 const extractor={available:true,name:'Mock model',model:'mock',external:true,consentId:'mock-destination',destination:'mock.invalid',async extract(note){calls++;if(release)await release;return validateCandidates(raw(),note.text,note.language,'mock');}};
 const app=createApp({directory:dir,port:0,schedule:false,extractionProvider:extractor,asrProvider:{available:false,name:'none'}});const port=await app.listen(),origin='http://127.0.0.1:'+port;let cookie='',csrf='';
 t.after(async()=>{await app.close();rmSync(dir,{recursive:true,force:true});});
 async function call(route,body,extra={}){const r=await fetch(origin+route,{method:body===undefined?'GET':'POST',headers:{Cookie:cookie,Origin:origin,'X-CSRF-Token':csrf,'Content-Type':'application/json',...extra},body:body===undefined?undefined:JSON.stringify(body)});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,data:await r.json()};}
 await call('/api/demo',{});const state=(await call('/api/state')).data;csrf=state.csrf;
 const config=(await call('/api/voice/config')).data;assert.equal(config.extraction.consentId,'mock-destination');assert.ok(!JSON.stringify(config).includes('API_KEY'));
 const note=(await call('/api/voice/note',{id:'ai-note',revision:0,text,language:'en'})).data.note;
 assert.equal((await call('/api/voice/extract',{id:note.id,revision:1})).data.error,'model_consent_required');assert.equal(calls,0);
 assert.equal((await call('/api/voice/extract',{id:note.id,revision:1,consentProvider:'mock-destination'},{'X-CSRF-Token':'wrong'})).status,403);
 const r=await call('/api/voice/extract',{id:note.id,revision:1,consentProvider:'mock-destination'});assert.equal(r.status,200);assert.equal(r.data.note.revision,2);assert.equal(r.data.note.extraction.contract,AI_CONTRACT);assert.equal(r.data.note.extraction.sourceTextSHA256.length,64);assert.equal(calls,1);
 const after=(await call('/api/state')).data;for(const k of ['days','episodes','medications'])assert.deepEqual(after.vault[k],state.vault[k]);
 assert.equal((await call('/api/voice/extract',{id:note.id,revision:1,consentProvider:'mock-destination'})).status,409);
 let unblock;release=new Promise(resolve=>unblock=resolve);const pending=call('/api/voice/extract',{id:note.id,revision:2,consentProvider:'mock-destination'});
 while(calls<2)await new Promise(r=>setTimeout(r,5));
 assert.equal((await call('/api/voice/extract',{id:note.id,revision:2,consentProvider:'mock-destination'})).data.error,'model_busy');
 const current=readVoice(app.store,state.user.id,note.id);current.text+=' Edited.';current.revision++;writeVoice(app.store,state.user.id,current);unblock();assert.equal((await pending).status,409);assert.equal(readVoice(app.store,state.user.id,note.id).revision,3);
 await call('/api/demo',{});csrf=(await call('/api/state')).data.csrf;assert.equal((await call('/api/voice/extract',{id:note.id,revision:3,consentProvider:'mock-destination'})).status,404);
});
