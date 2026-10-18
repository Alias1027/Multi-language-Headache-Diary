import {isIP} from 'node:net';

const LOOPBACK=new Set(['127.0.0.1','::1','::ffff:127.0.0.1']);

// The HTTP listener always remains on loopback. Only an explicitly configured,
// same-machine HTTPS reverse proxy can opt into a public browser origin.
export function deploymentFromEnv(env=process.env){
  const mode=env.HD_DEPLOYMENT_MODE||'local';
  if(!['local','https-proxy'].includes(mode))throw new Error('invalid_deployment_mode');
  if(mode==='local'){
    if(env.HD_PUBLIC_ORIGIN)throw new Error('public_origin_requires_https_proxy');
    return Object.freeze({mode,publicOrigin:null});
  }
  let url;
  try{url=new URL(env.HD_PUBLIC_ORIGIN);}catch{throw new Error('invalid_public_origin');}
  const hostname=url.hostname.replace(/^\[|\]$/g,''),validHost=isIP(hostname)||hostname.length<=253&&hostname.split('.').every(label=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label));
  if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash||url.origin!==env.HD_PUBLIC_ORIGIN||!validHost)throw new Error('invalid_public_origin');
  return Object.freeze({mode,publicOrigin:url.origin});
}

export function requestBoundary(req,port,deployment){
  const host=req.headers.host;
  if(typeof host!=='string')return {error:'invalid_host'};
  if(deployment.mode==='local'){
    const origins=[`http://127.0.0.1:${port}`,`http://localhost:${port}`];
    if(!origins.includes('http://'+host))return {error:'invalid_host'};
    if(req.headers.origin&&!origins.includes(req.headers.origin))return {error:'invalid_origin'};
    return {origin:'http://'+host,clientAddress:req.socket.remoteAddress};
  }
  if(!LOOPBACK.has(req.socket.remoteAddress))return {error:'untrusted_proxy'};
  const origin=deployment.publicOrigin,expectedHost=new URL(origin).host;
  if(host!==expectedHost)return {error:'invalid_host'};
  // Comma-separated forwarding chains and user-provided Forwarded headers are
  // deliberately not interpreted. The example proxy overwrites these headers.
  if(req.headers['x-forwarded-proto']!=='https'||req.headers.forwarded!==undefined)return {error:'invalid_proxy_protocol'};
  if(req.headers['x-forwarded-host']!==undefined&&req.headers['x-forwarded-host']!==expectedHost)return {error:'invalid_proxy_host'};
  const address=req.headers['x-forwarded-for'];
  if(typeof address!=='string'||!isIP(address))return {error:'invalid_proxy_client'};
  if(req.headers.origin!==undefined&&req.headers.origin!==origin)return {error:'invalid_origin'};
  if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.headers.origin!==origin)return {error:'invalid_origin'};
  return {origin,clientAddress:address};
}

export function sessionCookie(token,deployment,maxAge=43200){
  return `hd_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${deployment.mode==='https-proxy'?'; Secure':''}`;
}
