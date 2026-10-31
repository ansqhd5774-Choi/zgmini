import {env} from 'cloudflare:workers';
import {COMPOSITE_OBSERVED_PREFIX,COMPOSITE_OBSERVED_VERSION} from '../../../../lib/composite-observed-history-r1.mjs';
import {sampleCnnObservedPoints} from '../../../../lib/cnn-observed-sampling-r1.mjs';

// Derived published composite scores only. Visitor GET does no calculation,
// provider I/O, or remote write. Dates without samples are not interpolated.
const periods={'1D':2,'1W':9,'1M':33,'3M':96,'6M':188,'1Y':370} as const;
export async function GET(request:Request){
 const params=new URL(request.url).searchParams;
 const period=params.get('period')??'1D';
 if(!Object.prototype.hasOwnProperty.call(periods,period))return Response.json({status:'INVALID_PERIOD'},{status:400});
 const days=periods[period as keyof typeof periods];
 const now=Date.now(),dayMs=86400000;
 const from=new Date(now-(days-1)*dayMs).toISOString().slice(0,10);
 const to=new Date(now).toISOString().slice(0,10);
 const rows=await env.DB.prepare("SELECT snapshot_key,body FROM market_public_snapshots_v1 WHERE snapshot_key BETWEEN ? AND ? ORDER BY snapshot_key ASC LIMIT 371")
  .bind(COMPOSITE_OBSERVED_PREFIX+from,COMPOSITE_OBSERVED_PREFIX+to).all<{snapshot_key:string,body:string}>();
 const all=new Map<string,{observedAt:string,score:number,asOfDate:string|null}>();
 let validDays=0;
 for(const row of rows.results??[]){
  let data:any;
  try{data=JSON.parse(row.body)}catch{return Response.json({status:'INVALID_STORED_SCORE'},{status:503});}
  const day=row.snapshot_key.slice(COMPOSITE_OBSERVED_PREFIX.length);
  if(data?.version!==COMPOSITE_OBSERVED_VERSION||data.date!==day||!Array.isArray(data.points))
   return Response.json({status:'INVALID_STORED_SCORE'},{status:503});
  validDays++;
  for(const point of data.points){
   const t=Date.parse(point?.calculatedAt??'');
   if(!Number.isFinite(t)||t>now+300000||new Date(t).toISOString().slice(0,10)!==day
     ||typeof point?.score!=='number'||!Number.isFinite(point.score)||point.score<0||point.score>100)
    return Response.json({status:'INVALID_STORED_SCORE'},{status:503});
   const observedAt=new Date(t).toISOString();
   all.set(observedAt,{observedAt,score:point.score,asOfDate:typeof point?.asOfDate==='string'?point.asOfDate:null});
  }
 }
 let points=[...all.values()].sort((a,b)=>a.observedAt.localeCompare(b.observedAt));
 if(period==='1D'){
  const last=points.at(-1)?.observedAt.slice(0,10);
  points=last?points.filter(p=>p.observedAt.startsWith(last)):[];
 }
 const total=points.length;
 if(period==='1M'||period==='3M'||period==='6M'||period==='1Y')
  points=sampleCnnObservedPoints(points);
 return Response.json({status:total?'READY':'PENDING',version:COMPOSITE_OBSERVED_VERSION,period,availableDays:validDays,totalObservedPoints:total,sampled:points.length<total,timeMeaning:'PC_CALCULATED_AT',points},{
  headers:{'Cache-Control':'public, max-age=60, must-revalidate','x-data-source':'STORED','x-content-type-options':'nosniff'}
 });
}