import test from 'node:test';
import assert from 'node:assert/strict';
import {R32,FORMULAS,identity,validateThemeRegistry,compareThemeCoverage,sourcePlan,scoreR32Theme,runThemeBatch} from '../scripts/pc-writer/theme-platform.mjs';
const theme=i=>({id:'theme-'+i,label:'테마 '+i,enabled:true,public:true,methodologyVersion:R32,etfs:['AAA','BBB','CCC'],benchmark:'SPY',approvalSha256:'a'.repeat(64),inputs:{confirmed:{adapter:'gmh',priceMode:'RAW'},provisional:{adapter:'parquet',priceMode:'SPLIT_ADJUSTED'}},publication:{confirmed:'confirmed:'+i,provisional:'provisional:'+i}});
const registry=n=>({schema:'ZGMINI_THEME_PLATFORM_V1',themes:Array.from({length:n},(_,i)=>theme(i))});
function memory(){let state;return {load:async()=>structuredClone(state),save:async(_,next,revision)=>{assert.equal(revision,state?.revision??0);state=structuredClone(next);}};}
function adapters(overrides={}){return Object.fromEntries(['source','calculate','validate','publish','readback','public'].map(stage=>[stage,overrides[stage]??(async({theme,completed})=>({status:'VERIFIED',artifactSha256:identity({stage,theme}),methodologyVersion:theme.methodologyVersion,definitionSha256:identity(theme),calculationSha256:completed.calculate?.artifactSha256}))]));}
test('registration has no theme-count limit; 1001 themes and arbitrary ETF count',()=>{
 const r=registry(1001);r.themes[0].etfs=Array.from({length:1001},(_,i)=>'ETF'+i);
 assert.equal(validateThemeRegistry(r,{formulas:FORMULAS}).themes.length,1001);
 assert.equal(sourcePlan(registry(1001)).length,8);
});
test('reject duplicate identity, missing formula and cross-theme key collisions',()=>{
 for(const change of [r=>r.themes[1].id=r.themes[0].id,r=>r.themes[0].methodologyVersion='PAIR50',r=>r.themes[1].publication.confirmed=r.themes[0].publication.confirmed]){
  const r=registry(2);change(r);assert.throws(()=>validateThemeRegistry(r,{formulas:FORMULAS}));
 }
});
test('coverage catches omission, unregistered public result and formula mismatch',()=>{
 const r=registry(2);const report=compareThemeCoverage(r,[{id:'theme-0',methodologyVersion:'PAIR50'},{id:'unexpected'}]);
 assert.deepEqual(new Set(report.differences.map(d=>d.reason)),new Set(['METHODOLOGY_MISMATCH','UNREGISTERED_PUBLIC_THEME','REGISTERED_PUBLIC_THEME_MISSING']));
});
test('R32 reuses exact reducer and AUM for three real contributors',()=>{
 const d=theme(0),dates=['2026-10-28'];
 const individual=Object.fromEntries(d.etfs.map((s,i)=>[s,[{date:dates[0],score:20+i*20,realSessionCount:252,status:'R188_COMPATIBLE'}]]));
 const aum=Object.fromEntries(d.etfs.map((s,i)=>[s,{aumUsd:i+1,aumAsOf:dates[0]}]));
 const result=scoreR32Theme({definition:d,dates,individual,aum});
 assert.equal(result.history[0].score,46.66667);assert.equal(result.methodologyVersion,R32);
 assert.equal(result.history[0].contributingETFs.length,3);
});
test('null input stays excluded, not fake zero; no eligible point remains null',()=>{
 const r=scoreR32Theme({definition:theme(0),dates:['2026-10-28'],individual:{},aum:{}});
 assert.equal(r.history[0].score,null);assert.equal(r.history[0].excluded.length,3);
});
test('bounded batch resumes without repeating verified stages and never publishes private runs',async()=>{
 const store=memory(),r=registry(51),a=adapters();let cursor=null,calls=0;
 do{const out=await runThemeBatch({registry:r,adapters:a,store,runKey:'one',maxStages:7,after:cursor});calls+=out.executed;cursor=out.status==='RUNNING'?out.cursor:null;}while(cursor);
 assert.equal(calls,51*2*3);
 const again=await runThemeBatch({registry:r,adapters:a,store,runKey:'one'});assert.equal(again.executed,0);
});
test('one theme failure does not stop other themes',async()=>{
 const out=await runThemeBatch({registry:registry(3),adapters:adapters({source:async({theme})=>{if(theme.id==='theme-0')throw Object.assign(Error(),{code:'SOURCE_TIMEOUT'});return {status:'VERIFIED',artifactSha256:'b'.repeat(64)};}}),store:memory(),runKey:'two'});
 assert.equal(out.status,'PARTIAL');assert.equal(out.results.filter(r=>r.status==='COMPLETE').length,4);
 assert.equal(out.results[0].code,'SOURCE_TIMEOUT');
});
test('wrong calculator version fails before any publication',async()=>{
 let publications=0;
 const out=await runThemeBatch({registry:registry(1),mode:'public',adapters:adapters({calculate:async()=>({status:'VERIFIED',artifactSha256:'a'.repeat(64),methodologyVersion:'PAIR50'}),publish:async()=>{publications++;}}),store:memory(),runKey:'three'});
 assert.equal(out.status,'PARTIAL');assert.equal(publications,0);
});
test('public proof must refer to exact calculated artifact, not only matching numeric scores',async()=>{
 const valid=async({theme,completed})=>({status:'VERIFIED',artifactSha256:'a'.repeat(64),methodologyVersion:R32,definitionSha256:identity(theme),calculationSha256:completed.calculate.artifactSha256,publicationContext:{selectionVerified:true,formulaVerified:true,inputVerified:true,rightsEvidenceValid:true,publicationApprovalValid:true,readerCompatible:true}});
 const out=await runThemeBatch({registry:registry(1),mode:'public',grant:{schema:'ZGMINI_THEME_DELEGATION_V1',actions:['publish']},adapters:adapters({validate:valid,publish:async({theme})=>({status:'VERIFIED',artifactSha256:'a'.repeat(64),methodologyVersion:R32,definitionSha256:identity(theme),calculationSha256:'f'.repeat(64)})}),store:memory(),runKey:'four'});
 assert.equal(out.results[0].code,'THEME_PROJECTION_CALCULATION_MISMATCH');
});

test('common public runner checks delegated scope before external write',async()=>{
 let writes=0;
 const out=await runThemeBatch({registry:registry(1),mode:'public',adapters:adapters({publish:async()=>{writes++;}}),store:memory(),runKey:'no-public-grant'});
 assert.equal(writes,0);assert.equal(out.results[0].code,'THEME_PUBLIC_DELEGATION_REQUIRED');
});
test('checkpoint failure after effect stops, so uncertain write is not reported successful',async()=>{
 const store={load:async()=>null,save:async()=>{throw Error('DISK_FAILURE');}};
 await assert.rejects(runThemeBatch({registry:registry(1),adapters:adapters(),store,runKey:'five'}),/DISK_FAILURE/);
});

test('future formula is an explicit trusted binding, not a per-theme branch',async()=>{
 const r=registry(3);r.themes.forEach(t=>t.methodologyVersion='FUTURE_APPROVED');
 const out=await runThemeBatch({registry:r,adapters:adapters(),store:memory(),runKey:'future',formulas:{FUTURE_APPROVED:()=>{}}});
 assert.equal(out.status,'COMPLETE');assert.equal(out.results.length,6);
});
