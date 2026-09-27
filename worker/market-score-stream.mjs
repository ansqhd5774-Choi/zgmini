// Only the existing public score payload crosses this boundary, never collector inputs.
export function streamMarketScore(handler,request,{waitUntil}={}) {
  let closed=false,previous='',heartbeat;
  const encoder=new TextEncoder();
  const body=new ReadableStream({
    start(controller){
      const send=event=>{
        if(closed)return;
        const line=JSON.stringify(event);
        if(event.type==='snapshot'&&line===previous)return;
        previous=line;
        controller.enqueue(encoder.encode(line+'\n'));
      };
      send({type:'start'});
      heartbeat=setInterval(()=>send({type:'heartbeat'}),5000);
      const completion=Promise.resolve().then(()=>handler(request,body=>send({type:'snapshot',body})))
        .then(async response=>{
          const body=await response.json();
          if(!response.ok||body.status!=='SUCCESS')send({type:'error',reason:'MARKET_SCORE_UNAVAILABLE'});
          else send({type:'complete',body,cacheControl:response.headers.get('cache-control'),age:response.headers.get('age')});
        })
        .catch(()=>send({type:'error',reason:'MARKET_SCORE_UNAVAILABLE'}))
        .finally(()=>{clearInterval(heartbeat);if(!closed){closed=true;controller.close()}});
      // The request has returned headers, but provider and cache work is still live.
      if(typeof waitUntil==='function')waitUntil(completion);
    },
    cancel(){closed=true;clearInterval(heartbeat)},
  });
  return new Response(body,{headers:{
    'content-type':'application/x-ndjson; charset=utf-8',
    'cache-control':'no-store',
    'vary':'Accept',
    'x-content-type-options':'nosniff',
  }});
}
