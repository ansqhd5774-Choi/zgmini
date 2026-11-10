import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {observeStoredMarketInputs} from '../lib/score-history/market-input-observation-shadow-r1.mjs';

// Isolated source-level integration: inject the approved Reader and the real
// provenance shadow, while replacing unrelated score/provider dependencies.
const sourceFile=fileURLToPath(new URL('../scripts/pc-writer/market.mjs',import.meta.url));
const code=fs.readFileSync(sourceFile,'utf8')
 .replace(/^import .*;\r?\n/gm,'')
 .replace('export async function calculateMarket','async function calculateMarket');
const keys=['macro','credit','supply','fundFlows','bisDsr','bisTc','rates'];
const now=Date.UTC(2026,10,9,20,42,51);
const body={status:'SUCCESS',asOfDate:'2026-11-09',domains:Array.from({length:12},(_,i)=>({id:'d'+i,status:'READY',score:i})),overall:{status:'READY',score:47.31578798432822}};
const scoreStub=`export function createMarketScoreR1Handler({collectInputs}){
 return async()=>{await collectInputs();return Response.json(${JSON.stringify(body)})}
}`;

function harness({invalidKey=null,failReader=false}={}){
 const selected=Object.fromEntries(keys.map(key=>[key,{storedAt:now,body:{source:key,observations:[1,2]}}]));
 const queries=[],reads=[];
 const db={prepare(sql){
  assert.match(sql,/^SELECT batch_key,body,stored_at FROM market_input_batches_v1/);
  return {bind(pattern){return {async all(){
   const key=pattern.slice(0,-2);queries.push(key);
   return {results:key===invalidKey?[]:[{batch_key:key+':2026-11-09',body:JSON.stringify(selected[key].body),stored_at:now}]};
  }}}};
 }};
 const store={async readInput(key){reads.push(key);return selected[key]??null}};
 const readStoredMarketInputs=async s=>{
  if(failReader)throw Error('ORIGINAL_READER_FAILED');
  await Promise.all(keys.map(key=>s.readInput(key)));
  return {series:{},external:{},providerSummary:{}};
 };
 const mockFs={readFileSync(file){return file.endsWith('market-score-r1.mjs')?scoreStub:'// credit source';}};
 const compile=new Function('fs','os','path','gunzipSync','pathToFileURL','marketOperationalStore',
  'readStoredMarketInputs','observeStoredMarketInputs','buildStoredDiagnostic',
  'readBreadthB1R5StoredPublicDomainR1','mergeEarningsProductionCandidate',
  'runEarningsR5ProductionCycle','readStoredEarningsRiskFourFactor',
  'candidate2dbImportBoundary',code+'\nreturn calculateMarket;');
 const calculate=compile(mockFs,os,path,gunzipSync,pathToFileURL,()=>store,
  readStoredMarketInputs,observeStoredMarketInputs,()=>({}),()=>({}),
  x=>x,async()=>{throw Error('NO_OPTIONAL_EARNINGS');},async()=>null,
  ()=>({transform:text=>({code:text})}));
 return {db,calculate,queries,reads};
}

test('default calculation keeps original reader behavior with zero provenance queries',async()=>{
 const {db,calculate,queries,reads}=harness();
 assert.deepEqual(await calculate('/fixture',db,now),body);
 assert.deepEqual(reads,keys);
 assert.deepEqual(queries,[]);
});

test('opt-in hook binds seven selected batches to the exact calculation timestamp',async()=>{
 const {db,calculate,reads,queries}=harness();
 const evidence=[];
 const output=await calculate('/fixture',db,now,{onInputEvidence:payload=>evidence.push(payload)});
 assert.deepEqual(output,body);
 assert.deepEqual(reads,keys);
 assert.deepEqual(queries,keys);
 assert.equal(evidence.length,1);
 assert.equal(evidence[0].calculatedAt,new Date(now).toISOString());
 assert.equal(evidence[0].score,body.overall.score);
 assert.equal(evidence[0].evidence.status,'SHADOW_7_BATCHES_ONLY');
 assert.equal(evidence[0].evidence.verifiedCount,7);
 assert.equal(JSON.stringify(evidence).includes('observations'),false);
});

test('an unmatched batch is UNPROVEN without changing output or disabling score',async()=>{
 const {db,calculate}=harness({invalidKey:'credit'}),evidence=[];
 assert.deepEqual(await calculate('/fixture',db,now,{onInputEvidence:x=>evidence.push(x)}),body);
 assert.equal(evidence[0].evidence.verifiedCount,6);
 assert.equal(evidence[0].evidence.sources[1].status,'UNPROVEN');
});

test('optional reporting callback failure never changes a verified score',async()=>{
 const {db,calculate}=harness();
 assert.deepEqual(await calculate('/fixture',db,now,{onInputEvidence(){throw Error('UNRELATED_REPORT_FAILURE')}}),body);
});

test('original reader failure propagates and never reports a false calculation',async()=>{
 const {db,calculate}=harness({failReader:true}),evidence=[];
 await assert.rejects(calculate('/fixture',db,now,{onInputEvidence:x=>evidence.push(x)}),/ORIGINAL_READER_FAILED/);
 assert.equal(evidence.length,0);
});
