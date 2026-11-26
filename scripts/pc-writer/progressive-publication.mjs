import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';

// Only sources modified by the intervening auxiliary stages are included.
// Unknown checkpoint means recalculate; never assume missing input is unchanged.
export function auxiliaryInputCheckpoint(base){
 let db;
 try{
  db=new DatabaseSync(path.join(base,'storage','core.sqlite'),{readOnly:true});
  db.exec('PRAGMA query_only=ON; PRAGMA busy_timeout=30000;');
  const outputs=db.prepare("SELECT feed_key,snapshot_key,body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' ORDER BY feed_key,snapshot_key").all();
  const file=path.join(base,'supply-r10','inputs.json');
  const supply=fs.existsSync(file)?fs.readFileSync(file,'utf8'):null;
  // The S&P 500 shadow input is collected between the early and final Writer
  // passes. Include its actual stored checkpoint; otherwise fresh market-price
  // observations could be mistaken for unchanged auxiliary inputs and the
  // final R10 calculation/publication would be skipped.
  const hasInputTable=db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='market_input_batches_v1'").get();
  const sp500=hasInputTable?db.prepare("SELECT batch_key,body,stored_at FROM market_input_batches_v1 WHERE batch_key LIKE 'shadowSp500Benchmark:%' ORDER BY stored_at DESC LIMIT 1").get()??null:null;
  return createHash('sha256').update(JSON.stringify({outputs,supply,sp500})).digest('hex');
 }catch{return null;}finally{db?.close();}
}

// Private Core checkpoint diagnostics: these timings measure the existing
// early/final Writer and auxiliary paths without changing their call order.
export async function progressivePublication({enabled,publish,collectAuxiliary,checkpoint}){
 const clock=()=>process.hrtime.bigint();
 const ms=started=>Math.max(0,Number((clock()-started)/1_000_000n));
 const totalStart=clock();
 const readCheckpoint=async()=>{try{return await checkpoint();}catch{return null;}};
 const earlyStart=clock();
 const early=enabled?await publish({early:true}):null;
 const earlyPublicationMs=enabled?ms(earlyStart):null;
 const earlyVerifiedAt=early?.status===0?new Date().toISOString():null;
 const beforeStart=clock();
 const before=enabled&&early?.status===0?await readCheckpoint():null;
 const beforeCheckpointMs=enabled&&early?.status===0?ms(beforeStart):0;
 const auxiliaryStartedAt=new Date().toISOString();
 const auxiliaryStart=clock();
 let auxiliary;
 try{auxiliary=await collectAuxiliary();}catch{auxiliary={status:'FAILED_PREVIOUS_INPUTS_PRESERVED'};}
 const auxiliaryMs=ms(auxiliaryStart);
 const afterStart=clock();
 const after=before===null?null:await readCheckpoint();
 const afterCheckpointMs=before===null?0:ms(afterStart);
 const unchanged=before!==null&&after!==null&&before===after;
 const finalStart=clock();
 const final=unchanged?early:await publish({early:false});
 const finalPublicationMs=unchanged?0:ms(finalStart);
 return {publication:final,auxiliary,progressive:{
  enabled,earlyExit:early?.status??null,earlyVerifiedAt,auxiliaryStartedAt,
  auxiliaryStatus:auxiliary?.status??'COMPLETE',
  finalSkipped:unchanged,reason:unchanged?'AUXILIARY_INPUTS_UNCHANGED':before===null?'CHECKPOINT_UNAVAILABLE_OR_EARLY_NOT_VERIFIED':'AUXILIARY_INPUTS_CHANGED',
  stageTiming:{scope:'MONOTONIC_CORE_PROGRESSIVE_PUBLICATION_ONLY',
   totalMs:ms(totalStart),earlyPublicationMs,auxiliaryMs,
   checkpointMs:beforeCheckpointMs+afterCheckpointMs,finalPublicationMs},
 }};
}
