// W06 R4 #49 — display-only provenance guard for the economic12 CM-R1
// *four-factor* inflation domain. The separate risk Inflation R2 must never
// be relabeled as the economic domain or used as its one-year history.
import {
 LEGACY_MARKET_INFLATION_METHOD,LEGACY_MARKET_INFLATION_PARTS,
} from './market-score/inflation-legacy-public-domain.mjs';
const score=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)
 &&Number.isFinite(Date.parse(x+'T00:00:00Z'))
 &&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;

export function verifiedEconomicInflationScore(domain,asOf){
 if(domain?.id!=='inflation'||domain.status!=='READY'
  ||domain.methodologyVersion!==LEGACY_MARKET_INFLATION_METHOD
  ||domain.freshness!=='CURRENT_VINTAGE_ONLY'
  ||!score(domain.score)||!date(asOf)
  ||!Array.isArray(domain.indicators)
  ||domain.indicators.length!==LEGACY_MARKET_INFLATION_PARTS.length)
  return null;
 let expected=0;
 for(let i=0;i<LEGACY_MARKET_INFLATION_PARTS.length;i++){
  const row=domain.indicators[i],part=LEGACY_MARKET_INFLATION_PARTS[i];
  if(row?.id!==part.id||row.status!=='READY'||!score(row.score)
   ||!date(row.observationDate)||row.observationDate>asOf)return null;
  expected+=row.score*part.weight;
 }
 return Math.abs(expected-domain.score)<=1e-6?domain.score:null;
}
export function verifiedEconomicInflationChart(domain,asOf,currentScore){
 if(!score(currentScore)||verifiedEconomicInflationScore(domain,asOf)!==currentScore)return [];
 const byDay=new Map(),conflicts=new Set();
 for(const row of Array.isArray(domain.trend)?domain.trend:[]){
  const d=row?.date??row?.label;
  if(!date(d)||d>asOf)continue;
  // Explicit missing published scores are a chart gap, not zero.
  const value=row?.score===null?null:(row?.score??row?.value);
  const valid=value===null||score(value);
  if(!valid)continue;
  if(byDay.has(d)&&byDay.get(d)!==value){conflicts.add(d);continue;}
  byDay.set(d,value);
 }
 if(conflicts.size)return [];
 const current=byDay.get(asOf);
 if(!score(current)||Math.abs(current-currentScore)>1e-6)return [];
 const start=new Date(asOf+'T00:00:00Z');
 start.setUTCFullYear(start.getUTCFullYear()-1);
 return [...byDay].filter(([d])=>d>=start.toISOString().slice(0,10))
  .sort(([a],[b])=>a.localeCompare(b))
  .map(([date,score])=>({date,score}));
}
