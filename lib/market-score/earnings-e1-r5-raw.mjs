const finite=value=>typeof value==="number"&&Number.isFinite(value);
const padCik=value=>{const digits=String(value??"").replace(/\D/g,"");return digits?digits.padStart(10,"0"):null;};
const median=values=>{const rows=values.filter(finite).sort((a,b)=>a-b);if(!rows.length)return null;const i=Math.floor(rows.length/2);return rows.length%2?rows[i]:(rows[i-1]+rows[i])/2;};
const coverage=(valid,total)=>Number.isInteger(valid)&&Number.isInteger(total)&&total>0?valid/total:null;
const symmetricChange=(current,prior)=>finite(current)&&finite(prior)&&(Math.abs(current)+Math.abs(prior))>0?2*(current-prior)/(Math.abs(current)+Math.abs(prior)):null;
const percentChange=(current,prior)=>finite(current)&&finite(prior)&&prior!==0?100*(current/prior-1):null;
const margin=(income,revenue)=>finite(income)&&finite(revenue)&&revenue!==0?100*income/revenue:null;
const breadth=(positive,eligible)=>Number.isInteger(positive)&&Number.isInteger(eligible)&&eligible>0?100*positive/eligible:null;
const annualizedLog3m=(current,lag)=>finite(current)&&finite(lag)&&current>0&&lag>0?400*Math.log(current/lag):null;
const component=(raw,cov=null,extra={})=>({raw:finite(raw)?raw:null,coverage:finite(cov)?cov:null,...extra});

export function buildEarningsE1R5RawActual({issuerRows=[],beaCorporateProfits=null,producerIndustries=[],unitLaborCostYoY=null,s10Raw=null,s10Coverage=null}={}){
  if(!Array.isArray(issuerRows))return {status:"INVALID",reason:"ISSUER_ROWS_REQUIRED",components:{},quality:{}};
  const seen=new Set(),rows=[];
  for(const row of issuerRows){const cik=padCik(row?.cik);if(!cik||cik==="0000000000")continue;if(seen.has(cik))return {status:"INVALID",reason:"DUPLICATE_ISSUER_CIK",cik,components:{},quality:{}};seen.add(cik);rows.push({...row,cik});}
  const issuerCount=rows.length,nonFinancial=rows.filter(row=>row?.isFinancial===false),nonFinancialCount=nonFinancial.length;
  const eps=[],revenue=[],marginLevel=[],marginChange=[],fcfMargin=[];let epsEligible=0,revenueEligible=0,marginLevelEligible=0,marginChangeEligible=0,fcfEligible=0,epsUp=0,netEligible=0,profitable=0;const sectors=new Map();
  for(const row of rows){
    const cur=row?.current??{},prior=row?.priorYear??{};
    if(finite(cur.eps)&&finite(prior.eps)){epsEligible++;const change=symmetricChange(cur.eps,prior.eps);if(finite(change))eps.push(change);if(cur.eps>prior.eps)epsUp++;}
    const rev=percentChange(cur.revenue,prior.revenue);if(finite(rev)){revenueEligible++;revenue.push(rev);}
    if(finite(cur.netIncome)){netEligible++;if(cur.netIncome>0)profitable++;}
    if(row?.sectorId!=null&&finite(cur.netIncome)&&finite(prior.netIncome)){const key=String(row.sectorId),s=sectors.get(key)??{current:0,prior:0,count:0};s.current+=cur.netIncome;s.prior+=prior.netIncome;s.count++;sectors.set(key,s);}
    if(row?.isFinancial!==false)continue;
    const cm=margin(cur.operatingIncome,cur.revenue);if(finite(cm)){marginLevelEligible++;marginLevel.push(cm);}const pm=margin(prior.operatingIncome,prior.revenue),mc=finite(cm)&&finite(pm)?cm-pm:null;if(finite(mc)){marginChangeEligible++;marginChange.push(mc);}const fcf=finite(cur.operatingCashFlow)&&finite(cur.capex)?cur.operatingCashFlow-cur.capex:null,fm=margin(fcf,cur.revenue);if(finite(fm)){fcfEligible++;fcfMargin.push(fm);}
  }
  const sectorRows=[...sectors.values()].filter(row=>row.count>0),sectorUp=sectorRows.filter(row=>row.current>row.prior).length,bea=symmetricChange(beaCorporateProfits?.current,beaCorporateProfits?.priorYear);
  let totalWeight=0,eligibleWeight=0,weighted=0,eligibleIndustries=0;
  for(const row of Array.isArray(producerIndustries)?producerIndustries:[]){const weight=Number(row?.priorRevenue);if(finite(weight)&&weight>0)totalWeight+=weight;const input=annualizedLog3m(row?.inputCurrent,row?.inputLag3m),output=annualizedLog3m(row?.outputCurrent,row?.outputLag3m),pressure=finite(input)&&finite(output)?input-output:null;if(!finite(pressure)||!finite(weight)||weight<=0)continue;eligibleIndustries++;eligibleWeight+=weight;weighted+=weight*pressure;}
  const calculatedS10=eligibleWeight>0?weighted/eligibleWeight:null,calculatedS10Coverage=totalWeight>0?eligibleWeight/totalWeight:null,finalS10=finite(s10Raw)?s10Raw:calculatedS10,finalS10Coverage=finite(s10Raw)?s10Coverage:calculatedS10Coverage;
  const components={
    S1:component(median(eps),coverage(epsEligible,issuerCount),{eligibleCount:epsEligible}),S2:component(median(revenue),coverage(revenueEligible,issuerCount),{eligibleCount:revenueEligible}),S3:component(median(marginLevel),coverage(marginLevelEligible,nonFinancialCount),{eligibleCount:marginLevelEligible}),S4:component(median(marginChange),coverage(marginChangeEligible,nonFinancialCount),{eligibleCount:marginChangeEligible}),S5:component(median(fcfMargin),coverage(fcfEligible,nonFinancialCount),{eligibleCount:fcfEligible}),S6:component(bea,finite(bea)?1:0),S7:component(breadth(epsUp,epsEligible),coverage(epsEligible,issuerCount)),S8:component(breadth(profitable,netEligible),coverage(netEligible,issuerCount)),S9:component(breadth(sectorUp,sectorRows.length),sectorRows.length?1:null),S10:component(finalS10,finalS10Coverage,{eligibleIndustryCount:eligibleIndustries,totalIndustryCount:Array.isArray(producerIndustries)?producerIndustries.length:0}),S11:component(unitLaborCostYoY,finite(unitLaborCostYoY)?1:0),
  };
  const missing=Object.entries(components).filter(([,value])=>!finite(value.raw)).map(([key])=>key);
  return {status:missing.length?"PARTIAL":"READY",missing,components,quality:{issuerCount,nonFinancialCount,sectorCount:sectorRows.length}};
}
