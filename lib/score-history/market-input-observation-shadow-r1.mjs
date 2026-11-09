import {readSelectedMarketBatchProvenance} from './market-batch-provenance-read-r1.mjs';

// Development-only shadow wrapper for the existing D05 stored-input Reader.
// Caller injects the original reader and the already-approved store. This
// function never substitutes source rows, changes a score, or writes data.
const INPUT_KEYS=Object.freeze(['macro','credit','supply','fundFlows','bisDsr','bisTc','rates']);
const SAFE_ERROR=/^(MARKET_[A-Z0-9_]+|SELECTED_INPUT_EVIDENCE_REQUIRED)$/;

export async function observeStoredMarketInputs({reader,store,db,decode,now}={}){
 if(typeof reader!=='function'||typeof store?.readInput!=='function')throw Error('MARKET_SHADOW_READER_REQUIRED');
 const selected=new Map(),duplicates=new Set();
 const wrappedStore={...store,async readInput(key){
  const value=await store.readInput(key);
  if(selected.has(key))duplicates.add(key);
  selected.set(key,value);
  return value;
 }};
 // The existing Reader owns selection, merging, TTL and READY behavior.
 // Even an evidence failure below cannot change its returned inputs.
 const inputs=await reader(wrappedStore,now);
 const provenance=[];
 for(const key of INPUT_KEYS){
  if(duplicates.has(key)){
   provenance.push({sourceKey:key,status:'UNPROVEN',code:'MULTIPLE_SELECTED_READS'});
   continue;
  }
  if(!selected.has(key)){
   provenance.push({sourceKey:key,status:'UNPROVEN',code:'READER_DID_NOT_SELECT'});
   continue;
  }
  if(!selected.get(key)){
   provenance.push({sourceKey:key,status:'MISSING'});
   continue;
  }
  try{
   const matched=await readSelectedMarketBatchProvenance({db,key,selected:selected.get(key),decode});
   provenance.push({sourceKey:key,status:'VERIFIED',batchKey:matched.batchKey,
    storedAt:matched.storedAt,storedBodySha256:matched.storedBodySha256});
  }catch(error){
   const message=error?.message;
   provenance.push({sourceKey:key,status:'UNPROVEN',
    code:typeof message==='string'&&SAFE_ERROR.test(message)?message:'PROVENANCE_READ_FAILED'});
  }
 }
 const verifiedCount=provenance.filter(item=>item.status==='VERIFIED').length;
 // Seven market batches alone do NOT prove D05's separate earnings/breadth
 // inputs. Never label the full calculation or published history VERIFIED.
 return {inputs,provenance:Object.freeze({status:'SHADOW_7_BATCHES_ONLY',verifiedCount,
  totalBatches:INPUT_KEYS.length,sources:Object.freeze(provenance.map(item=>Object.freeze(item)))})};
}
