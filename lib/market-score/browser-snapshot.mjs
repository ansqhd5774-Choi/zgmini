// Store only the anonymous public result and never extend the server deadline.
const KEY='zgmini-market-score-v1';
export function readMarketSnapshot(storage,now=Date.now()){
 try{
  const entry=JSON.parse(storage.getItem(KEY)??'null');
  if(!entry||entry.expiresAt<=now||entry.expiresAt-now>300000||entry.body?.status!=='SUCCESS'||entry.body.domains?.length!==12)return null;
  return entry;
 }catch{return null;}
}
export function saveMarketSnapshot(storage,body,headers,now=Date.now()){
 const ttl=Number(/(?:^|,)\s*max-age=(\d+)/.exec(headers.get('cache-control')??'')?.[1]);
 const age=Math.max(0,Number(headers.get('age')??0));
 const generated=Date.parse(body?.updatedAt??'');
 const remaining=Math.min(300,ttl-age);
 // updatedAt starts collection, so it is a conservative additional upper bound.
 const expiresAt=Math.min(now+remaining*1000,generated+300000);
 if(body?.status!=='SUCCESS'||body.domains?.length!==12||!Number.isFinite(expiresAt)||expiresAt<=now)return;
 try{storage.setItem(KEY,JSON.stringify({body,expiresAt}));}catch{/* Storage is optional. */}
}
