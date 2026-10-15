export const E1_R5_VERSION="E1-R5";

export const E1_R5_WEIGHTS=Object.freeze({
  S1:0.15,
  S2:0.08,
  S3:0.08,
  S4:0.10,
  S5:0.06,
  S6:0.08,
  S7:0.10,
  S8:0.05,
  S9:0.05,
  S10:0.10,
  S11:0.05,
  S12:0.07,
  S13:0.03,
});

export const E1_R5_BLOCK_WEIGHTS=Object.freeze({
  actual:0.55,
  breadth:0.20,
  costPressure:0.15,
  forward:0.10,
});

export const E1_R5_SCORE_KEYS=Object.freeze(Object.keys(E1_R5_WEIGHTS));
export const E1_R5_NO_REWEIGHT=true;
export const E1_R5_FORWARD_SUBWEIGHTS=Object.freeze({S12A:4,S12B:3});

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const clamp=value=>Math.max(0,Math.min(100,value));

export function historicalPercentile(value,history,{inverse=false}={}){
  if(!finite(value)||!Array.isArray(history))return null;
  const rows=history.filter(finite);
  if(!rows.length)return null;
  let below=0,equal=0;
  for(const row of rows){
    if(row<value)below++;
    else if(row===value)equal++;
  }
  const positive=100*(below+0.5*equal)/rows.length;
  return inverse?100-positive:positive;
}

function blockScore(scores,keys,denominator){
  let weighted=0;
  for(const key of keys)weighted+=E1_R5_WEIGHTS[key]*scores[key];
  return weighted/denominator;
}

export function buildEarningsE1R5({scores={},asOfDate=null,retrievedAt=new Date().toISOString(),sourceVersion=null,sourceStoredAt=null,raw=null,quality=null,historyMode="HISTORICAL_PERCENTILE"}={}){
  const missing=[];
  const normalized={};
  for(const key of E1_R5_SCORE_KEYS){
    const value=scores?.[key];
    if(!finite(value)||value<0||value>100){
      normalized[key]=null;
      missing.push(key);
    }else normalized[key]=value;
  }

  if(missing.length){
    return {
      id:"earnings",
      status:"PARTIAL",
      score:null,
      methodologyVersion:E1_R5_VERSION,
      asOfDate,
      retrievedAt,
      updatedAt:retrievedAt,
      normalization:"HISTORICAL_PERCENTILE",
      historyMode,
      noReweight:E1_R5_NO_REWEIGHT,
      weights:E1_R5_WEIGHTS,
      blockWeights:E1_R5_BLOCK_WEIGHTS,
      components:normalized,
      blocks:null,
      raw,
      quality,
      sourceVersion,
      sourceStoredAt,
      missing,
    };
  }

  const blocks={
    actual:blockScore(normalized,["S1","S2","S3","S4","S5","S6"],E1_R5_BLOCK_WEIGHTS.actual),
    breadth:blockScore(normalized,["S7","S8","S9"],E1_R5_BLOCK_WEIGHTS.breadth),
    costPressure:blockScore(normalized,["S10","S11"],E1_R5_BLOCK_WEIGHTS.costPressure),
    forward:blockScore(normalized,["S12","S13"],E1_R5_BLOCK_WEIGHTS.forward),
  };

  let score=0;
  for(const key of E1_R5_SCORE_KEYS)score+=E1_R5_WEIGHTS[key]*normalized[key];

  return {
    id:"earnings",
    status:"READY",
    score:clamp(score),
    methodologyVersion:E1_R5_VERSION,
    asOfDate,
    retrievedAt,
    updatedAt:retrievedAt,
    normalization:"HISTORICAL_PERCENTILE",
    historyMode,
    noReweight:E1_R5_NO_REWEIGHT,
    weights:E1_R5_WEIGHTS,
    blockWeights:E1_R5_BLOCK_WEIGHTS,
    components:normalized,
    blocks,
    raw,
    quality,
    sourceVersion,
    sourceStoredAt,
    missing:[],
  };
}

export function scoreEarningsE1R5Raw({raw={},histories={},asOfDate=null,retrievedAt=new Date().toISOString(),sourceVersion=null,sourceStoredAt=null,quality=null,historyMode="CURRENT_AVAILABLE_HISTORY"}={}){
  const scores={};
  const historyCounts={};
  for(let i=1;i<=11;i++){
    const key=`S${i}`;
    const history=Array.isArray(histories?.[key])?histories[key].filter(finite):[];
    historyCounts[key]=history.length;
    scores[key]=historicalPercentile(raw?.[key],history,{inverse:key==="S10"||key==="S11"});
  }

  const forwardScores={};
  for(const key of ["S12A","S12B","S13"]){
    const history=Array.isArray(histories?.[key])?histories[key].filter(finite):[];
    historyCounts[key]=history.length;
    forwardScores[key]=historicalPercentile(raw?.[key],history);
  }
  scores.S12=finite(forwardScores.S12A)&&finite(forwardScores.S12B)
    ?(E1_R5_FORWARD_SUBWEIGHTS.S12A*forwardScores.S12A+E1_R5_FORWARD_SUBWEIGHTS.S12B*forwardScores.S12B)/(E1_R5_FORWARD_SUBWEIGHTS.S12A+E1_R5_FORWARD_SUBWEIGHTS.S12B)
    :null;
  scores.S13=forwardScores.S13;

  return {
    ...buildEarningsE1R5({scores,asOfDate,retrievedAt,sourceVersion,sourceStoredAt,raw,quality:{...quality,historyCounts,forwardScores},historyMode}),
    forwardScores,
    historyCounts,
  };
}
