import {selectedVoiceFields} from './voice-review.mjs';
import {APP_VERSION} from './release.mjs';
import {uiText,translate} from './i18n.mjs';
import {extractVoice} from './voice-parser.mjs';
import {localVault} from './offline.mjs';
export function voiceEvidenceValue(lang,item){return typeof item.value==='string'&&['headache','acute','location','quality','symptoms','suspectedTriggers','drugClass','unit'].includes(item.field)?translate(lang,item.value):item.value;}
export const voiceText=(lang,key)=>uiText(lang,'voice',key);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toBase64=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});
const fromBase64=(data,mime)=>new Blob([Uint8Array.from(atob(data),c=>c.charCodeAt(0))],{type:mime});
export function createVoiceWorkspace(){
  let host,ctx,draft,notes=[],config={available:false},suggestions=null,selected=new Set(),recording=null,stream=null,recordTimer=null,objectURL=null,busy=false,loadedUser=null,saveTimer,status='';
  const T=k=>voiceText(ctx?.lang,k)||ctx?.translate(k)||k;
  function fresh(){return {uid:ctx.userId,id:crypto.randomUUID(),revision:0,language:ctx.lang==='zh'?'zh':'en',text:'',audioData:null,mime:null,note:null};}
  function unsaved(){return !!draft&&(!!draft.audioData||draft.text!==(draft.note?.text||''));}
  function say(message){status=message;const el=host?.querySelector('[role="status"]');if(el)el.textContent=message;}
  async function persist(){clearTimeout(saveTimer);try{await localVault.put('voice-draft',draft);say(T(unsaved()?'localVoice':'savedVoice'));}catch{say(T('draftFailure'));}}
  function audioURL(){if(objectURL){URL.revokeObjectURL(objectURL);objectURL=null;}if(draft.audioData){objectURL=URL.createObjectURL(fromBase64(draft.audioData,draft.mime));return objectURL;}return draft.note?.hasAudio?'/api/voice/audio?id='+encodeURIComponent(draft.id):null;}
  function render(){
    if(!host?.isConnected)return;ctx.onActivity?.({recording:!!recording,busy});
    const audio=audioURL(),btn=(action,label,disabled=false,extra='')=>`<button type="button" data-voice-action="${action}" ${disabled?'disabled':''} ${extra}>${esc(T(label))}</button>`;
    host.innerHTML=`<div class="section-head"><div><div class="eyebrow">HEADACHE DIARY / ${APP_VERSION}</div><h1>${esc(T('voice'))}</h1><p class="muted">${esc(T('intro'))}</p></div></div>
      <section class="card voice-card"><div class="notice">${esc(T('privacy'))}</div><div class="notice ${config.available?'':'warning'}">${esc(T(config.available?'configured':'notConfigured'))}</div>
      <p class="muted voice-support">${esc(T('voiceSupport'))}</p><label class="field">${esc(T('voiceLanguage'))}<select id="voice-language" ${draft.note||draft.audioData||recording||busy?'disabled':''}><option value="zh" ${draft.language==='zh'?'selected':''}>中文</option><option value="en" ${draft.language==='en'?'selected':''}>English</option></select></label>
      <div class="actions voice-actions">${recording?btn('stop','stop',false,'class="primary recording-button"'):btn('record','record',busy,'class="primary"')}<span data-voice-new ${draft.note||unsaved()?'':'hidden'}>${btn('new','newVoice',busy||!!recording,'class="smallbutton"')}</span></div>
      <label class="field">${esc(T('upload'))}<input id="voice-file" type="file" accept="audio/webm,audio/ogg,audio/wav,audio/x-wav,audio/mpeg,audio/mp4,.m4a,.mp3,.wav,.ogg,.webm" ${busy||recording?'disabled':''}></label>
      ${audio?`<audio controls preload="metadata" src="${esc(audio)}" aria-label="${esc(T('voice'))}"></audio><a class="button smallbutton" href="${esc(audio+(draft.audioData?'':'&download=1'))}" download="voice-original.${({ 'audio/wav':'wav','audio/x-wav':'wav','audio/mpeg':'mp3','audio/mp4':'m4a','audio/x-m4a':'m4a','audio/ogg':'ogg'})[(draft.mime||draft.note?.mime||'').split(';')[0]]||'webm'}">${esc(T('downloadAudio'))}</a>`:''}
      <label class="field voice-transcript">${esc(T('transcript'))}<textarea dir="auto" id="voice-text" maxlength="5000" rows="6" ${busy||recording?'disabled':''} placeholder="${draft.language==='zh'?'今天头痛，左侧太阳穴跳痛，疼痛6分，持续了2小时。服用了布洛芬200毫克。':'I have a headache, left temple, throbbing, pain 6/10. It lasted 2 hours. I took ibuprofen 200 mg.'}">${esc(draft.text)}</textarea></label>
      <div class="actions">${btn('save','saveVoice',busy||!!recording)}${btn('transcribe','recognize',busy||!!recording||!config.available||!audio)}${btn('organize','organize',busy||!!recording)}</div>
      ${config.external?'<label class="check model-consent"><input id="audio-model-consent" type="checkbox">'+esc(T('audioConsent'))+' '+esc(config.provider)+' ('+esc(config.destination)+', '+esc(config.model||'adapter')+'). '+esc(T('modelScope'))+'</label>':''}
      <div class="model-tools">${config.extraction?.available?'<p class="muted">'+esc(config.extraction.provider)+' · '+esc(config.extraction.model)+'</p>':'<p class="muted">'+esc(T('modelNotConfigured'))+'</p>'}
      ${config.extraction?.external?'<label class="check model-consent"><input id="text-model-consent" type="checkbox">'+esc(T('modelConsent'))+' '+esc(config.extraction.provider)+' ('+esc(config.extraction.destination)+', '+esc(config.extraction.model)+'). '+esc(T('modelScope'))+'</label>':''}
      ${btn('model-organize','modelOrganize',busy||!!recording||!config.extraction?.available)}</div><p role="status" aria-live="polite" class="notice">${esc(status)}</p>
      ${draft.note?.originalTranscript?`<details><summary>${esc(T('originalTranscript'))}</summary><p class="voice-quote" dir="auto">${esc(draft.note.originalTranscript)}</p></details>`:''}</section>
      ${suggestions?`<section class="card"><h2>${esc(T('suggestion'))}</h2><p class="notice warning">${esc(T('caution'))}</p>${suggestions.evidence.length?`<div class="table-scroll"><table class="data-table"><thead><tr><th>${esc(T('suggestion'))}</th><th>${esc(T('transcript'))}</th></tr></thead><tbody>${suggestions.evidence.map((x,i)=>`<tr><td><label class="check"><input type="checkbox" class="voice-candidate" data-index="${i}" ${selected.has(i)?'checked':''}>${esc(T('acceptField'))}</label>${esc(T(x.kind==='days'?'daily':x.kind))} · ${esc(T(x.field))}<br><strong>${esc(voiceEvidenceValue(ctx.lang,x))}</strong></td><td class="voice-quote" dir="auto">${esc(x.quote)}</td></tr>`).join('')}</tbody></table></div>`:`<p>${esc(T('emptySuggestion'))}</p>`}<ul>${suggestions.warnings.map(w=>`<li>${esc(T(w))}</li>`).join('')}</ul><label class="check"><input id="voice-reviewed" type="checkbox">${esc(T('review'))}</label><div class="actions voice-actions">${ctx.onFillAll?btn('fill-all','fillAll',busy||!suggestions.evidence.length):Object.entries({days:'fillDays',episodes:'fillEpisodes',medications:'fillMedications'}).map(([kind,label])=>btn('fill',label,busy||!Object.keys(suggestions.fields[kind]).length,`data-kind="${kind}"`)).join('')}</div></section>`:''}
      <section class="card"><h2>${esc(T('historyVoice'))}</h2>${notes.length?notes.map(n=>`<div class="row"><div><strong>${esc(new Date(n.createdAt).toLocaleString(ctx.lang))}</strong><small>${n.language.toUpperCase()} · ${Math.round(n.bytes/1024)} KB · r${n.revision}</small><small class="voice-quote" dir="auto">${esc(n.text.slice(0,100))}</small></div><button type="button" data-voice-action="load" data-id="${esc(n.id)}" ${busy||recording?'disabled':''}>${esc(T('loadVoice'))}</button></div>`).join(''):`<p>${esc(T('noNotes'))}</p>`}${draft.note?`<div class="actions voice-actions">${btn('delete','deleteVoice',busy||!!recording)}</div>`:''}</section>`;
  }
  async function list(){notes=(await ctx.api('/api/voice/notes')).notes;}
  async function save(){
    if(draft.audioData){const response=await fetch('/api/voice/upload?id='+encodeURIComponent(draft.id)+'&language='+draft.language,{method:'POST',headers:{'Content-Type':draft.mime,'X-CSRF-Token':ctx.csrf()},body:fromBase64(draft.audioData,draft.mime)});const result=await response.json();if(!response.ok)throw new Error(result.error);draft.note=result.note;draft.revision=result.note.revision;draft.audioData=null;await persist();}
    if(draft.text.trim()&&(!draft.note||draft.text!==draft.note.text)){const r=await ctx.api('/api/voice/note',{id:draft.id,revision:draft.revision,text:draft.text,language:draft.language});draft.note=r.note;draft.revision=r.note.revision;}
    if(!draft.note)throw new Error('needText');await persist();await list();say(T('savedVoice'));
  }
  async function useBlob(blob){if(!blob.size||blob.size>10*1024*1024)throw new Error('tooLarge');draft={...fresh(),language:draft.language,audioData:await toBase64(blob),mime:blob.type||'audio/webm'};suggestions=null;await persist();}
  function stop(){if(recording?.state==='recording')recording.stop();stream?.getTracks().forEach(t=>t.stop());clearInterval(recordTimer);}
  async function start(){
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw new Error('unsupported');
    if(unsaved()&&!confirm(T('discardVoice')))return;
    try{stream=await navigator.mediaDevices.getUserMedia({audio:true});}catch{throw new Error('permissionDenied');}
    const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus','audio/webm'].find(m=>MediaRecorder.isTypeSupported(m));
    const parts=[];let size=0,seconds=0;
    try{recording=new MediaRecorder(stream,mime?{mimeType:mime,audioBitsPerSecond:64000}:{audioBitsPerSecond:64000});}catch{stream.getTracks().forEach(t=>t.stop());throw new Error('unsupported');}
    recording.ondataavailable=e=>{if(e.data.size){parts.push(e.data);size+=e.data.size;if(size>8*1024*1024)stop();}};
    recording.onerror=()=>{stop();say(T('unsupported'));};
    recording.onstop=async()=>{const type=recording.mimeType;recording=null;stream?.getTracks().forEach(t=>t.stop());stream=null;clearInterval(recordTimer);busy=true;try{await useBlob(new Blob(parts,{type}));}catch(e){say(T(e.message)===e.message?T('error'):T(e.message));}finally{busy=false;render();}};
    recording.start(1000);recordTimer=setInterval(()=>{seconds++;say(T('recording')+' · '+seconds+' / 300 s');if(seconds>=300)stop();},1000);render();say(T('recording'));
  }
  async function action(event){
    const b=event.target.closest('[data-voice-action]');if(!b)return;const a=b.dataset.voiceAction;
    if(a==='stop'){stop();return;}
    if(busy||recording){say(T('needStop'));return;}
    busy=true;
    try{
      if(a==='record'){await start();return;}
      if(a==='save')await save();
      if(a==='transcribe'){if(config.external&&!host.querySelector('#audio-model-consent')?.checked)throw new Error('model_consent_required');if(draft.text&& !confirm(T('overwriteTranscript')))return;await save();render();const r=await ctx.api('/api/voice/transcribe',{id:draft.id,revision:draft.revision,consentProvider:config.external?config.consentId:undefined});draft.note=r.note;draft.revision=r.note.revision;draft.text=r.note.text;suggestions=null;await persist();await list();}
      if(a==='model-organize'){
        if(!config.extraction?.available)throw new Error('model_not_configured');
        if(config.extraction.external&&!host.querySelector('#text-model-consent')?.checked)throw new Error('model_consent_required');
        if(!draft.text.trim())throw new Error('needText');await save();render();
        const r=await ctx.api('/api/voice/extract',{id:draft.id,revision:draft.revision,consentProvider:config.extraction.external?config.extraction.consentId:undefined});
        draft.note=r.note;draft.revision=r.note.revision;suggestions=r.suggestions;selected=new Set(suggestions.evidence.map((_,i)=>i));await persist();await list();
      }
      if(a==='organize'){if(!draft.text.trim())throw new Error('needText');suggestions=extractVoice(draft.text,{language:draft.language});selected=new Set(suggestions.evidence.map((_,i)=>i));await persist();}
      if(a==='fill-all'){if(!selected.size)throw new Error('emptySuggestion');if(!host.querySelector('#voice-reviewed')?.checked)throw new Error('needReview');await save();await ctx.onFillAll(selectedVoiceFields(suggestions.evidence,selected),draft.note);return;}
      if(a==='fill'){if(!host.querySelector('#voice-reviewed')?.checked)throw new Error('needReview');await save();await ctx.onFill(b.dataset.kind,selectedVoiceFields(suggestions.evidence,selected)[b.dataset.kind],draft.note);return;}
      if(a==='new'){if(unsaved()&&!confirm(T('discardVoice')))return;draft=fresh();suggestions=null;await localVault.remove('voice-draft');status='';}
      if(a==='load'){if(unsaved()&&!confirm(T('discardVoice')))return;await list();const n=notes.find(n=>n.id===b.dataset.id);if(!n)throw new Error('voice_not_found');draft={...fresh(),id:n.id,revision:n.revision,note:n,language:n.language,text:n.text,mime:n.mime};suggestions=null;await persist();}
      if(a==='delete'){if(!confirm(T('deleteConfirm')))return;await ctx.api('/api/voice/delete',{id:draft.id,revision:draft.revision});draft=fresh();suggestions=null;await localVault.remove('voice-draft');await list();status='';}
    }catch(e){say(e.network?T('offlineVoice'):T(e.message)===e.message?T('error'):T(e.message));}
    finally{busy=false;render();}
  }
  async function change(event){if(busy||recording)return;
    if(event.target.classList.contains('voice-candidate')){const i=Number(event.target.dataset.index);if(event.target.checked)selected.add(i);else selected.delete(i);host.querySelector('#voice-reviewed').checked=false;}
    if(event.target.id==='voice-language'){draft.language=event.target.value;suggestions=null;await persist();render();}
    if(event.target.id==='voice-file'){const file=event.target.files[0];if(!file)return;if(unsaved()&&!confirm(T('discardVoice')))return;busy=true;try{const ext=file.name.split('.').at(-1).toLowerCase();await useBlob(file.type?file:new Blob([file],{type:{wav:'audio/wav',mp3:'audio/mpeg',m4a:'audio/mp4',ogg:'audio/ogg',webm:'audio/webm'}[ext]||'application/octet-stream'}));}catch(e){say(T(e.message)===e.message?T('error'):T(e.message));}finally{busy=false;render();}}
  }
  window.addEventListener('beforeunload',event=>{if(recording||busy||unsaved()){event.preventDefault();event.returnValue='';}});
  return {
    canLeave(){if(recording||busy){say(T('needStop'));return false;}return true;},hasUnsaved:unsaved,
    async mount(element,context){host=element;ctx=context;if(loadedUser!==ctx.userId){loadedUser=ctx.userId;const saved=await localVault.get('voice-draft');draft=saved?.uid===ctx.userId?saved:fresh();suggestions=null;notes=[];status=unsaved()?T('localVoice'):'';}
      host.onclick=action;host.onchange=change;host.oninput=event=>{if(event.target.id==='voice-text'){draft.text=event.target.value;suggestions=null;host.querySelectorAll('.model-consent input').forEach(x=>x.checked=false);const next=host.querySelector('[data-voice-new]');if(next)next.hidden=!(draft.note||unsaved());host.querySelector('#voice-reviewed')?.closest('section')?.remove();clearTimeout(saveTimer);saveTimer=setTimeout(persist,250);}};
      render();try{config=await ctx.api('/api/voice/config');await list();}catch{config={available:false};say(T('offlineVoice'));}render();
    }
  };
}


