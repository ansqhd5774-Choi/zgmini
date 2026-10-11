export const E1_R5_SHADOW_VERSION="E1-R5-SHADOW-R1";

export const E1_R5_AREAS=Object.freeze({
  realized:Object.freeze({id:"A",label:"실제 기업 실적",weight:0.55}),
  breadth:Object.freeze({id:"B",label:"실적 확산성",weight:0.20}),
  cost:Object.freeze({id:"C",label:"생산·원가 압력",weight:0.15}),
  forward:Object.freeze({id:"D",label:"미래 실적 전망",weight:0.10}),
});

export const E1_R5_COMPONENTS=Object.freeze({
  epsGrowthStrength:Object.freeze({id:"S1",area:"realized",label:"EPS 성장 강도",weight:0.15,direction:"UP",source:"SEC"}),
  revenueGrowth:Object.freeze({id:"S2",area:"realized",label:"매출 성장률",weight:0.08,direction:"UP",source:"SEC"}),
  operatingMarginLevel:Object.freeze({id:"S3",area:"realized",label:"영업이익률 수준",weight:0.08,direction:"UP",source:"SEC"}),
  operatingMarginChange:Object.freeze({id:"S4",area:"realized",label:"영업이익률 변화",weight:0.10,direction:"UP",source:"SEC"}),
  freeCashFlowMargin:Object.freeze({id:"S5",area:"realized",label:"잉여현금흐름 마진",weight:0.06,direction:"UP",source:"SEC"}),
  beaCorporateProfitGrowth:Object.freeze({id:"S6",area:"realized",label:"미국 전체 기업이익 성장",weight:0.08,direction:"UP",source:"BEA"}),
  epsImprovementBreadth:Object.freeze({id:"S7",area:"breadth",label:"EPS 개선 기업 비율",weight:0.10,direction:"UP",source:"SEC"}),
  profitableCompanyBreadth:Object.freeze({id:"S8",area:"breadth",label:"흑자 기업 비율",weight:0.05,direction:"UP",source:"SEC"}),
  improvingSectorBreadth:Object.freeze({id:"S9",area:"breadth",label:"실적 개선 업종 비율",weight:0.05,direction:"UP",source:"SEC"}),
  producerCostPressure:Object.freeze({id:"S10",area:"cost",label:"업종별 생산자물가 압력",weight:0.10,direction:"DOWN",source:"BLS"}),
  unitLaborCostPressure:Object.freeze({id:"S11",area:"cost",label:"단위노동비용 압력",weight:0.05,direction:"DOWN",source:"BLS"}),
  forwardEpsRevision:Object.freeze({id:"S12",area:"forward",label:"향후 EPS 전망 수정",weight:0.07,direction:"UP",source:"UNRESOLVED_FREE_COMMERCIAL"}),
  guidanceBreadth:Object.freeze({id:"S13",area:"forward",label:"기업 가이던스 방향",weight:0.03,direction:"UP",source:"SEC_CANDIDATE"}),
});

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const clamp100=value=>Math.max(0,Math.min(100,value));
const stableScore=value=>{
  const clamped=clamp100(value);
  const nearestInteger=Math.round(clamped);
  return Math.abs(clamped-nearestInteger)<1e-12?nearestInteger:clamped;
};
const sum=values=>values.reduce((total,value)=>total+value,0);

export function symmetricChange(current,prior){
  if(!finite(current)||!finite(prior))return null;
  const denominator=Math.abs(current)+Math.abs(prior);
  return denominator===0?0:2*(current-prior)/denominator;
}

export function percentChange(current,prior){
  if(!finite(current)||!finite(prior)||prior<=0)return null;
  return 100*(current/prior-1);
}

export function ratioPercent(numerator,denominator){
  if(!finite(numerator)||!finite(denominator)||denominator<=0)return null;
  return 100*numerator/denominator;
}

export function marginPercent(profit,revenue){
  return ratioPercent(profit,revenue);
}

export function percentagePointChange(currentPercent,priorPercent){
  if(!finite(currentPercent)||!finite(priorPercent))return null;
  return currentPercent-priorPercent;
}

export function quarterFromCumulative(currentCumulative,priorCumulative=0){
  if(!finite(currentCumulative)||!finite(priorCumulative))return null;
  return currentCumulative-priorCumulative;
}

export function freeCashFlow(operatingCashFlow,capex){
  if(!finite(operatingCashFlow)||!finite(capex))return null;
  return operatingCashFlow-capex;
}

export function annualizedLog3m(current,lag3m){
  if(!finite(current)||!finite(lag3m)||current<=0||lag3m<=0)return null;
  return 400*Math.log(current/lag3m);
}

export function producerCostPressure(inputAnnualized3m,outputAnnualized3m){
  if(!finite(inputAnnualized3m)||!finite(outputAnnualized3m))return null;
  return inputAnnualized3m-outputAnnualized3m;
}

export function breadthPercent(positiveCount,eligibleCount){
  if(!Number.isInteger(positiveCount)||!Number.isInteger(eligibleCount)||positiveCount<0||eligibleCount<=0||positiveCount>eligibleCount)return null;
  return 100*positiveCount/eligibleCount;
}

export function guidanceNetBreadth(up,flat,down){
  if(![up,flat,down].every(Number.isInteger)||up<0||flat<0||down<0)return null;
  const eligible=up+flat+down;
  return eligible?(up-down)/eligible:null;
}

export function percentileScore(value,history,{direction="UP",minPoints=1}={}){
  if(!finite(value)||!Array.isArray(history)||!Number.isInteger(minPoints)||minPoints<1)return null;
  const valid=history.filter(finite);
  if(valid.length<minPoints)return null;
  let lower=0,equal=0;
  for(const item of valid){
    if(item<value)lower++;
    else if(item===value)equal++;
  }
  const positive=100*(lower+0.5*equal)/valid.length;
  if(direction==="UP")return clamp100(positive);
  if(direction==="DOWN")return clamp100(100-positive);
  return null;
}

export function validateEarningsR5Weights(){
  const components=Object.values(E1_R5_COMPONENTS);
  const areas=Object.values(E1_R5_AREAS);
  const componentWeight=sum(components.map(item=>item.weight));
  const areaWeight=sum(areas.map(item=>item.weight));
  const areaComponentWeights=Object.fromEntries(areas.map(area=>[
    area.id,
    sum(components.filter(item=>item.area===Object.keys(E1_R5_AREAS).find(key=>E1_R5_AREAS[key].id===area.id)).map(item=>item.weight)),
  ]));
  return {
    status:Math.abs(componentWeight-1)<1e-12&&Math.abs(areaWeight-1)<1e-12&&areas.every(area=>Math.abs((areaComponentWeights[area.id]??0)-area.weight)<1e-12)?"PASS":"FAIL",
    componentWeight,
    areaWeight,
    areaComponentWeights,
  };
}

export function buildEarningsR5ShadowScore(componentScores={}){
  const components=Object.entries(E1_R5_COMPONENTS).map(([key,meta])=>({
    key,
    ...meta,
    score:finite(componentScores?.[key])?clamp100(componentScores[key]):null,
  }));
  const missing=components.filter(item=>!finite(item.score)).map(item=>item.id);
  const areas={};
  for(const [areaKey,area] of Object.entries(E1_R5_AREAS)){
    const rows=components.filter(item=>item.area===areaKey);
    const areaMissing=rows.filter(item=>!finite(item.score)).map(item=>item.id);
    areas[areaKey]={
      id:area.id,
      label:area.label,
      weight:area.weight,
      status:areaMissing.length?"PARTIAL":"READY",
      score:areaMissing.length?null:stableScore(rows.reduce((total,item)=>total+item.weight*item.score,0)/area.weight),
      missing:areaMissing,
    };
  }
  if(missing.length){
    return {
      id:"earnings",
      status:"PARTIAL",
      score:null,
      methodologyVersion:E1_R5_SHADOW_VERSION,
      active:false,
      reweighted:false,
      missing,
      areas,
      components,
    };
  }
  return {
    id:"earnings",
    status:"READY",
    score:stableScore(components.reduce((total,item)=>total+item.weight*item.score,0)),
    methodologyVersion:E1_R5_SHADOW_VERSION,
    active:false,
    reweighted:false,
    missing:[],
    areas,
    components,
  };
}
