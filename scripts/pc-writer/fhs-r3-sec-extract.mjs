// SEC CompanyFacts -> strict same-annual-filing R3 score input. Pure, no I/O.
// SEC API omits dimensions and custom tags; all outputs remain provisional.
import {validDay} from './fhs-r3-score.mjs';
const FIELDS={
 assets:[['us-gaap','Assets'],['ifrs-full','Assets']],
 previousAssets:[['us-gaap','Assets'],['ifrs-full','Assets']],
 currentAssets:[['us-gaap','AssetsCurrent'],['ifrs-full','CurrentAssets']],
 currentLiabilities:[['us-gaap','LiabilitiesCurrent'],['ifrs-full','CurrentLiabilities']],
 cash:[['us-gaap','CashAndCashEquivalentsAtCarryingValue'],['ifrs-full','CashAndCashEquivalents']],
 totalLiabilities:[['us-gaap','Liabilities'],['ifrs-full','Liabilities']],
 operatingCashFlow:[['us-gaap','NetCashProvidedByUsedInOperatingActivities'],['ifrs-full','CashFlowsFromUsedInOperatingActivities']],
 previousOperatingCashFlow:[['us-gaap','NetCashProvidedByUsedInOperatingActivities'],['ifrs-full','CashFlowsFromUsedInOperatingActivities']]
};
const FORMS=new Set(['10-K','10-K/A','10-KT','20-F','20-F/A','40-F','40-F/A']);
const d=(x,y)=>Math.floor((Date.parse(x)-Date.parse(y))/86400000);
const stop=(reason)=>({status:'NOT_READY',reason});
function fields(doc,key){
 const list=[];
 for(const [tax,tag] of FIELDS[key])for(const row of doc?.facts?.[tax]?.[tag]?.units?.USD??[]){
  if(row&&typeof row.val==='number'&&Number.isFinite(row.val)&&validDay(row.end)&&validDay(row.filed)&&FORMS.has(row.form))list.push({...row,tax,tag});
 }
 return list;
}
const annualFlow=x=>validDay(x.start)&&x.start<x.end&&d(x.end,x.start)>=320&&d(x.end,x.start)<=400;
const instant=x=>x.start==null;
function choose(data,key,{asOf,end,accn,flow=false,filingLock=true}){
 const valid=fields(data,key).filter(x=>x.end===end&&x.filed<=asOf&&x.end<=asOf&&
   (flow?annualFlow(x):instant(x))&&(!filingLock||x.accn===accn));
 if(!valid.length)return stop('MISSING_'+key.toUpperCase());
 valid.sort((a,b)=>b.filed.localeCompare(a.filed)||String(b.accn??'').localeCompare(String(a.accn??'')));
 // A different value for the same period in the chosen report is an unresolved conflict.
 const latest=filingLock?valid:valid.filter(x=>x.filed===valid[0].filed);
 if(new Set(latest.map(x=>x.val)).size>1)return stop('CONFLICT_'+key.toUpperCase());
 return {status:'OK',val:latest[0].val,filed:latest[0].filed};
}
export function extractFhsR3Annual(doc,cik,asOf){
 if(!validDay(asOf))return stop('INVALID_ASOF');
 if(String(doc?.cik??'').padStart(10,'0')!==cik)return stop('CIK_MISMATCH');
 const candidates=fields(doc,'assets').filter(x=>instant(x)&&x.val>0&&x.filed<=asOf&&x.end<=asOf&&typeof x.accn==='string'&&x.accn.length>0);
 candidates.sort((a,b)=>b.end.localeCompare(a.end)||b.filed.localeCompare(a.filed));
 const anchor=candidates[0];if(!anchor)return stop('NO_VERIFIABLE_ANNUAL_ANCHOR');
 if(d(asOf,anchor.end)>550)return stop('STALE_ANNUAL_ANCHOR');
 const hist=fields(doc,'previousAssets').filter(x=>instant(x)&&x.val>0&&x.end<anchor.end&&d(anchor.end,x.end)>=300&&d(anchor.end,x.end)<=430&&x.filed<=asOf);
 hist.sort((a,b)=>b.end.localeCompare(a.end)||b.filed.localeCompare(a.filed));
 const priorEnd=hist[0]?.end;if(!priorEnd)return stop('MISSING_PREVIOUS_YEAR_ASSETS');
 const target={fiscalEnd:anchor.end,previousFiscalEnd:priorEnd,filedAt:anchor.filed};
 for(const key of ['assets','currentAssets','currentLiabilities','cash','totalLiabilities','operatingCashFlow']){
  const row=choose(doc,key,{asOf,end:anchor.end,accn:anchor.accn,flow:key==='operatingCashFlow'});
  if(row.status!=='OK')return row;
  target[key]=row.val;
 }
 for(const key of ['previousAssets','previousOperatingCashFlow']){
  // Annual comparative values may appear in the latest report or in the prior year's report.
  const row=choose(doc,key,{asOf,end:priorEnd,accn:anchor.accn,filingLock:false,flow:key==='previousOperatingCashFlow'});
  if(row.status!=='OK')return row;
  target[key]=row.val;
 }
 return {status:'R3_SEC_INPUT_CANDIDATE',financial:target,
  provenance:'SEC_COMPANYFACTS_SAME_FILING_ANNUAL_CANDIDATE',
  sectorVerified:false,cashUnrestrictedVerified:false,filingContextVerified:false,
  caveat:'SEC_NON_DIMENSIONAL_FACTS; SECTOR_AND_RESTRICTED_CASH_NOT_PROVEN'};
}
