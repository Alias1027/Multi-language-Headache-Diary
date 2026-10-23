import {readFileSync,readdirSync,lstatSync,existsSync,realpathSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const rootFiles=new Set(['package.json','README.md','README.zh-CN.md','LICENSE','NOTICE.md','SECURITY.md','CONTRIBUTING.md','CHANGELOG.md','.env.example','.gitignore']);
const trees=new Set(['public','server','tests','scripts','docs','fixtures','examples','miniapps','android','.github']);
const extensions=new Set(['.mjs','.js','.ps1','.py','.json','.md','.txt','.csv','.html','.css','.svg','.png','.jpg','.webmanifest','.yml','.yaml','.wxml','.wxss','.axml','.acss','.ttml','.ttss','.gradle','.properties','.java','.xml']);
const privateName=/(^|\/)(data|runtime|node_modules|models|\.venv|__pycache__|coverage|test-results)(\/|$)|(^|\/)(\.env(?:\..+)?|local-keys\.json)$|\.(?:sqlite(?:-wal|-shm)?|db|log|pid|zip|docx|exe|wav|mp3|webm|pem|key)$/i;
export function sourceFiles(root){
 const files=[];root=realpathSync(root);
 const walk=(dir)=>{for(const name of readdirSync(dir).sort()){
  const file=path.join(dir,name),relative=path.relative(root,file).split(path.sep).join('/');
  if(relative==='.git')continue;
  if(/(^|\/)(build|\.gradle)(\/|$)|\.(?:jks|keystore|apk|aab|class)$|(^|\/)local\.properties$/i.test(relative))throw Error('Android build/private file forbidden: '+relative);
  const st=lstatSync(file);if(st.isSymbolicLink())throw Error('Symlink forbidden: '+relative);
  if(privateName.test(relative)&&relative!=='.env.example')throw Error('Private/runtime file forbidden: '+relative);
  const top=relative.split('/')[0];if(!trees.has(top)&&!rootFiles.has(relative))throw Error('Unexpected source path: '+relative);
  if(st.isDirectory()){walk(file);continue;}
  if(!st.isFile())throw Error('Nonregular source path: '+relative);
  if(!rootFiles.has(relative)&&!extensions.has(path.extname(relative)))throw Error('Unexpected source type: '+relative);
  files.push(relative);
 }};walk(root);return files;
}
export function auditSource(root){
 root=realpathSync(root);const files=sourceFiles(root),errors=[];
 const read=f=>readFileSync(path.join(root,f),'utf8');
 const pkg=JSON.parse(read('package.json')),version=pkg.version;
 if(!/^\d+\.\d+\.\d+$/.test(version))errors.push('Invalid application version');
 for(const file of ['README.md','README.zh-CN.md','NOTICE.md','CONTRIBUTING.md','SECURITY.md','docs/PROJECT_REPORT.md','docs/IMPLEMENTATION_STATUS.md','docs/USER_GUIDE.zh.md','docs/LOCALIZATION.md','docs/VOICE_INTEGRATION.md','docs/MODEL_INTEGRATION.md','docs/ARCHITECTURE.md','docs/DATA_DICTIONARY.md','docs/RESEARCH_PLAN.md','docs/VALIDATION.md','docs/RELEASE_CHECKLIST.md']){
  if(!existsSync(path.join(root,file))){errors.push('Missing document: '+file);continue;}
  if(!read(file).split('\n').slice(0,8).join('\n').includes(version))errors.push('Stale document version: '+file);
 }
 for(const file of files){
  if(!/\.(?:mjs|js|json|md|txt|csv|html|py|ps1|yml|yaml|gradle|properties|java|xml)$/.test(file)&&file!=='.env.example')continue;
  const s=read(file);
  if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:sk-proj-|sk-ant-)[A-Za-z0-9_-]{20,}|\bAKIA[A-Z0-9]{16}\b/.test(s))errors.push('Possible credential: '+file);
  if(/\.(?:md|txt|csv|html)$/.test(file)&&/\b(?:NRMP|ERAS|MyERAS)\b|申请CV|申请规划|Match排名|住院医申请|遴选委员会/i.test(s))errors.push('Non-project private discussion: '+file);
  if(file.endsWith('.md'))for(const m of s.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)){
   const link=m[1];if(/^(?:https?:|mailto:|#)/i.test(link))continue;
   let local;try{local=decodeURIComponent(link.split('#')[0]);}catch{errors.push('Malformed link: '+file);continue;}
   const target=path.resolve(path.dirname(path.join(root,file)),local),rel=path.relative(root,target);
   if(path.isAbsolute(rel)||rel==='..'||rel.startsWith('..'+path.sep)||!existsSync(target))errors.push('Broken/nonportable link: '+file+' -> '+link);
  }
 }
 for(const file of ['docs/RELEASE_CHECKLIST.md','docs/RELEASE_PARTICIPATION.md']){
  if(!read(file).includes('<!-- release-target: '+version+' -->'))errors.push('Stale release target: '+file);
 }
 for(const file of ['docs/USER_GUIDE.en.md','docs/WINDOWS_PORTABLE.md']){
  if(!read(file).split('\n').slice(0,8).join('\n').includes(version))errors.push('Stale document version: '+file);
 }
 const sw=read('public/sw.js'),release=read('public/release.mjs');
 if(!release.includes("APP_VERSION='"+version+"'"))errors.push('Release module version mismatch');
 if(!sw.includes("headache-shell-"+version))errors.push('Offline cache version mismatch');
 const assets=[...sw.matchAll(/'([^']+)'/g)].map(x=>x[1]).filter(x=>x.startsWith('/')&&x!=='/api/');
 for(const asset of assets)if(!existsSync(path.join(root,'public',asset==='/'?'index.html':asset.slice(1))))errors.push('Missing offline asset: '+asset);
 for(const file of files.filter(x=>/^public\/(?:locales\/)?[^/]+\.mjs$/.test(x)))if(file!=='public/clinician.mjs'&&!assets.includes('/'+file.slice(7)))errors.push('Uncached public module: '+file);
 if(errors.length)throw Error(errors.join('\n'));
 return {version,files:files.length,offlineAssets:new Set(assets).size,license:pkg.license};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{console.log(JSON.stringify(auditSource(process.argv[2]||path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')),null,2));}
 catch(e){console.error(e.message);process.exitCode=1;}
}

