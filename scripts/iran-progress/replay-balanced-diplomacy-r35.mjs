// Read-only replay. Never acquires a writer lease, fetches providers, or publishes.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {hash} from './store.mjs';
import {storedR3Candidates,resolveR3Events} from './operate-r3.mjs';
import {resolveReviewedR5SourceRevision} from './operate-r5.mjs';
import {independentlyCorroboratedR5Positives} from '../../lib/iran-progress/verified-positive-r5.mjs';
import {calculateIranDailyAnchorShadow} from '../../lib/iran-progress/daily-anchored-shadow-r5.mjs';
export function replayBalancedDiplomacy(db,{asOfDate}={}){
 const getCheckpoint=name=>{const row=db.prepare('SELECT body FROM checkpoints WHERE name=?').get(name);return row?JSON.parse(row.body):null;};
 const store={db,getCheckpoint},versions=new Map();
 for(const row of db.prepare("SELECT id,body,stored_at FROM sources WHERE id LIKE 'news-metadata:%' ORDER BY stored_at,id").all()){
  const article=JSON.parse(row.body);if(row.id!=='news-metadata:'+hash(article))throw Error('R35_RECEIPT_HASH_MISMATCH');
  const rows=versions.get(article.sourceUrl)??[];rows.push({article,storedAt:row.stored_at});versions.set(article.sourceUrl,rows);
 }
 const all=storedR3Candidates(store),resolved=resolveR3Events(all);
 const events=independentlyCorroboratedR5Positives(resolved.accepted,all).map(e=>{
  const rows=versions.get(e.sourceUrl);if(!rows?.length)throw Error('R35_RECEIPT_MISSING '+e.sourceUrl+' '+e.evidence);
  const distinct=[...new Map(rows.map(r=>[JSON.stringify([r.article.title,r.article.date]),r.article])).values()];
  const event=distinct.length>1?resolveReviewedR5SourceRevision(e,distinct):e;
  return {...event,sourceStoredAt:rows[0].storedAt};
 });
 const calculate=evidencePolicy=>calculateIranDailyAnchorShadow(events,{asOfDate,sensitivityScale:21,evidencePolicy});
 const legacy=calculate('LEGACY_R5_1'),balanced=calculate('BALANCED_REPORTED_STAGES_R5_2');
 const stored=getCheckpoint('reference-flow-last-valid-r5');
 return {mode:'READ_ONLY_STORED_REPLAY_NOT_PRODUCTION',asOfDate,storedPublicScore:stored?.score??null,
  sameInputsLegacyScore:legacy.score,balancedScore:balanced.score,change: Number((balanced.score-legacy.score).toFixed(2)),
  stageDeltasChanged:false,weightsChanged:false,anchorChanged:false,scaleChanged:false,
  events:events.length,positiveEvents:events.filter(e=>e.delta>0).map(e=>({date:e.date,title:e.evidence,rule:e.rule,domainDelta:e.delta,sourceUrl:e.sourceUrl,eventVerified:e.eventVerified})),
  possibleDuplicates:resolved.held,history:balanced.history,
  latePriorPublicationDateCount:balanced.latePriorPublicationDateCount,potentialCasualtyRevisionCount:balanced.potentialCasualtyRevisionCount,
  providerCalls:0,sqliteWrites:0,d1Writes:0};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [input,asOfDate,output]=process.argv.slice(2);if(!input||!asOfDate||!output||path.resolve(input)===path.resolve(output))throw Error('R35_REPLAY_ARGS_INVALID');
 const db=new DatabaseSync(input,{readOnly:true});try{db.exec('PRAGMA query_only=ON');const result=replayBalancedDiplomacy(db,{asOfDate});fs.writeFileSync(output,JSON.stringify(result,null,2));console.log(JSON.stringify({...result,history:undefined}));}finally{db.close();}
}
