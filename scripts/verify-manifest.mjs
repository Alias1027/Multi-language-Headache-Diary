import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,lstatSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
export function verifyManifest(root){
 root=path.resolve(root);const expected=new Map();
 for(const line of readFileSync(path.join(root,'SHA256SUMS.txt'),'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/)){
  const m=/^([a-f0-9]{64})  (.+)$/.exec(line);if(!m)throw Error('Malformed manifest');
  const name=m[2];if(name.includes('\\')||name.split('/').includes('..')||path.isAbsolute(name)||/^[A-Za-z]:/.test(name)||expected.has(name))throw Error('Unsafe/duplicate manifest path');
  expected.set(name,m[1]);
 }
 const actual=[];const walk=dir=>{for(const name of readdirSync(dir)){
  const file=path.join(dir,name),rel=path.relative(root,file).split(path.sep).join('/'),st=lstatSync(file);
  if(st.isSymbolicLink())throw Error('Symlink forbidden: '+rel);
  if(st.isDirectory())walk(file);else if(rel!=='SHA256SUMS.txt')actual.push(rel);
 }};walk(root);
 for(const name of actual){if(!expected.has(name))throw Error('Extra file: '+name);const hash=createHash('sha256').update(readFileSync(path.join(root,name))).digest('hex');if(hash!==expected.get(name))throw Error('Hash mismatch: '+name);expected.delete(name);}
 if(expected.size)throw Error('Missing file: '+expected.keys().next().value);
 return {verified:actual.length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{if(!process.argv[2])throw Error('Manifest directory required');console.log(JSON.stringify(verifyManifest(process.argv[2])));}catch(e){console.error(e.message);process.exitCode=1;}}
