import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyReferenceHistory} from '../lib/iran-progress/chart-history.mjs';
test('14 calendar days preserve actual changes and carry stored state without invented events',()=>{
 const history=[{date:'2026-10-01',value:54.5,delta:4.5},{date:'2026-10-02',value:49.5,delta:-5}];
 const points=dailyReferenceHistory({asOfDate:'2026-10-09',score:49.5,history});
 assert.equal(points.length,14);assert.equal(points[0].date,'2026-09-26');assert.equal(points.at(-1).date,'2026-10-09');
 assert.equal(points[0].value,50);assert.equal(points.at(-1).value,49.5);
 assert.deepEqual(points.filter(p=>!p.carried).map(p=>[p.date,p.value]),history.map(p=>[p.date,p.value]));
 assert.equal(history.length,2);
});
test('missing prior delta never invents a preceding value',()=>{
 const points=dailyReferenceHistory({asOfDate:'2026-10-09',score:49.5,history:[{date:'2026-10-02',value:49.5}]});
 assert.equal(points[0].date,'2026-10-02');assert.equal(points.length,8);
});

test('R3 chart never paints its arbitrary initial 50 before the first observed article',()=>{
 const events=[
  {date:'2026-10-12',value:48.1,delta:-1.9},
  {date:'2026-10-17',value:39.1,delta:-9},
  {date:'2026-10-18',value:36.7,delta:-2.4},
 ];
 const input={asOfDate:'2026-10-18',score:36.7,history:events};
 const original=dailyReferenceHistory(input);
 assert.equal(original.length,14);
 assert.equal(original[0].value,50);
 const revised=dailyReferenceHistory(input,{hidePreEventCarry:true});
 assert.equal(revised.length,7);
 assert.equal(revised[0].date,'2026-10-12');
 assert.equal(revised[0].value,48.1);
 assert.equal(revised.at(-1).value,36.7);
 assert.equal(revised.find(x=>x.date==='2026-10-16').carried,true);
 assert.equal(input.history.length,3);
});
test('R3 cannot fabricate a 14-day curve when no dated observation exists',()=>{
 const r=dailyReferenceHistory({asOfDate:'2026-10-18',score:50,history:[]},
  {hidePreEventCarry:true});
 assert.deepEqual(r,[]);
});
