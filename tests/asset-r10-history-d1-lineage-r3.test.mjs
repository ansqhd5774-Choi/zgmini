import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assetR10HistoryLineageDiff}
 from '../lib/diagnostic-layer/asset-bubble-r10-d1-lineage-r3.mjs';

const make=()=>{
 const factors=Array.from({length:6},(_,i)=>({id:'x'+i,unit:'PERCENT',source:'S'+i,
  value:i+0.5,previousValue:i,observationDate:'2026-04-01',previousObservationDate:'2026-01-01'}));
 const raw={sourceVersion:'batch-1',sourceStoredAt:100,asOfDate:'2026-10-28',
  scoreObservationQuarter:'2026-Q2',diagnosticScore:22.57,factors};
 const history={sourceVersion:raw.sourceVersion,sourceStoredAt:raw.sourceStoredAt,
  asOfDate:raw.asOfDate,scoreObservationQuarter:raw.scoreObservationQuarter,
  approvedScore:raw.diagnosticScore,
  factors:factors.map(f=>({id:f.id,unit:f.unit,source:f.source,
   points:[null,null,null,
    {value:f.previousValue,observationDate:f.previousObservationDate},
    {value:f.value,observationDate:f.observationDate}]}))};
 return {raw,history};
};

test('matches exact approved six factor source/value/date lineage',()=>{
 const {raw,history}=make();assert.deepEqual(assetR10HistoryLineageDiff(raw,history),[]);
});
test('reports exact failed sourceVersion and storedAt separately',()=>{
 const {raw,history}=make();raw.sourceVersion='batch-2';raw.sourceStoredAt=101;
 assert.deepEqual(assetR10HistoryLineageDiff(raw,history).map(x=>x.field),['sourceVersion','sourceStoredAt']);
});
test('does not mask factor score, date, source or value mismatches',()=>{
 const {raw,history}=make();raw.diagnosticScore=23;
 raw.factors[3].observationDate='2026-04-02';raw.factors[4].value=44;
 raw.factors[5].source='different';
 assert.deepEqual(assetR10HistoryLineageDiff(raw,history).map(x=>x.field),[
  'diagnosticScore/approvedScore','factors[3:x3].observationDate',
  'factors[4:x4].value','factors[5:x5].source']);
});
test('only read-only SELECT statements; no D1 writable adapter or mutation methods',()=>{
 const code=fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../scripts/pc-writer/ASSET_R10_1Y_HISTORY_D1_LINEAGE_READONLY_R3.mjs'),'utf8');
 assert.match(code,/\.adapter\(config\.core\)/);
 assert.doesNotMatch(code,/allowWrites\s*:\s*true/);
 assert.doesNotMatch(code,/\.run\(\)|\.batch\(|INSERT\s+INTO|UPDATE\s+market_public_snapshots_v1|DELETE\s+FROM/i);
 assert.equal((code.match(/\.first\(\)/g)||[]).length,2);
});

test('R3 CMD only runs the pinned read-only diagnostic from existing work branch',()=>{
 const cmd=fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../scripts/pc-writer/ASSET_R10_1Y_HISTORY_D1_LINEAGE_READONLY_R3.cmd'),'utf8');
 assert.match(cmd,/--branch codex\/api-site-integration-r1-20261026/);
 assert.match(cmd,/f75fe9e5f3737959d05f13f55fcde0b34d95b646/);
 assert.match(cmd,/39c2f3bc94eea4bb706889a074661e2f03b1924e/);
 assert.match(cmd,/--read-only/);
 assert.doesNotMatch(cmd,/--apply|--confirm-asset-r10-history-d1-write|wrangler deploy|git\s+reset|git\s+clean/i);
});
