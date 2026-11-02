import test from 'node:test';
import assert from 'node:assert/strict';
import {preservePreviousR10,R10_RECALCULATED_STATUS} from '../scripts/pc-writer/asset-r10-refresh-gate.mjs';

test('R10 success is publishable only with new successful calculation and READY payload',()=>{
  assert.equal(preservePreviousR10({inputInstalled:true,calculationStatus:R10_RECALCULATED_STATUS,projectionStatus:'READY'}),false);
  assert.equal(preservePreviousR10({inputInstalled:false,calculationStatus:null,projectionStatus:null}),false);
});

test('R10 failed calculation preserves last release even if old payload still reports READY',()=>{
  assert.equal(preservePreviousR10({inputInstalled:true,calculationStatus:'FAILED_PREVIOUS_RELEASE_PRESERVED',projectionStatus:'READY'}),true);
  assert.equal(preservePreviousR10({inputInstalled:true,calculationStatus:R10_RECALCULATED_STATUS,projectionStatus:'PARTIAL'}),true);
  assert.equal(preservePreviousR10({inputInstalled:true,calculationStatus:null,projectionStatus:'READY'}),true);
});

test('R10 preserves a valid existing release if the input research file is missing',()=>{
  assert.equal(preservePreviousR10({inputInstalled:false,calculationStatus:null,projectionStatus:'READY'}),true);
  assert.equal(preservePreviousR10({inputInstalled:false,calculationStatus:null,projectionStatus:'PENDING'}),false);
});
