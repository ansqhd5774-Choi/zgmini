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

test('archive CSV and metadata symlinks fail before digest or parsing',
  {skip:process.platform==='win32'},()=>fixture(({root,folder})=>{
  for(const suffix of ['csv','json']){
    const source=path.join(folder,hash+'.'+suffix);
    const outside=path.join(root,'unapproved-'+suffix);
    fs.renameSync(source,outside);
    fs.symlinkSync(outside,source);
    assert.throws(()=>readArchivedBeaMfgR6({root,sourceSha:hash,now}),
      /BEA_MFG_ARCHIVE_UNSAFE_PATH/);
    fs.unlinkSync(source);
    fs.renameSync(outside,source);
  }
}));

test('linked ancestor directory cannot redirect BEA archive outside its raw family',
  {skip:process.platform==='win32'},()=>fixture(({root,folder})=>{
  const diverted=path.join(root,'unapproved-archive');
  fs.renameSync(folder,diverted);
  fs.symlinkSync(diverted,folder,'dir');
  assert.throws(()=>readArchivedBeaMfgR6({root,sourceSha:hash,now}),
    /BEA_MFG_ARCHIVE_UNSAFE_PATH/);
}));

const archiveChanged=(folder,meta,text,{storedAt=now}={})=>{
  const sha=createHash('sha256').update(text).digest('hex');
  fs.writeFileSync(path.join(folder,sha+'.csv'),text);
  fs.writeFileSync(path.join(folder,sha+'.json'),JSON.stringify({
    ...meta,sourceVersion:sha,file:sha+'.csv',
    sourceStoredAt:storedAt,sourceRetrievedAt:new Date(storedAt).toISOString()
  }));
  return sha;
};

test('identical archived SHA yields deterministic period, YoY and five-point source lineage',()=>fixture(({root})=>{
  const a=readArchivedBeaMfgR6({root,sourceSha:hash,now});
  const b=readArchivedBeaMfgR6({root,sourceSha:hash,now});
  assert.deepEqual(a,b);
  assert.equal(a.sourceVersion,hash);
  assert.equal(a.sourceStoredAt,now);
  assert.equal(a.indicator.history.length,5);
  assert.equal(a.indicator.yearAgoPeriod,'2025-Q2');
  assert.equal(a.indicator.observationPeriod,'2026-Q2');
  assert.equal(a.historicalMode,'CURRENT_VINTAGE_NOT_PIT');
}));

test('revised raw CSV changes SHA and output only for that valid source checkpoint',()=>fixture(({root,folder,meta})=>{
  const base=readArchivedBeaMfgR6({root,sourceSha:hash,now});
  const revisedText=csv.replace('1053.304','1153.304');
  const revisionAt=now+10_000;
  const revisionSha=archiveChanged(folder,meta,revisedText,{storedAt:revisionAt});
  assert.notEqual(revisionSha,hash);
  const revised=readArchivedBeaMfgR6({root,sourceSha:revisionSha,now:revisionAt});
  assert.notEqual(revised.indicator.value,base.indicator.value);
  assert.equal(revised.sourceVersion,revisionSha);
  assert.equal(revised.sourceStoredAt,revisionAt);
  assert.equal(revised.indicator.observationPeriod,'2026-Q2');
  assert.equal(revised.indicator.history[4].profitsBillionsUsdAnnualRate,1153.304);
  assert.deepEqual(readArchivedBeaMfgR6({root,sourceSha:hash,now:revisionAt}).indicator,base.indicator);
  assert.deepEqual(readArchivedBeaMfgR6({root,sourceSha:revisionSha,now:revisionAt}),revised);
}));

test('current observed zero remains numeric YoY -100; zero base and missing values fail closed',()=>fixture(({root,folder,meta})=>{
  const zeroText=csv.replace('1053.304','0');
  const zeroSha=archiveChanged(folder,meta,zeroText);
  const zero=readArchivedBeaMfgR6({root,sourceSha:zeroSha,now});
  assert.equal(zero.indicator.currentProfitsBillionsUsdAnnualRate,0);
  assert.equal(zero.indicator.value,-100);
  const zeroBaseText=csv.replace('681.285','0');
  const zeroBaseSha=archiveChanged(folder,meta,zeroBaseText);
  assert.throws(()=>readArchivedBeaMfgR6({root,sourceSha:zeroBaseSha,now}),/BEA_MFG_YOY_BASE_NONPOSITIVE/);
  for(const missing of ['.','null','']){
    const unavailable=csv.replace('1053.304',missing);
    const sha=archiveChanged(folder,meta,unavailable);
    assert.throws(()=>readArchivedBeaMfgR6({root,sourceSha:sha,now}),/BEA_MFG_INVALID_VALUE/);
  }
  assert.equal(readArchivedBeaMfgR6({root,sourceSha:hash,now}).indicator.value,
    (1053.304/681.285-1)*100);
}));

test('noncontiguous or duplicated archived quarters never create synthetic history',()=>fixture(({root,folder,meta})=>{
  const missingQuarter=csv.replace('2025-10-01,801.724\n','');
  const missingSha=archiveChanged(folder,{...meta,rowCount:4},missingQuarter);
  assert.throws(()=>readArchivedBeaMfgR6({root,sourceSha:missingSha,now}),
    /BEA_MFG_NONCONTIGUOUS_QUARTERS|BEA_MFG_INSUFFICIENT_HISTORY/);
  const duplicateQuarter=csv.replace('2025-10-01','2025-07-01');
  const duplicateSha=archiveChanged(folder,meta,duplicateQuarter);
  assert.throws(()=>readArchivedBeaMfgR6({root,sourceSha:duplicateSha,now}),
    /BEA_MFG_NONCONTIGUOUS_QUARTERS/);
}));

test('null or array archive metadata fails with a bounded source-contract error',()=>fixture(({root,folder})=>{
  const metadata=path.join(folder,hash+'.json');
  for(const invalid of ['null','[]']){
    fs.writeFileSync(metadata,invalid);
    assert.throws(()=>readArchivedBeaMfgR6({root,sourceSha:hash,now}),
      /BEA_MFG_ARCHIVE_METADATA_MISMATCH/);
  }
}));

test('dangling CSV/meta and raw directory links are unsafe rather than missing',
  {skip:process.platform==='win32'},()=>fixture(({root,folder})=>{
    for(const suffix of ['csv','json']){
      const file=path.join(folder,hash+'.'+suffix);
      fs.unlinkSync(file);
      fs.symlinkSync(path.join(root,'nonexistent-'+suffix),file);
      assert.throws(()=>readArchivedBeaMfgR6({root,sourceSha:hash,now}),
        /BEA_MFG_ARCHIVE_UNSAFE_PATH/);
      fs.unlinkSync(file);
      if(suffix==='csv')fs.writeFileSync(file,csv);
    }
    const linked=path.join(root,'raw','earnings-recession','bea-manufacturing-profits-r5');
    fs.rmSync(linked,{recursive:true,force:true});
    fs.symlinkSync(path.join(root,'nonexistent-folder'),linked,'dir');
    assert.throws(()=>readArchivedBeaMfgR6({root,sourceSha:hash,now}),
      /BEA_MFG_ARCHIVE_UNSAFE_PATH/);
}));
