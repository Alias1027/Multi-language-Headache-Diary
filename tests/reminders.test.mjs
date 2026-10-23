import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Store} from '../server/storage.mjs';
import {emptyVault} from '../server/core.mjs';
import {createApp} from '../server/main.mjs';
import {reminderDefaults,validateReminder,saveReminders,viewReminders,runReminders,dayComplete} from '../server/reminders.mjs';
import {catalogs,languages} from '../public/i18n.mjs';
import {renderReminders,reminderText} from '../public/reminder-ui.mjs';
function fixture(t){const dir=mkdtempSync(path.join(os.tmpdir(),'headache-reminders-'));const store=new Store(dir),id=store.createUser('test@example.invalid','sample-password',emptyVault(),true);const user=store.get(id);t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true});});return {store,user,dir};}
function setup(store,user,changes={}){return saveReminders(store,user,{revision:user.profile.reminders?.revision||0,config:{...reminderDefaults(user),enabled:true,consent:true,time:'20:00',timezone:'Asia/Shanghai',...changes}});}
const now=()=>new Date('2026-10-16T12:00:00Z');
test('Reading legacy reminder defaults is disabled and never mutates clinical or account data',t=>{
 const {store,user}=fixture(t);user.vault.reminder={enabled:true,time:'19:00'};const old=JSON.stringify(user);
 assert.equal(viewReminders(user).config.enabled,false);assert.equal(viewReminders(user).config.time,'19:00');assert.equal(JSON.stringify(user),old);
 assert.equal(runReminders(store,user,{now:now()}),false);assert.equal(JSON.stringify(user),old);
});
test('Validation rejects malformed times, empty/duplicate days, unsupported channels and missing opt-in',t=>{
 const {user}=fixture(t),base={...reminderDefaults(user),enabled:true,consent:true};
 for(const change of [{time:'12:99'},{time:'24:00'},{timezone:'invalid'},{weekdays:[]},{weekdays:[1,1]},{weekdays:['1']},{channels:[]},{channels:['unknown']},{channels:['sms']},{channels:['email']},{email:'bad'},{phone:'letters'},{quietStart:'08:00',quietEnd:'08:00'},{pauseUntil:'2026-02-30'},{message:'x'.repeat(241)},{enabled:'true'},{consent:false},{language:'xx'}])assert.throws(()=>validateReminder({...base,...change}),/invalid_reminder/);
 assert.equal(validateReminder({...base,channels:['email','sms'],email:'x@example.invalid',phone:'+86 13800000000'}).enabled,true);
});
test('Encrypted settings are separate from the clinical vault and reject stale revisions',t=>{
 const {store,user}=fixture(t),before=structuredClone(user.vault);setup(store,user,{email:'reminder-contact@example.invalid',message:'private reminder text'});
 assert.deepEqual(user.vault,{...before,reminder:{enabled:false,time:'20:00'}});assert.equal(user.vault.revision,before.revision);
 const row=store.db.prepare('SELECT profile,vault FROM users WHERE id=?').get(user.id);assert.ok(!row.profile.includes('reminder-contact'));assert.ok(!row.profile.includes('private reminder text'));assert.ok(!JSON.stringify(user.vault).includes('reminder-contact'));
 assert.equal(store.get(user.id).profile.reminders.config.email,'reminder-contact@example.invalid');
 assert.throws(()=>saveReminders(store,user,{revision:0,config:reminderDefaults(user)}),/revision_reminder_conflict/);
});
test('Schedule emits once per local day across repeated ticks and a reloaded store record',t=>{
 const {store,user}=fixture(t);setup(store,user,{channels:['inapp','wechat','alipay']});assert.equal(runReminders(store,user,{now:now()}),true);assert.equal(user.profile.reminders.history.length,3);
 assert.equal(runReminders(store,store.get(user.id),{now:new Date('2026-10-16T12:01:00Z')}),false);
 assert.ok(user.profile.reminders.history.every(x=>x.status==='simulated'&&!x.test));assert.equal(runReminders(store,store.get(user.id),{now:new Date('2026-10-17T12:00:00Z')}),true);
});
test('Disabled, paused, wrong weekdays and missed windows do not send or accumulate a backlog',t=>{
 const {store,user}=fixture(t);
 for(const changes of [{enabled:false},{pauseUntil:'2026-10-16'},{weekdays:[1]},{time:'19:40'},{time:'20:01'}]){setup(store,user,changes);assert.equal(runReminders(store,user,{now:now()}),false);}
 assert.equal(user.profile.reminders.history.length,0);
});
test('Quiet hours crossing midnight skip once, without a later burst',t=>{
 const {store,user}=fixture(t);setup(store,user,{time:'23:00'});assert.equal(runReminders(store,user,{now:new Date('2026-10-16T15:00:00Z')}),true);assert.equal(user.profile.reminders.history[0].status,'skipped_quiet');
 assert.equal(runReminders(store,user,{now:new Date('2026-10-16T15:01:00Z')}),false);
 setup(store,user,{time:'07:00'});runReminders(store,user,{now:new Date('2026-10-16T23:00:00Z')});assert.equal(user.profile.reminders.history[0].status,'skipped_quiet');
});
test('Missing and unknown states are not complete; known daily answers suppress a reminder',t=>{
 const {store,user}=fixture(t);user.vault.timezone='Asia/Shanghai';setup(store,user);const d={date:'2026-10-16',headache:'no',acute:'no',preventiveTaken:'not_applicable',dailyImpact:'none'};
 assert.equal(dayComplete(user.vault,d.date),false);user.vault.days=[{...d,headache:'unknown'}];assert.equal(dayComplete(user.vault,d.date),false);user.vault.days=[d];assert.equal(dayComplete(user.vault,d.date),true);
 runReminders(store,user,{now:now()});assert.equal(user.profile.reminders.history[0].status,'skipped_completed');
});
test('Completion is based on diary date even when reminder time zone differs',t=>{
 const {store,user}=fixture(t);user.vault.timezone='Asia/Shanghai';setup(store,user,{time:'20:00',timezone:'America/New_York'});
 user.vault.days=[{date:'2026-10-17',headache:'yes',acute:'yes',preventiveTaken:'no',dailyImpact:'limited'}];runReminders(store,user,{now:new Date('2026-10-17T00:00:00Z')});assert.equal(user.profile.reminders.history[0].status,'skipped_completed');assert.equal(user.profile.reminders.history[0].localDate,'2026-10-16');
});
test('Daylight-saving repeated hour does not duplicate; a missing hour does not backfill',t=>{
 const {store,user}=fixture(t);setup(store,user,{timezone:'America/New_York',time:'01:30',quietEnabled:false});runReminders(store,user,{now:new Date('2026-11-01T05:30:00Z')});assert.equal(runReminders(store,user,{now:new Date('2026-11-01T06:30:00Z')}),false);
 setup(store,user,{timezone:'America/New_York',time:'02:30',quietEnabled:false});assert.equal(runReminders(store,user,{now:new Date('2026-03-08T07:00:00Z')}),false);
});
test('Explicit simulation works with schedule off, is rate-limited and does not consume the daily slot',t=>{
 const {store,user}=fixture(t);setup(store,user,{enabled:false});runReminders(store,user,{now:now(),test:true});assert.equal(user.profile.reminders.lastDate,'');assert.throws(()=>runReminders(store,user,{now:now(),test:true}),/reminder_test_wait/);
 setup(store,user);assert.equal(runReminders(store,user,{now:now()}),true);assert.equal(user.profile.reminders.history.length,2);
});
test('Adapter failures are bounded, recorded without secrets and never mislabelled delivered',t=>{
 const {store,user}=fixture(t);setup(store,user);runReminders(store,user,{now:now(),adapter:{simulate(){throw new Error('secret contact');}}});assert.equal(user.profile.reminders.history[0].status,'failed');assert.ok(!JSON.stringify(viewReminders(user)).includes('secret contact'));assert.equal(runReminders(store,user,{now:now()}),false);
});
test('History is capped and every language has matching reminders, escaped content and no clinical result inference',t=>{
 const {store,user}=fixture(t);setup(store,user,{message:'<img src=x onerror=alert(1)>'});
 for(let i=0;i<105;i++)runReminders(store,user,{now:new Date(now().getTime()+i*31000),test:true});assert.equal(user.profile.reminders.history.length,100);
 for(const lang of Object.keys(languages)){
  assert.deepEqual(Object.keys(catalogs[lang].reminders),Object.keys(catalogs.en.reminders));const html=renderReminders(viewReminders(user),{t:key=>reminderText(lang,key)||key,lang,languages});assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('undefined'));assert.ok(html.includes(reminderText(lang,'rSimulation')));
 }
});
test('Reminder API requires session and CSRF, isolates patients, and denies clinician access',async t=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'headache-reminder-http-')),app=createApp({directory:dir,port:0,schedule:false}),port=await app.listen(),origin='http://127.0.0.1:'+port;
 t.after(async()=>{await app.close();rmSync(dir,{recursive:true,force:true});});let cookie='',csrf='';
 const call=async(url,body,token=csrf)=>{const r=await fetch(origin+url,{method:body===undefined?'GET':'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json','X-CSRF-Token':token},body:body===undefined?undefined:JSON.stringify(body)});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,data:await r.json()};};
 assert.equal((await call('/api/reminders')).status,401);await call('/api/demo',{});csrf=(await call('/api/state')).data.csrf;
 const cfg=(await call('/api/reminders')).data.config;cfg.email='private@example.invalid';
 assert.equal((await call('/api/reminders',{revision:0,config:cfg},'wrong')).status,403);
 assert.equal((await call('/api/reminders',{revision:0,config:cfg})).status,200);assert.equal((await call('/api/reminders/test',{})).status,200);
 const exported=(await call('/api/export')).data;assert.ok(!JSON.stringify(exported).includes('private@example.invalid'));
 assert.equal((await call('/api/demo/role',{role:'clinician'})).status,403);const actor=app.store.get((await call('/api/state')).data.user.id);actor.profile.role='clinician';app.store.save(actor);assert.ok(!JSON.stringify((await call('/api/state')).data).includes('private@example.invalid'));assert.equal((await call('/api/reminders')).status,403);assert.equal((await call('/api/reminders/test',{})).status,403);
 await call('/api/demo',{});csrf=(await call('/api/state')).data.csrf;assert.equal((await call('/api/reminders')).data.revision,0);assert.equal((await call('/api/reminders')).data.history.length,0);
});

test('The independent server timer schedules a saved plan while hospital scheduling is off',async t=>{
 t.mock.timers.enable({apis:['setInterval','Date'],now:Date.parse('2026-10-16T11:59:30Z')});
 const dir=mkdtempSync(path.join(os.tmpdir(),'headache-reminder-timer-')),app=createApp({directory:dir,port:0,schedule:false,reminderSchedule:true});await app.listen();
 t.after(async()=>{await app.close();rmSync(dir,{recursive:true,force:true});});
 const id=app.store.createUser('timer@example.invalid','sample-password',emptyVault(),true),user=app.store.get(id);setup(app.store,user);
 t.mock.timers.tick(60000);let saved=app.store.get(id);assert.equal(saved.profile.reminders.history.length,1);assert.equal(saved.profile.reminders.history[0].status,'simulated');assert.equal(saved.vault.jobs.length,0);
 t.mock.timers.tick(60000);assert.equal(app.store.get(id).profile.reminders.history.length,1);
});
