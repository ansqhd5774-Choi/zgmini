import test from 'node:test';
import assert from 'node:assert/strict';
import {GROWTH_R2_FEATURE_IDS,GROWTH_R2_WEIGHTS,validateGrowthR2Contract} from '../lib/market-score/growth-r2-contract.mjs';
import {appendGrowthR2History,projectGrowthR2Current} from '../lib/market-score/growth-r2-collector-r1.mjs';
import {buildGrowthR2Score} from '../lib/market-score/growth-r2-score-r1.mjs';
import {projectGrowthR2Public} from '../lib/market-score/growth-r2-public-r1.mjs';

test('contract exact feature set and weights',()=>{
  assert.equal(validateGrowthR2Contract(),true);
  assert.equal(GROWTH_R2_FEATURE_IDS.length,24);
  assert.equal(GROWTH_R2_FEATURE_IDS.includes('G041'),false);
  assert.ok(Math.abs(Object.values(GROWTH_R2_WEIGHTS).reduce((a,b)=>a+b,0)-1)<1e-12);
});

test('collector keeps zero, ignores null, is idempotent',()=>{
  const base=[{candidateId:'G010',observationDate:'2026-01-01',availableAt:'2026-02-01T00:00:00Z',vintageId:'v1',harmonizedValue:0,pitEligible:true}];
  const incoming=[
    {...base[0]},
    {candidateId:'G010',observationDate:'2026-02-01',availableAt:'2026-03-01T00:00:00Z',vintageId:'v2',harmonizedValue:null,pitEligible:true},
    {candidateId:'G010',observationDate:'2026-03-01',availableAt:'2026-04-01T00:00:00Z',vintageId:'v3',harmonizedValue:2,pitEligible:true},
  ];
  const r=appendGrowthR2History(base,incoming);
  assert.equal(r.appended,1);
  assert.equal(r.ignoredNull,1);
  assert.equal(r.duplicate,1);
  assert.equal(r.rows[0].harmonizedValue,0);
});

test('project current obeys asOf and PIT',()=>{
  const rows=[
    {candidateId:'G010',observationDate:'2026-01-01',availableAt:'2026-02-01T00:00:00Z',harmonizedValue:1,pitEligible:true},
    {candidateId:'G010',observationDate:'2026-02-01',availableAt:'2026-03-01T00:00:00Z',harmonizedValue:2,pitEligible:true},
    {candidateId:'G010',observationDate:'2026-03-01',availableAt:'2026-04-01T00:00:00Z',harmonizedValue:3,pitEligible:false},
  ];
  const x=projectGrowthR2Current(rows,'2026-03-15T00:00:00Z');
  assert.equal(x.G010.observationDate,'2026-02-01');
});

function fixture(asOf='2026-04-15T00:00:00Z') {
  const rows=[];
  for (const id of GROWTH_R2_FEATURE_IDS) {
    for (let i=1;i<=4;i++) rows.push({
      candidateId:id,
      observationDate:`2026-${String(i).padStart(2,'0')}-01`,
      availableAt:`2026-${String(i).padStart(2,'0')}-05T00:00:00Z`,
      vintageId:`${id}-${i}`,
      sourceHash:`h-${id}-${i}`,
      frequency:'MONTHLY',
      harmonizedValue:i,
      pitEligible:true,
    });
  }
  return {rows,asOf};
}

test('full fixture READY and deterministic',()=>{
  const f=fixture();
  const a=buildGrowthR2Score({featureRecords:f.rows,asOf:f.asOf,codeSha:'x'});
  const b=buildGrowthR2Score({featureRecords:f.rows,asOf:f.asOf,codeSha:'x'});
  assert.equal(a.status,'READY');
  assert.equal(a.coverage,24);
  assert.equal(a.score,b.score);
  assert.equal(a.inputSnapshotId,b.inputSnapshotId);
});

test('missing required feature is NOT_READY without rescale',()=>{
  const f=fixture();
  const rows=f.rows.filter(x=>x.candidateId!=='G010');
  const r=buildGrowthR2Score({featureRecords:rows,asOf:f.asOf});
  assert.equal(r.status,'NOT_READY');
  assert.equal(r.score,null);
  assert.deepEqual(r.missingFactors,['G010']);
});

test('stale required feature is NOT_READY',()=>{
  const f=fixture('2026-08-15T00:00:00Z');
  const r=buildGrowthR2Score({featureRecords:f.rows,asOf:f.asOf});
  assert.equal(r.status,'NOT_READY');
  assert.ok(r.staleFactors.length>0);
});

test('public projection rounds only display value',()=>{
  const p=projectGrowthR2Public({methodologyVersion:'x',asOf:'a',status:'READY',score:63.456,coverage:24,requiredCoverage:24,missingFactors:[],staleFactors:[],inputSnapshotId:'h'});
  assert.equal(p.score,63.456);
  assert.equal(p.displayScore,63.5);
});
