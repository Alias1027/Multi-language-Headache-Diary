import {createHash} from 'node:crypto';
import {cloudSpeechProviderFromEnv,validateCandidates,AI_CONTRACT} from './ai-providers.mjs';
const processing=new Map();
async function modelCall(key,task){if(processing.has(key))throw Error('model_busy');const p=Promise.resolve().then(task);processing.set(key,p);try{return await p;}finally{processing.delete(key);}}
function publicProvider(p){return {available:!!p.available,provider:p.name,external:!!p.external,model:p.model,consentId:p.consentId,destination:p.destination};}
import {seal,unseal} from './storage.mjs';
export const MAX_AUDIO_BYTES=10*1024*1024;
export const MAX_USER_AUDIO_BYTES=100*1024*1024;
const MIME={'audio/webm':'webm','audio/ogg':'ogg','audio/mp4':'m4a','audio/x-m4a':'m4a','audio/mpeg':'mp3','audio/wav':'wav','audio/x-wav':'wav'};
const idOK=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(id);
const fail=code=>{throw new Error('invalid_voice_'+code);};
export function prepareVoice(store){store.db.exec('CREATE TABLE IF NOT EXISTS voice_notes (user_id TEXT NOT NULL,id TEXT NOT NULL,bytes INTEGER NOT NULL,body TEXT NOT NULL,PRIMARY KEY(user_id,id));');}
function context(uid,id){return uid+':voice:'+id;}
export function readVoice(store,uid,id){if(!idOK(id))fail('id');const row=store.db.prepare('SELECT body FROM voice_notes WHERE user_id=? AND id=?').get(uid,id);return row?unseal(row.body,store.key,context(uid,id)):null;}
export function writeVoice(store,uid,note){store.db.prepare('INSERT INTO voice_notes VALUES (?,?,?,?) ON CONFLICT(user_id,id) DO UPDATE SET body=excluded.body,bytes=excluded.bytes').run(uid,note.id,note.bytes,seal(note,store.key,context(uid,note.id)));}
function metadata(note){if(!note)return null;const {audio,...rest}=note;return {...rest,hasAudio:!!audio};}
export function voiceProviderFromEnv(env=process.env){
  const cloud=cloudSpeechProviderFromEnv(env);if(cloud)return cloud;
  const endpoint=env.HD_ASR_URL||'';
  if(!endpoint)return {available:false,name:'Not configured'};
  const url=new URL(endpoint);
  if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.username||url.password||url.hash||url.search)throw new Error('ASR adapter must use a loopback HTTP URL without credentials, query or fragment.');
  return {available:true,name:env.HD_ASR_LABEL||'Local ASR adapter',external:env.HD_ASR_EXTERNAL==='1',consentId:env.HD_ASR_EXTERNAL==='1'?(env.HD_ASR_LABEL||'External ASR via local adapter'):undefined,destination:env.HD_ASR_EXTERNAL==='1'?(env.HD_ASR_LABEL||'External ASR via local adapter'):undefined,async transcribe(note){
    const form=new FormData();form.append('file',new Blob([Buffer.from(note.audio,'base64')],{type:note.mime}),note.id+'.'+MIME[note.mime.split(';')[0]]);form.append('language',note.language);
    const response=await fetch(url,{method:'POST',headers:env.HD_ASR_TOKEN?{Authorization:'Bearer '+env.HD_ASR_TOKEN}:{},body:form,signal:AbortSignal.timeout(90000),redirect:'error'});
    if(!response.ok)throw new Error('asr_unavailable');
    let size=0;const chunks=[];for await(const chunk of response.body){size+=chunk.length;if(size>65536)throw new Error('asr_invalid_response');chunks.push(chunk);}
    const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if(typeof value.text!=='string'||!value.text.trim()||value.text.length>5000||value.language!==note.language||typeof value.model!=='string'||value.model.length>120)throw new Error('asr_invalid_response');
    return value;
  }};
}
export function checkVoiceSource(store,uid,record,previous){
  if(!record.sourceVoiceId)return;
  if(previous?.sourceVoiceId===record.sourceVoiceId&&previous.sourceVoiceRevision===record.sourceVoiceRevision)return;
  const n=readVoice(store,uid,record.sourceVoiceId);
  if(!n||n.revision!==record.sourceVoiceRevision)throw new Error('revision_voice_conflict');
}
function audioValid(bytes,mime){
  const base=mime.split(';')[0];
  if(!MIME[base]||bytes.length<16||bytes.length>MAX_AUDIO_BYTES)return false;
  if(base==='audio/webm')return bytes.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]));
  if(base==='audio/ogg')return bytes.toString('ascii',0,4)==='OggS';
  if(base==='audio/mp4'||base==='audio/x-m4a')return bytes.toString('ascii',4,8)==='ftyp';
  if(base==='audio/wav'||base==='audio/x-wav')return bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WAVE';
  return bytes.toString('ascii',0,3)==='ID3'||bytes[0]===255&&(bytes[1]&0xe0)===0xe0;
}
export async function handleVoice({store,uid,provider,extractor={available:false,name:'Not configured'},route,req,res,url,body,json}){
  if(route==='/api/voice/config'&&req.method==='GET')return json(200,{...publicProvider(provider),extraction:publicProvider(extractor),languages:['zh','en'],maxBytes:MAX_AUDIO_BYTES,maxUserBytes:MAX_USER_AUDIO_BYTES,maxRecordingSeconds:300});
  if(route==='/api/voice/notes'&&req.method==='GET'){
    const notes=store.db.prepare('SELECT id FROM voice_notes WHERE user_id=?').all(uid).map(({id})=>metadata(readVoice(store,uid,id))).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));return json(200,{notes});
  }
  if(route==='/api/voice/upload'&&req.method==='POST'){
    const id=url.searchParams.get('id'),language=url.searchParams.get('language'),mime=String(req.headers['content-type']||'').toLowerCase().replaceAll(' ',''),bytes=body;
    if(!idOK(id)||!['zh','en'].includes(language))fail('input');
    if(!Buffer.isBuffer(bytes)||!audioValid(bytes,mime))fail('audio');
    const hash=createHash('sha256').update(bytes).digest('hex'),old=readVoice(store,uid,id);
    if(old){if(old.sha256!==hash||old.mime!==mime||old.language!==language)fail('duplicate');return json(200,{note:metadata(old),duplicate:true});}
    const usage=store.db.prepare('SELECT count(*) AS count,coalesce(sum(bytes),0) AS bytes FROM voice_notes WHERE user_id=?').get(uid);
    if(usage.count>=100||usage.bytes+bytes.length>MAX_USER_AUDIO_BYTES)return json(413,{error:'voice_quota'});
    const note={id,language,mime,bytes:bytes.length,sha256:hash,audio:bytes.toString('base64'),text:'',originalTranscript:null,asrModel:null,revision:1,createdAt:new Date().toISOString()};
    writeVoice(store,uid,note);store.audit(uid,'voice_audio_saved');return json(201,{note:metadata(note)});
  }
  const id=req.method==='GET'?url.searchParams.get('id'):body.id;
  if(!idOK(id))return json(400,{error:'invalid_voice_id'});
  let note=readVoice(store,uid,id);
  if(route==='/api/voice/note'&&req.method==='POST'){
    if(typeof body.text!=='string'||!body.text.trim()||body.text.length>5000||!['zh','en'].includes(body.language))fail('text');
    if(note&&note.revision!==body.revision)return json(409,{error:'revision_voice_conflict'});
    if(note&&note.language!==body.language)fail('language');
    if(!note){if(body.revision!==0)return json(409,{error:'revision_voice_conflict'});const count=store.db.prepare('SELECT count(*) AS n FROM voice_notes WHERE user_id=?').get(uid).n;if(count>=100)return json(413,{error:'voice_quota'});note={id,language:body.language,mime:null,bytes:0,sha256:null,audio:null,originalTranscript:null,asrModel:null,revision:0,createdAt:new Date().toISOString()};}
    note.text=body.text;note.extraction=null;note.revision++;note.updatedAt=new Date().toISOString();writeVoice(store,uid,note);store.audit(uid,'voice_text_saved');return json(200,{note:metadata(note)});
  }
  if(!note)return json(404,{error:'voice_not_found'});
  if(route==='/api/voice/audio'&&req.method==='GET'){
    if(!note.audio)return json(404,{error:'voice_not_found'});res.writeHead(200,{'Content-Type':note.mime,'Content-Length':note.bytes,'Cache-Control':'no-store','Content-Disposition':`${url.searchParams.get('download')==='1'?'attachment':'inline'}; filename="voice-${note.id}.${MIME[note.mime.split(';')[0]]}"`});return res.end(Buffer.from(note.audio,'base64'));
  }
  if(note.revision!==body.revision)return json(409,{error:'revision_voice_conflict'});
  if(route==='/api/voice/delete'&&req.method==='POST'){store.db.prepare('DELETE FROM voice_notes WHERE user_id=? AND id=?').run(uid,id);store.audit(uid,'voice_note_deleted');return json(200,{ok:true});}
  if(route==='/api/voice/extract'&&req.method==='POST'){
    if(!extractor.available)return json(503,{error:'model_not_configured'});
    if(extractor.external&&body.consentProvider!==extractor.consentId)return json(400,{error:'model_consent_required'});
    if(!note.text?.trim())return json(400,{error:'invalid_voice_text'});
    let result;try{
      result=await modelCall(uid+':extract',()=>extractor.extract(note));
      // Validate injected/local adapters too; never trust additional fields or reconstructed output.
      result=validateCandidates({contract:AI_CONTRACT,language:result.language,items:result.evidence},note.text,note.language,extractor.model||result.model||'adapter');
    }catch(e){return json(502,{error:['model_busy','model_invalid_response'].includes(e.message)?e.message:'model_unavailable'});}
    const current=readVoice(store,uid,id);if(!current||current.revision!==note.revision)return json(409,{error:'revision_voice_conflict'});
    note.extraction={provider:extractor.name,model:result.model,contract:AI_CONTRACT,sourceTextSHA256:createHash('sha256').update(note.text).digest('hex'),generatedAt:new Date().toISOString(),suggestions:result};
    note.revision++;note.updatedAt=new Date().toISOString();writeVoice(store,uid,note);store.audit(uid,'voice_model_candidates_review_pending');
    return json(200,{suggestions:result,note:metadata(note)});
  }
  if(route==='/api/voice/transcribe'&&req.method==='POST'){
    if(!provider.available)return json(503,{error:'asr_not_configured'});
    if(!note.audio)fail('no_audio');
    if(provider.external&&body.consentProvider!==provider.consentId)return json(400,{error:'model_consent_required'});
    let result;try{result=await modelCall(uid+':transcribe',()=>provider.transcribe(note));}catch{return json(502,{error:'asr_unavailable'});}
    if(!result||typeof result.text!=='string'||!result.text.trim()||result.text.length>5000||result.language!==note.language||typeof result.model!=='string'||result.model.length>120)return json(502,{error:'asr_invalid_response'});
    const current=readVoice(store,uid,id);if(!current||current.revision!==note.revision)return json(409,{error:'revision_voice_conflict'});
    // Do not change an existing original transcript on retries; retain the newest ASR output separately.
    if(note.originalTranscript===null){note.originalTranscript=result.text;note.originalAsrModel=result.model;note.originalTranscribedAt=new Date().toISOString();}note.extraction=null;note.latestTranscript=result.text;note.text=result.text;note.asrModel=result.model;note.revision++;note.updatedAt=new Date().toISOString();writeVoice(store,uid,note);store.audit(uid,'voice_transcribed');return json(200,{note:metadata(note)});
  }
  return json(404,{error:'not_found'});
}
