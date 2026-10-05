import {liquidityCrisisDefense} from "../diagnostic-layer/model.mjs";

const finiteScore=value=>typeof value==="number"&&Number.isFinite(value)&&value>=0&&value<=100;
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);

export const LIQUIDITY_ACTIVE_UI_SEED_R1=Object.freeze([
  Object.freeze({label:"2026-09-20",value:58.75429405736534,source:"ZGMINI_DIAGNOSTIC_V1_PRODUCTION_LIVE_CANARY_RESULT_R47"}),
  Object.freeze({label:"2026-09-21",value:60.507901909599056,source:"ZGMINI_MKT_S13_RUNTIME_CHAIN_VERIFY_FIX2_BROWSER"}),
]);

function indicator(name,latest,source){
  const score=finiteScore(latest?.value)?latest.value:null;
  return {
    name,
    status:score===null?"PARTIAL":"READY",
    score,
    value:null,
    unit:"",
    asOfDate:validDate(latest?.observationDate)?latest.observationDate:null,
    source,
  };
}

function normalizeTrend(rows=[]){
  const byDate=new Map();
  for(const row of rows){
    const label=row?.label??row?.observationDate??null;
    const value=row?.value??row?.score??null;
    if(!validDate(label)||!finiteScore(value))continue;
    byDate.set(label,{label,value});
  }
  return [...byDate.values()].sort((a,b)=>a.label.localeCompare(b.label));
}

function scoreRows(node){
  return (Array.isArray(node?.rows)?node.rows:[])
    .flatMap(row=>validDate(row?.observationDate)&&finiteScore(row?.score)
      ?[{observationDate:row.observationDate,score:row.score}]
      :[])
    .sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
}

function latestScoreAtOrBefore(rows,date){
  let found=null;
  for(const row of rows){
    if(row.observationDate>date)break;
    found=row.score;
  }
  return found;
}

export function buildLiquidityDiagnosticTrendR1(r1,{asOfDate=null,limit=370}={}){
  const sources={
    fundingStress:scoreRows(r1?.components?.fundingStress),
    bankReserves:scoreRows(r1?.components?.bankReserves),
    tga:scoreRows(r1?.components?.tga),
    onRrp:scoreRows(r1?.components?.onRrp),
    m2:scoreRows(r1?.components?.m2),
    bondVolatility:scoreRows(r1?.components?.bondVolatility),
  };
  const dates=[...new Set(Object.values(sources).flatMap(rows=>rows.map(row=>row.observationDate)))]
    .filter(date=>!validDate(asOfDate)||date<=asOfDate)
    .sort();
  const out=[];
  for(const date of dates){
    const input=Object.fromEntries(Object.entries(sources).map(([id,rows])=>[id,latestScoreAtOrBefore(rows,date)]));
    const scored=liquidityCrisisDefense(input);
    if(scored.status==="READY"&&finiteScore(scored.score))out.push({label:date,value:scored.score});
  }
  return out.slice(-Math.max(1,Math.trunc(Number(limit)||370)));
}

export function selectLiquidityPublicDomainR1(existing,detailed){
  if(detailed?.status==="READY")return detailed;
  return existing??detailed;
}

export function buildLiquidityActivePublicDomainR1({
  diagnostic,
  storedTrend=[],
  asOfDate=null,
}={}){
  const scoreNode=diagnostic?.snapshot?.diagnostics?.liquidityCrisisDefense??null;
  const r1=diagnostic?.snapshot?.r1??null;
  const score=scoreNode?.status==="READY"&&finiteScore(scoreNode?.score)?scoreNode.score:null;
  const latest=r1?.latest??{};
  const currentPoint=score!==null&&validDate(asOfDate)?[{label:asOfDate,value:score}]:[];
  const reconstructedTrend=buildLiquidityDiagnosticTrendR1(r1,{asOfDate,limit:370});
  const trend=normalizeTrend([
    ...reconstructedTrend,
    ...LIQUIDITY_ACTIVE_UI_SEED_R1,
    ...(Array.isArray(storedTrend)?storedTrend:[]),
    ...currentPoint,
  ]).filter(row=>!validDate(asOfDate)||row.label<=asOfDate);

  return {
    status:score===null?(scoreNode?"PARTIAL":"UNAVAILABLE"):"READY",
    score,
    missingFactors:Array.isArray(scoreNode?.missing)?scoreNode.missing:[],
    indicators:[
      indicator("은행 준비금",latest.bankReserves,"Federal Reserve / WRESBAL active transform"),
      indicator("M2 증가율",latest.m2,"Federal Reserve / M2SL active transform"),
      indicator("TGA 변화",latest.tga,"U.S. Treasury / WTREGEN active transform"),
      indicator("ON RRP 변화",latest.onRrp,"Federal Reserve / RRPONTSYD active transform"),
    ],
    trend,
    freshness:"CURRENT_ACTIVE_DIAGNOSTIC_R1_RECONSTRUCTED_PLUS_STORED_PUBLIC_SCORE_HISTORY",
    updatedAt:validDate(asOfDate)?asOfDate:null,
    asOfDate:validDate(asOfDate)?asOfDate:null,
    methodologyVersion:"DIAGNOSTIC_SCORE_TRANSFORM_R1",
    interpretation:"현재 ACTIVE D3 유동성 점수와 동일한 구성점수입니다. 추이는 저장된 구성요소 점수의 동일 산식 재계산과 실제 Production 누적 점수를 사용하며 임의 보간·재가중하지 않습니다.",
  };
}
