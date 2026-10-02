export const PUBLIC_PROJECTION_KEYS=Object.freeze({
  inflation:'detail:inflation:v1',
  recession:'detail:recession:v1',
  liquidityCrisis:'detail:liquidity-crisis:v1',
  creditRisk:'detail:credit-risk:v1',
  earningsRecession:'detail:earnings-recession:v1',
  assetBubble:'detail:asset-bubble:v1',
  debtRisk:'detail:debt-risk:v1',
  supplyShock:'detail:supply-shock:v1',
  koreaFearGreed:'public:korea-fear-greed:v1',
});

const KEY_SET=new Set(Object.values(PUBLIC_PROJECTION_KEYS));
const validKey=key=>typeof key==='string'&&KEY_SET.has(key);

export function publicProjectionStore(db){
  if(!db?.prepare)throw Error('STORAGE_UNAVAILABLE');
  return Object.freeze({
    async read(key){
      if(!validKey(key))throw Error('INVALID_PROJECTION_KEY');
      const row=await db.prepare(
        'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?'
      ).bind(key).first();
      return row?{body:JSON.parse(row.body),storedAt:Number(row.stored_at)}:null;
    },
    async write(key,body,storedAt=Date.now()){
      if(!validKey(key))throw Error('INVALID_PROJECTION_KEY');
      const encoded=JSON.stringify(body);
      await db.prepare(
        'INSERT INTO market_public_snapshots_v1(snapshot_key,body,stored_at) VALUES(?,?,?) ON CONFLICT(snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at'
      ).bind(key,encoded,storedAt).run();
      return {key,storedAt,bytes:new TextEncoder().encode(encoded).length};
    },
  });
}

export async function storedProjectionResponse(request,{store,key,maxAgeMs=36*3600000,now=Date.now()}={}){
  const headers={'cache-control':'no-store','x-robots-tag':'noindex','x-content-type-options':'nosniff','x-public-projection':'STORED'};
  if(request.method!=='GET')return Response.json({status:'FAILED',reason:'METHOD_NOT_ALLOWED'},{status:405,headers});
  let row;try{row=await store.read(key)}catch{}
  if(!row||!Number.isFinite(row.storedAt)||row.storedAt>now||now-row.storedAt>=maxAgeMs){
    return Response.json({status:'unavailable',reason:row?'STORED_PROJECTION_STALE':'STORED_PROJECTION_PENDING'},{status:503,headers});
  }
  headers['cache-control']='public, max-age=60, must-revalidate';
  headers['x-public-projection-at']=new Date(row.storedAt).toISOString();
  return Response.json(row.body,{headers});
}
