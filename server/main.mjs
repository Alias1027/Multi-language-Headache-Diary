import {viewReminders,saveReminders,runReminders} from './reminders.mjs';
import {APP_VERSION} from '../public/release.mjs';
import http from 'node:http';
import {extractionProviderFromEnv} from './ai-providers.mjs';
import {reportLanguage} from '../public/report-options.mjs';
import {saveDiaryBatch} from './diary-batch.mjs';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store,checkPassword} from './storage.mjs';
import {emptyVault,applyRecord,createReport,toFHIR,LANGUAGES,validDate,dateAt} from './core.mjs';
import {syntheticVault} from './fixtures.mjs';
import {queueReport,processQueue,runSchedule,cancelPending,correctSharedReports} from './sharing.mjs';
import {prepareVoice,handleVoice,voiceProviderFromEnv,MAX_AUDIO_BYTES,checkVoiceSource} from './voice.mjs';
import {prepareCare,careContext,ensureDemoPair,viewCare,saveCare,loadCare} from './care.mjs';
import {buildCareSummary} from './care-report.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function createApp({directory=process.env.HD_DATA_DIR||path.join(root,'../data'),port=Number(process.env.PORT||8765),schedule=true,reminderSchedule=schedule,asrProvider=voiceProviderFromEnv(),extractionProvider=extractionProviderFromEnv()}={}) {
  const store=new Store(directory), attempts=new Map();
  prepareVoice(store);prepareCare(store);
  const server=http.createServer(async(req,res)=>{
    const host=req.headers.host,actualPort=server.address()?.port||port;
    const origins=[`http://127.0.0.1:${actualPort}`,`http://localhost:${actualPort}`];
    function json(status,body){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));}
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
    res.setHeader('Permissions-Policy','camera=(), microphone=(self), geolocation=()');
    if(!origins.includes('http://'+host))return json(403,{error:'invalid_host'});
    if(req.headers.origin&&!origins.includes(req.headers.origin))return json(403,{error:'invalid_origin'});
    const url=new URL(req.url,'http://'+host),route=url.pathname;
    try{
      if(route==='/api/health')return json(200,{ok:true,version:APP_VERSION,mode:'local-experimental'});
      if(!route.startsWith('/api/')){
        if(req.method!=='GET'&&req.method!=='HEAD')return json(405,{error:'method_not_allowed'});
        const safe=decodeURIComponent(route==='/'?'/index.html':route);const file=path.resolve(root,'public','.'+safe);
        if(!file.startsWith(path.join(root,'public')+path.sep)||!existsSync(file))return json(404,{error:'not_found'});
        const type={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.webmanifest':'application/manifest+json'}[path.extname(file)]||'application/octet-stream';
        res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-cache'});return res.end(req.method==='HEAD'?undefined:readFileSync(file));
      }
      const token=req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('hd_session='))?.slice(11),session=store.authenticate(token);
      const publicAuth=['/api/register','/api/login','/api/demo'].includes(route)&&req.method==='POST';
      if(!publicAuth&&!session)return json(401,{error:'login_required'});
      if(!publicAuth&&req.method!=='GET'&&req.headers['x-csrf-token']!==session.csrf)return json(403,{error:'invalid_csrf'});
      let body={};if(req.method==='POST'){
        const isAudio=route==='/api/voice/upload',limit=isAudio?MAX_AUDIO_BYTES:262144;
        if(Number(req.headers['content-length'])>limit)return json(413,{error:'body_too_large'});
        const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>limit)return json(413,{error:'body_too_large'});chunks.push(chunk);}if(isAudio)body=Buffer.concat(chunks);else try{body=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}catch{return json(400,{error:'invalid_json'});}
      }
      function setSession(id){const s=store.session(id);res.setHeader('Set-Cookie',`hd_session=${s.token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200`);return s;}
      if(['/api/register','/api/login','/api/demo'].includes(route)&&req.method==='POST'){
        const ip=req.socket.remoteAddress,entry=attempts.get(ip)||{n:0,reset:Date.now()+60000};if(entry.reset<Date.now()){entry.n=0;entry.reset=Date.now()+60000;}entry.n++;attempts.set(ip,entry);if(entry.n>20)return json(429,{error:'try_later'});
        if(route==='/api/demo'){const id=store.createUser('synthetic-'+randomUUID()+'@example.invalid',randomUUID(),syntheticVault(),true);setSession(id);store.audit(id,'synthetic_demo_started');return json(200,{ok:true});}
        const email=String(body.email||'').trim().toLowerCase(),password=String(body.password||'');
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||password.length<10||password.length>128)return json(400,{error:'invalid_credentials_format'});
        const existing=store.findEmail(email);
        if(route==='/api/register'){
          if(existing)return json(409,{error:'email_exists'});const id=store.createUser(email,password,emptyVault());setSession(id);store.audit(id,'registered');return json(201,{ok:true});
        }
        if(!existing||!checkPassword(password,existing.password))return json(401,{error:'invalid_credentials'});setSession(existing.id);return json(200,{ok:true});
      }
      const actor=store.get(session.user_id),context=careContext(store,actor);
      if(route==='/api/demo/role'&&req.method==='POST'){
        if(!context.patient.vault.synthetic)return json(403,{error:'care_demo_only'});
        if(!['patient','clinician'].includes(body.role))return json(400,{error:'invalid_care_role'});
        const clinician=ensureDemoPair(store,context.patient);setSession(body.role==='clinician'?clinician.id:context.patient.id);return json(200,{ok:true});
      }
      if(route==='/api/care'&&req.method==='GET')return json(200,viewCare(store,context));
      if(route==='/api/care/save'&&req.method==='POST')return json(200,saveCare(store,context,body));
      if(context.role==='clinician'&&!['/api/state','/api/report','/api/logout'].includes(route))return json(403,{error:'care_access_denied'});
      if(route.startsWith('/api/voice/'))return await handleVoice({store,uid:session.user_id,provider:asrProvider,extractor:extractionProvider,route,req,res,url,body,json});
      const user=context.patient,v=user.vault;
      if(route==='/api/reminders'&&req.method==='GET')return json(200,viewReminders(user));
      if(route==='/api/reminders'&&req.method==='POST')return json(200,saveReminders(store,user,body));
      if(route==='/api/reminders/test'&&req.method==='POST'){if(!user.profile.reminders)throw new Error('invalid_reminder_settings');runReminders(store,user,{test:true});return json(200,viewReminders(user));}
      if(route==='/api/state'&&req.method==='GET')return json(200,{user:{id:actor.id,email:actor.profile.email,verified:actor.profile.verified,role:context.role,patientId:user.id},csrf:session.csrf,integrations:{externalAI:!!asrProvider.external||!!extractionProvider.external},vault:v,audit:store.audits(user.id)});
      if(route==='/api/logout'&&req.method==='POST'){store.logout(token);res.setHeader('Set-Cookie','hd_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json(200,{ok:true});}
      if(route==='/api/mailbox'&&req.method==='GET')return json(200,{mode:'mock',verification:user.profile.verified?null:user.profile.verification,expires:user.profile.verificationExpires,notifications:v.notifications});
      if(route==='/api/verify'&&req.method==='POST'){
        user.profile.verificationAttempts++;
        const ok=user.profile.verificationAttempts<=5&&Date.now()<user.profile.verificationExpires&&body.code===user.profile.verification;
        if(ok){user.profile.verified=true;user.profile.verification=null;store.audit(user.id,'mock_email_verified');}store.save(user);return json(ok?200:400,{ok,error:ok?undefined:'invalid_code'});
      }
      if(route==='/api/resend-code'&&req.method==='POST'){
        if(user.profile.verified)return json(200,{ok:true});user.profile.verification=randomUUID().slice(0,8).toUpperCase();user.profile.verificationExpires=Date.now()+900000;user.profile.verificationAttempts=0;store.save(user);return json(200,{ok:true});
      }
      if(route==='/api/diary/batch'&&req.method==='POST')return json(200,saveDiaryBatch(store,user,body));
      if(route==='/api/records'&&req.method==='POST'){
        if(!v.operations.includes(body.operationId))checkVoiceSource(store,user.id,body.record||{},v[body.kind]?.find?.(r=>r.id===body.record?.id));
        const result=applyRecord(v,body.kind,body.record,body.operationId);if(!result.duplicate){correctSharedReports(store,user);store.audit(user.id,'record_'+body.kind+'_saved');store.save(user,{history:true});}return json(200,result);
      }
      if(route==='/api/settings'&&req.method==='POST'){
        if(!LANGUAGES.includes(body.language)||!LANGUAGES.includes(body.reportLanguage))throw new Error('invalid_language');
        const reportLanguageMode=body.reportLanguageMode??'fixed';if(!['interface','fixed'].includes(reportLanguageMode))throw new Error('invalid_language');
        new Intl.DateTimeFormat('en',{timeZone:body.timezone}).format();
        if(body.timezone!==v.timezone&&(v.days.length||v.episodes.length||v.medications.length))throw new Error('timezone_locked');
        if(!validDate(body.enrolled)||body.enrolled>dateAt(Date.now(),body.timezone))throw new Error('invalid_date');
        if(body.enrolled!==v.enrolled&&(v.days.length||v.episodes.length||v.medications.length))throw new Error('enrollment_locked');
        if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(body.reminder?.time||''))throw new Error('invalid_time');
        Object.assign(v,{language:body.language,reportLanguage:body.reportLanguage,reportLanguageMode,timezone:body.timezone,enrolled:body.enrolled,reminder:{enabled:!!body.reminder.enabled,time:body.reminder.time}});store.save(user);return json(200,{ok:true});
      }
      if(route==='/api/report'&&req.method==='POST'){
        const report=createReport(v,body.from,body.to,body.language);
        report.careSummary=buildCareSummary(loadCare(store,user.id),report.createdAt);
        v.reports.push(report);store.save(user);return json(200,report);
      }
      if(route==='/api/export'&&req.method==='GET'){
        store.audit(user.id,'export_downloaded');res.setHeader('Content-Disposition',`attachment; filename="headache-diary-${url.searchParams.get('format')==='fhir'?'fhir':'data'}.json"`);
        const exportVault=structuredClone(v);delete exportVault.operations;delete exportVault.jobs;delete exportVault.diaryBatches;
        return json(200,url.searchParams.get('format')==='fhir'?toFHIR(v,user.id):{format:'headache-diary-v1',exportedAt:new Date().toISOString(),vault:exportVault,care:viewCare(store,context)});
      }
      if(route==='/api/consent'&&req.method==='POST'){
        if(!body.active){if(v.consent)v.consent.active=false;cancelPending(store,user);store.audit(user.id,'consent_revoked');store.save(user);return json(200,{ok:true});}
        if(!user.profile.verified)throw new Error('verify_first');
        if(!['weekly','monthly'].includes(body.frequency)||!['summary','details'].includes(body.scope)||!validDate(body.expires)||Date.parse(body.expires+'T23:59:59Z')<=Date.now())throw new Error('invalid_consent');
        cancelPending(store,user);v.consent={id:randomUUID(),active:true,institution:'mock-clinic',frequency:body.frequency,scope:body.scope,expires:body.expires+'T23:59:59Z',grantedAt:new Date().toISOString(),research:false};store.audit(user.id,'consent_granted');store.save(user);return json(200,{ok:true});
      }
      if(route==='/api/share'&&req.method==='POST'){queueReport(store,user,body.from,body.to,body.language||reportLanguage(v));store.save(user);return json(200,{ok:true});}
      if(route==='/api/process'&&req.method==='POST'){
        if(body.fault&&!['offline','lost_ack'].includes(body.fault))throw new Error('invalid_fault');processQueue(store,user,{fault:body.fault,force:true,retryAttention:true});store.save(user);return json(200,{ok:true});
      }
      if(route==='/api/schedule'&&req.method==='POST'){runSchedule(store,user);store.save(user);return json(200,{ok:true});}
      if(route==='/api/receipts'&&req.method==='GET')return json(200,{receipts:store.hospital.prepare('SELECT transfer_id,revision,received_at FROM receipts WHERE patient_id=? ORDER BY received_at DESC').all(store.hash(user.id+':mock-clinic'))});
      if(route==='/api/packet'&&req.method==='GET'){
        const job=v.jobs.find(j=>j.id===url.searchParams.get('id'));if(!job?.packet)return json(404,{error:'not_found'});res.setHeader('Content-Disposition','attachment; filename="encrypted-transfer.json"');return json(200,JSON.parse(job.packet));
      }
      return json(404,{error:'not_found'});
    }catch(e){if(e.status)return json(e.status,{error:e.message});const conflict=['revision_conflict','date_conflict','revision_voice_conflict'].includes(e.message);const known=/^(invalid_|end_|followup_|future_|outside_|revision_|date_|timezone_|enrollment_|consent_|verify_)/.test(e.message);json(conflict?409:known?400:500,{error:known?e.message:'internal_error'});if(!known)console.error('Request failed:',e.name);}
  });
  const timer=schedule||reminderSchedule?setInterval(()=>{
    try{for(const row of store.db.prepare('SELECT id FROM users').all()){const u=store.get(row.id);if(u.profile.role==='clinician')continue;if(schedule){const scheduled=runSchedule(store,u),processed=processQueue(store,u);if(scheduled||processed)store.save(u);}if(reminderSchedule)runReminders(store,u);}}catch(e){console.error('Scheduler:',e.name);}
  },60000):null;
  timer?.unref();
  return {server,store,listen:()=>new Promise(resolve=>server.listen(port,'127.0.0.1',()=>resolve(server.address().port))),close:()=>new Promise(resolve=>{if(timer)clearInterval(timer);server.close(()=>{store.close();resolve();});})};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const app=createApp();app.listen().then(port=>console.log(`Headache Diary Lab ${APP_VERSION}\nLocal: http://127.0.0.1:${port}\nExperimental local service. Press Ctrl+C to stop.`));for(const sig of ['SIGINT','SIGTERM'])process.on(sig,async()=>{await app.close();process.exit(0);});}

