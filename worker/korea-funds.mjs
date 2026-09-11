import {runFscScoped,SCOPED_PROFILE,SCOPED_VERSION,SCOPED_COPY} from './phase2-fsc-scoped.mjs';
export const PUBLIC_VERSION=`${SCOPED_VERSION}-public-1`;
export const PUBLIC_CACHE_KEY=`${SCOPED_PROFILE}:${PUBLIC_VERSION}`;
export const CACHE_MS=15*60*1000;
const valid=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const iso=d=>`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
const epoch=d=>Date.parse(`${iso(d)}T00:00:00Z`);
export function recentHistory(scores){
 const last=scores.findLast(p=>valid(p.value));if(!last)return [];
 const cutoff=new Date(epoch(last.date));cutoff.setUTCFullYear(cutoff.getUTCFullYear()-1);
 return scores.filter(p=>epoch(p.date)>=cutoff.getTime()&&p.date<=last.date).slice(-366)
   .map(p=>({date:p.date,score:valid(p.value)?p.value:null}));
}
export function publicIndicator(source,scores,now){
 const history=source.quality.complete?recentHistory(scores):[];
 const last=history.findLast(p=>valid(p.score)),previous=last?history.slice(0,history.lastIndexOf(last)).findLast(p=>valid(p.score)):null;
 const stale=last&&(now.getTime()-epoch(last.date)>7*86400000||!source.calculationReady);
 return {id:source.id,name:source.label,status:last?(stale?'STALE':'READY'):source.status==='WARMUP'?'WARMUP':'UNAVAILABLE',
   score:last?.score??null,scoreScale:{min:0,max:100},observationDate:last?.date??null,
   previousObservationDate:previous?.date??null,changePoints:previous?last.score-previous.score:null,
   fetchedAt:source.fetchedAt,sourcePublishedAt:null,history,historyMode:source.historyMode,
   pointInTimeVerified:false,unit:null,
   briefExplanation:source.id==='LEV_BLEND20_60'?'최근 신용융자 변화의 과거 대비 상대 수준':'최근 3관측 평균 반대매매 금액의 과거 대비 상대 수준',
   inputStartDate:source.inputStartDate,requiredRawObservations:source.requiredRawObservations,
   staleReason:stale?'OBSERVATION_DELAY_OR_INVALID_LATEST_INPUT':null};
}
export async function publicSnapshot(env,context={}){
 const histories={},clock=context.clock??(()=>new Date(Date.now()));
 const result=await runFscScoped(env,{...context,onIndicatorScores:(name,scores)=>{histories[name]=scores;}});
 return {profileId:SCOPED_PROFILE,methodologyVersion:PUBLIC_VERSION,snapshotGeneratedAt:clock().toISOString(),
   indicators:['credit','capital'].map(name=>publicIndicator(result.indicators[name],histories[name]??[],clock())),
   sourceAttribution:{label:SCOPED_COPY.source,url:'https://www.data.go.kr/data/15094809/openapi.do'},
   disclaimer:SCOPED_COPY.introduction,historyExplanation:SCOPED_COPY.history,liquidationExplanation:SCOPED_COPY.liquidation};
}
const response=(data,status=200)=>{
 const body=JSON.stringify(data);
 if(new TextEncoder().encode(body).length>65536)return Response.json({error:'RESPONSE_LIMIT'},{status:503});
 return new Response(body,{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
};
export function createKoreaFundsHandler(context={}){
 let cache=null,inFlight=null;
 return async(request,env)=>{
   if(request.method!=='GET')return response({error:'METHOD_NOT_ALLOWED'},405);
   if(new URL(request.url).search)return response({error:'QUERY_NOT_ALLOWED'},400);
   const now=Date.now();
   if(cache?.key===PUBLIC_CACHE_KEY&&now-cache.at<CACHE_MS)return response(cache.data);
   if(!inFlight)inFlight=(async()=>{
     let data;
     try{data=await publicSnapshot(env,context);}
     catch{data={profileId:SCOPED_PROFILE,methodologyVersion:PUBLIC_VERSION,snapshotGeneratedAt:new Date(Date.now()).toISOString(),indicators:[],error:'DATA_UNAVAILABLE'};}
     // Preserve real previous success per indicator, without changing source dates.
     if(cache?.key===PUBLIC_CACHE_KEY){
       for(const old of cache.data.indicators){
         const next=data.indicators.find(i=>i.id===old.id);
         if(valid(old.score)&&(!next||next.score===null)){
           const stale={...old,status:'STALE',staleReason:'REFRESH_FAILED'};
           if(next)data.indicators[data.indicators.indexOf(next)]=stale;else data.indicators.push(stale);
         }
       }
     }
     cache={key:PUBLIC_CACHE_KEY,at:Date.now(),data};return data;
   })().finally(()=>{inFlight=null;});
   return response(await inFlight);
 };
}
export const koreaFunds=createKoreaFundsHandler();
