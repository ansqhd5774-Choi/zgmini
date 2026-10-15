import {nextArrowState,SCORE_ARROW_VERSION} from '../../lib/market-score/score-arrow.mjs';
import {amplifyCompositeDisplayScore} from '../../lib/market-score/composite-display-sensitivity-r1.mjs';
export const ARROW_KEYS=Object.freeze({core:'public:score-arrow:core:v1',iran:'public:score-arrow:iran:v1'});
// Separate writer partitions and compare-and-swap prevent overlapping jobs from renewing a change.
export async function publishArrowState(remote,database,partition,samples,now=Date.now()){
 const key=ARROW_KEYS[partition];if(!key)throw Error('ARROW_PARTITION_INVALID');
 const old=(await remote.query(database,'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?',[key])).results[0];
 const previous=old?JSON.parse(old.body):null;
 if(old?.stored_at>=now)return {status:'NEWER_PRESERVED'};
 const body=nextArrowState(previous,samples,now),encoded=JSON.stringify(body);
 await remote.request(database,[{sql:'INSERT INTO market_public_snapshots_v1(snapshot_key,body,stored_at) SELECT ?,?,? WHERE NOT EXISTS(SELECT 1 FROM market_public_snapshots_v1 WHERE snapshot_key=?) OR EXISTS(SELECT 1 FROM market_public_snapshots_v1 WHERE snapshot_key=? AND body=?) ON CONFLICT(snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at WHERE market_public_snapshots_v1.body=?',params:[key,encoded,now,key,key,old?.body??'',old?.body??'']}]);
 const check=(await remote.query(database,'SELECT body FROM market_public_snapshots_v1 WHERE snapshot_key=?',[key])).results[0];
 if(check?.body!==encoded)throw Error('ARROW_PUBLICATION_READBACK_FAILED');
 return {status:'VERIFIED',version:SCORE_ARROW_VERSION,entries:Object.keys(body.entries).length};
}
export async function publishCoreArrowState(remote,database,now=Date.now()){
 const rows=(await remote.query(database,"SELECT snapshot_key,body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key IN ('current','public:rate-sentiment:v1','public:korea-fear-greed:v1')")).results;
 const samples={};
 for(const row of rows){
  const body=JSON.parse(row.body),sourceAt=row.stored_at;
  if(row.snapshot_key==='current'&&body.overall?.status==='READY')samples.composite={score:amplifyCompositeDisplayScore(body.overall.score),sourceAt,method:'COMPOSITE_DISPLAY_R1'};
  if(row.snapshot_key==='current')for(const d of body.domains??[])if(d.status==='READY')samples['domain:'+d.id]={score:d.score,sourceAt,method:d.version??d.methodologyVersion??null};
  if(row.snapshot_key==='public:rate-sentiment:v1'&&body.status==='READY')samples.rate={score:body.score,sourceAt,method:body.version};
  if(row.snapshot_key==='public:korea-fear-greed:v1'){
   const c=body.payload?.composite;if(c?.status==='READY')samples.korea={score:c.displayScore,sourceAt,method:c.methodologyVersion};
  }
 }
 const usa=(await remote.query(database,"SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key='fear-greed' AND snapshot_key='current'")).results[0];
 if(usa){const b=JSON.parse(usa.body);if(b.status==='verified')samples.usa={score:b.score,sourceAt:usa.stored_at,method:'CNN'};}
 return publishArrowState(remote,database,'core',samples,now);
}
