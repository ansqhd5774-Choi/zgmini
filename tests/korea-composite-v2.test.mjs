import test from 'node:test';
import assert from 'node:assert/strict';
import {
 buildV2FromRows,calculateCorporatePenalty,calculateV2Score,describeV2Score,
 V2_COMPOSITE_VERSION,V2_CORPORATE_MAX_PENALTY,V2_WEIGHTS
} from '../worker/korea-composite-v2.mjs';

const d=i=>new Date(Date.UTC(2024,0,1)+i*86400000).toISOString().slice(0,10).replaceAll('-','');
const rows=Array.from({length:600},(_,i)=>({
 basDt:d(i),
 crdTrFingWhl:1000+i,
 invrDpsgAmt:10000+i*2,
 brkTrdUcolMnyVsOppsTrdAmt:100+i,
}));
test('penalty is one-sided and capped at ten',()=>{
 assert.equal(calculateCorporatePenalty(-2),0);
 assert.equal(calculateCorporatePenalty(0),0);
 assert.ok(Math.abs(calculateCorporatePenalty(1)-10/3)<1e-12);
 assert.equal(calculateCorporatePenalty(3),V2_CORPORATE_MAX_PENALTY);
 assert.equal(calculateCorporatePenalty(9),V2_CORPORATE_MAX_PENALTY);
});
test('final formula is 50/50 core minus penalty',()=>{
 assert.equal(V2_WEIGHTS.leverage,.5);
 assert.equal(V2_WEIGHTS.liquidation,.5);
 assert.equal(calculateV2Score(60,40,-1),50);
 assert.equal(calculateV2Score(60,40,3),40);
});
test('stage policy uses rounded displayScore',()=>{
 assert.equal(describeV2Score(24.96).stageCode,'FEAR');
 assert.equal(describeV2Score(75.04).stageCode,'GREED');
 assert.equal(describeV2Score(75.06).stageCode,'EXTREME_GREED');
});
test('build has warmup then real history and no positive corporate reward',()=>{
 const disclosures=[];
 const result=buildV2FromRows({creditRows:rows,capitalRows:rows,disclosureRows:disclosures},new Date(`${d(599).slice(0,4)}-${d(599).slice(4,6)}-${d(599).slice(6,8)}T00:00:00Z`));
 assert.equal(result.methodologyVersion,V2_COMPOSITE_VERSION);
 assert.equal(result.status,'READY');
 assert.ok(result.score!==null);
 assert.equal(result.corporateStressPenalty,0);
 assert.equal(result.components.at(-1).weightedContribution,0);
 assert.ok(result.history.length<=366);
});
test('severe disclosures can only lower score from the 50/50 core',()=>{
 const disclosureRows=[];
 for(let i=320;i<600;i+=10)for(let j=0;j<5;j++)disclosureRows.push({basDt:d(i),crno:`${i}-${j}`});
 const result=buildV2FromRows({creditRows:rows,capitalRows:rows,disclosureRows},new Date(`${d(599).slice(0,4)}-${d(599).slice(4,6)}-${d(599).slice(6,8)}T00:00:00Z`));
 assert.ok(result.score!==null);
 assert.ok(result.corporateStressPenalty>=0);
 assert.ok(result.score<=result.baseScore+1e-12);
});
test('missing deposit never becomes neutral 50',()=>{
 const broken=rows.map((x,i)=>i===599?{...x,invrDpsgAmt:null}:x);
 const result=buildV2FromRows({creditRows:broken,capitalRows:broken,disclosureRows:[]},new Date(`${d(599).slice(0,4)}-${d(599).slice(4,6)}-${d(599).slice(6,8)}T00:00:00Z`));
 assert.notEqual(result.history.at(-1).score,50);
 assert.equal(result.history.at(-1).score,null);
});
