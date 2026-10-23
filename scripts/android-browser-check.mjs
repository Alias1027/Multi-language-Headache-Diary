// Real browser, bundled Android UI and WebCrypto; the native bridge is mocked.
// These fault-injection checks do not certify JNI, Android devices or TLS sync.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createEngine} from '../android/web/engine.mjs';
import {encryptBackup} from '../android/web/backup.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(import.meta.dirname,'..'),results=[];
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
async function openPage({readFailure=false,backup=''}={}){
 const page=await browser.newPage({viewport:{width:412,height:915}}),errors=[];
 page.setDefaultTimeout(15000);page.on('pageerror',err=>errors.push(err.message));page.on('dialog',d=>d.accept());
 await page.route('https://appassets.androidplatform.net/**',async route=>{
  const relative=decodeURIComponent(new URL(route.request().url()).pathname).slice(1),file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep)){await route.abort();return;}
  try{await route.fulfill({body:await readFile(file),contentType:file.endsWith('.mjs')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream'});}catch{await route.fulfill({status:404,body:''});}
 });
 await page.addInitScript(({readFailure,backup})=>{
  let failed=readFailure;const values={};globalThis.__nativeTest={held:null,holdJournal:false,values,restored:null};
  globalThis.AndroidBridge={call(id,method,input){const a=JSON.parse(input),test=globalThis.__nativeTest;
   const finish=()=>{try{
    let value=null;
    if(method==='import')value=backup;
    else if(method==='restore'){for(const k of Object.keys(values))delete values[k];Object.assign(values,structuredClone(a.value));test.restored=structuredClone(values);failed=false;}
    else if(method==='disconnect'){}
    else if(failed)throw new Error('nativeError');
    else if(method==='get')value=values[a.key]??null;
    else if(method==='all')value=structuredClone(values);
    else if(method==='put')values[a.key]=structuredClone(a.value);
    else if(method==='remove')delete values[a.key];
    else if(method==='replace'){for(const k of Object.keys(values))delete values[k];Object.assign(values,structuredClone(a.value));}
    else throw new Error('unexpectedMethod');
    globalThis.nativeResult(id,{ok:true,value});
   }catch(err){globalThis.nativeResult(id,{ok:false,error:err.message});}};
   if(method==='put'&&a.key==='offline-journal-v2'&&test.holdJournal)test.held=finish;else setTimeout(finish,0);
  }};
 },{readFailure,backup});
 await page.goto('https://appassets.androidplatform.net/android/web/index.html');return {page,errors};
}
try{
 let bag={};const storage={get:async k=>structuredClone(bag[k]??null),put:async(k,v)=>{bag[k]=structuredClone(v);},all:async()=>structuredClone(bag),replace:async v=>{bag=structuredClone(v);}};
 const engine=createEngine({storage,locks:{request:async(k,fn)=>fn()},now:()=> '2026-10-23T12:00:00Z'});
 await engine.initialize('zh','Asia/Shanghai','2026-10-01');
 await engine.save({date:'2026-10-20',operationId:'synthetic-restored-day',records:[{kind:'days',record:{id:'day-2026-10-20',revision:0,date:'2026-10-20',headache:'no',acute:'no',dailyImpact:'none',preventiveTaken:'not_applicable'}}]});
 const password='synthetic backup password 123!',backup=await encryptBackup(bag,password);
 {
  const {page,errors}=await openPage({readFailure:true,backup});
  await page.waitForFunction(()=>document.querySelector('#mobile-app').textContent.includes('nativeError'));
  assert.equal(await page.locator('[data-mobile=restore]').count(),1,'An unreadable vault must still expose encrypted-backup recovery');
  assert.equal(await page.locator('#create-profile').count(),0,'Do not offer destructive reinitialization when the existing vault cannot be read');
  await page.locator('#backup-password').fill(password);await page.locator('[data-mobile=restore]').click();
  await page.locator('#unified-diary-form').waitFor();
  assert.equal(await page.evaluate(()=>globalThis.__nativeTest.restored['offline-journal-v2'].pending[0].date),'2026-10-20');
  assert.deepEqual(errors,[]);results.push({scenario:'startup read failure -> encrypted backup recovery -> saved diary retained',passed:true});await page.close();
 }
 {
  const {page,errors}=await openPage();
  await page.locator('#create-profile button').click();await page.locator('#unified-diary-form').waitFor();
  await page.locator('[data-kind=days] [name=notes]').fill('synthetic note preserved while saving');
  await page.locator('[name=preventiveTaken]').selectOption('not_applicable');await page.locator('[name=dailyImpact]').selectOption('none');
  await page.evaluate(()=>{globalThis.__nativeTest.holdJournal=true;});
  await page.locator('#unified-diary-form button[type=submit]').click();await page.waitForFunction(()=>globalThis.__nativeTest.held!==null);
  await page.locator('#mobile-language').selectOption('en');
  await page.waitForFunction(()=>document.querySelector('#mobile-language').value==='zh');
  assert.equal(await page.locator('html').getAttribute('lang'),'zh','Language change must not replace an active save form');
  await page.locator('[data-mobile=page][data-page=settings]').click();
  assert.equal(await page.locator('#unified-diary-form').count(),1,'Navigation must wait for the active diary save');
  assert.equal(await page.locator('#unified-diary-form > fieldset').evaluate(el=>el.disabled),true);
  await page.evaluate(()=>{const t=globalThis.__nativeTest;t.holdJournal=false;t.held();t.held=null;});
  await page.waitForFunction(()=>document.querySelector('#unified-diary-form > fieldset')?.disabled===false);
  assert.equal(await page.evaluate(()=>globalThis.__nativeTest.values['offline-journal-v2'].pending[0].records[0].record.notes),'synthetic note preserved while saving');
  await page.locator('#mobile-language').selectOption('en');await page.waitForFunction(()=>document.documentElement.lang==='en');
  assert.deepEqual(errors,[]);results.push({scenario:'delayed native save -> language/navigation guarded -> note retained -> language change resumes',passed:true});await page.close();
 }
 const evidence={scope:'real browser/UI/WebCrypto with a synthetic native bridge; no device/JNI/TLS certification',passed:results.length,results};
 if(process.argv[2]){const output=path.resolve(process.argv[2]);await mkdir(output,{recursive:true});await writeFile(path.join(output,'android-browser-results.json'),JSON.stringify(evidence,null,2)+'\n');}
 console.log(JSON.stringify(evidence,null,2));
}finally{await browser.close();}
