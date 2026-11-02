import test from 'node:test';
import assert from 'node:assert/strict';
import {isMarketSession} from '../lib/market-score/breadth-b1-r3-calendar.mjs';
import {storedR10BLockedFiveQuarters} from '../scripts/pc-writer/asset-r10-b-stored-runner-r1.mjs';

const lastSession=month=>{
 const [y,m]=month.split('-').map(Number);
 for(let t=Date.UTC(y,m,0);;t-=86400000){
  const date=new Date(t).toISOString().slice(0,10);
  if(date!=='2025-01-09'&&isMarketSession(date))return date;
 }
};
const months=['2025-09','2025-10','2025-11','2025-12',
 '2026-01','2026-02','2026-03','2026-04','2026-05','2026-06'];
function sample({closureQuality=true,closureBreadth=true}={}){
 const qualityRows=months.map(month=>({observationDate:lastSession(month),
  coverage:0.99,participation:0.65}));
 const scores=[22,51,60,69,55,66,77,50,60,70];
 const breadthRows=months.map((month,i)=>({observationDate:lastSession(month),
  researchSafetyScore:scores[i],rankObservations:252}));
 if(closureQuality)qualityRows.unshift({observationDate:'2025-01-09',
  coverage:0.99,participation:0.65});
 if(closureBreadth)breadthRows.unshift({observationDate:'2025-01-09',
  researchSafetyScore:null,rankObservations:null});
 return {quality:{rows:qualityRows},breadth:{formulaApproved:true,rows:breadthRows},
  release:{status:'READY',scoreObservationQuarter:'2026-Q2',
   methodologyVersion:'ASSET_BUBBLE_R10_CANDIDATE',indicators:[
    {id:'breadthDivergence',status:'READY',score:60},
    ...Array.from({length:5},(_,i)=>({id:'other'+i,status:'READY',score:60})),
   ]}};
}
const locked=x=>storedR10BLockedFiveQuarters(x);
test('R47 ignores only pre-window closure while preserving 5Q scores and nulls',()=>{
 const data=sample(),value=locked(data);
 assert.deepEqual(value,[
  {quarter:'2025-Q2',breadthDivergence:null},
  {quarter:'2025-Q3',breadthDivergence:null},
  {quarter:'2025-Q4',breadthDivergence:60},
  {quarter:'2026-Q1',breadthDivergence:66},
  {quarter:'2026-Q2',breadthDivergence:60},
 ]);
 assert.deepEqual(value,locked(sample({closureQuality:false,closureBreadth:false})));
});
test('quality or breadth alone can contain the old closure without becoming a scored session',()=>{
 assert.ok(locked(sample({closureBreadth:false})));
 assert.ok(locked(sample({closureQuality:false})));
});
test('duplicate/out-of-order historical closure still fails',()=>{
 const data=sample();
 data.quality.rows.splice(1,0,{...data.quality.rows[0]});
 assert.equal(locked(data),null);
 const badBreadth=sample();
 badBreadth.breadth.rows.splice(1,0,{...badBreadth.breadth.rows[0]});
 assert.equal(locked(badBreadth),null);
});
test('invalid coverage or breadth score on historical closure still fails',()=>{
 const data=sample();data.quality.rows[0].coverage=1.2;
 assert.equal(locked(data),null);
 const other=sample();other.breadth.rows[0].researchSafetyScore=101;
 assert.equal(locked(other),null);
});
test('another historical non-session date is still rejected',()=>{
 const data=sample();
 data.quality.rows.splice(1,0,{observationDate:'2025-01-20',
  coverage:0.99,participation:0.65});
 assert.equal(locked(data),null);
});
test('2025-01-09 is still rejected if it is inside the locked 5Q window',()=>{
 const data=sample();data.release.scoreObservationQuarter='2026-Q1';
 data.release.indicators[0].score=66;
 assert.equal(locked(data),null);
});
test('a non-session inside the 5Q window is always rejected',()=>{
 const data=sample();
 data.quality.rows.splice(1,0,{observationDate:'2025-06-19',
  coverage:0.99,participation:0.65});
 assert.equal(locked(data),null);
});
