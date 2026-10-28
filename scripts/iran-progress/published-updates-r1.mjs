import {hash} from './store.mjs';
import {IRAN_UPDATE_HISTORY_VERSION,IRAN_UPDATE_PREFIX,iranPublicationPoint,attachIranUpdateHistory} from '../../lib/iran-progress/intraday-history-r1.mjs';
export function readIranPublishedUpdates(store){
 return store.db.prepare("SELECT body FROM publications WHERE id LIKE ? ORDER BY published_at,id").all(IRAN_UPDATE_PREFIX+'%').map(r=>JSON.parse(r.body));
}
export function withIranPublishedUpdates(store,body){return attachIranUpdateHistory(body,readIranPublishedUpdates(store));}
export function recordIranPublishedUpdate(store,body,result){
 if(!['VERIFIED','UNCHANGED'].includes(result?.status)||result.bodyHash!==hash(body))throw Error('IRAN_UPDATE_READBACK_REQUIRED');
 const record={version:IRAN_UPDATE_HISTORY_VERSION,verification:'D1_READBACK_VERIFIED',bodyHash:result.bodyHash,point:iranPublicationPoint(body)};
 // Existing immutable publication ledger: no new DB table, no rewrite or pruning of old observations.
 store.publication(IRAN_UPDATE_PREFIX+body.publishedAt,record,body.publishedAt);return record;
}
