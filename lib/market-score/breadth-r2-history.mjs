import {finalizeBreadthR2Runtime} from './breadth-r2-method-r1.mjs';
import {BREADTH_R2_RUNTIME_VERSION} from './breadth-r2-runtime.mjs';

const dateOk=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value));

// Actual collected daily snapshots only; never backdate today's inputs.
export function breadthSnapshotTrend(snapshots,current,asOf){
  const days=new Map();
  const start=new Date(Date.parse(asOf)-365*86400000).toISOString().slice(0,10);
  const add=result=>{
    const day=result?.runtime?.asOfDate;
    if(!dateOk(day)||day<start||day>asOf)return;
    const final=finalizeBreadthR2Runtime(result);
    if(final.status==='READY')days.set(day,{label:day,value:final.score});
    else days.delete(day);
  };
  for(const snapshot of [...snapshots].sort((a,b)=>String(a.cachedAt).localeCompare(String(b.cachedAt)))){
    if(snapshot?.runtimeResult?.runtimeVersion!==BREADTH_R2_RUNTIME_VERSION)continue;
    add(snapshot.runtimeResult);
  }
  add(current);
  return [...days.values()].sort((a,b)=>a.label.localeCompare(b.label));
}

export async function readBreadthSnapshotTrend(db,current,asOf){
  const start=new Date(Date.parse(asOf)-365*86400000).toISOString().slice(0,10);
  const rows=await db.prepare(`SELECT body_json FROM market_score_breadth_r2_snapshot_v1
    WHERE cache_key LIKE ? AND cached_at >= ?
    ORDER BY cached_at DESC LIMIT 800`).bind(`${BREADTH_R2_RUNTIME_VERSION}|%`,start).all();
  const snapshots=[];
  for(const row of rows.results??[]){
    try{snapshots.push(JSON.parse(row.body_json));}catch{/* Ignore corrupt historical entries. */}
  }
  return breadthSnapshotTrend(snapshots,current,asOf);
}
