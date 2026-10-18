import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createApp} from '../server/main.mjs';
import {emptyVault} from '../server/core.mjs';
import {syntheticVault} from '../server/fixtures.mjs';
import {queueReport,processQueue} from '../server/sharing.mjs';

test('An idle scheduler does not rewrite an unchanged patient vault every minute',async t=>{
 t.mock.timers.enable({apis:['setInterval','Date'],now:Date.parse('2026-10-16T12:00:00Z')});
 const dir=mkdtempSync(path.join(os.tmpdir(),'headache-idle-')),app=createApp({directory:dir,port:0});await app.listen();
 t.after(async()=>{await app.close();rmSync(dir,{recursive:true,force:true});});
 const id=app.store.createUser('idle@example.invalid','sample-password',emptyVault(),true);
 const before=app.store.db.prepare('SELECT profile,vault FROM users WHERE id=?').get(id);
 const changes=Number(app.store.db.prepare('SELECT total_changes() AS n').get().n);
 t.mock.timers.tick(5*60000);
 assert.equal(Number(app.store.db.prepare('SELECT total_changes() AS n').get().n)-changes,0,'idle ticks should make no SQL writes');
 assert.deepEqual(app.store.db.prepare('SELECT profile,vault FROM users WHERE id=?').get(id),before);
});

test('Scheduled sharing is persisted once; later idle ticks do not duplicate or rewrite it',async t=>{
 t.mock.timers.enable({apis:['setInterval','Date'],now:Date.parse('2026-10-16T12:00:00Z')});
 const dir=mkdtempSync(path.join(os.tmpdir(),'headache-scheduled-')),app=createApp({directory:dir,port:0});await app.listen();
 t.after(async()=>{await app.close();rmSync(dir,{recursive:true,force:true});});
 const id=app.store.createUser('scheduled@example.invalid','sample-password',syntheticVault(),true),user=app.store.get(id);
 user.vault.consent={id:'timer-consent',active:true,institution:'mock-clinic',scope:'summary',expires:'2099-01-01T00:00:00Z',frequency:'monthly'};app.store.save(user);
 t.mock.timers.tick(60000);
 const saved=app.store.get(id);assert.equal(saved.vault.jobs.length,1);assert.equal(saved.vault.jobs[0].status,'delivered');assert.equal(saved.vault.reports.length,1);assert.equal(saved.vault.notifications.length,1);
 assert.equal(app.store.hospital.prepare('SELECT count(*) AS n FROM receipts').get().n,1);
 const row=app.store.db.prepare('SELECT profile,vault FROM users WHERE id=?').get(id);
 t.mock.timers.tick(3*60000);
 assert.deepEqual(app.store.db.prepare('SELECT profile,vault FROM users WHERE id=?').get(id),row);
});

test('Scheduled retries and cancellation are durable even when no new report is due',async t=>{
 t.mock.timers.enable({apis:['setInterval','Date'],now:Date.parse('2026-10-16T12:00:00Z')});
 const dir=mkdtempSync(path.join(os.tmpdir(),'headache-retry-')),app=createApp({directory:dir,port:0});await app.listen();
 t.after(async()=>{await app.close();rmSync(dir,{recursive:true,force:true});});
 const id=app.store.createUser('retry@example.invalid','sample-password',emptyVault(),true),user=app.store.get(id);
 user.vault.enrolled='2026-10-01';user.vault.consent={id:'timer-consent',active:true,institution:'mock-clinic',scope:'summary',expires:'2099-01-01T00:00:00Z',frequency:'monthly'};
 queueReport(app.store,user,'2026-10-01','2026-10-15','en');processQueue(app.store,user,{fault:'offline'});app.store.save(user);
 t.mock.timers.tick(60000);let saved=app.store.get(id);assert.equal(saved.vault.jobs[0].status,'delivered');assert.equal(saved.vault.jobs[0].attempts,2);
 queueReport(app.store,saved,'2026-10-01','2026-10-14','en');saved.vault.consent.active=false;app.store.save(saved);
 t.mock.timers.tick(60000);saved=app.store.get(id);assert.equal(saved.vault.jobs[1].status,'cancelled');assert.equal(saved.vault.jobs.length,2);
 assert.equal(app.store.hospital.prepare('SELECT count(*) AS n FROM receipts').get().n,1);
});
