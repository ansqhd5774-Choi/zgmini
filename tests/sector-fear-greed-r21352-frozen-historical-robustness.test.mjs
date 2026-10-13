import test from 'node:test';
import assert from 'node:assert/strict';
import {R21352_FEATURE,R21352_HORIZONS,R21352_REFERENCE_OBSERVATIONS,R21352_EXPECTED_IC_DIRECTION,neweyWestMeanR21352,exactBlockSignFlipR21352,purgedTimeFoldsR21352,holmAdjustR21352} from '../scripts/pc-writer/sector-fear-greed-r21352-frozen-historical-robustness.mjs';

test('R2.13.52 preserves frozen feature, horizons, reference, and direction',()=>{assert.equal(R21352_FEATURE,'internalCorrelationShock');assert.deepEqual(R21352_HORIZONS,[5,20,60]);assert.equal(R21352_REFERENCE_OBSERVATIONS,756);assert.equal(R21352_EXPECTED_IC_DIRECTION,'NEGATIVE');});

test('R2.13.52 Newey-West identifies a persistent negative mean',()=>{const values=Array.from({length:120},(_,i)=>-.10+.02*Math.sin(i/5));const r=neweyWestMeanR21352(values,20);assert.equal(r.n,120);assert.ok(r.mean<0);assert.ok(r.t<0);assert.ok(r.pOneSidedNegative<.05);});

test('R2.13.52 exact block sign flip is deterministic and directional',()=>{const values=Array.from({length:126},(_,i)=>-.15+.01*Math.sin(i));const a=exactBlockSignFlipR21352(values,21),b=exactBlockSignFlipR21352(values,21);assert.deepEqual(a,b);assert.equal(a.blocks,6);assert.equal(a.assignments,64);assert.ok(a.observedMedian<0);assert.ok(a.pOneSidedNegative<=.05);});

test('R2.13.52 purged time folds remove horizon tails without using future folds',()=>{const rows=Array.from({length:240},(_,i)=>({date:new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10),partialIcVsFiveRaw:-.1-.001*(i%7)}));const r=purgedTimeFoldsR21352(rows,20);assert.equal(r.folds,4);assert.equal(r.negative,4);assert.equal(r.positive,0);assert.ok(r.detail.every(x=>x.purgedTail===20&&x.eligible>=21));});

test('R2.13.52 Holm correction is monotone and controls six-cell family',()=>{const r=holmAdjustR21352([{key:'a',p:.001},{key:'b',p:.01},{key:'c',p:.02},{key:'d',p:.2},{key:'e',p:.4},{key:'f',p:.8}]);assert.equal(r.length,6);for(let i=1;i<r.length;i++)assert.ok(r[i].adjusted>=r[i-1].adjusted);assert.equal(r[0].adjusted,.006);});
