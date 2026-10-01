import {readBreadthB1R4StoredScore} from "./breadth-b1-r4-reader.mjs";
import {
  B1_R5_METHOD,B1_R5_SOURCE,
  B1_R5_ADVANCE_WEIGHT,B1_R5_VALUE_WEIGHT,B1_R5_EMA5_WEIGHT,B1_R5_EMA20_WEIGHT,
} from "./breadth-b1-r5-contract.mjs";

export const B1_R5_READER="B1-R5-STORED-READER-R1";

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const clamp=value=>Math.max(0,Math.min(100,value));
const validRatio=value=>finite(value)&&value>=0&&value<=1;

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

  return {
    ...common,
    status:"READY",
    score:composed.score,
    interpretation:"B1-R5: 상승종목비율 30% + 상승거래대금비율 20% + 5일 수급 EMA 30% + 20일 수급 EMA 20%",
    factors:composed.factors,
  };
}
