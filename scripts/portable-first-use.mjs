// Verify an extracted final portable artifact using its bundled launchers and real UI.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import net from 'node:net';
import path from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE);
const root=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]); const version=JSON.parse(readFileSync(path.join(root,'project/package.json'),'utf8')).version;mkdirSync(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const results=[],errors=[];let browser,running=false;
const run=(file,args=[])=>execFileSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(root,file),...args],{stdio:'ignore',windowsHide:true,timeout:30000});
const sock=net.createServer();await new Promise(r=>sock.listen(0,'127.0.0.1',r));const port=sock.address().port;await new Promise(r=>sock.close(r));
const origin='http://127.0.0.1:'+port;
try{
 assert.equal(existsSync(path.join(root,'data')),false,'Final portable artifact must contain no data directory');
 const manifest=readFileSync(path.join(root,'SHA256SUMS.txt'),'utf8').replace(/^\uFEFF/,'');let files=0;
 for(const line of manifest.trim().split(/\r?\n/)){const i=line.indexOf('  ');assert.ok(i>0);const rel=line.slice(i+2);assert.ok(!rel.split(/[\\/]/).includes('..'));assert.equal(hash(readFileSync(path.join(root,rel))),line.slice(0,i).toLowerCase(),rel);files++;}
 results.push({check:'unpacked ZIP manifest and no pre-existing data',files});
 run('Start.ps1',['-Port',String(port),'-NoBrowser']);running=true;
 const firstPid=JSON.parse(readFileSync(path.join(root,'data/server.pid'),'utf8').replace(/^\uFEFF/,''));
 assert.equal((await (await fetch(origin+'/api/health')).json()).version,version);
 run('Start.ps1',['-Port',String(port),'-NoBrowser']);
 assert.equal(JSON.parse(readFileSync(path.join(root,'data/server.pid'),'utf8').replace(/^\uFEFF/,'')).id,firstPid.id);
 results.push({check:'first startup and repeat startup use bundled runtime and same process'});
 browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE});
 const page=await browser.newPage({viewport:{width:1280,height:1000},acceptDownloads:true});page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto(origin);await page.locator('[data-action=demo]').click();await page.locator('.voice-launcher').waitFor();await page.locator('#language-switch').selectOption('en');
 const state=()=>page.evaluate(async()=> (await fetch('/api/state')).json());const initial=await state();
 const date='2026-09-24';assert.equal(initial.vault.days.some(d=>d.date===date),false);
 await page.locator('[name=diaryDate]').fill(date);await page.locator('[name=diaryDate]').blur();
 await page.locator('[name=headache][value=no]').check();await page.locator('[name=acute][value=no]').check();
 await page.locator('[name=preventiveTaken]').selectOption('not_applicable');await page.locator('[name=dailyImpact]').selectOption('none');
 const note='Synthetic first-use check / 首次使用虚构记录';
 await page.locator('#unified-day fieldset[data-kind=days] textarea[name=notes]').fill(note);
 async function save(){const p=page.waitForResponse(r=>r.url().endsWith('/api/diary/batch')&&r.request().method()==='POST');await page.locator('.diary-savebar button[type=submit]').click();const r=await p;assert.equal(r.status(),200,await r.text());await page.locator('.diary-savebar button:not([disabled])').waitFor();}
 await save();let saved=await state();assert.equal(saved.vault.days.length,initial.vault.days.length+1);assert.equal(saved.vault.days.find(d=>d.date===date).notes,note);
 for(const key of ['episodes','medications','preventives'])assert.deepEqual(saved.vault[key],initial.vault[key]);
 results.push({check:'new daily status saved through patient UI; untouched event templates do not save'});
 await page.locator('#unified-day fieldset[data-kind=days] textarea[name=notes]').fill(note+' — revised');await save();
 saved=await state();assert.equal(saved.vault.days.length,initial.vault.days.length+1);assert.ok(saved.vault.days.find(d=>d.date===date).revision>1);
 await page.reload();await page.locator('.voice-launcher').waitFor();assert.deepEqual((await state()).vault.days,saved.vault.days);
 results.push({check:'edit and browser reload preserve one revised daily record'});
 await page.locator('[data-page=report]').click();await page.locator('#report-form [name=from]').fill('2026-09-01');await page.locator('#report-form [name=to]').fill('2026-09-28');await page.locator('#report-language').selectOption('en');
 const response=page.waitForResponse(r=>r.url().endsWith('/api/report')&&r.request().method()==='POST');await page.locator('#report-form button[type=submit]').click();const r=await response;assert.equal(r.status(),200);const report=await r.json();await page.locator('#report-paper').waitFor();
 assert.equal(report.summary.statusDays,24);assert.equal(report.summary.headacheDays,8);
 const pending=page.waitForEvent('download');await page.locator('[data-action=download-report]').click();const dl=await pending;assert.deepEqual(JSON.parse(readFileSync(await dl.path(),'utf8')),report);
 await page.screenshot({path:path.join(out,'first-use-report.png')});
 const retained=await state();
 results.push({check:'report generation and downloaded JSON match saved record; coverage 24/28'});
 run('Stop.ps1');running=false;assert.equal(existsSync(path.join(root,'data/server.pid')),false);await assert.rejects(fetch(origin+'/api/health'));
 run('Start.ps1',['-Port',String(port),'-NoBrowser']);running=true;await page.reload();await page.locator('[data-page=report]').waitFor();const restored=await state();
 assert.equal(restored.user.id,retained.user.id);for(const key of ['days','episodes','medications','preventives','reports'])assert.deepEqual(restored.vault[key],retained.vault[key]);
 results.push({check:'stop and restart retain same synthetic account, diary and report'});
 await browser.close();browser=null;run('Stop.ps1');running=false;
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:results.length,results,errors},null,2));
}catch(e){errors.push(e.message);process.exitCode=1;console.error(e.stack);}
finally{await browser?.close();if(running||existsSync(path.join(root,'data/server.pid')))try{run('Stop.ps1');}catch(e){errors.push('stop: '+e.message);}writeFileSync(path.join(out,'first-use-results.json'),JSON.stringify({version,passed:results.length,results,errors},null,2));}

