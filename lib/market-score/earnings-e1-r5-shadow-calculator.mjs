import {
  E1_R5_COMPONENTS,
  annualizedLog3m,
  breadthPercent,
  buildEarningsR5ShadowScore,
  freeCashFlow,
  guidanceNetBreadth,
  marginPercent,
  percentChange,
  percentileScore,
  percentagePointChange,
  producerCostPressure,
  symmetricChange,
} from "./earnings-e1-r5-contract.mjs";

export const E1_R5_RESEARCH_HISTORY_POLICY=Object.freeze({
  status:"RESEARCH_CANDIDATE",
  operationalApproved:false,
  minPoints:Object.freeze({
    epsGrowthStrength:24,
    revenueGrowth:24,
    operatingMarginLevel:24,
    operatingMarginChange:24,
    freeCashFlowMargin:24,
    beaCorporateProfitGrowth:24,
    epsImprovementBreadth:24,
    profitableCompanyBreadth:24,
    improvingSectorBreadth:24,
    producerCostPressure:60,
    unitLaborCostPressure:24,
    forwardEpsRevision:60,
    guidanceBreadth:24,
  }),
});

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const padCik=value=>{const digits=String(value??"").replace(/\D/g,"");return digits?digits.padStart(10,"0"):null;};

function median(values){
  const rows=values.filter(finite).sort((a,b)=>a-b);
  if(!rows.length)return null;
  const index=Math.floor(rows.length/2);
  return rows.length%2?rows[index]:(rows[index-1]+rows[index])/2;
}

function safeCoverage(valid,total){
  return Number.isInteger(valid)&&Number.isInteger(total)&&total>0?valid/total:null;
}

function strictIssuerRows(rows){
  if(!Array.isArray(rows))return {status:"INVALID",reason:"ISSUER_ROWS_REQUIRED",rows:[]};
  const seen=new Set(),clean=[];
  for(const row of rows){
    const cik=padCik(row?.cik);
    if(!cik||cik==="0000000000")continue;
    if(seen.has(cik))return {status:"INVALID",reason:"DUPLICATE_ISSUER_CIK",cik,rows:[]};
    seen.add(cik);clean.push({...row,cik});
  }
  return {status:"PASS",reason:null,rows:clean};
}

function validPair(current,prior,fn){
  return finite(current)&&finite(prior)?fn(current,prior):null;
}

function component(raw,coverage=null,extra={}){
  return {raw:finite(raw)?raw:null,coverage:finite(coverage)?coverage:null,...extra};
}

export function buildEarningsR5RawComponents({
  issuerRows=[],
  beaCorporateProfits=null,
  producerIndustries=[],
  unitLaborCostYoY=null,
  forwardEpsRows=[],
  guidance=null,
}={}){
  const normalized=strictIssuerRows(issuerRows);
  if(normalized.status!=="PASS")return {...normalized,components:{},quality:{}};
  const rows=normalized.rows,issuerCount=rows.length;
  const nonFinancial=rows.filter(row=>row?.isFinancial===false),nonFinancialCount=nonFinancial.length;

  const epsChanges=[],revenueGrowths=[],marginLevels=[],marginChanges=[],fcfMargins=[];
  let epsComparable=0,revenueComparable=0,marginLevelComparable=0,marginChangeComparable=0,fcfComparable=0;
  let epsImproved=0,netIncomeComparable=0,profitable=0;
  const sectors=new Map();

  for(const row of rows){
    const current=row?.current??{},prior=row?.priorYear??{};
    if(finite(current.eps)&&finite(prior.eps)){
      epsComparable++;
      const change=symmetricChange(current.eps,prior.eps);if(finite(change))epsChanges.push(change);
      if(current.eps>prior.eps)epsImproved++;
    }
    const revenueGrowth=validPair(current.revenue,prior.revenue,percentChange);
    if(finite(revenueGrowth)){revenueComparable++;revenueGrowths.push(revenueGrowth);}
    if(finite(current.netIncome)){netIncomeComparable++;if(current.netIncome>0)profitable++;}
    if(row?.sectorId!=null&&finite(current.netIncome)&&finite(prior.netIncome)){
      const id=String(row.sectorId),sector=sectors.get(id)??{current:0,prior:0,count:0};
      sector.current+=current.netIncome;sector.prior+=prior.netIncome;sector.count++;sectors.set(id,sector);
    }
    if(row?.isFinancial!==false)continue;
    const currentMargin=marginPercent(current.operatingIncome,current.revenue);
    if(finite(currentMargin)){marginLevelComparable++;marginLevels.push(currentMargin);}
    const priorMargin=marginPercent(prior.operatingIncome,prior.revenue);
    const marginChange=percentagePointChange(currentMargin,priorMargin);
    if(finite(marginChange)){marginChangeComparable++;marginChanges.push(marginChange);}
    const fcf=freeCashFlow(current.operatingCashFlow,current.capex);
    const fcfMargin=marginPercent(fcf,current.revenue);
    if(finite(fcfMargin)){fcfComparable++;fcfMargins.push(fcfMargin);}
  }

  const sectorRows=[...sectors.values()].filter(row=>row.count>0);
  const improvingSectors=sectorRows.filter(row=>row.current>row.prior).length;
  const beaRaw=symmetricChange(beaCorporateProfits?.current,beaCorporateProfits?.priorYear);

  const producerRows=Array.isArray(producerIndustries)?producerIndustries:[];
  let producerTotalWeight=0,producerEligibleWeight=0,producerWeighted=0,producerEligibleCount=0;
  for(const row of producerRows){
    const priorRevenue=Number(row?.priorRevenue);
    if(finite(priorRevenue)&&priorRevenue>0)producerTotalWeight+=priorRevenue;
    const input=annualizedLog3m(row?.inputCurrent,row?.inputLag3m);
    const output=annualizedLog3m(row?.outputCurrent,row?.outputLag3m);
    const pressure=producerCostPressure(input,output);
    if(!finite(pressure)||!finite(priorRevenue)||priorRevenue<=0)continue;
    producerEligibleCount++;producerEligibleWeight+=priorRevenue;producerWeighted+=priorRevenue*pressure;
  }
  const producerRaw=producerEligibleWeight>0?producerWeighted/producerEligibleWeight:null;

  const forwardRows=Array.isArray(forwardEpsRows)?forwardEpsRows:[];
  const forwardChanges=[];
  for(const row of forwardRows){
    const value=symmetricChange(row?.current,row?.prior30d);if(finite(value))forwardChanges.push(value);
  }
  const guidanceRaw=guidance?guidanceNetBreadth(guidance.up,guidance.flat,guidance.down):null;

  const components={
    epsGrowthStrength:component(median(epsChanges),safeCoverage(epsComparable,issuerCount),{eligibleCount:epsComparable}),
    revenueGrowth:component(median(revenueGrowths),safeCoverage(revenueComparable,issuerCount),{eligibleCount:revenueComparable}),
    operatingMarginLevel:component(median(marginLevels),safeCoverage(marginLevelComparable,nonFinancialCount),{eligibleCount:marginLevelComparable,universe:"NON_FINANCIAL"}),
    operatingMarginChange:component(median(marginChanges),safeCoverage(marginChangeComparable,nonFinancialCount),{eligibleCount:marginChangeComparable,universe:"NON_FINANCIAL"}),
    freeCashFlowMargin:component(median(fcfMargins),safeCoverage(fcfComparable,nonFinancialCount),{eligibleCount:fcfComparable,universe:"NON_FINANCIAL"}),
    beaCorporateProfitGrowth:component(beaRaw,finite(beaRaw)?1:0),
    epsImprovementBreadth:component(breadthPercent(epsImproved,epsComparable),safeCoverage(epsComparable,issuerCount),{positiveCount:epsImproved,eligibleCount:epsComparable}),
    profitableCompanyBreadth:component(breadthPercent(profitable,netIncomeComparable),safeCoverage(netIncomeComparable,issuerCount),{positiveCount:profitable,eligibleCount:netIncomeComparable}),
    improvingSectorBreadth:component(breadthPercent(improvingSectors,sectorRows.length),sectorRows.length?1:null,{positiveCount:improvingSectors,eligibleCount:sectorRows.length}),
    producerCostPressure:component(producerRaw,producerTotalWeight>0?producerEligibleWeight/producerTotalWeight:null,{eligibleIndustryCount:producerEligibleCount,totalIndustryCount:producerRows.length}),
    unitLaborCostPressure:component(unitLaborCostYoY,finite(unitLaborCostYoY)?1:0,{semantic:"PERCENT_CHANGE_FROM_SAME_QUARTER_YEAR_AGO"}),
    forwardEpsRevision:component(median(forwardChanges),safeCoverage(forwardChanges.length,forwardRows.length),{eligibleCount:forwardChanges.length,totalCount:forwardRows.length}),
    guidanceBreadth:component(guidanceRaw,guidanceRaw==null?null:1,{up:guidance?.up??null,flat:guidance?.flat??null,down:guidance?.down??null}),
  };

  const missing=Object.entries(components).filter(([,value])=>!finite(value.raw)).map(([key])=>E1_R5_COMPONENTS[key].id);
  return {
    status:missing.length?"PARTIAL":"READY",
    missing,
    components,
    quality:{issuerCount,nonFinancialCount,sectorCount:sectorRows.length},
  };
}

function historyValuesBefore(history,asOf){
  if(!Array.isArray(history)||!asOf||!Number.isFinite(Date.parse(asOf)))return [];
  const cutoff=Date.parse(asOf),out=[];
  for(const row of history){
    if(!row||typeof row!=="object"||!finite(row.value)||!row.availableAt)continue;
    const available=Date.parse(row.availableAt);if(!Number.isFinite(available)||available>=cutoff)continue;
    out.push(row.value);
  }
  return out;
}

export function scoreEarningsR5RawComponents(rawResult,{
  histories={},
  asOf,
  historyPolicy=E1_R5_RESEARCH_HISTORY_POLICY,
}={}){
  const componentScores={},scoredComponents={};
  for(const [key,meta] of Object.entries(E1_R5_COMPONENTS)){
    const raw=rawResult?.components?.[key]?.raw??null;
    const history=historyValuesBefore(histories?.[key],asOf);
    const minPoints=historyPolicy?.minPoints?.[key];
    const score=Number.isInteger(minPoints)&&minPoints>0
      ?percentileScore(raw,history,{direction:meta.direction,minPoints})
      :null;
    componentScores[key]=score;
    scoredComponents[key]={
      ...(rawResult?.components?.[key]??{raw:null,coverage:null}),
      score,
      historyPoints:history.length,
      minHistoryPoints:Number.isInteger(minPoints)?minPoints:null,
      direction:meta.direction,
    };
  }
  const composite=buildEarningsR5ShadowScore(componentScores);
  return {
    ...composite,
    historyPolicy:{status:historyPolicy?.status??"UNSPECIFIED",operationalApproved:historyPolicy?.operationalApproved===true},
    rawStatus:rawResult?.status??"PARTIAL",
    components:scoredComponents,
    quality:rawResult?.quality??{},
  };
}

export function buildEarningsR5Shadow(input,{histories={},asOf,historyPolicy=E1_R5_RESEARCH_HISTORY_POLICY}={}){
  const raw=buildEarningsR5RawComponents(input);
  return scoreEarningsR5RawComponents(raw,{histories,asOf,historyPolicy});
}
