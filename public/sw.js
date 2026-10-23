const CACHE='headache-shell-0.8.2';
const ASSETS=['/care-access-i18n.mjs','/care-access-ui.mjs','/report-view.mjs','/diary-drafts.mjs','/network.mjs','/offline-queue.mjs','/care-report-ui.mjs','/care-history-i18n.mjs','/care-observation.mjs','/voice-review.mjs','/reminder-ui.mjs','/release.mjs','/locale-registry.mjs','/locales/zh.mjs','/locales/en.mjs','/locales/es.mjs','/locales/fr.mjs','/locales/ru.mjs','/locales/ar.mjs','/locales/hi.mjs','/locales/ur.mjs','/','/index.html','/style.css','/app.mjs','/i18n.mjs','/domain.mjs','/episode-assessment.mjs','/offline.mjs','/workspace-i18n.mjs','/care-ui.mjs','/diary-ui.mjs','/entry-templates.mjs','/report-options.mjs','/voice-ui.mjs','/voice-parser.mjs','/icon.svg','/manifest.webmanifest','/vendor/qrcodegen.js'];
const NETWORK_TIMEOUT_MS=4000;
// A failed install preserves the previous working shell. Updates wait for old
// tabs to close, avoiding mixed module versions. IndexedDB is never touched.
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('headache-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
function unavailable(){return new Response('Offline resource unavailable',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});}
async function boundedFetch(request){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),NETWORK_TIMEOUT_MS);
  try{
    const original=await fetch(request,{signal:controller.signal});
    // Include the response body in the limit: a server can send headers quickly
    // and then stall the script stream. Shell assets are small local files.
    const bytes=await original.arrayBuffer();
    const response=new Response([204,205,304].includes(original.status)?null:bytes,{status:original.status,statusText:original.statusText,headers:original.headers});
    return {response,redirected:original.redirected};
  }finally{clearTimeout(timer);}
}
async function shellResponse(request){
  const url=new URL(request.url),navigation=request.mode==='navigate';
  const shellKey=navigation?'/index.html':url.pathname,allowed=ASSETS.includes(shellKey);
  if(allowed){const cached=await caches.match(shellKey,{cacheName:CACHE});if(cached)return cached;}
  try{
    const {response,redirected}=await boundedFetch(request);
    if(response.ok&&allowed&&ASSETS.includes(url.pathname)&&!redirected){
      // Storage pressure must not turn a successful online response into an
      // error. An incomplete cache is reported by the browser's offline path.
      try{const cache=await caches.open(CACHE);await cache.put(url.pathname,response.clone());}catch{}
    }
    return response;
  }catch{return navigation?await caches.match('/index.html',{cacheName:CACHE})||unavailable():unavailable();}
}
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(e.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname==='/clinician.html'||url.pathname==='/clinician.mjs')return;
  e.respondWith(shellResponse(e.request));
});
