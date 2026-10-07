export const FUND_FLOWS_R2_SHADOW_METHOD="FUND_FLOWS_R2_COMPONENTS_SHADOW_R1";

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const sum=values=>values.filter(finite).reduce((a,b)=>a+b,0);

export function buildFundFlowsR2Components({secRows=[],iciRows=[]}={}){
  const sec=(Array.isArray(secRows)?secRows:[])
    .filter(row=>validDate(row?.observationDate))
    .sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
  const ici=(Array.isArray(iciRows)?iciRows:[])
    .filter(row=>validDate(row?.observationDate))
    .sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
  const latestSec=sec.at(-1)??null,latestIci=ici.at(-1)??null;
  if(!latestSec||!latestIci)return {
    status:"PARTIAL",score:null,scoreStatus:"PENDING_WEIGHT_APPROVAL",
    reason:!latestSec?"FUND_FLOWS_R2_SEC_MISSING":"FUND_FLOWS_R2_ICI_MISSING",
    methodologyVersion:FUND_FLOWS_R2_SHADOW_METHOD,mode:"SHADOW_ONLY",
  };

  const recent=ici.slice(-Math.min(4,ici.length));
  const cumulative4w={
    equity:sum(recent.map(row=>row.equity)),
    domesticEquity:sum(recent.map(row=>row.domesticEquity)),
    worldEquity:sum(recent.map(row=>row.worldEquity)),
    bond:sum(recent.map(row=>row.bond)),
    total:sum(recent.map(row=>row.total)),
  };
  const latest={
    observationDate:latestIci.observationDate,
    equity:finite(latestIci.equity)?latestIci.equity:null,
    domesticEquity:finite(latestIci.domesticEquity)?latestIci.domesticEquity:null,
    worldEquity:finite(latestIci.worldEquity)?latestIci.worldEquity:null,
    bond:finite(latestIci.bond)?latestIci.bond:null,
    total:finite(latestIci.total)?latestIci.total:null,
  };
  const secLatest={
    observationDate:latestSec.observationDate,
    allNetRatio:finite(latestSec.allNetRatio)?latestSec.allNetRatio:null,
    indexNetRatio:finite(latestSec.indexNetRatio)?latestSec.indexNetRatio:null,
    nonIndexNetRatio:finite(latestSec.nonIndexNetRatio)?latestSec.nonIndexNetRatio:null,
    allOutflowRatio:finite(latestSec.allOutflowRatio)?latestSec.allOutflowRatio:null,
  };
  return {
    status:"READY",
    score:null,
    scoreStatus:"PENDING_WEIGHT_APPROVAL",
    methodologyVersion:FUND_FLOWS_R2_SHADOW_METHOD,
    mode:"SHADOW_ONLY",
    productionFormulaChanged:false,
    coverage:{
      secRows:sec.length,secFirst:sec[0].observationDate,secLast:latestSec.observationDate,
      iciRows:ici.length,iciFirst:ici[0].observationDate,iciLast:latestIci.observationDate,
      iciWeeksUsed:recent.length,
    },
    latest,
    cumulative4w,
    relative:{
      latestEquityMinusBond:finite(latest.equity)&&finite(latest.bond)?latest.equity-latest.bond:null,
      fourWeekEquityMinusBond:cumulative4w.equity-cumulative4w.bond,
      domesticShareOfEquity:finite(latest.domesticEquity)&&finite(latest.equity)&&latest.equity!==0?latest.domesticEquity/latest.equity:null,
    },
    secLatest,
    interpretation:"Shadow components only: SEC provides long-run registered-fund context; ICI provides current weekly equity/domestic/world/bond flows. Final R2 weights are intentionally not assigned yet.",
  };
}
