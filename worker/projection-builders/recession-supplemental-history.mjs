import {enrichLiquidityDisplayRows} from './liquidity-stored-history.mjs';
const finite=x=>typeof x==='number'&&Number.isFinite(x);
export async function readRecessionClaimsHistory(db,asOf){
 const result=await db.prepare(`WITH weeks AS (
 SELECT observation_date,SUM(value) AS total FROM market_score_employment_r4_shadow_current_v1
 WHERE logical_series_id='STATE_INITIAL_CLAIMS' AND observation_date<=?
 GROUP BY observation_date HAVING COUNT(DISTINCT geography_code)>=51
 ORDER BY observation_date DESC LIMIT 108
 ), averages AS (
 SELECT observation_date,AVG(total) OVER (ORDER BY observation_date ROWS BETWEEN 3 PRECEDING AND CURRENT ROW) AS value,
 COUNT(*) OVER (ORDER BY observation_date ROWS BETWEEN 3 PRECEDING AND CURRENT ROW) AS n,
 LAG(observation_date,3) OVER (ORDER BY observation_date) AS first_week FROM weeks
 ) SELECT observation_date AS observationDate,value FROM averages WHERE n=4 AND julianday(observation_date)-julianday(first_week)=21 ORDER BY observation_date`).bind(asOf).all();
 return result?.results??[];
}
export function buildRecessionSupplementalSources(series={},external={},claims=[]){
 const threeMonth=new Map((series.DGS3MO??[]).map(r=>[r.observationDate,r.value]));
 const curve=(series.DGS10??[]).filter(r=>finite(r.value)&&finite(threeMonth.get(r.observationDate))).map(r=>({observationDate:r.observationDate,value:r.value-threeMonth.get(r.observationDate)}));
 return {
  initialClaims:claims,
  yieldCurve:curve,
  hyCreditStress:(external.cmdiRows??[]).map(r=>({observationDate:r.observationDate,value:r.hy??r.raw?.hy})),
  creditConditions:series.NFCICREDIT??[],
 };
}
export function enrichRecessionSupplementals(rows,sources,asOf){
 return rows.map(row=>{
  const saved=sources[row.id]??[];
  const anchor=saved.find(p=>p.observationDate===row.observationDate&&finite(p.value)&&finite(row.value)&&Math.abs(p.value-row.value)<1e-8);
  if(!anchor)return {...row,previousValue:null,previousObservationDate:null,trend:[],historyStatus:saved.length?'SOURCE_MISMATCH':'NOT_CONNECTED'};
  return {...enrichLiquidityDisplayRows([row],[[saved,p=>p.value]],asOf)[0],historyStatus:'READY'};
 });
}
