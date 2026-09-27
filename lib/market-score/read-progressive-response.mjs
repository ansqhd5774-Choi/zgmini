export async function readProgressiveMarketResponse(response,onSnapshot,onComplete) {
  if(!response.ok)throw new Error('MARKET_SCORE_UNAVAILABLE');
  if(!response.headers.get('content-type')?.includes('application/x-ndjson')){
    const body=await response.json();
    if(body?.status!=='SUCCESS')throw new Error('MARKET_SCORE_UNAVAILABLE');
    onSnapshot(body);onComplete(body,response.headers);return;
  }
  const reader=response.body.getReader(),decoder=new TextDecoder();
  let buffer='',complete=false;
  const line=text=>{
    if(!text.trim())return;
    const event=JSON.parse(text);
    if(event.type==='error')throw new Error('MARKET_SCORE_UNAVAILABLE');
    if(event.type==='snapshot'||event.type==='complete'){
      if(event.body?.status!=='SUCCESS'||event.body.domains?.length!==12)throw new Error('INVALID_MARKET_SNAPSHOT');
      onSnapshot(event.body);
      if(event.type==='complete'){
        complete=true;
        onComplete(event.body,new Headers({'cache-control':event.cacheControl??'no-store',age:event.age??'0'}));
      }
    }
  };
  try{
    while(true){
      const {done,value}=await reader.read();
      buffer+=done?decoder.decode():decoder.decode(value,{stream:true});
      let index;
      while((index=buffer.indexOf('\n'))>=0){line(buffer.slice(0,index));buffer=buffer.slice(index+1)}
      if(buffer.length>2_000_000)throw new Error('MARKET_STREAM_LIMIT');
      if(done)break;
    }
    if(buffer)line(buffer);
    if(!complete)throw new Error('INCOMPLETE_MARKET_STREAM');
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
}
