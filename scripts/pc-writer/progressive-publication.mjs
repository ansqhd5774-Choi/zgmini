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
  return createHash('sha256').update(JSON.stringify({outputs,supply})).digest('hex');
 }catch{return null;}finally{db?.close();}
}

export async function progressivePublication({enabled,publish,collectAuxiliary,checkpoint}){
 const readCheckpoint=async()=>{try{return await checkpoint();}catch{return null;}};
 const early=enabled?await publish({early:true}):null;
 const earlyVerifiedAt=early?.status===0?new Date().toISOString():null;
 const before=enabled&&early?.status===0?await readCheckpoint():null;
 const auxiliaryStartedAt=new Date().toISOString();
 let auxiliary;
 try{auxiliary=await collectAuxiliary();}catch{auxiliary={status:'FAILED_PREVIOUS_INPUTS_PRESERVED'};}
 const after=before===null?null:await readCheckpoint();
 const unchanged=before!==null&&after!==null&&before===after;
 const final=unchanged?early:await publish({early:false});
 return {publication:final,auxiliary,progressive:{
  enabled,earlyExit:early?.status??null,earlyVerifiedAt,auxiliaryStartedAt,
  auxiliaryStatus:auxiliary?.status??'COMPLETE',
  finalSkipped:unchanged,reason:unchanged?'AUXILIARY_INPUTS_UNCHANGED':before===null?'CHECKPOINT_UNAVAILABLE_OR_EARLY_NOT_VERIFIED':'AUXILIARY_INPUTS_CHANGED',
 }};
}
