import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {hash} from './store.mjs';
import {classifyR2Article,buildReferenceFlowR2,CLASSIFIER_VERSION} from '../../lib/iran-progress/reference-flow-r2.mjs';

// A read-only replay: do not openStore() or mutate the R1 database/checkpoints.
export function replayStoredR2(db,{now=Date.now()}={}){
 const latest=new Map();
 for(const row of db.prepare("SELECT id,body,stored_at FROM sources WHERE id LIKE 'news-metadata:%' ORDER BY stored_at,id").all()){
  const article=JSON.parse(row.body);
  if(row.id!=='news-metadata:'+hash(article))throw Error('R2_RECEIPT_HASH_MISMATCH');
  if(!article.sourceUrl||!article.date||typeof article.title!=='string')throw Error('R2_RECEIPT_INVALID');
  latest.set(article.sourceUrl,{article,receiptHash:hash(article),storedAt:row.stored_at});
 }
 const decisions=[...latest.values()].map(({article,receiptHash})=>({receiptHash,classifierVersion:CLASSIFIER_VERSION,sourceUrl:article.sourceUrl,...classifyR2Article(article)}));
 const result=buildReferenceFlowR2(decisions,{asOfDate:new Date(now).toISOString().slice(0,10)});
 const reasons={};for(const d of decisions)if(!d.accepted)reasons[d.reason]=(reasons[d.reason]??0)+1;
 const old=db.prepare('SELECT body FROM checkpoints WHERE name=?').get('reference-flow-last-valid-r1');
 const r1=old?JSON.parse(old.body):null;
 const {ledger,...projection}=result;
 return {mode:'READ_ONLY_REPLAY',classifierVersion:CLASSIFIER_VERSION,calculatedAt:now,
  inputCount:latest.size,accepted:decisions.filter(d=>d.accepted).length,excludedReasons:reasons,
  r1:r1?{version:r1.version,rawScore:r1.score,displaySensitivity:r1.displaySensitivity,asOfDate:r1.asOfDate}:null,
  r2:{...projection,events:ledger.map(({evidence,...e})=>e)},
  decisions:decisions.map(({evidence,...d})=>d),
  productionReady:false,remainingGates:['MULTISOURCE_DISCOVERY','SEMANTIC_EVENT_REVIEW','PUBLIC_CONTRACT','RUNTIME_AND_UI']};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,input,output]=process.argv.slice(2);
 if(mode!=='--replay'||!input||!output||path.resolve(input)===path.resolve(output))throw Error('R2_REPLAY_ARGS_INVALID');
 if(!fs.existsSync(input))throw Error('R2_INPUT_MISSING');
 const db=new DatabaseSync(input,{readOnly:true});
 try{const report=replayStoredR2(db);fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify({mode:report.mode,inputCount:report.inputCount,accepted:report.accepted,r1RawScore:report.r1?.rawScore,r2RawScore:report.r2.score,productionReady:false}));}finally{db.close();}
}
