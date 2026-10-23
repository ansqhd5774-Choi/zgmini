import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {auditR131PriceReadiness} from '../scripts/pc-writer/theme-r2-r131-price-readiness.mjs';

const SYMBOLS=['ARKF','BOTZ','BUG','CIBR','CLOU','DRIV','FINX','ITA','NLR','ROBO','SHLD','SKYY','SPY','URA'];
const stem=symbol=>`${symbol}_2025-10-20_2026-10-20_0123456789abcdef`;
const rowDates=length=>Array.from({length},(_,i)=>{
  const day=new Date(Date.UTC(2025,9,20+i)).toISOString().slice(0,10);
  return {sessionDate:day,close:100+i/10,netAssetsUSD:1_000_000+i};
});

function fixture(root,days=252,skipSymbol=null){
  fs.mkdirSync(path.join(root,'raw'),{recursive:true});
  fs.mkdirSync(path.join(root,'derived'),{recursive:true});
  for(const symbol of SYMBOLS){
    if(symbol===skipSymbol)continue;
    const data={rows:rowDates(days)};
    fs.writeFileSync(path.join(root,'raw',stem(symbol)+'.json'),JSON.stringify(data));
    fs.writeFileSync(path.join(root,'derived',stem(symbol)+'.daily-research.json'),JSON.stringify(data));
  }
}

test('R131 read-only audit counts 252 aligned session dates but does not claim 252-rank reference',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r131-ready-'));
  try{
    fixture(root);
    const result=auditR131PriceReadiness(root);
    assert.equal(result.status,'PRICE_DATE_COUNTS_ONLY_NOT_LICENSED');
    assert.equal(result.alignment.commonUniquePriceDates,252);
    assert.equal(result.alignment.latestRank63CountGate,true);
    assert.equal(result.alignment.latestRank126CountGate,true);
    assert.equal(result.alignment.latestRank252CountGate,false);
    assert.equal(result.alignment.full252Chart63CountGate,false);
    assert.equal(result.symbols.SPY.derived.datedNetAssetObservations.dates,252);
    assert.equal(result.licenseRightsVerified,false);
    assert.equal(result.providerCalls,0);
    assert.equal(result.dbWrites,0);
    assert.equal(result.productionChanged,false);
    assert.equal(result.published,false);
    assert.equal(JSON.stringify(result).includes('100.1'),false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('R131 audit explicitly reports a missing ETF instead of assuming its data',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r131-missing-'));
  try{
    fixture(root,252,'SHLD');
    const result=auditR131PriceReadiness(root);
    assert.equal(result.status,'NEEDS_SCHEMA_OR_FILE_REVIEW');
    assert.equal(result.alignment.commonUniquePriceDates,0);
    assert.ok(result.issues.includes('SOURCE_PAIR_NOT_UNIQUE_SHLD'));
    assert.ok(result.issues.includes('DERIVED_PRICE_SHAPE_UNVERIFIED_SHLD'));
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
