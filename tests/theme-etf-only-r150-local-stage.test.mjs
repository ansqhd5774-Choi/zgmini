import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {stageR145ResearchText,runR150LocalStage} from '../scripts/pc-writer/theme-etf-only-r150-local-stage.mjs';
import {THEME_ETF_ONLY_PAIRS,validateThemeEtfOnlyPublic} from '../worker/theme-etf-only-public.mjs';
function report(){
 const dates=Array.from({length:252},(_,i)=>new Date(Date.parse('2026-10-16T00:00:00Z')-(251-i)*86400000).toISOString().slice(0,10));
 return {version:'ZGMINI-R145-ETF-ONLY-STORED-252-PRIVATE-READONLY-V1',status:'PRIVATE_252_RESEARCH_READY_NO_PUBLICATION',etf252Ready:13,themes252Ready:7,
  weights:{trend:.4,relativeStrength:.2,volatility:.4},pairWeight:.5,scoreMethod:'ETF_ONLY_PROXY',individualStocksUsed:0,
  upstreamThirdPartyCommercialRightsVerified:false,adjustedCloseVerified:false,derivedProviderLicenseExists:true,
  observationDate:'2026-10-16',published:false,publicScore:null,
  themes:THEME_ETF_ONLY_PAIRS.map(p=>({...p,status:'RESEARCH_252_READY_NOT_PUBLIC',validPoints:252,latestScore:44,days:dates.map(date=>({date,score:44,prior:99,price:123}))}))};
}
const source={fileModifiedAt:'2026-10-20T12:00:00Z'};
test('R150 stages exactly 7x252, no raw prices, no license escalation',()=>{
 const {candidate,summary}=stageR145ResearchText(JSON.stringify(report()),source);
 assert.equal(summary.points,1764);assert.equal(candidate.themes.length,7);
 assert.equal(candidate.sourceStoredAtKind,'R145_REPORT_FILE_MTIME_NOT_PROVIDER');
 assert.equal(candidate.priceSourceStoredAtVerified,false);
 assert.equal(candidate.publicationAuthorized,false);
 assert.equal(candidate.upstreamCommercialRightsVerified,false);
 assert.equal(validateThemeEtfOnlyPublic(candidate),false);
 assert.deepEqual(Object.keys(candidate.themes[0].history[0]),['date','score']);
});
test('R150 blocks altered weights, missing days and unexpected public payload',()=>{
 const w=report();w.weights.volatility=.3;assert.throws(()=>stageR145ResearchText(JSON.stringify(w),source),/WEIGHT_DRIFT/);
 const d=report();d.themes[0].days.pop();assert.throws(()=>stageR145ResearchText(JSON.stringify(d),source),/MISSING_252/);
 const p=report();p.published=true;assert.throws(()=>stageR145ResearchText(JSON.stringify(p),source),/RESEARCH_ONLY_EXPECTED/);
});
test('R150 default check only creates no file or directory',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r150-check-'));
 try{
  const input=path.join(dir,'r145.json');fs.writeFileSync(input,JSON.stringify(report()));
  const base=path.join(dir,'unused');const response=runR150LocalStage({inputPath:input,base,writeLocal:false});
  assert.equal(response.mode,'CHECK_ONLY');assert.equal(fs.existsSync(base),false);
  assert.equal(response.candidateFile,null);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('R150 cannot write to arbitrary or C fixture roots',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r150-guard-'));
 try{
  const input=path.join(dir,'r145.json');fs.writeFileSync(input,JSON.stringify(report()));
  assert.throws(()=>runR150LocalStage({inputPath:input,base:dir,writeLocal:true}),/UNAPPROVED_E_ROOT/);
  assert.deepEqual(fs.readdirSync(dir),['r145.json']);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
