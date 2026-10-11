import {collectionHealthSummary,COLLECTION_HEALTH_KEY} from '../../worker/collection-health.mjs';
import {FEED_POLICY,publicFeedStore} from '../../worker/public-feed-store.mjs';
import path from 'node:path';
import os from 'node:os';
import {readCollectionChecks} from './collection-checks.mjs';
import {readAdditionalCollectionEntries} from './additional-collection-health.mjs';

// These are collection JOBS, not a claim about every individual API series.
export const HEALTH_JOBS=['macroCredit','macro','rates','credit','supply','fundFlows','bisDsr','bisTc','earnings','consumption','breadth','inflation','employment','growth'];
export async function buildLocalCollectionHealth(core,history,now=Date.now(),base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer')){
 const entries=[];
 for(const id of HEALTH_JOBS){
  const row=await core.prepare('SELECT finished_at,status FROM market_collection_jobs_v1 WHERE job=?').bind(id).first();
  entries.push({id:'job:'+id,storedAt:row?.finished_at??null,complete:row?.status==='COMPLETE',outcome:row?.status==='COMPLETE'?'success':/FAILED|ERROR/.test(row?.status??'')?'failure':'unknown'});
 }
 for(const id of Object.keys(FEED_POLICY)){
  const row=await core.prepare("SELECT stored_at FROM public_feed_snapshots_v1 WHERE kind='input' AND feed_key=? AND snapshot_key='current'").bind(id).first();
  const output=await core.prepare("SELECT stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'").bind(id).first();
  const attempt=await core.prepare('SELECT finished_at,status FROM market_collection_jobs_v1 WHERE job=?').bind('feed:'+id).first();
  const failed=attempt?.status==='FAILED'&&attempt.finished_at>(row?.stored_at??0);
  entries.push({id:'feed:'+id,storedAt:row?.stored_at??null,lastSuccessAt:!!row&&output?.stored_at>=row.stored_at?row.stored_at:null,checkedAt:failed?attempt.finished_at:row?.stored_at??null,outcome:failed?'failure':!!row&&output?.stored_at>=row.stored_at?'success':'unknown'});
 }
 const korea=await history.prepare("SELECT fetched_at FROM kfg_rev7_market_dates WHERE status IN ('COMPLETE','NO_TRADING_OBSERVATION') ORDER BY fetched_at DESC LIMIT 1").first();
 entries.push({id:'korea',storedAt:korea?.fetched_at?Date.parse(korea.fetched_at):null,complete:!!korea});
 entries.push(...readAdditionalCollectionEntries(base));
 const checks=readCollectionChecks(base);
 return collectionHealthSummary(entries.map(entry=>{
  const check=checks[entry.id];
  const lastSuccessAt=Math.max(entry.lastSuccessAt??(entry.outcome==='success'?entry.checkedAt??entry.storedAt:0)??0,check?.lastSuccessAt??(check?.outcome==='success'?check.checkedAt:0)??0)||null;
  return {...(check&&check.checkedAt>=(entry.checkedAt??entry.storedAt??0)?{...entry,...check}:entry),lastSuccessAt};
 }),now);
}
export async function storeLocalCollectionHealth(core,history,now=Date.now(),base){
 const summary=await buildLocalCollectionHealth(core,history,now,base);
 await publicFeedStore(core).writeOutput(COLLECTION_HEALTH_KEY,summary,now);
 const check=await publicFeedStore(core).readOutput(COLLECTION_HEALTH_KEY);
 if(JSON.stringify(check?.body)!==JSON.stringify(summary))throw Error('COLLECTION_HEALTH_READBACK_FAILED');
 return summary;
}
