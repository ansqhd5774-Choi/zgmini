import test from 'node:test';
import assert from 'node:assert/strict';
import {creditRiskInputLineage} from '../lib/score-history/credit-risk-input-lineage-r1.mjs';

const base=()=>({
 inputs:{series:Object.fromEntries(['DGS2','DGS5','DGS10','DGS30'].map((key,index)=>[key,[{observationDate:'2026-11-06',value:3+index}]])),
  external:{cmdiRows:[{observationDate:'2026-11-06',hy:0.12,ig:0.32,market:0.21}]}},
 snapshot:{storedAt:1800000000000,body:{asOfDate:'2026-11-06',diagnostics8:{creditRiskDefense:{status:'READY',score:72}},
  domains:[{id:'credit',indicators:[{id:'credit-43',score:64,value:0.21,unit:'지수',observationDate:'2026-11-05',source:'Chicago Fed'}]}]}},
 nowIso:'2026-11-10T10:00:00Z',
});
const signature=value=>creditRiskInputLineage(value).inputSignature;

test('same score inputs do not change from publication clock or snapshot re-save',()=>{
 const a=base(),b=base();b.snapshot.storedAt+=120000;b.nowIso='2026-11-11T12:00:00Z';
 b.inputs.series.DGS2[0].checkedAt='2026-11-11T12:00:00Z';
 b.inputs.external.cmdiRows[0].retrievedAt='2026-11-11T12:00:00Z';
 assert.equal(signature(a),signature(b));
});

test('a newly stored bond observation is detected',()=>{
 const a=base(),b=base();b.inputs.series.DGS10.push({observationDate:'2026-11-09',value:3.5});
 assert.notEqual(signature(a),signature(b));
});

test('same-day corrected Treasury value is detected',()=>{
 const a=base(),b=base();b.inputs.series.DGS2[0].value=8;
 assert.notEqual(signature(a),signature(b));
});

test('same-day corrected CMDI data is detected',()=>{
 const a=base(),b=base();b.inputs.external.cmdiRows[0].hy=0.99;
 assert.notEqual(signature(a),signature(b));
});

test('irrelevant macro and credit inputs do not cause a false change',()=>{
 const a=base(),b=base();b.inputs.series.PAYEMS=[{observationDate:'2026-11-01',value:100}];
 b.inputs.external.dvpRepoRows=[{observationDate:'2026-11-01',value:9}];
 assert.equal(signature(a),signature(b));
});

test('the stored current score is a separate effective input',()=>{
 const a=base(),b=base();b.snapshot.body.diagnostics8.creditRiskDefense.score=65;
 assert.notEqual(signature(a),signature(b));
});

test('the actual builder cutoff changes the signature; wall clock alone does not',()=>{
 const a=base(),b=base();b.snapshot.body.asOfDate='2026-11-07';
 assert.notEqual(signature(a),signature(b));
});

test('a missing snapshot asOf uses reader time as the effective cutoff',()=>{
 const a=base(),b=base();delete a.snapshot.body.asOfDate;delete b.snapshot.body.asOfDate;
 b.nowIso='2026-11-11T01:00:00Z';
 assert.notEqual(signature(a),signature(b));
});

test('TTL-caused source disappearance changes lineage without inventing zero values',()=>{
 const a=base(),b=base();b.inputs.series={};b.inputs.external={};
 assert.notEqual(signature(a),signature(b));
 assert.equal(creditRiskInputLineage(b).sourceCount,4);
});

test('optional NFCI display and credit diagnostic status are covered',()=>{
 const a=base(),b=base(),c=base();b.snapshot.body.domains[0].indicators[0].value=0;
 c.snapshot.body.diagnostics8.creditRiskDefense.status='PARTIAL';
 assert.notEqual(signature(a),signature(b));
 assert.notEqual(signature(a),signature(c));
});

test('input signature is stable across JSON roundtrips and never returns raw source rows',()=>{
 const value=base(),copy=JSON.parse(JSON.stringify(value));
 value.inputs.external.cmdiRows[0].token='private-test-token';
 const result=creditRiskInputLineage(value);
 assert.equal(result.inputSignature,signature(copy));
 assert.match(result.inputSignature,/^[a-f0-9]{64}$/);
 assert.equal(JSON.stringify(result).includes('private-test-token'),false);
});

test('missing valid time context fails clearly, without fabricated dates',()=>{
 const value=base();delete value.snapshot.body.asOfDate;delete value.nowIso;
 assert.throws(()=>creditRiskInputLineage(value),/CREDIT_RISK_ASOF_REQUIRED/);
});
