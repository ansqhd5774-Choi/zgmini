import {PUBLIC_DISPLAY_MAX_AGE_MS} from './public-display-freshness.mjs';

export const RATE_SENTIMENT_PUBLIC_KEY='public:rate-sentiment:v1';
function weekdayGap(date,now){
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;
 const start=Date.parse(date+'T00:00:00Z');
 if(!Number.isFinite(start))return null;
 const last=new Date(now).toISOString().slice(0,10);
 if(date>last)return null;
 const d=new Date(start);let count=0;
 while(d.toISOString().slice(0,10)<last){
  d.setUTCDate(d.getUTCDate()+1);
  if(d.getUTCDay()!==0&&d.getUTCDay()!==6)count++;
  if(count>10)return count;
 }
 return count;
}
export async function storedRateSentimentResponse(request,{db,now=Date.now()}={}){
 const headers={'cache-control':'no-store','x-robots-tag':'noindex','x-content-type-options':'nosniff','x-rate-sentiment-source':'STORED'};
 if(request.method!=='GET')return Response.json({status:'FAILED',reason:'METHOD_NOT_ALLOWED'},{status:405,headers});
 if(!db?.prepare)return Response.json({status:'unavailable',reason:'STORED_DATABASE_UNBOUND'},{status:503,headers});
 let row;
 try{row=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?').bind(RATE_SENTIMENT_PUBLIC_KEY).first();}
 catch{return Response.json({status:'unavailable',reason:'STORED_SCORE_READ_FAILED'},{status:503,headers});}
 const at=Number(row?.stored_at);
 if(!row||!Number.isSafeInteger(at)||at>now||now-at>=PUBLIC_DISPLAY_MAX_AGE_MS){
  return Response.json({status:'unavailable',reason:row?'STORED_SCORE_STALE':'STORED_SCORE_PENDING'},{status:503,headers});
 }
 let body;
 try{body=JSON.parse(row.body);}catch{return Response.json({status:'unavailable',reason:'STORED_SCORE_INVALID'},{status:503,headers});}
 const lag=weekdayGap(body?.observationDate,now);
 if(body?.status!=='READY'||body?.version!=='RATE_SENTIMENT_R1_RESEARCH'||!Number.isFinite(body.score)||body.score<0||body.score>100||!Array.isArray(body.week)||body.week.length!==5||body.week.at(-1)?.label!==body.observationDate||lag===null||lag>2){
  return Response.json({status:'unavailable',reason:lag>2?'STORED_OBSERVATION_STALE':'STORED_SCORE_INVALID'},{status:503,headers});
 }
 return Response.json(body,{headers:{...headers,'cache-control':'public, max-age=60, must-revalidate','x-rate-sentiment-observation-at':body.observationDate}});
}
