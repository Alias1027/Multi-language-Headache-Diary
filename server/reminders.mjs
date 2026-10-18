import {randomUUID} from 'node:crypto';
import {LANGUAGES,validDate,dateAt} from './core.mjs';
import {uiText} from '../public/i18n.mjs';

export const REMINDER_CHANNELS=['inapp','email','sms','webpush','wechat','alipay'];
const timeOK=x=>typeof x==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(x);
const fail=()=>{throw new Error('invalid_reminder_settings');};
export function reminderDefaults(user){return {enabled:false,time:user.vault.reminder?.time||'20:00',timezone:user.vault.timezone,weekdays:[0,1,2,3,4,5,6],channels:['inapp'],language:user.vault.language||'zh',message:'',email:'',phone:'',quietEnabled:true,quietStart:'22:00',quietEnd:'08:00',skipCompleted:true,pauseUntil:'',consent:false};}
export function validateReminder(input){
 if(!input||typeof input!=='object')fail();
 const {enabled,time,timezone,weekdays,channels,language,message,email,phone,quietEnabled,quietStart,quietEnd,skipCompleted,pauseUntil,consent}=input;
 if([enabled,quietEnabled,skipCompleted,consent].some(x=>typeof x!=='boolean')||!timeOK(time)||!timeOK(quietStart)||!timeOK(quietEnd)||quietEnabled&&quietStart===quietEnd)fail();
 if(typeof timezone!=='string'||timezone.length>80)fail();
 try{new Intl.DateTimeFormat('en',{timeZone:timezone}).format();}catch{fail();}
 if(!Array.isArray(weekdays)||!weekdays.length||weekdays.length>7||weekdays.some(x=>!Number.isInteger(x)||x<0||x>6)||new Set(weekdays).size!==weekdays.length)fail();
 if(!Array.isArray(channels)||!channels.length||channels.length>6||channels.some(x=>!REMINDER_CHANNELS.includes(x))||new Set(channels).size!==channels.length||!LANGUAGES.includes(language))fail();
 if(typeof message!=='string'||message.length>240||typeof email!=='string'||email.length>254||typeof phone!=='string'||phone.length>30||typeof pauseUntil!=='string'||pauseUntil&&!validDate(pauseUntil))fail();
 if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||phone&&!/^\+?[0-9 ()-]{6,30}$/.test(phone))fail();
 if(enabled&&(!consent||channels.includes('email')&&!email||channels.includes('sms')&&!phone))fail();
 return {enabled,time,timezone,weekdays:[...weekdays].sort(),channels:[...channels],language,message:message.trim(),email:email.trim(),phone:phone.trim(),quietEnabled,quietStart,quietEnd,skipCompleted,pauseUntil,consent};
}
export function viewReminders(user){
 const saved=user.profile.reminders;
 return {mode:'mock',revision:saved?.revision||0,config:structuredClone(saved?.config||reminderDefaults(user)),history:structuredClone(saved?.history||[]),connections:REMINDER_CHANNELS.map(channel=>({channel,status:'mock_only'}))};
}
export function saveReminders(store,user,body,now=new Date()){
 const old=user.profile.reminders;
 if(body.revision!==(old?.revision||0))throw Object.assign(new Error('revision_reminder_conflict'),{status:409});
 const config=validateReminder(body.config);
 user.profile.reminders={config,revision:(old?.revision||0)+1,history:old?.history||[],lastDate:old?.lastDate||'',lastTest:old?.lastTest||'',updatedAt:now.toISOString()};
 // Retire the former foreground-only timer only after an explicit settings save.
 user.vault.reminder={enabled:false,time:config.time};
 store.save(user);store.audit(user.id,'reminder_preferences_saved');return viewReminders(user);
}
export function localClock(now,timezone){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
 const date=`${parts.year}-${parts.month}-${parts.day}`;
 return {date,time:`${parts.hour}:${parts.minute}`,weekday:new Date(date+'T12:00:00Z').getUTCDay()};
}
const minute=t=>Number(t.slice(0,2))*60+Number(t.slice(3));
export function inQuiet(time,c){return c.quietEnabled&&(c.quietStart<c.quietEnd?time>=c.quietStart&&time<c.quietEnd:time>=c.quietStart||time<c.quietEnd);}
export function dayComplete(v,date){const d=v.days.find(x=>x.date===date);return !!d&&['yes','no'].includes(d.headache)&&['yes','no'].includes(d.acute)&&['yes','no','not_applicable'].includes(d.preventiveTaken)&&['none','limited','unable'].includes(d.dailyImpact);}

// Transport boundary: no network, push subscription, platform identifier or credential is used.
// A live provider requires a separately reviewed consent/binding/outbox implementation.
export const mockReminderAdapter=Object.freeze({simulate:()=>({status:'simulated'})});
export function runReminders(store,user,{now=new Date(),test=false,adapter=mockReminderAdapter}={}){
 const r=user.profile.reminders;if(!r)return false;const c=r.config;
 const clock=localClock(now,c.timezone);
 if(test){if(r.lastTest&&now-Date.parse(r.lastTest)<30000)throw Object.assign(new Error('reminder_test_wait'),{status:429});}
 else {
  if(!c.enabled||!c.consent||c.pauseUntil&&clock.date<=c.pauseUntil||!c.weekdays.includes(clock.weekday)||r.lastDate===clock.date)return false;
  // A fifteen-minute grace window tolerates a scheduler tick. Missed days are never replayed.
  const delta=minute(clock.time)-minute(c.time);if(delta<0||delta>15)return false;
 }
 let status=!test&&inQuiet(clock.time,c)?'skipped_quiet':!test&&c.skipCompleted&&dayComplete(user.vault,dateAt(now,user.vault.timezone))?'skipped_completed':null;
 const batch=randomUUID(),message=c.message||uiText(c.language,'reminders','defaultMessage');
 for(const channel of c.channels){
  let result=status;
  if(!result){try{const outcome=adapter.simulate({idempotencyKey:`${user.id}:${clock.date}:${test?batch:'scheduled'}:${channel}`,channel,language:c.language,message});result=outcome?.status==='simulated'?'simulated':'failed';}catch{result='failed';}}
  r.history.unshift({id:randomUUID(),batch,channel,status:result,at:now.toISOString(),localDate:clock.date,timezone:c.timezone,test,message});
 }
 r.history=r.history.slice(0,100);if(test)r.lastTest=now.toISOString();else r.lastDate=clock.date;
 store.save(user);return true;
}
