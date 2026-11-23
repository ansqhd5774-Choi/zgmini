import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';

// Development-only, read-only proof that a previously selected market input
// corresponds to exactly one saved batch row. This does not select an input,
// perform a DB query, or replace the approved input/sourceVersion contract.
const KEYS=new Set(['macro','credit','supply','fundFlows','bisDsr','bisTc','rates']);

export function matchSelectedMarketBatch({key,selected,candidateRows,decode}={}){
 if(!KEYS.has(key))throw Error('MARKET_SOURCE_KEY_UNSUPPORTED');
 if(!selected||!Number.isSafeInteger(selected.storedAt)||selected.body===null||typeof selected.body!=='object')
  throw Error('SELECTED_INPUT_EVIDENCE_REQUIRED');
 if(!Array.isArray(candidateRows)||candidateRows.length>10||typeof decode!=='function')
  throw Error('BATCH_CANDIDATES_INVALID');
 const matches=[];
 for(const row of candidateRows){
  if(typeof row?.batch_key!=='string'||!row.batch_key.startsWith(key+':')||row.stored_at!==selected.storedAt||typeof row.body!=='string')continue;
  let decoded;
  try{decoded=decode(row.body);}catch{continue;}
  if(isDeepStrictEqual(decoded,selected.body))matches.push(row);
 }
 // Duplicate timestamps, a changed selection, or missing stored provenance
 // must never turn into an invented source identity.
 if(matches.length===0)throw Error('MARKET_BATCH_PROVENANCE_UNPROVEN');
 if(matches.length!==1)throw Error('MARKET_BATCH_PROVENANCE_AMBIGUOUS');
 const row=matches[0];
 return Object.freeze({sourceKey:key,batchKey:row.batch_key,storedAt:row.stored_at,
  storedBodySha256:createHash('sha256').update(row.body).digest('hex'),
  evidence:'EXACT_STORED_ROW_MATCH'});
}
