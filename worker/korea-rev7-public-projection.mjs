import {Rev7D1Store} from './korea-rev7-d1.mjs';
import {calculateRev7,REV7_VERSION} from './korea-rev7-engine.mjs';

const finite=x=>typeof x==='number'&&Number.isFinite(x);

export function buildHistoricalSnapshotRecords(result,calculatedAt=new Date().toISOString()){
  if(result?.methodologyVersion!==REV7_VERSION)throw Error('REV7_VERSION_MISMATCH');
  return (result.history??[]).filter(point=>finite(point?.composite)).map(point=>({
    date:point.date,
    methodologyVersion:REV7_VERSION,
    factorsJson:JSON.stringify(point.factors),
    compositeJson:JSON.stringify({
      id:result.id,score:point.composite,status:point.status,
      observationDate:point.date,weights:result.weights,
    }),
    historyMode:result.historyMode,
    pointInTimeVerified:result.pointInTimeVerified?1:0,
    sourceObservedAt:point.date,
    calculatedAt,
  }));
}

export async function populateHistoricalSnapshots(env,context={}){
  if(!env?.DB?.prepare||!env?.DB?.batch)throw Error('INVALID_D1_CONFIGURATION');
  const store=context.store??new Rev7D1Store(env.DB);
  const calculate=context.calculate??calculateRev7;
  const progress=await store.getBackfillProgress();
  if(progress?.status!=='COMPLETE'||Number(progress?.successfulTradingDates)<1030)
    throw Error('REV7_BACKFILL_NOT_COMPLETE');

  const history=await store.getHistory(1030);
  const result=calculate(history);
  const latest=await store.getLatestSnapshot();
  if(!latest||latest.methodologyVersion!==REV7_VERSION||latest.date!==result.observationDate||
     !finite(latest?.composite?.score)||!finite(result.score)||
     Math.abs(latest.composite.score-result.score)>1e-9)
    throw Error('REV7_LATEST_SNAPSHOT_MISMATCH');

  const records=buildHistoricalSnapshotRecords(result,context.calculatedAt??new Date().toISOString());
  let inserted=0,attempted=0;
  for(let offset=0;offset<records.length;offset+=40){
    const chunk=records.slice(offset,offset+40);
    const statements=chunk.map(row=>env.DB.prepare(`INSERT OR IGNORE INTO kfg_rev7_snapshots
      (date,methodology_version,factors_json,composite_json,history_mode,point_in_time_verified,source_observed_at,calculated_at)
      VALUES (?,?,?,?,?,?,?,?)`).bind(
        row.date,row.methodologyVersion,row.factorsJson,row.compositeJson,row.historyMode,
        row.pointInTimeVerified,row.sourceObservedAt,row.calculatedAt
      ));
    const results=await env.DB.batch(statements);
    attempted+=chunk.length;
    inserted+=results.reduce((sum,item)=>sum+Number(item?.meta?.changes??0),0);
  }
  const countRow=await env.DB.prepare(`SELECT COUNT(*) AS count,MIN(date) AS oldest,MAX(date) AS latest
    FROM kfg_rev7_snapshots WHERE methodology_version=?`).bind(REV7_VERSION).first();
  return {
    methodologyVersion:REV7_VERSION,status:'COMPLETE',
    readyDates:records.length,attempted,inserted,
    persistedCount:Number(countRow?.count??0),oldest:countRow?.oldest??null,latest:countRow?.latest??null,
    providerRequests:0,krxRequests:0,bokRequests:0,
    researchOnly:true,productionEligible:false,
  };
}
