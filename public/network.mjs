// No automatic write retry here: the diary's durable queue supplies stable
// operation IDs and decides when a failed or ambiguous request can be retried.
export async function requestJSON(url,options={},timeoutMs=12000){
  const controller=new AbortController();
  const externalSignal=options.signal;
  const abort=()=>controller.abort();
  if(externalSignal?.aborted)abort();
  else externalSignal?.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(abort,timeoutMs);
  try{
    let response;
    try{response=await fetch(url,{...options,signal:controller.signal});}
    catch(cause){throw Object.assign(new Error(controller.signal.aborted?'network_timeout':'network_unavailable',{cause}),{network:true});}
    let result;
    try{result=await response.json();}
    catch(cause){
      if(!response.ok)throw Object.assign(new Error('http_error',{cause}),{status:response.status});
      throw Object.assign(new Error('network_response_incomplete',{cause}),{network:true});
    }
    if(!response.ok)throw Object.assign(new Error(result?.error||'http_error'),{status:response.status});
    return result;
  }finally{
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort',abort);
  }
}
