import {REV7_VERSION,REV7_INDEX_ID,REV7_FACTORS,REV7_DIRECTIONS} from './korea-rev7-engine.mjs';
import {populateHistoricalSnapshots} from './korea-rev7-public-projection.mjs';

export const PUBLIC_VERSION=`${REV7_VERSION}-public-3`;
export const PUBLIC_CACHE_KEY=`${REV7_VERSION}:${PUBLIC_VERSION}`;
export const CACHE_MS=15*60*1000;
export const DEGRADED_CACHE_MS=5*1000;
export const PUBLIC_HISTORY_LIMIT=270;

const valid=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const round1=x=>finite(x)?Math.round((x+Number.EPSILON)*10)/10:null;
const epoch=d=>/^\d{8}$/.test(d??'')?Date.parse(`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}T00:00:00Z`):NaN;

const FACTOR_META=Object.freeze({
  momentum:{name:'모멘텀',brief:'KOSPI의 125관측 이동평균 대비 위치를 504개 유효 관측으로 정규화한 점수'},
  strength:{name:'시장 강도',brief:'KOSPI 종목의 251관측 신고가·신저가 균형을 504개 유효 관측으로 정규화한 점수'},
  breadth:{name:'시장 폭',brief:'상승·하락 거래량 차이의 EMA19·EMA39 오실레이터 누적값을 정규화한 점수'},
  putCall:{name:'풋/콜',brief:'KOSPI200 옵션 Put/Call 5관측 평균을 공포 방향에서 역변환한 점수'},
  volatility:{name:'변동성',brief:'VKOSPI200의 50관측 이동평균 대비 상대수준을 공포 방향에서 역변환한 점수'},
  safeHaven:{name:'안전자산 선호',brief:'KOSPI와 국채 총수익지수의 20관측 수익률 차이를 정규화한 점수'},
  junkBond:{name:'신용 스프레드',brief:'BBB- 3년과 AA- 3년 금리차를 공포 방향에서 역변환한 점수'},
});

export const STAGE_POLICY='0≤x<25 EXTREME_FEAR; 25≤x<45 FEAR; 45≤x≤55 NEUTRAL; 55<x≤75 GREED; 75<x≤100 EXTREME_GREED';

export function stageForDisplayScore(displayScore){
  if(!valid(displayScore))return {stageCode:null,stageLabel:null};
  if(displayScore<25)return {stageCode:'EXTREME_FEAR',stageLabel:'극단적 공포'};
  if(displayScore<45)return {stageCode:'FEAR',stageLabel:'공포'};
  if(displayScore<=55)return {stageCode:'NEUTRAL',stageLabel:'중립'};
  if(displayScore<=75)return {stageCode:'GREED',stageLabel:'탐욕'};
  return {stageCode:'EXTREME_GREED',stageLabel:'극단적 탐욕'};
}

function parseJson(value,fallback=null){
  if(typeof value!=='string')return fallback;
  try{return JSON.parse(value);}catch{return fallback;}
}
function normalizeSnapshotRow(row){
  const factors=parseJson(row?.factors_json,{});
  const composite=parseJson(row?.composite_json,{});
  const score=valid(composite?.score)?composite.score:null;
  return {
    date:row?.date??null,
    methodologyVersion:row?.methodology_version??null,
    factors,
    score,
    displayScore:round1(score),
    status:composite?.status??(score===null?'WARMUP':'READY'),
    historyMode:row?.history_mode??'RECONSTRUCTED_CURRENT_VINTAGE',
    pointInTimeVerified:Boolean(row?.point_in_time_verified),
    calculatedAt:row?.calculated_at??null,
  };
}
function factorScore(row,id){
  const score=row?.factors?.[id]?.score;
  return valid(score)?score:null;
}

export async function defaultLoadProgress(env){
  const row=await env.DB.prepare(`SELECT successful_trading_date_count AS successfulTradingDates,status
    FROM kfg_rev7_backfill_progress WHERE methodology_version=? LIMIT 1`).bind(REV7_VERSION).first();
  return row??null;
}
export async function defaultLoadRows(env,limit=PUBLIC_HISTORY_LIMIT){
  const result=await env.DB.prepare(`SELECT date,methodology_version,factors_json,composite_json,
      history_mode,point_in_time_verified,calculated_at
    FROM kfg_rev7_snapshots
    WHERE methodology_version=?
    ORDER BY date DESC LIMIT ?`).bind(REV7_VERSION,limit).all();
  return [...(result?.results??[])].reverse();
}

function unavailable(reason){
  return {
    id:REV7_INDEX_ID,name:'ZGmini 한국 공포·탐욕지수',beta:true,
    methodologyVersion:REV7_VERSION,activeMethodologyVersion:REV7_VERSION,
    status:'UNAVAILABLE',staleReason:reason,score:null,displayScore:null,
    stageCode:null,stageLabel:null,scoreScale:{min:0,max:100},
    observationDate:null,previousObservationDate:null,changePoints:null,
    history:[],weights:Object.fromEntries(REV7_FACTORS.map(id=>[id,1/7])),
    components:[],historyMode:'RECONSTRUCTED_CURRENT_VINTAGE',
    pointInTimeVerified:false,researchOnly:true,productionEligible:false,
    sourcePublishedAt:null,
    sourceAttribution:'한국거래소 통계정보 · 한국은행 ECOS · ZGmini 자체 가공',
    stagePolicy:STAGE_POLICY,fallbackApplied:false,fallbackReason:null,
    briefMethodology:'Revision 7은 7개 시장심리 지표를 각각 1/7 동일가중으로 종합합니다.',
  };
}

export async function publicSnapshot(env,context={}){
  const loadProgress=context.loadProgress??defaultLoadProgress;
  const loadRows=context.loadRows??defaultLoadRows;
  const materializeHistory=context.materializeHistory??populateHistoricalSnapshots;
  const autoMaterializeHistory=context.autoMaterializeHistory??!context.loadRows;
  const clock=context.clock??(()=>new Date(Date.now()));
  const progress=await loadProgress(env);
  if(progress?.status!=='COMPLETE'||Number(progress?.successfulTradingDates)<1030){
    return {
      profileId:'ZGMINI_KR_FG_REV7',methodologyVersion:REV7_VERSION,
      activeMethodologyVersion:REV7_VERSION,snapshotGeneratedAt:clock().toISOString(),
      indicators:[],composite:unavailable('REV7_BACKFILL_NOT_COMPLETE'),
      researchOnly:true,productionEligible:false,
    };
  }

  let rawRows=await loadRows(env,PUBLIC_HISTORY_LIMIT);
  if(autoMaterializeHistory&&rawRows.length<PUBLIC_HISTORY_LIMIT){
    await materializeHistory(env,{calculatedAt:clock().toISOString()});
    rawRows=await loadRows(env,PUBLIC_HISTORY_LIMIT);
  }
  const rows=rawRows.map(normalizeSnapshotRow)
    .filter(row=>row.methodologyVersion===REV7_VERSION&&/^\d{8}$/.test(row.date??''));

  if(!rows.length){
    return {
      profileId:'ZGMINI_KR_FG_REV7',methodologyVersion:REV7_VERSION,
      activeMethodologyVersion:REV7_VERSION,snapshotGeneratedAt:clock().toISOString(),
      indicators:[],composite:unavailable('REV7_SNAPSHOT_HISTORY_MISSING'),
      researchOnly:true,productionEligible:false,
    };
  }

  const latest=rows.findLast(row=>valid(row.score))??null;
  if(!latest){
    return {
      profileId:'ZGMINI_KR_FG_REV7',methodologyVersion:REV7_VERSION,
      activeMethodologyVersion:REV7_VERSION,snapshotGeneratedAt:clock().toISOString(),
      indicators:[],composite:unavailable('REV7_READY_SNAPSHOT_MISSING'),
      researchOnly:true,productionEligible:false,
    };
  }

  const previous=rows.slice(0,rows.lastIndexOf(latest)).findLast(row=>valid(row.score))??null;
  const displayScore=round1(latest.score);
  const stage=stageForDisplayScore(displayScore);
  const stale=Number.isFinite(epoch(latest.date))&&clock().getTime()-epoch(latest.date)>7*86400000;

  const history=rows.map(row=>{
    const ds=round1(row.score);
    const s=stageForDisplayScore(ds);
    return {date:row.date,score:row.score,displayScore:ds,stageCode:s.stageCode,stageLabel:s.stageLabel};
  });

  const indicators=REV7_FACTORS.map(id=>{
    const factorHistory=rows.map(row=>({date:row.date,score:factorScore(row,id)}));
    const current=factorHistory.findLast(point=>valid(point.score))??null;
    const before=current?factorHistory.slice(0,factorHistory.lastIndexOf(current)).findLast(point=>valid(point.score))??null:null;
    return {
      id,name:FACTOR_META[id].name,status:current?(stale?'STALE':'READY'):'WARMUP',
      score:current?.score??null,scoreScale:{min:0,max:100},
      observationDate:current?.date??null,previousObservationDate:before?.date??null,
      changePoints:current&&before?current.score-before.score:null,
      history:factorHistory,historyMode:'RECONSTRUCTED_CURRENT_VINTAGE',
      pointInTimeVerified:false,briefExplanation:FACTOR_META[id].brief,
      direction:REV7_DIRECTIONS[id],weight:1/7,
    };
  });

  const components=REV7_FACTORS.map(id=>({
    id,label:FACTOR_META[id].name,score:factorScore(latest,id),
    direction:REV7_DIRECTIONS[id],weight:1/7,
    weightedContribution:valid(factorScore(latest,id))?factorScore(latest,id)/7:null,
  }));

  return {
    profileId:'ZGMINI_KR_FG_REV7',
    methodologyVersion:REV7_VERSION,
    activeMethodologyVersion:REV7_VERSION,
    snapshotGeneratedAt:clock().toISOString(),
    indicators,
    composite:{
      id:REV7_INDEX_ID,name:'ZGmini 한국 공포·탐욕지수',beta:true,
      methodologyVersion:REV7_VERSION,activeMethodologyVersion:REV7_VERSION,
      status:stale?'STALE':'READY',staleReason:stale?'OBSERVATION_DELAY':null,
      score:latest.score,displayScore,stageCode:stage.stageCode,stageLabel:stage.stageLabel,
      scoreScale:{min:0,max:100},observationDate:latest.date,
      previousObservationDate:previous?.date??null,
      changePoints:previous?latest.score-previous.score:null,
      history,weights:Object.fromEntries(REV7_FACTORS.map(id=>[id,1/7])),
      components,historyMode:'RECONSTRUCTED_CURRENT_VINTAGE',pointInTimeVerified:false,
      researchOnly:true,productionEligible:false,sourcePublishedAt:null,
      sourceAttribution:'한국거래소 통계정보 · 한국은행 ECOS · ZGmini 자체 가공',
      stagePolicy:STAGE_POLICY,fallbackApplied:false,fallbackReason:null,
      briefMethodology:'Revision 7은 모멘텀·시장강도·시장폭·풋/콜·변동성·안전자산 선호·신용스프레드 7개 지표를 각각 1/7 동일가중으로 종합합니다. 각 지표는 최근 504개 유효 관측의 Z-score를 Normal CDF로 0~100에 변환하며 공포 방향 지표는 역변환합니다.',
    },
    sourceAttribution:{label:'한국거래소 통계정보 · 한국은행 ECOS · ZGmini 자체 가공',url:'https://openapi.krx.co.kr/'},
    researchOnly:true,productionEligible:false,
  };
}

const response=(data,status=200)=>{
  const privateKeys=new Set(['weights','weight','weightedContribution','direction','briefMethodology','briefExplanation']);
  const body=JSON.stringify(data,(key,value)=>privateKeys.has(key)?undefined:value);
  if(new TextEncoder().encode(body).length>131072)return Response.json({error:'RESPONSE_LIMIT'},{status:503});
  return new Response(body,{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex'}});
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
      catch{
        data={
          profileId:'ZGMINI_KR_FG_REV7',methodologyVersion:REV7_VERSION,
          activeMethodologyVersion:REV7_VERSION,snapshotGeneratedAt:new Date().toISOString(),
          indicators:[],composite:unavailable('REV7_PUBLIC_READ_FAILED'),
          researchOnly:true,productionEligible:false,
        };
      }
      const ttl=valid(data?.composite?.score)?CACHE_MS:DEGRADED_CACHE_MS;
      cache={key:PUBLIC_CACHE_KEY,at:Date.now(),ttl,data};
      return data;
    })().finally(()=>{inFlight=null;});
    return response(await inFlight);
  };
}
export const koreaFunds=createKoreaFundsHandler();
