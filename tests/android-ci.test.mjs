import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const pwshProbe=spawnSync('pwsh',['-NoProfile','-Command','$PSVersionTable.PSVersion.Major'],{encoding:'utf8',timeout:10000});
const guardOptions={skip:!process.env.CI&&(pwshProbe.error?.code==='ENOENT')?'Optional PowerShell 7 CI guard checks; GitHub CI requires pwsh.':false};
function temporary(t){const dir=mkdtempSync(path.join(os.tmpdir(),'headache-ci-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));return dir;}
function run(script,args,env={}){const result=spawnSync('pwsh',['-NoProfile','-File',path.join(root,'scripts',script),...args],{encoding:'utf8',env:{...process.env,HD_ANDROID_KEYSTORE:'',HD_ANDROID_STORE_PASSWORD:'',...env},timeout:30000});assert.ifError(result.error);return {status:result.status,text:result.stdout+result.stderr};}
test('Android CI installer rejects a changed archive before extraction or execution',guardOptions,t=>{
 const dir=temporary(t),archive=path.join(dir,'untrusted.zip'),output=path.join(dir,'tools');writeFileSync(archive,'not the verified Gradle archive');
 const result=run('install-android-ci-gradle.ps1',['-OutputDirectory',output,'-ArchivePath',archive]);
 assert.notEqual(result.status,0);assert.match(result.text,/SHA-256 mismatch/);assert.equal(existsSync(path.join(output,'gradle-8.13')),false);
});
test('Android CI build refuses private release signing credentials before tool execution',guardOptions,t=>{
 const dir=temporary(t),output=path.join(dir,'output');
 const result=run('build-android-ci.ps1',['-GradlePath',path.join(dir,'missing'),'-SdkDirectory',dir,'-OutputDirectory',output],{HD_ANDROID_STORE_PASSWORD:'synthetic-test-only'});
 assert.notEqual(result.status,0);assert.match(result.text,/must not receive release signing credentials/);assert.equal(existsSync(output),false);assert.doesNotMatch(result.text,/synthetic-test-only/);
});
test('Android CI keeps generated tools and builds outside the distributable source',guardOptions,t=>{
 const dir=temporary(t),inside=path.join(root,'android','ci-output-must-not-exist');
 for(const [script,args] of [['install-android-ci-gradle.ps1',['-ArchivePath',path.join(dir,'absent.zip')]],['build-android-ci.ps1',['-GradlePath',path.join(dir,'missing'),'-SdkDirectory',dir]]]){
  const result=run(script,['-OutputDirectory',inside,...args]);assert.notEqual(result.status,0);assert.match(result.text,/outside the source/);assert.equal(existsSync(inside),false);
 }
});
