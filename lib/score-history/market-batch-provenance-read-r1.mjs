import {matchSelectedMarketBatch} from './market-batch-provenance-r1.mjs';

// Development-only read-side adapter. The caller supplies the exact selected
// object returned by the existing approved Reader; this function NEVER
// selects/replaces an input used by the scorer, nor modifies any DB table.
const KEYS=new Set(['macro','credit','supply','fundFlows','bisDsr','bisTc','rates']);
const QUERY='SELECT batch_key,body,stored_at FROM market_input_batches_v1 WHERE batch_key LIKE ? ORDER BY stored_at DESC LIMIT 10';

export async function readSelectedMarketBatchProvenance({db,key,selected,decode}={}){
 if(!KEYS.has(key))throw Error('MARKET_SOURCE_KEY_UNSUPPORTED');
 if(!selected||!Number.isSafeInteger(selected.storedAt)||!selected.body||typeof selected.body!=='object')
  throw Error('SELECTED_INPUT_EVIDENCE_REQUIRED');
 if(typeof db?.prepare!=='function'||typeof decode!=='function')throw Error('MARKET_PROVENANCE_READER_INVALID');
 const statement=db.prepare(QUERY);
 if(typeof statement?.bind!=='function')throw Error('MARKET_PROVENANCE_READER_INVALID');
 const rows=await statement.bind(key+':%').all();
 if(!Array.isArray(rows?.results))throw Error('MARKET_PROVENANCE_ROWS_INVALID');
 // Fail closed if a concurrent save, an old selected row outside the most
 // recent ten, or a duplicate timestamp prevents a unique causal join.
 return matchSelectedMarketBatch({key,selected,candidateRows:rows.results,decode});
}
