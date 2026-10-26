import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {mixNineR32Date,calculateNineR32Private} from
 '../scripts/pc-writer/theme-nine-r32-private-aggregate.mjs';

const DATE='2026-10-23';
const one=(ticker,score,sessions=700,status='R188_COMPATIBLE',aumUsd=1_000_000,
 aumAsOf=DATE)=>({ticker,score,sessions,status,aumUsd,aumAsOf});
const mix=(rows,allowDatedOfficialAum=false)=>mixNineR32Date({
 date:DATE,rows,benchmarkDate:DATE,allowDatedOfficialAum});

test('three plus ETFs use normalized same-date official AUM with 0-100 score',()=>{
 const out=mix([one('AAA',20,700,'R188_COMPATIBLE',10),
  one('BBB',60,700,'R188_COMPATIBLE',30),one('CCC',100,700,'R188_COMPATIBLE',60)]);
 assert.equal(out.score,80);
 assert.deepEqual(out.weightsPercent,{AAA:10,BBB:30,CCC:60});
 assert.equal(out.mode,'NORMALIZED_DATED_OFFICIAL_AUM_THREE_PLUS');
});

test('outdated AUM in three-plus is blocked, not renamed or silently excluded',()=>{
 assert.throws(()=>mix([one('AAA',20),one('BBB',60,700,'R188_COMPATIBLE',5,'2026-09-30'),
  one('CCC',100)]),e=>e.code==='AUM_FRESHNESS_UNAPPROVED'&&
  e.details.older[0].ticker==='BBB');
});

test('approved earlier-dated official AUM retains the exact source date and numeric score',()=>{
 const out=mix([one('AAA',20,700,'R188_COMPATIBLE',10,'2026-06-30'),
  one('BBB',60,700,'R188_COMPATIBLE',30,'2026-09-30'),
  one('CCC',100,700,'R188_COMPATIBLE',60,'2026-10-23')],true);
 assert.equal(out.score,80);
 assert.deepEqual(out.issuerAumAsOf,{AAA:'2026-06-30',BBB:'2026-09-30',CCC:DATE});
 assert.equal(out.datedOfficialAumUsed,true);
 assert.throws(()=>mix([one('AAA',20,700,'R188_COMPATIBLE',10,'2026-10-26'),
  one('BBB',60),one('CCC',90)],true),e=>e.code==='AUM_FUTURE_LOOKAHEAD');
});

test('two ETFS reuse approved R3 maturity ramp and official compatible parity',()=>{
 const p=mix([one('LONG',90,700),one('NEW',10,40,'ADAPTIVE_PROVISIONAL')]);
 assert.equal(p.score,66);
 assert.equal(p.weightsPercent.LONG,70);
 assert.equal(p.weightsPercent.NEW,30);
 const parity=mix([one('LONG',90,700),one('NEW',10,377)]);
 assert.equal(parity.score,50);
 assert.equal(parity.weightsPercent.LONG,50);
});

test('unapproved both-short pair becomes one real ETF with most real sessions',()=>{
 const x=mix([one('SHORT',25,120,'ADAPTIVE_PROVISIONAL'),
  one('YOUNG',75,41,'ADAPTIVE_PROVISIONAL')]);
 assert.equal(x.score,25);
 assert.deepEqual(x.contributingETFs,['SHORT']);
 assert.equal(x.mode,'R32_APPROVED_SINGLE_FALLBACK_FROM_TWO');
});

test('session tie uses current official AUM, ticker tie break and freshness guard',()=>{
 const x=mix([one('ZED',20,120,'ADAPTIVE_PROVISIONAL',9),
  one('ABC',90,120,'ADAPTIVE_PROVISIONAL',9)]);
 assert.equal(x.score,90);
 assert.deepEqual(x.contributingETFs,['ABC']);
 assert.throws(()=>mix([one('ZED',20,120,'ADAPTIVE_PROVISIONAL',9),
  one('ABC',90,120,'ADAPTIVE_PROVISIONAL',10,'2026-07-01')]),
  e=>e.code==='AUM_FRESHNESS_UNAPPROVED');
});

test('zero remains null, one scored ETF uses 100%; bad score is never a zero substitute',()=>{
 assert.deepEqual(mix([]).score,null);
 assert.equal(mix([one('AAA',31.25,40,'ADAPTIVE_PROVISIONAL')]).score,31.25);
 assert.throws(()=>mix([one('BAD',101)]),/R32_ELIGIBLE_ROW_INVALID/);
});

test('optional privately uploaded R25 result stops on non-benchmark AUM dates',t=>{
 const base=new URL('../',import.meta.url);
 const privatePath=new URL('upload/THEME_NINE_R25_INDIVIDUAL_SCORES_2665_21261.json',base);
 if(!fs.existsSync(privatePath))return t.skip('PC R25 JSON is intentionally not in GitHub');
 const r25=JSON.parse(fs.readFileSync(privatePath,'utf8'));
 const roster=JSON.parse(fs.readFileSync(new URL('config/theme-nine-r20-approved-candidates.json',base),'utf8'));
 const aum=JSON.parse(fs.readFileSync(new URL('config/theme-nine-r26-official-aum-evidence.json',base),'utf8'));
 assert.throws(()=>calculateNineR32Private({r25,roster,aum}),
  e=>e.code==='AUM_FRESHNESS_UNAPPROVED'&&e.details.older.length>0&&
   typeof e.details.theme==='string');
 const approval=JSON.parse(fs.readFileSync(new URL('config/theme-nine-r32-dated-aum-approval.json',base),'utf8'));
 const result=calculateNineR32Private({r25,roster,aum,aumApproval:approval});
 assert.equal(result.status,'PRIVATE_STAGE5_CALCULATED_NOT_PUBLISHED');
 assert.equal(result.themes.length,9);
 assert.equal(result.counts.tradingDates,252);
 for(const theme of result.themes){
  assert.equal(theme.history.length,252);
  assert.equal(theme.scoredDates+theme.missingDates,252);
  assert.ok(theme.scoredDates>0);
  for(const h of theme.history){
   if(h.score===null)continue;
   assert.ok(h.score>=0&&h.score<=100);
   assert.ok(h.contributingETFs.length>=1);
   assert.ok(Math.abs(Object.values(h.weightsPercent).reduce((s,n)=>s+n,0)-100)<1e-4);
  }
 }
 assert.ok(result.datedOfficialAumContributorDays>0);
 assert.equal(result.publicationAuthorized,false);
 assert.equal(result.d1Writes,0);
 assert.throws(()=>calculateNineR32Private({r25,roster,aum,
  aumApproval:{...approval,publicationAuthorized:true}}),
  e=>e.code==='AUM_APPROVAL_CONTRACT_INVALID');
});

test('self-contained CMD carries byte-exact six-component SHA bundles',t=>{
 const base=new URL('../',import.meta.url);
 const cmdFile=new URL('scripts/pc-writer/THEME_NINE_R32_PRIVATE_AGGREGATE.cmd',base);
 if(!fs.existsSync(cmdFile))return t.skip('builder has not emitted CMD yet');
 const cmd=fs.readFileSync(cmdFile,'ascii');
 const inputs=[
  ['R32A_CODE','scripts/pc-writer/theme-nine-r32-private-aggregate.mjs'],
  ['R32A_PREFLIGHT','scripts/pc-writer/theme-nine-r32-readonly-preflight.mjs'],
  ['R32A_PAIR','scripts/pc-writer/theme-optional-pair-weight-r3.mjs'],
  ['R32A_ROSTER','config/theme-nine-r20-approved-candidates.json'],
  ['R32A_AUM','config/theme-nine-r26-official-aum-evidence.json'],
  ['R32A_APPROVAL','config/theme-nine-r32-dated-aum-approval.json']
 ];
 for(const [tag,rel] of inputs){
  const start='::'+tag+'_BEGIN',end='::'+tag+'_END';
  const a=cmd.lastIndexOf(start),b=cmd.indexOf(end,a+start.length);
  assert.ok(a>=0&&b>a,tag);
  const extracted=Buffer.from(cmd.slice(a+start.length,b)
   .replace(/[^A-Za-z0-9+/=]/g,''),'base64');
  const source=fs.readFileSync(new URL(rel,base));
  assert.equal(createHash('sha256').update(extracted).digest('hex'),
   createHash('sha256').update(source).digest('hex'),tag);
 }
 assert.ok(cmd.startsWith('@echo off\r\n'));
 assert.ok(!cmd.includes('powershell'));
 assert.ok(!cmd.includes('%TEMP%'));
});

test('optional full-PC R25 bundle runs private CLI and only writes adjacent JSON',t=>{
 const root=fileURLToPath(new URL('../',import.meta.url));
 const original=path.join(root,'upload','THEME_NINE_R25_INDIVIDUAL_SCORES_2665_21261.json');
 if(!fs.existsSync(original))return t.skip('raw R25 is private, not committed');
 const stage=fs.mkdtempSync(path.join(root,'R32_TEST_STAGE_'));
 try{
  for(const [file,source] of [
   ['theme-nine-r32-private-aggregate.mjs','scripts/pc-writer/theme-nine-r32-private-aggregate.mjs'],
   ['theme-nine-r32-readonly-preflight.mjs','scripts/pc-writer/theme-nine-r32-readonly-preflight.mjs'],
   ['theme-optional-pair-weight-r3.mjs','scripts/pc-writer/theme-optional-pair-weight-r3.mjs'],
   ['theme-nine-r20-approved-candidates.json','config/theme-nine-r20-approved-candidates.json'],
   ['theme-nine-r26-official-aum-evidence.json','config/theme-nine-r26-official-aum-evidence.json'],
   ['theme-nine-r32-dated-aum-approval.json','config/theme-nine-r32-dated-aum-approval.json']])
   fs.copyFileSync(path.join(root,source),path.join(stage,file));
  const result=path.join(stage,'THEME_NINE_R32_PRIVATE_SHADOW_123_456.json');
  const run=spawnSync(process.execPath,[path.join(stage,'theme-nine-r32-private-aggregate.mjs'),
   '--private-aggregate'],{encoding:'utf8',env:{...process.env,
    R32_FOLDER:stage,R32_SELECTED:original,R32_SHADOW_RESULT:result}});
  if(run.error?.code==='EPERM'){
   if(fs.existsSync(result)){
    const shadow=JSON.parse(fs.readFileSync(result,'utf8'));
    assert.equal(shadow.themes.length,9);
   }
   return t.skip('this sandbox does not support child process output; Windows PC CMD not yet run');
  }
  assert.equal(run.status,0,run.stderr);
  assert.ok(run.stdout.trim(),JSON.stringify({stdout:run.stdout,
   stderr:run.stderr,error:run.error?.message,resultExists:fs.existsSync(result),
   stageContents:fs.readdirSync(stage)}));
  const log=JSON.parse(run.stdout);
  assert.equal(log.status,'PRIVATE_STAGE5_CALCULATED_NOT_PUBLISHED');
  const resultBytes=fs.readFileSync(result);
  assert.equal(log.resultSha256,createHash('sha256').update(resultBytes).digest('hex'));
  assert.equal(log.themeSummaries.length,9);
  assert.equal(fs.readdirSync(stage).length,7);
 }finally{fs.rmSync(stage,{recursive:true,force:true});}
});
