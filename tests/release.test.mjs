import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,cpSync,readFileSync,writeFileSync,mkdirSync,existsSync,symlinkSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {auditSource,sourceFiles} from '../scripts/release-check.mjs';
import {prepareRelease} from '../scripts/prepare-release.mjs';
import {verifyManifest} from '../scripts/verify-manifest.mjs';
import {createApp} from '../server/main.mjs';
import {APP_VERSION} from '../public/release.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
function temp(t){const dir=mkdtempSync(path.join(os.tmpdir(),'headache-release-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));return dir;}
function clone(t){const base=temp(t),source=path.join(base,'source');mkdirSync(source);for(const f of sourceFiles(root)){const out=path.join(source,f);mkdirSync(path.dirname(out),{recursive:true});cpSync(path.join(root,f),out);}return {base,source};}

test('Release package retains dotfiles and exact source hashes; never packages the parent data directory',t=>{
 const {base,source}=clone(t);mkdirSync(path.join(base,'data'));writeFileSync(path.join(base,'data','private.txt'),'synthetic private marker');
 const out=path.join(base,'output');prepareRelease(source,out);
 assert.ok(existsSync(path.join(out,'project','.github','workflows','test.yml')));assert.ok(existsSync(path.join(out,'project','.env.example')));
 assert.equal(existsSync(path.join(out,'data')),false);
 for(const f of sourceFiles(source))assert.deepEqual(readFileSync(path.join(source,f)),readFileSync(path.join(out,'project',f)),f);
 assert.equal(auditSource(path.join(out,'project')).version,APP_VERSION);
});
test('Release gate refuses private files and symbolic links before copying',t=>{
 const {base,source}=clone(t),out=path.join(base,'out');
 for(const name of ['.env','local-keys.json','data/diary.sqlite','docs/audio.wav','docs/private.docx']){
  const f=path.join(source,name);mkdirSync(path.dirname(f),{recursive:true});writeFileSync(f,'synthetic');
  assert.throws(()=>prepareRelease(source,out),/forbidden|Unexpected/i);assert.equal(existsSync(out),false);rmSync(f);if(name.startsWith('data/'))rmSync(path.join(source,'data'),{recursive:true});
 }
 const outside=path.join(base,'outside');mkdirSync(outside);symlinkSync(outside,path.join(source,'docs','linked'),'junction');
 assert.throws(()=>prepareRelease(source,out),/Symlink/);assert.equal(existsSync(out),false);
});
test('Release gate protects existing output, nested output and junction-routed output',t=>{
 const {base,source}=clone(t);assert.throws(()=>prepareRelease(source,path.join(source,'out')),/outside/);
 const out=path.join(base,'out');mkdirSync(out);writeFileSync(path.join(out,'keep.txt'),'keep');assert.throws(()=>prepareRelease(source,out),/empty/);assert.equal(readFileSync(path.join(out,'keep.txt'),'utf8'),'keep');
 const link=path.join(base,'linked');symlinkSync(source,link,'junction');assert.throws(()=>prepareRelease(source,path.join(link,'nested')),/outside/);
});
test('Release gate rejects stale docs, broken links, credential markers and non-project private discussions',t=>{
 const {source}=clone(t);const file=path.join(source,'README.md'),original=readFileSync(file,'utf8');
 for(const [suffix,pattern] of [['\n[missing](docs/not-there.md)',/Broken/],['\n'+['sk','proj'].join('-')+'-'+'x'.repeat(30),/credential/],['\n'+['NR','MP'].join('')+' private planning',/private discussion/]]){writeFileSync(file,original+suffix);assert.throws(()=>auditSource(source),pattern);}
 writeFileSync(file,original.replaceAll(APP_VERSION,'0.0.0'));assert.throws(()=>auditSource(source),/Stale/);
});
test('Source manifest detects altered, extra, missing and unsafe paths',t=>{
 const dir=temp(t),file=path.join(dir,'file.txt');writeFileSync(file,'original');const hash=createHash('sha256').update('original').digest('hex'),manifest=hash+'  file.txt\n';
 writeFileSync(path.join(dir,'SHA256SUMS.txt'),manifest);assert.equal(verifyManifest(dir).verified,1);
 writeFileSync(file,'changed');assert.throws(()=>verifyManifest(dir),/Hash/);writeFileSync(file,'original');
 writeFileSync(path.join(dir,'extra.txt'),'extra');assert.throws(()=>verifyManifest(dir),/Extra/);rmSync(path.join(dir,'extra.txt'));
 rmSync(file);assert.throws(()=>verifyManifest(dir),/Missing/);writeFileSync(path.join(dir,'SHA256SUMS.txt'),hash+'  ../outside.txt\n');assert.throws(()=>verifyManifest(dir),/Unsafe/);
});
test('All offline shell resources are served with usable types; health matches the shipped version',async t=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'headache-release-http-')),app=createApp({directory:dir,port:0,schedule:false}),port=await app.listen();
 t.after(async()=>{await app.close();rmSync(dir,{recursive:true,force:true});});
 const origin='http://127.0.0.1:'+port,sw=readFileSync(path.join(root,'public','sw.js'),'utf8');
 const assets=[...new Set([...sw.matchAll(/'([^']+)'/g)].map(x=>x[1]).filter(x=>x.startsWith('/')&&x!=='/api/'))];
 for(const asset of assets){const response=await fetch(origin+asset);assert.equal(response.status,200,asset);if(asset.endsWith('.mjs')||asset.endsWith('.js'))assert.match(response.headers.get('Content-Type'),/javascript/,asset);assert.ok((await response.arrayBuffer()).byteLength,asset);}
 const health=await fetch(origin+'/api/health');assert.equal((await health.json()).version,APP_VERSION);
 for(const url of ['/data/local-keys.json','/docs/PROJECT_REPORT.md','/.env'])assert.equal((await fetch(origin+url)).status,404);
});

function workerHarness({network=async()=>{throw Error('offline');},cached=new Map()}={}){
 const handlers={},puts=[],deleted=[];
 const self={location:{origin:'http://127.0.0.1:9999'},addEventListener:(name,fn)=>handlers[name]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{}}};
 const caches={open:async()=>({addAll:async()=>{},put:async(request)=>puts.push(request.url)}),match:async key=>cached.get(typeof key==='string'?key:key.url),keys:async()=>['headache-shell-0.0.0','unrelated-cache','headache-shell-'+APP_VERSION],delete:async key=>deleted.push(key)};
 vm.runInNewContext(readFileSync(path.join(root,'public','sw.js'),'utf8'),{self,caches,fetch:network,URL,Response});return {handlers,puts,deleted};
}
test('Offline worker never intercepts APIs, external origins or writes',()=>{
 const {handlers}=workerHarness();for(const [url,method] of [['http://127.0.0.1:9999/api/state','GET'],['https://external.invalid/file','GET'],['http://127.0.0.1:9999/','POST']]){
  let intercepted=false;handlers.fetch({request:{url,method},respondWith:()=>intercepted=true});assert.equal(intercepted,false);
 }
});
test('Offline worker serves navigation fallback but never substitutes HTML for a missing script',async()=>{
 const cached=new Map([['/index.html',new Response('<html>synthetic shell</html>',{headers:{'Content-Type':'text/html'}})]]),{handlers}=workerHarness({cached});
 let response;handlers.fetch({request:{url:'http://127.0.0.1:9999/route',method:'GET',mode:'navigate'},respondWith:p=>response=p});assert.match(await (await response).text(),/synthetic shell/);
 handlers.fetch({request:{url:'http://127.0.0.1:9999/missing.mjs',method:'GET',mode:'cors'},respondWith:p=>response=p});const missing=await response;assert.equal(missing.status,503);assert.doesNotMatch(missing.headers.get('Content-Type'),/text\/html/);
});
test('Offline worker removes only obsolete app caches',async()=>{
 const {handlers,deleted}=workerHarness();let done;handlers.activate({waitUntil:p=>done=p});await done;assert.deepEqual(deleted,['headache-shell-0.0.0']);
});

test('Current release licensing agrees across package, readmes and notices without overwriting vendor rights',()=>{
 const pkg=JSON.parse(readFileSync(path.join(root,'package.json'),'utf8'));
 assert.equal(pkg.license,'SEE LICENSE IN LICENSE');assert.match(pkg.author,/Junhui Liu M\.D\./);
 const license=readFileSync(path.join(root,'LICENSE'),'utf8');assert.match(license,/institutional use/i);assert.match(license,/Prior, explicit written authorization/);assert.match(license,/junhuiliu1025@gmail\.com/);assert.match(license,/not\s+retroactively revoke/);
 for(const file of ['README.md','README.zh-CN.md']){const text=readFileSync(path.join(root,file),'utf8');assert.doesNotMatch(text,/\[MIT(?: 许可证)?\]\(LICENSE\)/);assert.match(text,/Junhui Liu M\.D\./);}
 assert.match(readFileSync(path.join(root,'public/vendor/qrcodegen.js'),'utf8'),/MIT License/);
});
