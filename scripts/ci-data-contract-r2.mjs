// R2 #20: fixed synthetic D1 projection read contract.
// This reads no operational DB, invokes no providers, publishes nothing.
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PUBLIC_PROJECTION_KEYS} from '../worker/market-public-projection-store.mjs';
import {PROJECTION_ROUTES,readProjectionResponse} from '../worker/projection-runtime-r52.mjs';

const NOW=Date.parse('2026-11-25T12:00:00Z');
export const SCENARIOS=Object.freeze([
 {name:'ready-zero',status:200,reason:null},
 {name:'ready-null',status:200,reason:null},
 {name:'missing',status:503,reason:'STORED_PROJECTION_PENDING'},
 {name:'stale-version',status:503,reason:'STORED_PROJECTION_STALE'},
 {name:'source-future',status:503,reason:'STORED_PROJECTION_STALE'},
 {name:'source-expired',status:503,reason:'STORED_PROJECTION_STALE'},
 {name:'post-denied',status:405,reason:'METHOD_NOT_ALLOWED'},
]);
const QUERY='SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?';
const assert=(ok,code)=>{if(!ok)throw Error(code);};
const routeFor=id=>Object.entries(PROJECTION_ROUTES).find(([,value])=>value===id)?.[0];

export function syntheticEnvelope(name,now=NOW){
 const sourceStoredAt=name==='source-future'?now+1:
  name==='source-expired'?now-9*86400000:now-3600000;
 const version='approved-v1';
 const payload={status:'READY',score:name==='ready-null'?null:0,
  observations:[{value:0},{value:null}]};
 return {body:{payload,projection:{
  status:'READY',sourceStoredAt,sourceVersion:version,
  expectedSourceStoredAt:sourceStoredAt,
  expectedSourceVersion:name==='stale-version'?'other-v2':version,
  asOf:'2026-11-25'
 }},storedAt:now-60000};
}
function mockStoredDb(key,name,now){
 const calls=[];
 return {calls,prepare(sql){
  assert(sql===QUERY,'CI_DATA_NON_SELECT_OR_WRONG_QUERY');
  calls.push({sql,key:null});
  return {bind(actual){
   assert(actual===key,'CI_DATA_WRONG_STORAGE_KEY');
   calls.at(-1).key=actual;
   return {async all(){
    const row=name==='missing'?null:syntheticEnvelope(name,now);
    return {results:row?[{body:JSON.stringify(row.body),stored_at:row.storedAt}]:[],
     meta:{rows_read:row?1:0}};
   }};
  }};
 }};
}

export async function measureDataContracts({reader=readProjectionResponse,now=NOW}={}){
 assert(typeof reader==='function'&&Number.isFinite(now),'CI_DATA_READER_INVALID');
 const ids=Object.keys(PUBLIC_PROJECTION_KEYS);
 assert(ids.length===9&&new Set(Object.values(PUBLIC_PROJECTION_KEYS)).size===9,
  'CI_DATA_KEY_SET_CHANGED');
 assert(Object.keys(PROJECTION_ROUTES).length===9,
  'CI_DATA_ROUTE_SET_CHANGED');
 const result=[];
 const savedFetch=globalThis.fetch;
 let providerCalls=0;
 globalThis.fetch=()=>{providerCalls++;throw Error('CI_DATA_PROVIDER_CALL_FORBIDDEN');};
 try{
  for(const id of ids){
   const route=routeFor(id);
   assert(typeof route==='string'&&route.startsWith('/api/'),
    'CI_DATA_ROUTE_MISSING');
   const key=PUBLIC_PROJECTION_KEYS[id];
   for(const scenario of SCENARIOS){
    const db=mockStoredDb(key,scenario.name,now);
    const request=new Request('https://fixture.invalid'+route,{
     method:scenario.name==='post-denied'?'POST':'GET'});
    const response=await reader(request,db,id,{now});
    assert(response?.status===scenario.status,'CI_DATA_STATUS_MISMATCH');
    const value=await response.json();
    if(scenario.reason){
     assert(value?.reason===scenario.reason,'CI_DATA_REASON_MISMATCH');
    }else{
     const expected=syntheticEnvelope(scenario.name,now).body.payload;
     assert(JSON.stringify(value)===JSON.stringify(expected),
      'CI_DATA_ZERO_NULL_OR_BODY_CHANGED');
     assert(response.headers.get('x-public-projection')==='STORED',
      'CI_DATA_SOURCE_NOT_STORED');
    }
    assert(db.calls.length===(scenario.name==='post-denied'?0:1),
     'CI_DATA_READ_COUNT_INVALID');
    result.push({projection:id,route,scenario:scenario.name,
     status:response.status,readCount:db.calls.length,
     dataStatus:scenario.reason?'UNAVAILABLE':'STORED'});
   }
  }
 }finally{globalThis.fetch=savedFetch;}
 assert(providerCalls===0,'CI_DATA_PROVIDER_CALLED');
 return {schemaVersion:1,scope:'SYNTHETIC_D1_READ_ONLY_9_PROJECTIONS',
  operationalDataVerified:false,providerCalls,writeStatements:0,
  contractChecks:result.length,projections:ids.length,scenarios:SCENARIOS.length,
  results:result};
}
async function main(){
 assert(process.argv.length===2&&process.env.CI==='true','CI_DATA_CI_ONLY');
 const report=await measureDataContracts();
 const dir=resolve('artifacts/ci-data-contract');
 await mkdir(dir,{recursive:true});
 await writeFile(resolve(dir,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log('CI_DATA_CONTRACT '+JSON.stringify({
  projections:report.projections,scenarios:report.scenarios,
  contractChecks:report.contractChecks,providerCalls:report.providerCalls,
  writeStatements:report.writeStatements,scope:report.scope
 }));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{console.error(e.message);process.exitCode=1;});
