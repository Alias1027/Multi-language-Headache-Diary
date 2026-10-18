import {mkdirSync,existsSync,readdirSync,copyFileSync,realpathSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {auditSource,sourceFiles} from './release-check.mjs';
export function prepareRelease(source,destination){
 source=realpathSync(source);destination=path.resolve(destination);
 // Resolve an existing ancestor so a junction cannot route the output into source.
 let ancestor=destination;while(!existsSync(ancestor))ancestor=path.dirname(ancestor);
 destination=path.join(realpathSync(ancestor),path.relative(ancestor,destination));
 const rel=path.relative(source,destination);
 if(!rel||(!path.isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..'+path.sep)))throw Error('Destination must be outside source');
 if(existsSync(destination)&&readdirSync(destination).length)throw Error('Destination must be empty');
 const result=auditSource(source); // Validate every input before creating/copying anything.
 const out=path.join(destination,'project');mkdirSync(out,{recursive:true});
 for(const file of sourceFiles(source)){const target=path.join(out,file);mkdirSync(path.dirname(target),{recursive:true});copyFileSync(path.join(source,file),target);}
 auditSource(out);return {...result,destination};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{if(!process.argv[2])throw Error('Usage: node scripts/prepare-release.mjs DESTINATION');console.log(JSON.stringify(prepareRelease(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),process.argv[2]),null,2));}
 catch(e){console.error(e.message);process.exitCode=1;}
}
