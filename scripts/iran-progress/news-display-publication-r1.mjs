// Separate display projection: no score, classification or SQLite ledger writes.
import {IRAN_NEWS_DISPLAY_KEY,validIranNewsSnapshot} from '../../lib/iran-progress/news-display-r1.mjs';

export async function publishIranNewsDisplay(remote,db,snapshot,{now=Date.now()}={}){
 if(!validIranNewsSnapshot(snapshot,{now}))throw Error('NEWS_PUBLISH_PAYLOAD_INVALID');
 const before=(await remote.query(db,'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?',[IRAN_NEWS_DISPLAY_KEY])).results?.[0];
 if(before&&Number(before.stored_at)>snapshot.publishedAt)return {status:'REMOTE_NEWER_PRESERVED'};
 const encoded=JSON.stringify(snapshot);
 if(before?.body===encoded)return {status:'UNCHANGED'};
 let writeError;
 try{
  await remote.request(db,[{sql:'INSERT INTO market_public_snapshots_v1(snapshot_key,body,stored_at) VALUES(?,?,?) ON CONFLICT(snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at WHERE excluded.stored_at>=market_public_snapshots_v1.stored_at',
   params:[IRAN_NEWS_DISPLAY_KEY,encoded,snapshot.publishedAt]}]);
 }catch(error){writeError=error;}
 // Read-back is authoritative after a possible transport timeout. Never blindly retry.
 const after=(await remote.query(db,'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?',[IRAN_NEWS_DISPLAY_KEY])).results?.[0];
 if(after?.body!==encoded||Number(after.stored_at)!==snapshot.publishedAt)
  throw Object.assign(Error(writeError?'NEWS_PUBLISH_OUTCOME_UNKNOWN':'NEWS_PUBLISH_READBACK_FAILED'),{cause:writeError});
 return {status:'VERIFIED',itemCount:snapshot.itemCount,publishedAt:snapshot.publishedAt};
}
