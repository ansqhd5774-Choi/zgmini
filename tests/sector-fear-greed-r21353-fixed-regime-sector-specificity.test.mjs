import test from 'node:test';
import assert from 'node:assert/strict';
import {R21353_FIXED_MIN_SPY_ROWS,analyzeR21353Fixed} from '../scripts/pc-writer/sector-fear-greed-r21353-fixed-regime-sector-specificity.mjs';

test('R2.13.53 fixed minimum SPY rows matches trailing-63 requirement',()=>{assert.equal(R21353_FIXED_MIN_SPY_ROWS,64);});

test('R2.13.53 fixed analysis accepts sub-252 SPY history when matched regime coverage is sufficient',()=>{
 const spy=[];let p=100;for(let i=0;i<180;i++){p*=1+(i%13===0?-.01:.002);spy.push({date:new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10),close:p});}
 const dates=spy.slice(63,180).map(x=>x.date),mk=v=>dates.map(date=>({date,partialIcVsFiveRaw:v}));
 const detail={};const loso={};for(const h of [5,20,60]){detail[h]={return:mk(.02),drawdown:mk(-.08)};loso[h]={drawdown:{full:-.08,min:-.09,max:-.07,maxAbsDelta:.01,negativeRuns:11,positiveRuns:0}};}
 const s42={status:'SHADOW_R21342_TAIL_CORRELATION_SCREEN_COMPLETE',approvedR1ReferenceRequirement:756,normalizationChanged:false,weightsChanged:false,referenceWindowChanged:false,featureResults:{internalCorrelationShock:{status:'READY_252',crossSectional:{detail},loso:{summary:loso}}}};
 const s52={status:'SHADOW_R21352_FROZEN_HISTORICAL_ROBUSTNESS_COMPLETE',retuning:false,synthesis:{drawdownStrongCells:0,returnStrongCells:0}};
 const r=analyzeR21353Fixed(s42,s52,spy);assert.equal(r.spy.rows,180);assert.ok(r.spy.regimeDates>=100);assert.equal(r.synthesis.generalAxisEligible,false);
});

test('R2.13.53 fixed still rejects genuinely insufficient SPY history',()=>{const s42={status:'SHADOW_R21342_TAIL_CORRELATION_SCREEN_COMPLETE',approvedR1ReferenceRequirement:756,normalizationChanged:false,weightsChanged:false,referenceWindowChanged:false,featureResults:{internalCorrelationShock:{status:'READY_252'}}},s52={status:'SHADOW_R21352_FROZEN_HISTORICAL_ROBUSTNESS_COMPLETE',retuning:false};assert.throws(()=>analyzeR21353Fixed(s42,s52,Array(63).fill({date:'2026-01-01',close:100})),/R21353_FIXED_SPY_HISTORY_TOO_SHORT:63/);});
