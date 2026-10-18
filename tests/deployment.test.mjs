import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {deploymentFromEnv,requestBoundary,sessionCookie} from '../server/deployment.mjs';
import {createApp} from '../server/main.mjs';

const origin='https://diary.example.invalid';
const deployment=deploymentFromEnv({HD_DEPLOYMENT_MODE:'https-proxy',HD_PUBLIC_ORIGIN:origin});
function proxyRequest(extra={}){
  return {method:'GET',headers:{host:'diary.example.invalid','x-forwarded-proto':'https','x-forwarded-host':'diary.example.invalid','x-forwarded-for':'192.0.2.8',...extra},socket:{remoteAddress:'127.0.0.1'}};
}
test('HTTPS deployment is explicit and rejects ambiguous or non-HTTPS origins',()=>{
  assert.equal(deploymentFromEnv({}).mode,'local');
  assert.throws(()=>deploymentFromEnv({HD_PUBLIC_ORIGIN:origin}),/requires_https_proxy/);
  assert.throws(()=>deploymentFromEnv({HD_DEPLOYMENT_MODE:'public'}),/invalid_deployment_mode/);
  for(const value of [undefined,'','http://diary.example.invalid','https://diary.example.invalid/','https://diary.example.invalid/path','https://diary.example.invalid?x=1','https://diary.example.invalid#x','https://user:pass@diary.example.invalid','https://*.example.invalid']){
    assert.throws(()=>deploymentFromEnv({HD_DEPLOYMENT_MODE:'https-proxy',HD_PUBLIC_ORIGIN:value}),/invalid_public_origin/,String(value));
  }
});
test('Proxy trust requires loopback, exact host, HTTPS and a single sanitized client address',()=>{
  assert.deepEqual(requestBoundary(proxyRequest(),8765,deployment),{origin,clientAddress:'192.0.2.8'});
  for(const extra of [{host:'evil.invalid'},{host:'diary.example.invalid:443'},{'x-forwarded-proto':'http'},{'x-forwarded-proto':'https,http'},{'x-forwarded-proto':undefined},{'x-forwarded-host':'evil.invalid'},{'x-forwarded-for':'192.0.2.8, 127.0.0.1'},{'x-forwarded-for':'not-an-ip'},{'x-forwarded-for':undefined},{forwarded:'proto=https'},{origin:'https://evil.invalid'},{origin:'null'}])assert.ok(requestBoundary(proxyRequest(extra),8765,deployment).error,JSON.stringify(extra));
  const external=proxyRequest();external.socket.remoteAddress='192.0.2.9';assert.equal(requestBoundary(external,8765,deployment).error,'untrusted_proxy');
  const post=proxyRequest();post.method='POST';assert.equal(requestBoundary(post,8765,deployment).error,'invalid_origin');
  post.headers.origin=origin;assert.equal(requestBoundary(post,8765,deployment).error,undefined);
});
test('Proxy cookies are Secure for login and deletion; default local behavior remains available',()=>{
  assert.match(sessionCookie('synthetic',deployment),/; Secure$/);
  assert.match(sessionCookie('',deployment,0),/Max-Age=0; Secure$/);
  assert.doesNotMatch(sessionCookie('synthetic',deploymentFromEnv({})),/Secure/);
  const req={method:'GET',headers:{host:'127.0.0.1:8765','x-forwarded-host':'evil.invalid'},socket:{remoteAddress:'127.0.0.1'}};
  assert.equal(requestBoundary(req,8765,deploymentFromEnv({})).origin,'http://127.0.0.1:8765');
});
test('Proxy HTTP integration registers, authenticates, applies CSRF and clears secure session',async t=>{
  const directory=mkdtempSync(path.join(os.tmpdir(),'headache-proxy-'));
  const app=createApp({directory,port:0,schedule:false,deployment}),port=await app.listen();
  t.after(async()=>{await app.close();rmSync(directory,{recursive:true,force:true});});
  assert.equal(app.server.address().address,'127.0.0.1');
  let cookie='',csrf='';
  function call(route,body,extra={}){return new Promise((resolve,reject)=>{
    const headers={...proxyRequest().headers,Origin:origin,Cookie:cookie,'X-CSRF-Token':csrf,'Content-Type':'application/json',...extra};
    const req=http.request({hostname:'127.0.0.1',port,path:route,method:body===undefined?'GET':'POST',headers},res=>{
      const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,data:JSON.parse(Buffer.concat(chunks))}));
    });req.on('error',reject);req.end(body===undefined?undefined:JSON.stringify(body));
  });}
  const health=await call('/api/health');assert.equal(health.status,200);assert.equal(health.data.mode,'https-proxy-experimental');assert.match(health.headers['strict-transport-security'],/max-age/);
  assert.equal((await call('/api/health',undefined,{'X-Forwarded-Proto':'http'})).status,403);
  assert.equal((await fetch('http://127.0.0.1:'+port+'/api/health')).status,403);
  const registered=await call('/api/register',{email:'mobile@example.invalid',password:'synthetic-mobile-password'});assert.equal(registered.status,201);assert.match(registered.headers['set-cookie'][0],/; Secure$/);cookie=registered.headers['set-cookie'][0].split(';')[0];
  const state=await call('/api/state');assert.equal(state.status,200);csrf=state.data.csrf;
  assert.equal((await call('/api/logout',{}, {'X-CSRF-Token':'wrong'})).status,403);
  assert.equal((await call('/api/logout',{}, {Origin:'https://evil.invalid'})).status,403);
  const logout=await call('/api/logout',{});assert.equal(logout.status,200);assert.match(logout.headers['set-cookie'][0],/Max-Age=0; Secure$/);
  assert.equal((await call('/api/state')).status,401);
});
test('Caddy example overwrites forwarding headers and keeps Node on loopback',()=>{
  const example=readFileSync(new URL('../examples/deployment/Caddyfile.example.txt',import.meta.url),'utf8');
  for(const line of ['reverse_proxy 127.0.0.1:{$PORT:8765}','header_up -Forwarded','header_up X-Forwarded-Proto {scheme}','header_up X-Forwarded-Host {hostport}','header_up X-Forwarded-For {remote_host}'])assert.ok(example.includes(line));
  assert.doesNotMatch(example,/trusted_proxies|0\.0\.0\.0/);
});
