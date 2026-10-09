import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {fileURLToPath} from 'node:url';import {randomUUID} from 'node:crypto';
import {openStore,hash} from './store.mjs';
import {classifyFlowCandidate,buildReferenceFlow} from '../../lib/iran-progress/reference-flow-r1.mjs';
import {publishReferenceFlow} from './publication.mjs';
import {client,credential} from '../pc-writer/d1.mjs';
import {REVIEWED_FLOW_KEY,reviewedSignals} from './reviewed-flow.mjs';
import {FLOW_RULES} from '../../lib/iran-progress/reference-flow-r1.mjs';
export function calculateStoredFlow(store,now=Date.now(),{collectionFailed=false}={}){
 const evaluation=store.getCheckpoint('article-ai-evaluation-r14');
 if(!evaluation||evaluation.status!=='PASS')throw Error('FLOW_ARTICLE_EVALUATION_PENDING');
 const feeds=['mofa','govuk'].map(s=>store.getCheckpoint('article-feed:'+s));
 const collectionOk=!collectionFailed&&feeds.every(f=>f?.sourceId&&Number.isFinite(f.checkedAt)&&now-f.checkedAt>=0&&now-f.checkedAt<=86400000);
 const previous=store.getCheckpoint('reference-flow-last-valid-r1');
 if(!collectionOk)return buildReferenceFlow([],{collectionOk:false,previousResult:previous});
 const events=[],seen=new Set();let articleCount=0,candidateCount=0;
 for(const row of store.db.prepare("SELECT body FROM decisions WHERE id LIKE 'article-ai:%' ORDER BY stored_at DESC").all()){
  const d=JSON.parse(row.body);
  if(d.promptVersion!==evaluation.promptVersion||d.modelDigest!==evaluation.modelDigest||seen.has(d.sourceId))continue;
  const r=store.db.prepare('SELECT body FROM sources WHERE id=?').get(d.sourceId);if(!r)continue;
  const source=JSON.parse(r.body);
  if(d.sourceHash!==hash(source.text)||!source.rightsReceiptId||!store.db.prepare('SELECT id FROM sources WHERE id=?').get(source.rightsReceiptId))continue;
  seen.add(d.sourceId);articleCount++;
  for(const c of d.candidates??[]){candidateCount++;const e=classifyFlowCandidate(c,source);if(e.accepted)events.push(e);}
 }
 if(!articleCount)throw Error('FLOW_NO_SUPPORTED_ARTICLES');
 const reviewed=reviewedSignals(store.getCheckpoint(REVIEWED_FLOW_KEY));
 const result=buildReferenceFlow([...events,...reviewed],{asOfDate:new Date(now).toISOString().slice(0,10),sensitivity:1});
 const body={...result,displaySensitivity:3,publishedAt:now,collectionCheckedAt:Math.min(...feeds.map(f=>f.checkedAt)),articleCount,candidateCount,
  reviewedMethod:reviewed.length?'REVIEWED_NEWS_FLOW_STEP6':null,
  reviewedSignals:result.ledger.filter(e=>reviewed.some(r=>r.rule===e.rule&&r.date===e.date&&r.sourceUrl===e.sourceUrl)).map(({evidence,...e})=>e),
  events:result.ledger.filter(e=>FLOW_RULES.some(r=>r.id===e.rule)&&/^https:\/\/(?:www\.mofa\.go\.jp|www\.gov\.uk)\//.test(e.sourceUrl)&&Date.parse(e.date+'T00:00:00Z')>=Date.parse(result.asOfDate+'T00:00:00Z')-13*86400000).slice(-100).map(({evidence,...e})=>e)};
 delete body.ledger;
 return body;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const mode=process.argv[2];if(!['--preview','--publish'].includes(mode))throw Error('FLOW_ARGS_INVALID');
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
 const base=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13');
 const store=openStore(path.join(base,'iran.sqlite')),owner=randomUUID(),now=Date.now();
 try{
  if(!store.claim(owner,now))throw Error('FLOW_LEASE_HELD');
  const body=calculateStoredFlow(store,now,{collectionFailed:process.argv.includes('--collection-failed')});
  if(mode==='--preview')console.log(JSON.stringify(body));
  else{
   const config=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.zgmini','pc-writer','config.json'),'utf8'));
   const result=await publishReferenceFlow(client(config,credential(root)),config.core,body,{now});
   if(!['VERIFIED','UNCHANGED'].includes(result.status))throw Error('FLOW_REMOTE_NEWER_PRESERVED');
   if(body.status==='REFERENCE')store.checkpoint('reference-flow-last-valid-r1',body);
   store.checkpoint('reference-flow-publication-r1',{...result,score:body.score,eventCount:body.eventCount});
   console.log(JSON.stringify({...result,score:body.score,eventCount:body.eventCount}));
  }
 }finally{store.release(owner);store.close();}
}
