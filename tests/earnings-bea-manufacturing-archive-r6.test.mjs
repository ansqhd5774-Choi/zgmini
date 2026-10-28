import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {BEA_MFG_PROFIT_SERIES,BEA_MFG_PROFIT_CSV} from '../lib/market-score/earnings-bea-manufacturing-profit-source-r1.mjs';
import {readArchivedBeaMfgR6} from '../scripts/pc-writer/EARNINGS_BEA_MFG_PROFIT_R6_D1_ONE_SHOT.mjs';

const csv=`observation_date,${BEA_MFG_PROFIT_SERIES}\n2025-04-01,681.285\n2025-07-01,741.175\n2025-10-01,801.724\n2026-01-01,812.346\n2026-04-01,1053.304\n`;
const now=Date.parse('2026-10-28T00:00:00Z');
const hash=createHash('sha256').update(csv).digest('hex');
const fixture=fn=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'bea-mfg-r6-'));
  const folder=path.join(root,'raw','earnings-recession','bea-manufacturing-profits-r5');
  fs.mkdirSync(folder,{recursive:true});
  const meta={schemaVersion:'earnings-bea-manufacturing-raw-r5-v1',
    seriesId:BEA_MFG_PROFIT_SERIES,sourceUrl:BEA_MFG_PROFIT_CSV,sourceVersion:hash,
    sourceStoredAt:now,sourceRetrievedAt:new Date(now).toISOString(),
    historicalMode:'CURRENT_VINTAGE_NOT_PIT',unit:'BILLIONS_USD_SAAR',
    file:hash+'.csv',latestPeriod:'2026-Q2',rowCount:5};
  fs.writeFileSync(path.join(folder,hash+'.csv'),csv);
  fs.writeFileSync(path.join(folder,hash+'.json'),JSON.stringify(meta));
  try{return fn({root,folder,meta});}finally{fs.rmSync(root,{recursive:true,force:true});}
};

test('valid archived bytes and metadata project correct optional YoY',()=>fixture(({root})=>{
  const p=readArchivedBeaMfgR6({root,sourceSha:hash,now});
  assert.equal(p.sourceVersion,hash);
  assert.equal(p.indicator.observationPeriod,'2026-Q2');
  assert.ok(Math.abs(p.indicator.value-54.60548815840656)<1e-10);
}));

test('modified archived bytes are rejected before any D1 operation',()=>fixture(({root,folder})=>{
  fs.writeFileSync(path.join(folder,hash+'.csv'),csv.replace('1053.304','900.000'));
  assert.throws(()=>readArchivedBeaMfgR6({root,sourceSha:hash,now}),/ARCHIVE_SHA_MISMATCH/);
}));

test('metadata conflicts and stale observation fail closed',()=>fixture(({root,folder,meta})=>{
  fs.writeFileSync(path.join(folder,hash+'.json'),JSON.stringify({...meta,sourceVersion:'f'.repeat(64)}));
  assert.throws(()=>readArchivedBeaMfgR6({root,sourceSha:hash,now}),/METADATA_MISMATCH/);
  fs.writeFileSync(path.join(folder,hash+'.json'),JSON.stringify(meta));
  assert.throws(()=>readArchivedBeaMfgR6({root,sourceSha:hash,now:now+170*86_400_000}),/ARCHIVE_STALE/);
}));
