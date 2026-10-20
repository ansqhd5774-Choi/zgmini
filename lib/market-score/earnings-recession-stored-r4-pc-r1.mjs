// PC-only read path. Replays the unchanged approved E1-R4 four-input
// diagnostic evidence from local SEC-derived SQLite facts. Never publish raw
// issuer rows, and do not imply that revised current-vintage data is PIT.
import {buildEarningsE1R4} from "./earnings-e1-r4.mjs";
import {latestMatureFrame,MATURE_LAG_DAYS} from "./sec-earnings-e1-r2-provider.mjs";
export const RISK_R4_PERIOD_RECONSTRUCTION="E1_R4_STORED_PERIOD_CURRENT_VINTAGE_NOT_PIT";
const IDS=["epsGrowth","margin","revenueGrowth","earningsGrowthBreadth"];
const finite=x=>typeof x==="number"&&Number.isFinite(x)&&x>=0&&x<=100;
const validDate=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x+"T00:00:00Z"));
const empty=(reason,period=null)=>({status:"PARTIAL",methodologyVersion:"E1-R4",reason,
 financialPeriodEnd:period,score:null,factors:[],periodTrend:[],historyKind:null,
 historyMode:"CURRENT_VINTAGE_NOT_PIT",sourceStoredAt:null});
export async function readStoredEarningsRiskFourFactor({db,asOf}={}){
 if(!db||typeof db.prepare!=="function"||!validDate(asOf))return empty("INVALID_SOURCE_OR_DATE");
 const frame=latestMatureFrame(asOf,{lagDays:MATURE_LAG_DAYS});
 if(!frame)return empty("NO_MATURE_FINANCIAL_FRAME");
 // Query only pre-existing PC storage tables. The general-purpose
 // createEarningsE1R3D1Store getters are unsuitable here: they implicitly run
 // schema-creating initialization even when callers perform only reads.
 let periods;
 try{
  const result=await db.prepare(`SELECT u.period_end,u.retrieved_at,u.security_count,u.issuer_count,
    u.wikipedia_revision_id,
    (SELECT MAX(r.completed_at) FROM market_score_earnings_e1_r3_runs_v1 r
      WHERE r.period_end=u.period_end AND r.status='SUCCESS') AS completed_at
    FROM market_score_earnings_e1_r3_universe_v1 u
    WHERE u.period_end<=?
      AND EXISTS(SELECT 1 FROM market_score_earnings_e1_r3_current_v1 c WHERE c.period_end=u.period_end)
      AND EXISTS(SELECT 1 FROM market_score_earnings_e1_r3_runs_v1 r WHERE r.period_end=u.period_end AND r.status='SUCCESS')
    ORDER BY u.period_end DESC LIMIT 20`).bind(asOf).all();
  periods=Array.isArray(result?.results)?result.results:[];
 }catch{return empty("STORED_E1_R4_SOURCE_TABLES_MISSING",frame.end);}
 const selected=periods.filter(row=>row.period_end<=frame.end);
 const scores=[];
 for(const p of selected){
  let universe,facts,run;
  try{
   const [u,fr,success]=await Promise.all([
    db.prepare('SELECT body_json,security_count,issuer_count,wikipedia_revision_id,retrieved_at FROM market_score_earnings_e1_r3_universe_v1 WHERE period_end=? LIMIT 1').bind(p.period_end).first(),
    db.prepare('SELECT period_end,cik,metric,value FROM market_score_earnings_e1_r3_current_v1 WHERE period_end=? ORDER BY metric,cik').bind(p.period_end).all(),
    db.prepare("SELECT * FROM market_score_earnings_e1_r3_runs_v1 WHERE period_end=? AND status='SUCCESS' ORDER BY completed_at DESC LIMIT 1").bind(p.period_end).first(),
   ]);
   const parsed=u?.body_json?JSON.parse(u.body_json):null;
   universe={...parsed,securityCount:u?.security_count,retrievedAt:u?.retrieved_at};
   facts=Array.isArray(fr?.results)?fr.results:[];
   run=success;
  }catch{continue;}
  if(!universe?.members?.length||!facts?.length||run?.status!=="SUCCESS")continue;
  const map=new Map(facts.map(r=>[`${r.cik}|${r.metric}`,Number(r.value)]));
  const issuerRows=universe.members.map(m=>({
   cik:m.cik,epsGrowth:map.get(`${m.cik}|epsGrowth`)??null,
   revenueGrowth:map.get(`${m.cik}|revenueGrowth`)??null,
   operatingMargin:map.get(`${m.cik}|operatingMargin`)??null,
  }));
  // Existing scorer, weights, calibration and coverage gates are unchanged.
  const scored=buildEarningsE1R4({
   asOfDate:asOf,financialPeriodEnd:p.period_end,issuerRows,
   universeMeta:{securityCount:universe.securityCount,
    validCikSecurityCount:universe.members.length,uniqueIssuerCount:universe.members.length},
   retrievedAt:run.completed_at??p.completed_at??universe.retrievedAt,
  });
  if(scored.status!=="READY"||!finite(scored.score))continue;
  const factors=IDS.map(id=>({id,score:scored.components?.[id]?.score}));
  if(!factors.every(row=>finite(row.score)))continue;
  scores.push({periodEnd:p.period_end,score:scored.score,factors,
   sourceStoredAt:run.completed_at??p.completed_at??null});
 }
 const latest=scores.find(row=>row.periodEnd===frame.end);
 if(!latest)return empty("LATEST_MATURE_PERIOD_NOT_READY",frame.end);
 const sum=latest.factors.reduce((s,r,i)=>s+[0.35,0.25,0.20,0.20][i]*r.score,0);
 if(Math.abs(sum-latest.score)>1e-7)return empty("CURRENT_FOUR_FACTOR_PARITY_MISMATCH",frame.end);
 const cutoff=new Date(Date.parse(asOf+"T00:00:00Z"));cutoff.setUTCFullYear(cutoff.getUTCFullYear()-1);
 const since=cutoff.toISOString().slice(0,10);
 const periodTrend=scores.filter(row=>row.periodEnd>=since&&row.periodEnd<=asOf)
   .map(row=>({date:row.periodEnd,score:row.score}))
   .sort((a,b)=>a.date.localeCompare(b.date));
 return {
  status:"READY",methodologyVersion:"E1-R4",score:latest.score,
  financialPeriodEnd:frame.end,factors:latest.factors,
  periodTrend,historyKind:RISK_R4_PERIOD_RECONSTRUCTION,
  historyMode:"CURRENT_VINTAGE_NOT_PIT",sourceStoredAt:latest.sourceStoredAt,
 };
}
