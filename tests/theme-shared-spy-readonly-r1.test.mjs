import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readVerifiedSharedSpy} from '../scripts/pc-writer/theme-shared-spy-readonly-r1.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function fixture(run){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'theme-shared-spy-'));
 try{
  const home=path.join(root,'themes','data-center-power');
  fs.mkdirSync(path.join(home,'raw'),{recursive:true});
  const rows=[{symbol:'SPY',timestamp:'2026-10-21T19:00:00Z',close:600,is_gap:false},
   {symbol:'SPY',timestamp:'2026-10-22T19:00:00Z',close:601,is_gap:false}];
  const bytes=Buffer.from(rows.map(x=>JSON.stringify(x)).join('\n')+'\n'),digest=sha(bytes);
  const entry={path:'raw/SPY_'+digest+'.jsonl',sha256:digest,
   source:'https://getmarkethistory.com',collectedAt:'2026-10-23T00:00:00Z',
   observationFrom:'2026-10-21',observationThrough:'2026-10-22',
   priceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',schemaVersion:'GMH_NDJSON_1H_COLUMNS_V1'};
  const manifestPath=path.join(home,'raw-manifest.json');
  const rawPath=path.join(home,entry.path);
  fs.writeFileSync(rawPath,bytes);
  fs.writeFileSync(manifestPath,JSON.stringify({version:1,themeId:'data-center-power',files:[entry]}));
  run({root,home,manifestPath,rawPath,entry});
 }finally{fs.rmSync(root,{recursive:true,force:true});}
}

test('existing theme SPY source is reused only with SHA and price-mode evidence',()=>fixture(({root})=>{
 const actual=readVerifiedSharedSpy({dataRoot:root,sourceTheme:'data-center-power'});
 assert.equal(actual.bars.length,2);
 assert.equal(actual.bars.at(-1).close,601);
 assert.equal(actual.actualHourlyBars,2);
 assert.equal(actual.rawFiles.length,1);
 assert.equal(actual.rightsVerified,false);
 assert.equal(actual.publicationAuthorized,false);
 assert.equal(actual.providerCalls,0);
 assert.equal(actual.d1Writes,0);
 assert.equal(actual.schedulerWrites,0);
}));

test('tampered original SPY and wrong provider mode both block reuse',()=>fixture(({root,rawPath,manifestPath})=>{
 fs.appendFileSync(rawPath,'tamper');
 assert.throws(()=>readVerifiedSharedSpy({dataRoot:root,sourceTheme:'data-center-power'}),
  {code:'SHARED_SPY_SHA_MISMATCH'});
 const doc=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 doc.files[0].priceMode='ADJUSTED_CLOSE';
 fs.writeFileSync(manifestPath,JSON.stringify(doc));
 assert.throws(()=>readVerifiedSharedSpy({dataRoot:root,sourceTheme:'data-center-power'}),
  {code:'SHARED_SPY_ENTRY_CONTRACT'});
}));

test('unregistered source is not accepted and missing SPY is not treated as zero',()=>fixture(({root,manifestPath})=>{
 assert.throws(()=>readVerifiedSharedSpy({dataRoot:root,sourceTheme:'unknown'}),
  {code:'SHARED_SPY_SOURCE_NOT_APPROVED_FOR_PRIVATE_AUDIT'});
 const doc=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 doc.files=[];fs.writeFileSync(manifestPath,JSON.stringify(doc));
 assert.throws(()=>readVerifiedSharedSpy({dataRoot:root,sourceTheme:'data-center-power'}),
  {code:'SHARED_SPY_RAW_NOT_REGISTERED_OR_UNBOUNDED'});
}));
