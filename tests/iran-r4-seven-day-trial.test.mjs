import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {openStore} from '../scripts/iran-progress/store.mjs';
import {IRAN_R4_WEIGHTS,calculateIranR4RealityShadow} from '../lib/iran-progress/reality-shadow-r4.mjs';
import {R4_TRIAL_DEFAULT,tuneR4ShadowCandidate,validateR4TrialTuning,compareR4TrialCandidates}
 from '../lib/iran-progress/seven-day-tuning-r4.mjs';
import {dayKst,sampleR4Trial,summarizeR4Trial,previewR4TrialReweight,runR4TrialLocal}
 from '../scripts/iran-progress/seven-day-trial-r4.mjs';
const DAY=86400000,HOUR=3600000,BASE=Date.parse('2026-10-18T03:00:00Z');
const refs=at=>[{sourceId:'TEST_VERIFIED_SOURCE',sourceKind:'OFFICIAL',url:'https://example.invalid/fixture',
 verified:true,observedAt:at-2*HOUR,verifiedAt:at-HOUR}];
const front=(id,at)=>({id,phase:'ACTIVE_COMBAT',phaseVerified:true,
 phaseObservedAt:at-2*HOUR,phaseVerifiedAt:at-HOUR,phaseEvidence:refs(at),coverageThrough:at-HOUR,
 diplomacyStage:1,ceasefireStatus:'ACTIVE_COMBAT',
 military:{verified:true,eventsDeduplicated:true,fullCoverageVerified:true,
 coverageFrom:at-28*DAY,coverageThrough:at-HOUR,coverageEvidence:refs(at),
 recentSeverity:7,priorSeverity:21}});
const route=(id,at)=>({id,incidentCoverage:{verified:true,eventsDeduplicated:true,
 complete28Days:true,from:at-28*DAY,through:at-HOUR,
 recentSeverity:0,priorSeverity:0,evidence:refs(at)},
 restriction:{verified:true,state:'MAJOR_RESTRICTIONS',officialStateVerified:true,
 observedAt:at-2*HOUR,verifiedAt:at-HOUR,evidence:refs(at)}});
const input=at=>({fronts:Object.fromEntries(['IRN_USA','IRN_ISR','YEMEN_HOUTHI'].map(id=>[id,front(id,at)])),
 maritime:{routes:{HORMUZ:route('HORMUZ',at),RED_SEA:route('RED_SEA',at)}},
 nuclear:{verified:true,score:70,observedAt:at-2*HOUR,verifiedAt:at-HOUR,evidence:refs(at)}});
test('default weights and sensitivity reproduce unmodified R4 shadow candidate exactly',()=>{
 const shadow=calculateIranR4RealityShadow(input(BASE),BASE);
 assert.equal(shadow.status,'SHADOW_READY');
 assert.deepEqual(R4_TRIAL_DEFAULT.weights,IRAN_R4_WEIGHTS);
 const result=tuneR4ShadowCandidate(shadow,R4_TRIAL_DEFAULT);
 assert.equal(result.score,shadow.score);
 assert.equal(result.productionReady,false);
 assert.equal(result.calibrated,false);
});
test('sensitivity tunes only within a verified war phase, never turns fighting into peace',()=>{
 const shadow=calculateIranR4RealityShadow(input(BASE),BASE);
 const more=tuneR4ShadowCandidate(shadow,{weights:{D:.10,C:.35,M:.35,H:.10,N:.10},sensitivity:2});
 const less=tuneR4ShadowCandidate(shadow,{weights:{D:.10,C:.35,M:.35,H:.10,N:.10},sensitivity:.5});
 assert.equal(more.phase,'ACTIVE_COMBAT');
 for(const r of [more,less]){
  assert.ok(r.score>=25&&r.score<=39);
  assert.equal(r.productionReady,false);
 }
});
test('invalid weights, missing axis and out-of-bounds sensitivities fail rather than being renormalized',()=>{
 assert.throws(()=>validateR4TrialTuning({weights:{D:.2,C:.2,M:.2,H:.2,N:.1},sensitivity:1}));
 assert.throws(()=>validateR4TrialTuning({weights:{D:.2,C:.35,M:.25,H:.10},sensitivity:1}));
 assert.throws(()=>validateR4TrialTuning({weights:{...IRAN_R4_WEIGHTS},sensitivity:3}));
 assert.throws(()=>validateR4TrialTuning({weights:{...IRAN_R4_WEIGHTS},sensitivity:0}));
});
test('independent tuning variants are diagnostic only and do not modify shadow inputs',()=>{
 const shadow=calculateIranR4RealityShadow(input(BASE),BASE),before=JSON.stringify(shadow);
 const r=compareR4TrialCandidates([shadow],[{name:'baseline',config:R4_TRIAL_DEFAULT},
  {name:'candidate',config:{weights:{D:.1,C:.4,M:.3,H:.1,N:.1},sensitivity:1.5}}]);
 assert.equal(r.length,2);
 assert.equal(r[0].observations[0].score,shadow.score);
 assert.equal(JSON.stringify(shadow),before);
 assert.throws(()=>compareR4TrialCandidates([shadow],[{name:'same',config:R4_TRIAL_DEFAULT},{name:'same',config:R4_TRIAL_DEFAULT}]));
});
test('missing verified R4 source never starts the week or creates an invented score',()=>{
 const r=sampleR4Trial({verifiedInput:null,now:BASE,sourceHash:'fixture'});
 assert.equal(r.status,'R4_INPUT_PENDING');
 assert.equal(r.write,false);
});
test('seven daily samples form bounded, frozen uncalibrated trial without selecting 18 as a target',()=>{
 let record=null;
 for(let i=0;i<7;i++){
  const at=BASE+i*DAY;
  const r=sampleR4Trial({verifiedInput:input(at),observations:[],now:at,existing:record,sourceHash:'fixed-snapshot'});
  assert.equal(r.status,'SAMPLE_RECORDED');
  assert.equal(r.write,true);
  assert.equal(r.record.samples.at(-1).publicScore,null);
  assert.equal(r.record.samples.at(-1).independentCheck,'UNASSESSABLE');
  record=r.record;
 }
 const r=summarizeR4Trial(record,BASE+6*DAY);
 assert.equal(r.status,'SEVEN_DAYS_RECORDED');
 assert.equal(r.samples,7);
 assert.equal(r.missingDays.length,0);
 assert.equal(r.exactScoreAccuracy,'NOT_VERIFIED');
 assert.equal(r.autoTuned,false);
 const after=sampleR4Trial({verifiedInput:input(BASE+7*DAY),observations:[],
  now:BASE+7*DAY,existing:record,sourceHash:'fixed-snapshot'});
 assert.equal(after.status,'TRIAL_WINDOW_CLOSED');
 assert.equal(after.write,false);
});
test('same calendar day never overwrites first observation; changing tuning or runtime source stops the cohort',()=>{
 const at=BASE;
 const first=sampleR4Trial({verifiedInput:input(at),now:at,sourceHash:'source-v1'});
 assert.equal(sampleR4Trial({verifiedInput:input(at+HOUR),now:at+HOUR,
  existing:first.record,sourceHash:'source-v1'}).status,'SAMPLE_ALREADY_RECORDED');
 assert.throws(()=>sampleR4Trial({verifiedInput:input(at+DAY),now:at+DAY,
  existing:first.record,sourceHash:'source-v2'}),/DRIFT/);
 assert.throws(()=>sampleR4Trial({verifiedInput:input(at+DAY),now:at+DAY,
  existing:first.record,sourceHash:'source-v1',
  config:{weights:{D:.1,C:.4,M:.3,H:.1,N:.1},sensitivity:1.1}}),/DRIFT/);
});
test('a missing day stays missing after the seven-day clock ends',()=>{
 const first=sampleR4Trial({verifiedInput:input(BASE),now:BASE,sourceHash:'fixed'});
 const second=sampleR4Trial({verifiedInput:input(BASE+2*DAY),now:BASE+2*DAY,
   existing:first.record,sourceHash:'fixed'});
 const report=summarizeR4Trial(second.record,BASE+8*DAY);
 assert.equal(report.status,'INCOMPLETE');
 assert.equal(report.samples,2);
 assert.equal(report.missingDays.length,5);
});
test('read-only preflight with no R4 input neither creates weekly ledger nor changes existing SQLite checkpoints',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'iran-r4-trial-')),dbfile=path.join(dir,'production-source.sqlite'),home=path.join(dir,'weekly');
 const store=openStore(dbfile);
 try{
  store.checkpoint('verified-input',{legacyR13:true});
  store.close();
  const result=runR4TrialLocal({mode:'--preflight',dbFile:dbfile,dir:home,now:BASE});
  assert.equal(result.status,'R4_INPUT_PENDING');
  assert.equal(result.sampled,false);
  assert.equal(fs.existsSync(home),false);
  const report=runR4TrialLocal({mode:'--report',dbFile:dbfile,dir:home,now:BASE});
  assert.equal(report.status,'NOT_STARTED');
  const audit=openStore(dbfile);
  try{assert.deepEqual(audit.getCheckpoint('verified-input'),{legacyR13:true});
    assert.equal(audit.getCheckpoint('r4-shadow-verified-input-v1'),null);
  }finally{audit.close();}
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('local shadow run saves only small result ledger and never changes source DB',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'iran-r4-sample-')),dbfile=path.join(dir,'input.sqlite'),home=path.join(dir,'trial');
 const store=openStore(dbfile);
 try{
  store.checkpoint('r4-shadow-verified-input-v1',input(BASE));
  store.close();
  const a=runR4TrialLocal({mode:'--sample',dbFile:dbfile,dir:home,now:BASE});
  assert.equal(a.status,'SAMPLE_RECORDED');
  assert.equal(a.sampled,true);
  const again=runR4TrialLocal({mode:'--sample',dbFile:dbfile,dir:home,now:BASE});
  assert.equal(again.status,'SAMPLE_ALREADY_RECORDED');
  const report=runR4TrialLocal({mode:'--report',dbFile:dbfile,dir:home,now:BASE});
  assert.equal(report.samples,1);
  assert.equal(fs.readdirSync(home).length,1);
  const saved=JSON.parse(fs.readFileSync(path.join(home,'week.json'),'utf8'));
  assert.equal(saved.samples.length,1);
  assert.equal(saved.samples[0].publicScore,null);
  assert.equal(JSON.stringify(saved).includes('example.invalid'),false);
  const db=openStore(dbfile);
  try{assert.equal(db.getCheckpoint('r4-shadow-verified-input-v1').fronts.IRN_USA.id,'IRN_USA');
  }finally{db.close();}
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('seven daily samples can be reweighted after the week without modifying recorded baseline',()=>{
 let trial=null;
 for(let i=0;i<7;i++){
  const at=BASE+i*DAY;
  trial=sampleR4Trial({verifiedInput:input(at),observations:[],now:at,existing:trial,sourceHash:'fixed'}).record;
 }
 const before=JSON.stringify(trial);
 const variants=[{name:'baseline',config:R4_TRIAL_DEFAULT},
  {name:'lower_military',config:{weights:{D:.25,C:.35,M:.20,H:.10,N:.10},sensitivity:.8}}];
 const comparison=previewR4TrialReweight(trial,variants,BASE+6*DAY);
 assert.equal(comparison.status,'TUNING_CANDIDATES_ONLY');
 assert.equal(comparison.variants.length,2);
 assert.equal(comparison.variants[0].observations.length,7);
 assert.deepEqual(comparison.variants[0].observations.map(x=>x.score),trial.samples.map(x=>x.candidateScore));
 assert.equal(comparison.autoApplied,false);
 assert.equal(JSON.stringify(trial),before);
});
test('comparison requires seven distinct days; no auto adjustment after only six days',()=>{
 let trial=null;
 for(let i=0;i<6;i++)trial=sampleR4Trial({verifiedInput:input(BASE+i*DAY),now:BASE+i*DAY,
  existing:trial,sourceHash:'fixed'}).record;
 assert.equal(previewR4TrialReweight(trial,[{name:'baseline',config:R4_TRIAL_DEFAULT}],BASE+6*DAY).status,
  'INSUFFICIENT_SEVEN_DAY_HISTORY');
});
test('completed local trial compare reads variants separately and never rewrites ledger',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'iran-r4-compare-')),dbfile=path.join(dir,'input.sqlite'),home=path.join(dir,'trial');
 const store=openStore(dbfile);
 try{
  for(let i=0;i<7;i++) {
   const at=BASE+i*DAY;
   store.checkpoint('r4-shadow-verified-input-v1',input(at));
   const result=runR4TrialLocal({mode:'--sample',dbFile:dbfile,dir:home,now:at});
   assert.equal(result.status,'SAMPLE_RECORDED');
  }
  const main=path.join(home,'week.json'),original=fs.readFileSync(main,'utf8');
  const variantFile=path.join(home,'seven-day-variants.json');
  fs.writeFileSync(variantFile,JSON.stringify([{name:'frozen',config:R4_TRIAL_DEFAULT}]));
  const result=runR4TrialLocal({mode:'--compare',dbFile:dbfile,dir:home,now:BASE+6*DAY});
  assert.equal(result.status,'TUNING_CANDIDATES_ONLY');
  assert.deepEqual(result.variants[0].observations.map(x=>x.score),
   JSON.parse(original).samples.map(x=>x.candidateScore));
  assert.equal(fs.readFileSync(main,'utf8'),original);
 }finally{store.close();fs.rmSync(dir,{recursive:true,force:true});}
});
