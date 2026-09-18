import {buildComposite,COMPOSITE_VERSION} from './korea-composite.mjs';
import {buildCompositeV2,V2_COMPOSITE_VERSION} from './korea-composite-v2.mjs';
import {runFscScoped,SCOPED_PROFILE,SCOPED_VERSION,SCOPED_COPY} from './phase2-fsc-scoped.mjs';
export const PUBLIC_VERSION=`${SCOPED_VERSION}-public-1`;
export const PUBLIC_CACHE_KEY=`${SCOPED_PROFILE}:${PUBLIC_VERSION}:${COMPOSITE_VERSION}:${V2_COMPOSITE_VERSION}`;
export const CACHE_MS=15*60*1000;
export const DEGRADED_CACHE_MS=5*1000;
const valid=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const iso=d=>`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
const epoch=d=>Date.parse(`${iso(d)}T00:00:00Z`);
export function recentHistory(scores){
 const last=scores.findLast(p=>valid(p.value));if(!last)return [];
 const cutoff=new Date(epoch(last.date));cutoff.setUTCFullYear(cutoff.getUTCFullYear()-1);
 return scores.filter(p=>epoch(p.date)>=cutoff.getTime()&&p.date<=last.date).slice(-366)
   .map(p=>({date:p.date,score:valid(p.value)?p.value:null}));
}

function compactLegacy(composite){
 return {methodologyVersion:composite.methodologyVersion,score:composite.score,displayScore:composite.displayScore,stageCode:composite.stageCode,stageLabel:composite.stageLabel,observationDate:composite.observationDate,status:composite.status};
}
function selectActiveComposite(v2,v1){
 if(valid(v2?.score))return {...v2,activeMethodologyVersion:V2_COMPOSITE_VERSION,fallbackApplied:false,fallbackReason:null};
 if(valid(v1?.score))return {...v1,status:'STALE',staleReason:`V2_FALLBACK,${v2?.staleReason??v2?.status??'V2_UNAVAILABLE'}`,activeMethodologyVersion:V2_COMPOSITE_VERSION,fallbackApplied:true,fallbackReason:v2?.staleReason??v2?.status??'V2_UNAVAILABLE',sourceAttribution:`${v1.sourceAttribution} · V2 입력 불가로 V1 대체`};
 return {...v2,activeMethodologyVersion:V2_COMPOSITE_VERSION,fallbackApplied:false,fallbackReason:null};
}

function fullActiveSnapshot(data){
 return Array.isArray(data?.indicators)&&data.indicators.length>=2&&data.indicators.every(item=>valid(item?.score))
  &&data?.composite?.methodologyVersion===V2_COMPOSITE_VERSION
  &&valid(data?.composite?.score)&&data?.composite?.fallbackApplied!==true;
}
function unavailableV2(reason='V2_REFRESH_FAILED'){
 return {methodologyVersion:V2_COMPOSITE_VERSION,status:'UNAVAILABLE',staleReason:reason,score:null,displayScore:null,stageCode:null,stageLabel:null,history:[],components:[],sourceAttribution:'금융위원회 공공데이터포털 · 금융투자협회종합통계정보 · 공시정보조회서비스 · ZGmini 자체 가공'};
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
 const snapshot={profileId:SCOPED_PROFILE,methodologyVersion:PUBLIC_VERSION,snapshotGeneratedAt:clock().toISOString(),
   indicators:['credit','capital'].map(name=>publicIndicator(result.indicators[name],histories[name]??[],clock())),
   sourceAttribution:{label:SCOPED_COPY.source,url:'https://www.data.go.kr/data/15094809/openapi.do'},
   disclaimer:SCOPED_COPY.introduction,historyExplanation:SCOPED_COPY.history,liquidationExplanation:SCOPED_COPY.liquidation};
 const legacyComposite=buildComposite(snapshot.indicators,clock());
 const v2Composite=await buildCompositeV2(env,context,clock());
 return {...snapshot,activeMethodologyVersion:V2_COMPOSITE_VERSION,legacyComposite:compactLegacy(legacyComposite),composite:selectActiveComposite(v2Composite,legacyComposite)};
}
const response=(data,status=200)=>{
 const body=JSON.stringify(data);
 if(new TextEncoder().encode(body).length>131072)return Response.json({error:'RESPONSE_LIMIT'},{status:503});
 return new Response(body,{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
};
export function createKoreaFundsHandler(context={}){
 let cache=null,inFlight=null;
 return async(request,env)=>{
   if(request.method!=='GET')return response({error:'METHOD_NOT_ALLOWED'},405);
   if(new URL(request.url).search)return response({error:'QUERY_NOT_ALLOWED'},400);
   const now=Date.now();
   if(cache?.key===PUBLIC_CACHE_KEY&&now-cache.at<(cache.ttl??CACHE_MS))return response(cache.data);
   if(!inFlight)inFlight=(async()=>{
     let data;
     try{data=await publicSnapshot(env,context);}
     catch{data={profileId:SCOPED_PROFILE,methodologyVersion:PUBLIC_VERSION,activeMethodologyVersion:V2_COMPOSITE_VERSION,snapshotGeneratedAt:new Date(Date.now()).toISOString(),indicators:[],error:'DATA_UNAVAILABLE'};}
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
     // After retaining real previous indicators, rebuild an explicit V1 fallback if V2 is unavailable.
     // This prevents an initial transient failure from poisoning the public composite.
     if(!valid(data?.composite?.score)){
       const legacyComposite=buildComposite(data.indicators,(context.clock??(()=>new Date()))());
       data.legacyComposite=compactLegacy(legacyComposite);
       data.composite=selectActiveComposite(data?.composite??unavailableV2(),legacyComposite);
     }
     const ttl=fullActiveSnapshot(data)?CACHE_MS:DEGRADED_CACHE_MS;
     cache={key:PUBLIC_CACHE_KEY,at:Date.now(),ttl,data};return data;
   })().finally(()=>{inFlight=null;});
   return response(await inFlight);
 };
}
export const koreaFunds=createKoreaFundsHandler();
