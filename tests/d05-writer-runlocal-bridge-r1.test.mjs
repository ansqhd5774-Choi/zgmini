import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../scripts/pc-writer/run-local.mjs',import.meta.url),'utf8');

test('D05 witness is wired only to an inherited, live Core publication owner',()=>{
 const setup=source.indexOf('if(publish){\n  try{\n   const {createD05LocalCycleExclusiveWriter}');
 const compute=source.indexOf('const body=await calculateMarket(root,core,now,d05Writer?{onInputEvidence:e=>');
 const saved=source.indexOf('await marketOperationalStore(core).writeScore(body,now);');
 const archive=source.indexOf("report.compositeObserved=await appendCompositeObservedFromCurrent(core,now);");
 const bridge=source.indexOf("if(marketReady&&d05Writer&&report.compositeObserved?.status==='LOCAL_STORED')");
 const receipt=source.indexOf("report.d05PrivateLineageStatus=");
 assert.ok(setup>=0&&compute>setup&&saved>compute&&archive>saved&&bridge>archive&&receipt>bridge);
 assert.match(source,/createD05LocalCycleExclusiveWriter\(\{pcHome:base\}\)/);
 assert.match(source,/d05Captured=d05CaptureCount===1\?e:null/);
 assert.match(source,/if\(d05Writer\)d05MarketBody=body/);
});

test('bridge cannot invent a private ledger before a successful local archive event',()=>{
 assert.match(source,/if\(marketReady&&d05Writer&&report\.compositeObserved\?\.status==='LOCAL_STORED'\)/);
 assert.match(source,/archiveResult:report\.compositeObserved,runtimeSourceSha:source/);
 assert.match(source,/approvedSourceSha:config\.source,recordedAt:new Date\(\)\.toISOString\(\)/);
 assert.match(source,/ledgerPath:path\.join\(base,'score-lineage','d05-composite-events-v1\.jsonl'\)/);
 assert.match(source,/exclusiveWriter:d05Writer,initializeApprovedDirectory:true/);
 assert.match(source,/\}catch\{report\.d05PrivateLineageStatus='UNPROVEN';\}/);
 assert.doesNotMatch(source,/report\.(?:d05Captured|d05RawInput|d05InputSources|d05InputBatch)/);
});

test('original paid breadth, score history, calculation safety, and provider guard remain intact',()=>{
 assert.match(source,/isValidatedPaidBreadthDomain\(body\.domains\?\.find\(d=>d\.id==='breadth'\)\)/);
 assert.match(source,/attachStoredEarningsFactorTrends\(body,storedHistory\)/);
 assert.match(source,/attachStoredGrowthFactorTrends\(body,storedHistory\)/);
 assert.match(source,/assertCompleteMarket\(body\)/);
 assert.match(source,/CALCULATION_NETWORK_FORBIDDEN/);
 assert.match(source,/if\(!marketReady\)report\.market=\{status:'PREVIOUS_RELEASE_PRESERVED'\}/);
 assert.doesNotMatch(source,/\b(?:CREATE TABLE|DROP TABLE|DELETE FROM score-lineage)\b/i);
});
