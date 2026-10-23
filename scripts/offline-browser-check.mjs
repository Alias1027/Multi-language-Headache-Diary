import {APP_VERSION} from '../public/release.mjs';
// Optional real-browser regression using a fresh profile and disposable synthetic database only.
// This emulates connectivity and viewport conditions; it does not certify a physical phone.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtempSync,mkdirSync,rmSync,writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createApp} from '../server/main.mjs';
import {syntheticVault} from '../server/fixtures.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const output=process.argv[2]?path.resolve(process.argv[2]):null;
if(output)mkdirSync(output,{recursive:true});
const temporaryRoot=path.resolve(os.tmpdir());
const directory=mkdtempSync(path.join(temporaryRoot,'headache-offline-browser-'));
const dataDirectory=path.join(directory,'data'),profileDirectory=path.join(directory,'profile');
const app=createApp({directory:dataDirectory,port:0,schedule:false}),results=[],errors=[];
const password='Synthetic-only-password-070';
const email='offline-primary@example.invalid',otherEmail='offline-secondary@example.invalid';
const userId=app.store.createUser(email,password,syntheticVault(),true);
const otherId=app.store.createUser(otherEmail,password,syntheticVault(),true);
const initialVault=structuredClone(app.store.get(userId).vault),otherInitial=structuredClone(app.store.get(otherId).vault);
const dates=[12,11,10,9,8,7,6,5,4,3,2,1].map(n=>new Date(Date.now()-n*86400000).toISOString().slice(0,10));
const launchOptions={headless:true,viewport:{width:929,height:764},...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})};
let context,page,origin,slowShell=false;
// Delay responses at the server boundary, including requests made by the service worker.
const originalHandler=app.server.listeners('request')[0];
app.server.removeAllListeners('request');
app.server.on('request',(req,res)=>{
  if(slowShell&&new URL(req.url,'http://localhost').pathname==='/style.css'){
    const timer=setTimeout(()=>{if(!res.destroyed)originalHandler(req,res);},7000);timer.unref();return;
  }
  originalHandler(req,res);
});
async function startBrowser({offline=false}={}){
  context=await chromium.launchPersistentContext(profileDirectory,launchOptions);
  await context.setOffline(offline);page=context.pages()[0]||await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror',error=>errors.push(error.stack||error.message));page.on('dialog',dialog=>dialog.accept());
  await page.goto(origin,{waitUntil:'domcontentloaded'});
}
const journal=()=>page.evaluate(async()=>(await import('/offline.mjs')).localVault.get('offline-journal-v2'));
async function waitJournal(predicate,label){const deadline=Date.now()+20000;while(Date.now()<deadline){const value=await journal();if(predicate(value))return value;await page.waitForTimeout(50);}console.error(JSON.stringify({waiting:label,queue:(await journal())?.pending?.map(p=>({date:p.date,status:p.status,error:p.error})),ui:await page.locator('.statusline').innerText(),toast:await page.locator('#toast').innerText()}));assert.fail('Timed out waiting for '+label);}
async function waitQueue(count){await waitJournal(j=>j?.pending?.length===count,'queue length '+count);await page.locator('#unified-diary-form button[type=submit]:not([disabled])').waitFor();}
async function login(address=email,form='#auth-form'){
  const emailInput=page.locator(form+' [name=email]');
  if(await emailInput.isEditable())await emailInput.fill(address);else assert.equal(await emailInput.inputValue(),address);
  await page.locator(form+' [name=password]').fill(password);
  await page.locator(form+' button[type=submit]').first().click();
}
async function fillEntry(date,note,entryPage=page){
  const page=entryPage;
  await page.locator('[name=diaryDate]').waitFor();
  if(await page.locator('[name=diaryDate]').inputValue()!==date){
    const previous=await page.locator('[name=diaryDate]').elementHandle();
    await page.locator('[name=diaryDate]').fill(date);
    await page.waitForFunction(el=>!el.isConnected,previous);await previous.dispose();
    assert.equal(await page.locator('[name=diaryDate]').inputValue(),date);
  }
  for(const name of ['headache','acute']){
    const radio=page.locator(`[data-kind=days] [name=${name}][value=no]`);
    if(!await radio.isChecked()){
      const previous=await radio.elementHandle();await radio.check();
      await page.waitForFunction(el=>!el.isConnected,previous);await previous.dispose();
    }
  }
  await page.locator('[data-kind=days] [name=preventiveTaken]').selectOption('not_applicable');
  await page.locator('[data-kind=days] [name=dailyImpact]').selectOption('none');
  await page.locator('[data-kind=days] [name=notes]').fill(note);
}
async function entry(date,note,entryPage=page){
  await fillEntry(date,note,entryPage);
  const page=entryPage;
  await page.locator('#unified-diary-form button[type=submit]').click();
}
async function sync(){
  await page.locator('[data-action=sync]').first().click();
  const outcome=await waitJournal(j=>j?.pending?.length===0||j?.pending?.some(p=>p.status==='auth'),'sync or explicit sign-in');
  if(outcome.pending.length){await page.locator('[data-action=reauth]').first().click();await login(email,'#reauth-form');results.push({check:'cold-restart authentication recovery preserves pending queue and signs in to same account'});}
  await waitQueue(0);
  await page.locator('#unified-diary-form button[type=submit]:not([disabled])').waitFor();
}
const record=(date,note)=>({date,operationId:randomUUID(),records:[{kind:'days',record:{id:'day-'+date,revision:0,date,headache:'no',acute:'no',preventiveTaken:'not_applicable',dailyImpact:'none',notes:note}}]});
try{
  origin='http://127.0.0.1:'+await app.listen();
  await startBrowser();await login();await page.locator('#unified-diary-form').waitFor();
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  const shellCache=await page.evaluate(async(version)=>{
    const name=(await caches.keys()).find(key=>key==='headache-shell-'+version);
    const cache=await caches.open(name);
    return {name,paths:(await cache.keys()).map(request=>new URL(request.url).pathname),loadedModules:performance.getEntriesByType('resource').map(resource=>new URL(resource.name).pathname).filter(path=>path.endsWith('.mjs'))};
  },APP_VERSION);
  assert.equal(shellCache.name,'headache-shell-'+APP_VERSION);
  for(const asset of new Set(['/diary-drafts.mjs','/offline-queue.mjs','/network.mjs',...shellCache.loadedModules]))assert.ok(shellCache.paths.includes(asset),'loaded module must be in service-worker cache: '+asset);
  results.push({check:'first authenticated setup, service-worker control and all loaded modules cached',cachedAssets:shellCache.paths.length});

  await context.setOffline(true);
  await entry(dates[0],'Offline first day');await waitQueue(1);
  await entry(dates[1],'Offline second day');await waitQueue(2);
  await entry(dates[2],'Offline third day');await waitQueue(3);
  await entry(dates[0],'Offline first day corrected');await waitQueue(4);
  const firstQueue=await journal();
  assert.deepEqual([...new Set(firstQueue.pending.map(p=>p.date))].sort(),dates.slice(0,3).sort());
  assert.equal(await page.locator('#unified-diary-form button[type=submit]').isEnabled(),true);
  assert.equal(await page.locator('.voice-launcher').isEnabled(),true);
  assert.deepEqual(app.store.get(userId).vault,initialVault,'offline submission must not modify server data');
  results.push({check:'three offline dates and same-date correction, with diary still editable',queued:4});

  // Clear only the browser HTTP cache, preserving CacheStorage and IndexedDB.
  // A fresh browser process must restart offline solely from the SW shell;
  // otherwise the HTTP cache can hide an omitted module in the SW manifest.
  const cdp=await context.newCDPSession(page);
  await cdp.send('Network.clearBrowserCache');await cdp.detach();
  await context.close();context=null;
  await startBrowser({offline:true});await page.locator('#unified-diary-form').waitFor();
  assert.deepEqual((await journal()).pending,firstQueue.pending);
  assert.equal(await page.locator('[name=diaryDate]').isEnabled(),true);
  results.push({check:'cold browser restart with HTTP cache cleared restores encrypted queue and editable diary offline from service-worker cache'});

  for(const lang of ['zh','en','es','fr','ru','ar','hi','ur']){
    await page.locator('#language-switch').selectOption(lang);
    await page.waitForFunction(value=>document.documentElement.lang===value,lang);
    await page.setViewportSize({width:390,height:764});
    assert.equal(await page.locator('html').getAttribute('dir'),['ar','ur'].includes(lang)?'rtl':'ltr');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'offline mobile overflow '+lang);
    const label=await page.locator('.voice-launcher-label').boundingBox(),button=await page.locator('.voice-launcher').boundingBox();
    assert.ok(label.width<=button.width&&label.height<=button.height,'voice text fits button '+lang);
    await page.locator('.voice-launcher').click();await page.locator('.voice-dock:not([hidden])').waitFor();
    const dock=await page.locator('.voice-dock').boundingBox();
    assert.ok(dock.x>=0&&dock.x+dock.width<=390&&dock.y>=0&&dock.y+dock.height<=764,'voice dock fits mobile '+lang);
    await page.locator('.voice-dock-header button').click();
    if(output){
      await page.locator('#pending-journal').scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(output,'offline-mobile-'+lang+'.jpg'),type:'jpeg',quality:88});
    }
    results.push({check:'390px offline diary, text and voice panel',lang,direction:['ar','ur'].includes(lang)?'rtl':'ltr'});
  }
  await page.locator('#language-switch').selectOption('en');await page.setViewportSize({width:929,height:764});
  await context.setOffline(false);await sync();
  const synced=app.store.get(userId).vault;
  for(const date of dates.slice(0,3))assert.equal(synced.days.filter(d=>d.date===date).length,1,'one saved day for '+date);
  assert.equal(synced.days.find(d=>d.date===dates[0]).notes,'Offline first day corrected');
  assert.equal(synced.days.find(d=>d.date===dates[0]).revision,2);
  for(const kind of ['episodes','medications','preventives'])assert.deepEqual(synced[kind],initialVault[kind]);
  results.push({check:'reconnect and explicit sync commit all dates in order, correction is one revised day, other clinical records unchanged'});

  // Simulate a server commit whose response never reaches the browser.
  let ambiguousCommits=0;
  const loseAcknowledgment=async route=>{const response=await route.fetch();assert.equal(response.status(),200);ambiguousCommits++;await route.abort('failed');};
  await context.route('**/api/diary/batch',loseAcknowledgment);
  await entry(dates[3],'Acknowledgment lost');await waitQueue(1);
  assert.equal(ambiguousCommits,1);const committed=structuredClone(app.store.get(userId).vault);
  const lostQueue=await journal();assert.equal(lostQueue.pending.length,1);
  await context.unroute('**/api/diary/batch',loseAcknowledgment);await sync();
  assert.deepEqual(app.store.get(userId).vault,committed,'replay must not duplicate any saved record or revision');
  results.push({check:'lost acknowledgment retry preserves operation identity and does not duplicate server records'});

  let stalledRequest;
  const stall=route=>{stalledRequest=route;};
  await context.route('**/api/diary/batch',stall);
  const slowStart=performance.now();
  await entry(dates[7],'Slow request retained locally');await waitQueue(1);
  const slowElapsed=performance.now()-slowStart;
  assert.ok(slowElapsed<20000,'a stalled save must return to an editable pending state');
  assert.equal(app.store.get(userId).vault.days.some(d=>d.date===dates[7]),false);
  await stalledRequest?.abort('failed').catch(()=>{});
  await context.unroute('**/api/diary/batch',stall);await sync();
  assert.equal(app.store.get(userId).vault.days.find(d=>d.date===dates[7]).notes,'Slow request retained locally');
  results.push({check:'stalled save times out, remains locally queued and succeeds on explicit retry',elapsedMs:Math.round(slowElapsed)});

  const secondPage=await context.newPage();
  secondPage.on('pageerror',error=>errors.push(error.stack||error.message));secondPage.on('dialog',dialog=>dialog.accept());
  await secondPage.goto(origin);await secondPage.locator('#unified-diary-form').waitFor();
  await context.setOffline(true);
  await Promise.all([entry(dates[8],'First tab independent date'),entry(dates[9],'Second tab independent date',secondPage)]);
  await waitQueue(2);await secondPage.locator('#unified-diary-form button[type=submit]:not([disabled])').waitFor();
  const concurrent=(await journal()).pending;
  assert.deepEqual(concurrent.map(p=>p.date).sort(),[dates[8],dates[9]].sort());
  await secondPage.close();await context.setOffline(false);await sync();
  assert.equal(app.store.get(userId).vault.days.find(d=>d.date===dates[8]).notes,'First tab independent date');
  assert.equal(app.store.get(userId).vault.days.find(d=>d.date===dates[9]).notes,'Second tab independent date');
  results.push({check:'two tabs concurrently enqueue separate dates without overwriting queue or encryption key'});

  // Inject one precise IndexedDB persistence failure; do not fill the real device's disk.
  await page.evaluate(async()=>{const {localVault}=await import('/offline.mjs');globalThis.__restoreQuotaPut=localVault.put;localVault.put=async(name,value)=>{if(name==='offline-journal-v2')throw new DOMException('Synthetic quota pressure','QuotaExceededError');return globalThis.__restoreQuotaPut(name,value);};});
  const beforeQuota=structuredClone(app.store.get(userId).vault);
  await entry(dates[10],'Draft must survive quota failure');
  await page.locator('#unified-diary-form button[type=submit]:not([disabled])').waitFor();
  assert.equal((await journal()).pending.length,0);
  assert.equal(await page.locator('[data-kind=days] [name=notes]').inputValue(),'Draft must survive quota failure');
  assert.equal(await page.evaluate(async uid=>Object.values((await(await import('/offline.mjs')).localVault.get('diary-drafts-v2-'+uid))?.drafts||{}).some(d=>d.day.notes==='Draft must survive quota failure'),userId),true);
  assert.deepEqual(app.store.get(userId).vault,beforeQuota);
  await page.evaluate(async()=>{const {localVault}=await import('/offline.mjs');localVault.put=globalThis.__restoreQuotaPut;delete globalThis.__restoreQuotaPut;});
  await page.locator('#unified-diary-form button[type=submit]').click();await waitQueue(0);
  assert.equal(app.store.get(userId).vault.days.find(d=>d.date===dates[10]).notes,'Draft must survive quota failure');
  results.push({check:'injected queue-storage quota failure retains form and encrypted draft, reports no saved entry, retry succeeds'});

  await fillEntry(dates[8],'Unsaved draft in first tab');
  const secondDraftPage=await context.newPage();
  secondDraftPage.on('pageerror',error=>errors.push(error.stack||error.message));secondDraftPage.on('dialog',dialog=>dialog.accept());
  await secondDraftPage.goto(origin);await secondDraftPage.locator('#unified-diary-form').waitFor();
  await entry(dates[9],'Second tab saved independently',secondDraftPage);
  await secondDraftPage.locator('#unified-diary-form button[type=submit]:not([disabled])').waitFor();
  await waitQueue(0);
  const preservedDraft=await page.evaluate(async uid=>Object.values((await(await import('/offline.mjs')).localVault.get('diary-drafts-v2-'+uid))?.drafts||{}).find(d=>d.day.notes==='Unsaved draft in first tab'),userId);
  assert.ok(preservedDraft,'saving another tab must not remove a different pending draft');
  let signoutRequests=0;
  const countSignout=request=>{if(request.method()==='POST'&&new URL(request.url()).pathname==='/api/logout')signoutRequests++;};
  context.on('request',countSignout);
  for(const draftPage of [secondDraftPage,page]){
    await draftPage.evaluate(()=>{document.querySelector('#toast').textContent='';});
    await draftPage.locator('[data-action=logout]').click();
    await draftPage.waitForFunction(()=>!!document.querySelector('#toast')?.textContent);
    assert.equal(signoutRequests,0,'sign out must be blocked before the server request while any diary draft is unsent');
    assert.equal(await draftPage.locator('#unified-diary-form').isVisible(),true);
    assert.equal(await page.evaluate(async uid=>Object.values((await(await import('/offline.mjs')).localVault.get('diary-drafts-v2-'+uid))?.drafts||{}).some(d=>d.day.notes==='Unsaved draft in first tab'),userId),true);
  }
  context.off('request',countSignout);
  results.push({check:'sign out in either a clean second tab or the editing tab preserves unsent drafts and leaves the session active'});
  for(const lang of ['fr','ur']){
    await secondDraftPage.locator('#language-switch').selectOption(lang);
    await secondDraftPage.waitForFunction(value=>document.documentElement.lang===value,lang);
    await secondDraftPage.setViewportSize({width:390,height:764});
    await secondDraftPage.locator('.draft-recovery').waitFor({state:'visible'});
    assert.equal(await secondDraftPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'recovered draft mobile overflow '+lang);
  }
  results.push({check:'retained draft recovery controls fit a 390px viewport in French and Urdu'});
  await page.close();
  page=await context.newPage();page.on('pageerror',error=>errors.push(error.stack||error.message));page.on('dialog',dialog=>dialog.accept());
  await page.goto(origin);await page.locator('#unified-diary-form').waitFor();
  if(await page.locator('[data-kind=days] [name=notes]').inputValue()!=='Unsaved draft in first tab')await page.locator(`[data-diary-action=recover-draft][data-operation="${preservedDraft.operationId}"]`).click();
  await page.waitForFunction(()=>document.querySelector('[data-kind=days] [name=notes]')?.value==='Unsaved draft in first tab');
  assert.equal(app.store.get(userId).vault.days.find(d=>d.date===dates[8]).notes,'First tab independent date');
  await page.locator('[data-diary-action=clear]').click();
  await page.waitForFunction(()=>document.querySelector('[data-kind=days] [name=notes]')?.value!=='Unsaved draft in first tab');
  await secondDraftPage.close();
  results.push({check:'saving another tab does not overwrite or delete an unsent draft; closed-tab draft can be recovered'});

  await context.setOffline(true);await entry(dates[11],'Queued while reminder is edited');await waitQueue(1);
  const heldRoutes=[];const holdForEditing=route=>{heldRoutes.push(route);};
  await context.route('**/api/diary/batch',holdForEditing);await context.setOffline(false);
  const freshState=page.waitForResponse(r=>r.url().endsWith('/api/state'));
  await page.reload();await freshState;await page.locator('[data-page=settings]').click();
  await page.locator('[data-setting=reminders]>summary').click();
  await page.locator('#reminders-form [name=message]').fill('Preserve editing while background sync finishes');
  const editingForm=await page.locator('#reminders-form').elementHandle();
  await context.unroute('**/api/diary/batch',holdForEditing);
  for(const route of heldRoutes)await route.continue().catch(()=>{});
  await waitJournal(j=>j?.pending?.length===0,'background sync during reminder editing');
  await page.waitForTimeout(100);
  assert.equal(await editingForm.evaluate(el=>el.isConnected),true,'background completion must not replace the edited form');
  assert.equal(await page.locator('#reminders-form [name=message]').inputValue(),'Preserve editing while background sync finishes');
  await editingForm.dispose();await page.locator('[data-page=patient]').click();
  results.push({check:'startup/background sync completion preserves an in-progress reminder form without whole-page replacement'});

  await context.setOffline(true);await entry(dates[4],'Retained through session expiry');await waitQueue(1);
  const authQueue=(await journal()).pending;
  app.store.db.prepare('UPDATE sessions SET expires=0 WHERE user_id=?').run(userId);
  await context.setOffline(false);
  await page.locator('[data-action=sync]').first().click();
  await waitJournal(j=>j?.pending?.some(p=>p.status==='auth'),'auth-required queue');
  await page.reload();await page.locator('#unified-diary-form').waitFor();
  assert.equal((await journal()).pending[0].operationId,authQueue[0].operationId);
  assert.equal(await page.locator('[name=diaryDate]').isEnabled(),true);
  await page.locator('[data-action=reauth]').first().click();await page.locator('#reauth-form').waitFor();
  assert.equal(await page.locator('#reauth-form [name=email]').isEditable(),false);
  assert.equal(await page.locator('#reauth-form [name=email]').inputValue(),email);
  // A second tab may switch the origin's shared cookie; sync must verify the server account too.
  assert.equal((await context.request.post(origin+'/api/login',{data:{email:otherEmail,password}})).status(),200);
  await page.locator('[data-action=sync]').first().click();
  await waitJournal(j=>j?.pending?.[0]?.error==='reauthSameAccount','cross-account guard');
  assert.equal((await journal()).baseState.user.id,userId);
  assert.equal((await journal()).pending[0].userId,userId);
  assert.deepEqual(app.store.get(otherId).vault,otherInitial,'other account must not receive pending records');
  results.push({check:'expired session retains local diary across reload; other-account reauthentication cannot merge records'});
  await login(email,'#reauth-form');await page.locator('#reauth-form').waitFor({state:'detached'});
  if((await journal()).pending.length)await sync();
  assert.equal(app.store.get(userId).vault.days.find(d=>d.date===dates[4]).notes,'Retained through session expiry');
  results.push({check:'same-account reauthentication resumes pending upload'});

  await context.setOffline(true);await entry(dates[5],'Local conflict must remain');await waitQueue(1);
  // Independent authorized session represents a second device updating the same date.
  const secondSession=app.store.session(userId),conflicting=record(dates[5],'Other device saved this first');
  const conflictResponse=await fetch(origin+'/api/diary/batch',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,Cookie:'hd_session='+secondSession.token,'X-CSRF-Token':secondSession.csrf},body:JSON.stringify(conflicting)});
  assert.equal(conflictResponse.status,200);
  await context.setOffline(false);
  await page.locator('[data-action=sync]').first().click();
  await waitJournal(j=>j?.pending?.[0]?.status==='conflict','visible conflict');
  await page.locator('#pending-journal').waitFor({state:'visible'});
  assert.ok((await page.locator('#pending-journal').innerText()).includes(dates[5]));
  assert.equal((await journal()).pending[0].records[0].record.notes,'Local conflict must remain');
  await entry(dates[6],'Independent day after conflict');await waitQueue(2);
  assert.equal((await journal()).pending[0].status,'conflict');
  assert.equal(app.store.get(userId).vault.days.find(d=>d.date===dates[5]).notes,'Other device saved this first');
  assert.equal(await page.locator('#unified-diary-form button[type=submit]').isEnabled(),true);
  results.push({check:'conflict stays visible with both versions preserved; independent new day can still be queued'});

  slowShell=true;
  const cachedFetch=await page.evaluate(async()=>{const started=performance.now();const response=await fetch('/style.css',{cache:'no-store'});return {status:response.status,elapsed:performance.now()-started,size:(await response.text()).length};});
  assert.equal(cachedFetch.status,200);assert.ok(cachedFetch.size>100);assert.ok(cachedFetch.elapsed<3000,'cached shell must not wait for a seven-second network response');
  results.push({check:'cached stylesheet stays responsive while its network response is delayed seven seconds',elapsedMs:Math.round(cachedFetch.elapsed)});
  slowShell=false;
  assert.deepEqual(app.store.get(otherId).vault,otherInitial);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:results.length,results,errors,scope:'Desktop Chromium with simulated offline/slow network and mobile viewport; physical phones remain unverified'},null,2));
}catch(error){errors.push(error.stack||error.message);process.exitCode=1;console.error(error.stack);if(output&&page)await page.screenshot({path:path.join(output,'offline-browser-failure.png')}).catch(()=>{});}
finally{
  if(output)writeFileSync(path.join(output,'offline-browser-results.json'),JSON.stringify({passed:results.length,results,errors,scope:'Disposable synthetic database and fresh browser profile; no active patient data'},null,2));
  await context?.close();await app.close();
  const resolved=path.resolve(directory);
  assert.ok(resolved.startsWith(temporaryRoot+path.sep)&&path.basename(resolved).startsWith('headache-offline-browser-'));
  rmSync(resolved,{recursive:true,force:true});
}
