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
