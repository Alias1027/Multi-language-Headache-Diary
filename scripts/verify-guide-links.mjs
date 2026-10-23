import {readFileSync,readdirSync,existsSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

// Check the assembled bundle, where all relative guide links must really work.
export function verifyGuideLinks(bundle) {
 const root=path.resolve(bundle),version=JSON.parse(readFileSync(path.join(root,'project/package.json'),'utf8')).version;
 const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
 const files=[path.join(root,'使用说明.html'),...walk(path.join(root,'开始使用')).filter(f=>f.endsWith('.html'))];
 let links=0;
 for(const file of files){
  const html=readFileSync(file,'utf8');
  if(!html.includes(version))throw Error('Stale guide version: '+path.relative(root,file));
  for(const [,href] of html.matchAll(/(?:href|src)=["']([^"']+)["']/g)){
   if(/^(?:https?:|mailto:|#)/i.test(href))continue;
   const relative=decodeURIComponent(href.split(/[?#]/)[0]);
   const target=path.resolve(path.dirname(file),relative),inside=path.relative(root,target);
   if(path.isAbsolute(inside)||inside==='..'||inside.startsWith('..'+path.sep)||!existsSync(target))throw Error('Broken/nonportable guide link: '+path.relative(root,file)+' -> '+href);
   links++;
  }
 }
 return {version,guides:files.length,links};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{console.log(JSON.stringify(verifyGuideLinks(process.argv[2]),null,2));}catch(error){console.error(error.message);process.exitCode=1;}}
