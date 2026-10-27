import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {classifySpaceIssuerSources,runSpaceIssuerSourceGate} from
 '../scripts/pc-writer/theme-space-satellite-r21-source-gate.mjs';
import {scoreRelativeThemeBasket} from
 '../scripts/pc-writer/theme-optional-relative-weight-r4.mjs';

const makeEvidence=tickers=>({version:1,checkedAt:'2026-10-26',
 candidates:tickers.map(ticker=>({ticker,
  state:['MARS','ARKX'].includes(ticker)?
   'NOT_RETRIEVED_AFTER_BOUNDED_CHECK':'OFFICIAL_NUMERIC_OBSERVED',
  issuerUrl:'https://issuer.example/'+ticker,holdingsAsOf:'2026-10-23'}))});

test('R21 excludes only sources without official numbers or actual current score',()=>{
 const tickers=['UFO','NASA','WARP','MARS','ARKX','ROKT','ORBX','DIPR','WSPC'];
 const records=tickers.map(ticker=>({ticker,currentScore:
  ['ORBX','DIPR','WSPC'].includes(ticker)?null:50}));
 const r=classifySpaceIssuerSources({records,evidence:makeEvidence(tickers)});
 assert.deepEqual(r.included,['UFO','NASA','WARP','ROKT']);
 assert.equal(r.candidateCount,9);
 assert.equal(r.excluded.length,5);
 assert.equal(r.excluded.find(x=>x.ticker==='MARS').reason,
  'OFFICIAL_HOLDINGS_UNAVAILABLE_THIS_REVIEW');
 assert.equal(r.excluded.find(x=>x.ticker==='DIPR').reason,
  'NO_ACTUAL_CURRENT_ETF_SCORE');
 assert.equal(r.collectionRetries,0);
 assert.equal(r.permanentCandidateDeletion,false);
});

test('R21 recomputes only the latest private R4-A proposal, no historical fill',()=>{
 const tickers=['UFO','NASA','MARS','ARKX','WARP','ROKT'];
 const records=tickers.map((ticker,i)=>({ticker,currentScore:40+i}));
 const fixture=makeEvidence(tickers);
 const where=fs.mkdtempSync(path.join(os.tmpdir(),'zg-r21-'));
 try{
  const file=path.join(where,'evidence.json');
  fs.writeFileSync(file,JSON.stringify(fixture));
  const dates=['2026-10-22','2026-10-23'];
  const audit=()=>({report:'SPACE_SATELLITE_R18_PC_PRIVATE_VARIABLE_BASKET_SHADOW',
   sourceManifestSha256:'manifest',sharedSpyManifestSha256:'spy',
   shadowHistorySha256:'history',benchmarkLastDate:dates.at(-1),
   last252DisplayDays:2,candidateStatus:records,
   latestPrivateProposal:{date:dates.at(-1),score:46},
   privateTrace:{dates,timelines:Object.fromEntries(tickers.map((ticker,i)=>[
    ticker,[{score:40+i,status:'ADAPTIVE_PROVISIONAL'},
     {score:40+i,status:'ADAPTIVE_PROVISIONAL'}]])),
    sessionCounts:Object.fromEntries(tickers.map(ticker=>[ticker,
     new Map(dates.map(date=>[date,150]))]))}});
  const got=runSpaceIssuerSourceGate({dataRoot:'/unused',evidenceFile:file,
   r18Audit:audit,expectedManifest:'manifest',expectedSpy:'spy',
   expectedHistory:'history'});
  const expected=scoreRelativeThemeBasket({etfs:['UFO','NASA','WARP','ROKT']
   .map(x=>({symbol:x,score:40+tickers.indexOf(x),sessions:150,
    status:'ADAPTIVE_PROVISIONAL'}))});
  assert.equal(got.latestSourceScreenedPrivateScore,
   Number(expected.score.toFixed(5)));
  assert.equal(got.originalR18PrivateScore,46);
  assert.equal(got.publicWrites,0);
  assert.equal(got.privateHistoryRewritten,false);
  assert.equal(got.collectionRetries,0);
 }finally{fs.rmSync(where,{recursive:true,force:true});}
});

test('R21 no usable issuer pair yields null, not an invented score',()=>{
 const tickers=['UFO','MARS','ARKX'];
 const records=tickers.map(ticker=>({ticker,currentScore:
  ticker==='UFO'?25:45}));
 const r=classifySpaceIssuerSources({records,evidence:makeEvidence(tickers)});
 assert.deepEqual(r.included,['UFO']);
 assert.equal(r.excluded.length,2);
});

test('R21 rejects missing/duplicate sources without silently adding tickers',()=>{
 const records=[{ticker:'UFO',currentScore:50}];
 assert.throws(()=>classifySpaceIssuerSources({records,
  evidence:makeEvidence(['UFO','NASA'])}),/R21_SOURCE_RECORD_SET_DIFFERENT/);
 assert.throws(()=>classifySpaceIssuerSources({records,
  evidence:makeEvidence(['UFO','UFO'])}),/R21_EVIDENCE_TICKER_DUPLICATE/);
});
