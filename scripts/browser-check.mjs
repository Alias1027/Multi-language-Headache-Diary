// Optional browser regressions. Uses only a disposable synthetic database and a fresh browser.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtempSync,mkdirSync,rmSync,writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../server/main.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const output=process.argv[2]?path.resolve(process.argv[2]):null;
if(output)mkdirSync(output,{recursive:true});
const directory=mkdtempSync(path.join(os.tmpdir(),'headache-browser-'));
const app=createApp({directory,port:0,schedule:false}),results=[],errors=[];
let browser;
try{
 const port=await app.listen(),origin='http://127.0.0.1:'+port;
 browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
 const page=await browser.newPage({viewport:{width:929,height:764}});
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(origin);await page.locator('[data-action=demo]').click();await page.locator('.voice-launcher').waitFor();
 for(const lang of ['zh','en','es','fr','ru','ar','hi','ur']){
  await page.locator('#language-switch').selectOption(lang);
  await page.waitForFunction(value=>document.documentElement.lang===value,lang);
  assert.equal(await page.locator('html').getAttribute('dir'),['ar','ur'].includes(lang)?'rtl':'ltr');
  for(const size of [{width:929,height:764},{width:390,height:764},{width:844,height:320},{width:390,height:400},{width:1440,height:500}]){
   await page.setViewportSize(size);await page.locator('.voice-launcher').click();
   const dock=page.locator('.voice-dock:not([hidden])');await dock.waitFor();
   const rect=await dock.boundingBox(),close=await page.locator('.voice-dock-header button').boundingBox();
   assert.ok(rect.y>=8&&rect.x>=0&&rect.x+rect.width<=size.width&&rect.y+rect.height<=size.height,`${lang} ${JSON.stringify(size)} dock outside viewport`);
   assert.ok(close.y>=0&&close.y+close.height<=size.height,'close control must remain reachable');
   assert.ok((await page.locator('.voice-dock-body').boundingBox()).height>=60,'panel must leave usable scrolling space');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'document overflow');
   if(output&&size.height===320)await page.screenshot({path:path.join(output,`voice-landscape-${lang}.png`)});
   await page.locator('.voice-dock-header button').click();await page.locator('.voice-launcher').waitFor({state:'visible'});
   results.push({check:'voice layout and close control',lang,...size});
  }
  await page.setViewportSize({width:929,height:764});await page.locator('[data-page=settings]').click();
  await page.locator('[data-setting=reminders]').evaluate(el=>{el.open=true;});
  assert.equal(await page.locator('#reminders-form [name=language]').inputValue(),lang);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('[data-page=report]').click();assert.equal(await page.locator('#report-language').inputValue(),lang);
  const response=page.waitForResponse(r=>r.url().endsWith('/api/report')&&r.request().method()==='POST');
  await page.locator('#report-form button[type=submit]').click();const report=await(await response).json();
  assert.equal(report.language,lang);assert.equal(report.summary.headacheDays,8);assert.equal(report.summary.episodes,7);assert.equal(report.summary.acuteDays,5);
  results.push({check:'settings direction and report semantics',lang});
  await page.locator('[data-page=patient]').click();
 }
 await page.locator('#language-switch').selectOption('zh');await page.locator('[data-page=settings]').click();
 await page.locator('[data-setting=reminders]').evaluate(el=>{el.open=true;});
 const message=page.locator('#reminders-form [name=message]');await message.fill('UNSAVED REMINDER DRAFT');
 let accept=false,settingsPosts=0;page.on('dialog',dialog=>accept?dialog.accept():dialog.dismiss());
 page.on('request',request=>{if(request.url().endsWith('/api/settings')&&request.method()==='POST')settingsPosts++;});
 await page.locator('[data-setting=preferences]').evaluate(el=>{el.open=true;});
 const warning=page.waitForEvent('dialog');await page.locator('#preferences-form button[type=submit]').click();await warning;
 assert.equal(await message.inputValue(),'UNSAVED REMINDER DRAFT');assert.equal(settingsPosts,0);
 await page.locator('[data-setting=sync]').evaluate(el=>{el.open=true;});
 const otherWarning=page.waitForEvent('dialog');await page.locator('[data-action=receipts]').click();await otherWarning;
 assert.equal(await message.inputValue(),'UNSAVED REMINDER DRAFT');
 results.push({check:'dismiss preserves reminder draft across settings form and action'});
 accept=true;
 const settingsSaved=page.waitForResponse(r=>r.url().endsWith('/api/settings')&&r.request().method()==='POST');
 await page.locator('#preferences-form button[type=submit]').click();assert.equal((await settingsSaved).status(),200);
 await page.waitForFunction(()=>document.querySelector('#reminders-form [name=message]')?.value!=='UNSAVED REMINDER DRAFT');
 await page.locator('[data-setting=reminders]').evaluate(el=>{el.open=true;});await message.fill('Reviewed synthetic reminder');
 const saved=page.waitForResponse(r=>r.url().endsWith('/api/reminders')&&r.request().method()==='POST');
 await page.locator('#reminders-form button[type=submit]').click();assert.equal((await saved).status(),200);
 await page.locator('[data-action=reminder-test]:not([disabled])').waitFor();
 const simulated=page.waitForResponse(r=>r.url().endsWith('/api/reminders/test'));
 await page.locator('[data-action=reminder-test]').click();assert.equal((await simulated).status(),200);
 await page.locator('.reminder-event').waitFor();assert.ok((await page.locator('.reminder-event').first().innerText()).includes('Reviewed synthetic reminder'));
 await page.reload();await page.locator('[data-page=settings]').click();
 assert.equal(await message.inputValue(),'Reviewed synthetic reminder');
 results.push({check:'confirmed discard, reminder save, local simulation and reload'});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:results.length,results,errors},null,2));
}catch(error){errors.push(error.message);process.exitCode=1;console.error(error.stack);}
finally{
 if(output)writeFileSync(path.join(output,'browser-results.json'),JSON.stringify({passed:results.length,results,errors},null,2));
 await browser?.close();await app.close();rmSync(directory,{recursive:true,force:true});
}
