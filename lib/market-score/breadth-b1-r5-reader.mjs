import {readBreadthB1R4StoredScore,previousMarketSession} from "./breadth-b1-r4-reader.mjs";
import {isMarketSession} from "./breadth-b1-r3-calendar.mjs";
import {
  B1_R5_METHOD,B1_R5_SOURCE,
  B1_R5_ADVANCE_WEIGHT,B1_R5_VALUE_WEIGHT,B1_R5_EMA5_WEIGHT,B1_R5_EMA20_WEIGHT,
  B1_R5_FINAL_EMA_PERIOD,
} from "./breadth-b1-r5-contract.mjs";

export const B1_R5_READER="B1-R5-STORED-READER-R1";

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const clamp=value=>Math.max(0,Math.min(100,value));
const validRatio=value=>finite(value)&&value>=0&&value<=1;

export function smoothBreadthFinalSeries(points=[]){
  let previousDate=null,ema=null;
  return points.map(point=>{
    if(!finite(point?.value)||point.value<0||point.value>100||!previousMarketSession(point?.label)||!isMarketSession(point.label)||new Date(point.label+"T00:00:00Z").toISOString().slice(0,10)!==point.label)throw new Error("B1_R5_FINAL_SERIES_INVALID");
    if(previousDate!==null&&point.label<=previousDate)throw new Error("B1_R5_FINAL_SERIES_ORDER_INVALID");
    if(previousDate!==null&&previousMarketSession(point.label)!==previousDate)ema=null;
    ema=ema===null?point.value:ema+2/(B1_R5_FINAL_EMA_PERIOD+1)*(point.value-ema);
    previousDate=point.label;
    return {label:point.label,value:ema};
  });
}

export function composeBreadthB1R5Score({advanceRatio,advanceValueShare,ema5,ema20}={}){
  if(!validRatio(advanceRatio)||!validRatio(advanceValueShare)||!finite(ema5)||!finite(ema20))return null;
  if(ema5<0||ema5>100||ema20<0||ema20>100)return null;
  const factors={
    advanceRatio:100*advanceRatio,
    advanceValueShare:100*advanceValueShare,
    ema5,
    ema20,
  };
  const score=clamp(
    B1_R5_ADVANCE_WEIGHT*factors.advanceRatio+
    B1_R5_VALUE_WEIGHT*factors.advanceValueShare+
    B1_R5_EMA5_WEIGHT*factors.ema5+
    B1_R5_EMA20_WEIGHT*factors.ema20
  );
  return {score,factors};
}

export async function readBreadthB1R5StoredScore({
  storedR4Reader=readBreadthB1R4StoredScore,
  ...args
}={}){
  const base=await storedR4Reader(args);
  const common={
    ...base,
    methodologyVersion:B1_R5_METHOD,
    source:base?.source??B1_R5_SOURCE,
    providerRequests:0,
    storageMode:"D1_STORED_ONLY",
  };
  if(base?.status!=="READY"||!finite(base?.score)){
    return {...common,score:null};
  }

  const composed=composeBreadthB1R5Score({
    advanceRatio:base?.components?.advanceRatio,
    advanceValueShare:base?.components?.advanceValueShare,
    ema5:base?.smoothing?.ema5,
    ema20:base?.smoothing?.ema20,
  });
  if(!composed){
    return {
      ...common,
      status:"PARTIAL",
      score:null,
      missing:["B1_R5_FACTOR_VALUE_MISSING"],
    };
  }

  const observationDate=base?.observationDate??base?.runtime?.observationDate;
  const rawTrend=Array.isArray(base.trend)?base.trend:[];
  const trend=smoothBreadthFinalSeries(rawTrend.map(point=>point.label===observationDate?{...point,value:composed.score}:point));
  const current=trend.find(point=>point.label===observationDate);
  if(!current)return {...common,status:"PARTIAL",score:null,missing:["B1_R5_FINAL_CURRENT_MISSING"]};

  return {
    ...common,
    status:"READY",
    score:current.value,
    trend,
    interpretation:"B1-R5 R2: 상승종목비율 30% + 상승거래대금비율 20% + 5일 수급 EMA 30% + 20일 수급 EMA 20%를 합성한 뒤 최종 3일 EMA 적용. 단기 잡음을 줄이며 반응 지연이 발생할 수 있습니다.",
    smoothing:{...base.smoothing,rawScore:composed.score,finalEma:current.value,finalPeriod:B1_R5_FINAL_EMA_PERIOD},
    factors:composed.factors,
  };
}
