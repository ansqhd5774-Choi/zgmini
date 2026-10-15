const finite=value=>typeof value==="number"&&Number.isFinite(value);
const padCik=value=>{const digits=String(value??"").replace(/\D/g,"");return digits?digits.padStart(10,"0"):null;};

const median=values=>{
  const rows=values.filter(finite).sort((a,b)=>a-b);
  if(!rows.length)return null;
  const i=Math.floor(rows.length/2);
  return rows.length%2?rows[i]:(rows[i-1]+rows[i])/2;
};
const coverage=(valid,total)=>Number.isInteger(valid)&&Number.isInteger(total)&&total>0?valid/total:null;
const symmetricChange=(current,prior)=>finite(current)&&finite(prior)&&(Math.abs(current)+Math.abs(prior))>0?2*(current-prior)/(Math.abs(current)+Math.abs(prior)):null;
const percentChange=(current,prior)=>finite(current)&&finite(prior)&&prior!==0?100*(current/prior-1):null;
const margin=(income,revenue)=>finite(income)&&finite(revenue)&&revenue!==0?100*income/revenue:null;
const ppChange=(current,prior)=>finite(current)&&finite(prior)?current-prior:null;
const breadth=(positive,eligible)=>Number.isInteger(positive)&&Number.isInteger(eligible)&&eligible>0?100*positive/eligible:null;
const annualizedLog3m=(current,lag)=>finite(current)&&finite(lag)&&current>0&&lag>0?400*Math.log(current/lag):null;

function strictRows(input){
  if(!Array.isArray(input))return {status:"INVALID",reason:"ISSUER_ROWS_REQUIRED",rows:[]};
  const seen=new Set(),rows=[];
  for(const row of input){
    const cik=padCik(row?.cik);
    if(!cik||cik==="0000000000")continue;
    if(seen.has(cik))return {status:"INVALID",reason:"DUPLICATE_ISSUER_CIK",cik,rows:[]};
    seen.add(cik);rows.push({...row,cik});
  }
  return {status:"PASS",reason:null,rows};
}
const component=(raw,cov=null,extra={})=>({raw:finite(raw)?raw:null,coverage:finite(cov)?cov:null,...extra});

export function buildEarningsE1R5RawActual({issuerRows=[],beaCorporateProfits=null,producerIndustries=[],unitLaborCostYoY=null}={}){
  const normalized=strictRows(issuerRows);
  if(normalized.status!=="PASS")return {...normalized,components:{},quality:{}};
  const rows=normalized.rows,issuerCount=rows.length;
  const nonFinancial=rows.filter(row=>row?.isFinancial===false),nonFinancialCount=nonFinancial.length;
  const eps=[],revenue=[],marginLevel=[],marginChange=[],fcfMargin=[];
  let epsEligible=0,revenueEligible=0,marginLevelEligible=0,marginChangeEligible=0,fcfEligible=0,epsUp=0,netEligible=0,profitable=0;
  const sectors=new Map();

  for(const row of rows){
    const cur=row?.current??{},prior=row?.priorYear??{};
    if(finite(cur.eps)&&finite(prior.eps)){
      epsEligible++;
      const change=symmetricChange(cur.eps,prior.eps);if(finite(change))eps.push(change);
      if(cur.eps>prior.eps)epsUp++;
    }
    const rev=percentChange(cur.revenue,prior.revenue);
    if(finite(rev)){revenueEligible++;revenue.push(rev);}
    if(finite(cur.netIncome)){netEligible++;if(cur.netIncome>0)profitable++;}
    if(row?.sectorId!=null&&finite(cur.netIncome)&&finite(prior.netIncome)){
      const key=String(row.sectorId),s=sectors.get(key)??{current:0,prior:0,count:0};
      s.current+=cur.netIncome;s.prior+=prior.netIncome;s.count++;sectors.set(key,s);
    }
    if(row?.isFinancial!==false)continue;
    const cm=margin(cur.operatingIncome,cur.revenue);
    if(finite(cm)){marginLevelEligible++;marginLevel.push(cm);}
    const pm=margin(prior.operatingIncome,prior.revenue),mc=ppChange(cm,pm);
    if(finite(mc)){marginChangeEligible++;marginChange.push(mc);}
    const fcf=finite(cur.operatingCashFlow)&&finite(cur.capex)?cur.operatingCashFlow-cur.capex:null;
    const fm=margin(fcf,cur.revenue);
    if(finite(fm)){fcfEligible++;fcfMargin.push(fm);}
  }

  const sectorRows=[...sectors.values()].filter(row=>row.count>0),sectorUp=sectorRows.filter(row=>row.current>row.prior).length;
  const bea=symmetricChange(beaCorporateProfits?.current,beaCorporateProfits?.priorYear);
  const producerRows=Array.isArray(producerIndustries)?producerIndustries:[];
  let totalWeight=0,eligibleWeight=0,weighted=0,eligibleIndustries=0;
  for(const row of producerRows){
    const w=Number(row?.priorRevenue);if(finite(w)&&w>0)totalWeight+=w;
    const input=annualizedLog3m(row?.inputCurrent,row?.inputLag3m),output=annualizedLog3m(row?.outputCurrent,row?.outputLag3m);
    const pressure=finite(input)&&finite(output)?input-output:null;
    if(!finite(pressure)||!finite(w)||w<=0)continue;
    eligibleIndustries++;eligibleWeight+=w;weighted+=w*pressure;
  }
  const s10=eligibleWeight>0?weighted/eligibleWeight:null;

  const components={
    S1:component(median(eps),coverage(epsEligible,issuerCount),{eligibleCount:epsEligible,semantic:"MEDIAN_SYMMETRIC_EPS_CHANGE"}),
    S2:component(median(revenue),coverage(revenueEligible,issuerCount),{eligibleCount:revenueEligible,semantic:"MEDIAN_REVENUE_YOY_PERCENT"}),
    S3:component(median(marginLevel),coverage(marginLevelEligible,nonFinancialCount),{eligibleCount:marginLevelEligible,universe:"NON_FINANCIAL"}),
    S4:component(median(marginChange),coverage(marginChangeEligible,nonFinancialCount),{eligibleCount:marginChangeEligible,universe:"NON_FINANCIAL"}),
    S5:component(median(fcfMargin),coverage(fcfEligible,nonFinancialCount),{eligibleCount:fcfEligible,universe:"NON_FINANCIAL"}),
    S6:component(bea,finite(bea)?1:0,{semantic:"BEA_CORPORATE_PROFIT_SYMMETRIC_YOY"}),
    S7:component(breadth(epsUp,epsEligible),coverage(epsEligible,issuerCount),{positiveCount:epsUp,eligibleCount:epsEligible}),
    S8:component(breadth(profitable,netEligible),coverage(netEligible,issuerCount),{positiveCount:profitable,eligibleCount:netEligible}),
    S9:component(breadth(sectorUp,sectorRows.length),sectorRows.length?1:null,{positiveCount:sectorUp,eligibleCount:sectorRows.length}),
    S10:component(s10,totalWeight>0?eligibleWeight/totalWeight:null,{eligibleIndustryCount:eligibleIndustries,totalIndustryCount:producerRows.length}),
    S11:component(unitLaborCostYoY,finite(unitLaborCostYoY)?1:0,{semantic:"BLS_ULC_YOY_PERCENT"}),
  };
  const missing=Object.entries(components).filter(([,value])=>!finite(value.raw)).map(([key])=>key);
  return {status:missing.length?"PARTIAL":"READY",missing,components,quality:{issuerCount,nonFinancialCount,sectorCount:sectorRows.length}};
}
