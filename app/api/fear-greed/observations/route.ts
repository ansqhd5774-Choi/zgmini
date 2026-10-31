import {env} from 'cloudflare:workers';
import {CNN_OBSERVED_ARCHIVE_KEY,CNN_OBSERVED_ARCHIVE_VERSION} from '../../../../lib/cnn-observed-archive-r1.mjs';
import {sampleCnnObservedPoints} from '../../../../lib/cnn-observed-sampling-r1.mjs';

// Public stored-score reader only; never calls CNN or starts collection.
const DAYS={ '1D':2,'1W':9,'1M':33,'3M':96,'6M':188,'1Y':370 } as const;
const MS_DAY=86400000;
const DAY=/^\d{4}-\d{2}-\d{2}$/;
export async function GET(request:Request){
 const url=new URL(request.url);
 const period=url.searchParams.get('period')??'1D';
 const days=DAYS[period as keyof typeof DAYS];
 if(!days)return Response.json({status:'INVALID_PERIOD'},{status:400});
 const from=url.searchParams.get('from'),to=url.searchParams.get('to');
 const custom=from!==null||to!==null;
 if(custom&&(!from||!to||!DAY.test(from)||!DAY.test(to)||!Number.isFinite(Date.parse(from))||!Number.isFinite(Date.parse(to))||Date.parse(from)>Date.parse(to)||Date.parse(to)-Date.parse(from)>7*MS_DAY))
  return Response.json({status:'INVALID_DATE_RANGE'},{status:400});
 const now=Date.now();
 const start=custom?from!:new Date(now-(days-1)*MS_DAY).toISOString().slice(0,10);
 const end=custom?to!:new Date(now).toISOString().slice(0,10);
 const rows=await env.DB.prepare("SELECT snapshot_key,body FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key BETWEEN ? AND ? ORDER BY snapshot_key ASC LIMIT 371")
   .bind(CNN_OBSERVED_ARCHIVE_KEY,start,end).all<{snapshot_key:string,body:string}>();
 const byTime=new Map<string,{observedAt:string,score:number}>();
 let validDays=0;
 for(const row of rows.results??[]){
  let entry:any;
  try{entry=JSON.parse(row.body)}catch{return Response.json({status:'STORED_ARCHIVE_INVALID'},{status:503});}
  if(entry?.version!==CNN_OBSERVED_ARCHIVE_VERSION||entry.date!==row.snapshot_key||!Array.isArray(entry.observations))
   return Response.json({status:'STORED_ARCHIVE_INVALID'},{status:503});
  validDays++;
  for(const point of entry.observations){
   const ms=Date.parse(point?.observedAt??'');
   if(!Number.isFinite(ms)||ms>now+300000||!Number.isFinite(point?.score)||point.score<0||point.score>100||new Date(ms).toISOString().slice(0,10)!==row.snapshot_key)
    return Response.json({status:'STORED_ARCHIVE_INVALID'},{status:503});
   const key=new Date(ms).toISOString();
   byTime.set(key,{observedAt:key,score:point.score});
  }
 }
 const all=[...byTime.values()].sort((a,b)=>a.observedAt.localeCompare(b.observedAt));
 const points=custom||period==='1D'||period==='1W'?all:sampleCnnObservedPoints(all);
 return Response.json({status:all.length?'READY':'PENDING',version:CNN_OBSERVED_ARCHIVE_VERSION,period,range:{start,end},availableDays:validDays,totalObservedPoints:all.length,sampled:points.length<all.length,points},{
  headers:{'cache-control':'public, max-age=60, must-revalidate','x-data-source':'STORED','x-content-type-options':'nosniff'}
 });
}
