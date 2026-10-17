import test from 'node:test';import assert from 'node:assert/strict';
import {chartExtrema,clampedChartIndex} from '../lib/chart-extrema.mjs';
test('displayed extrema preserve zero, ignore gaps and choose latest ties',()=>{
 const result=chartExtrema([{date:'2026-10-01',value:0},{date:'2026-10-02',value:null},{date:'2026-10-03',value:90},{date:'2026-10-04',value:90},{date:'2026-10-05',value:NaN}]);
 assert.deepEqual(result,[{date:'2026-10-01',value:0,index:0,kind:'min'},{date:'2026-10-04',value:90,index:3,kind:'max'}]);
 assert.deepEqual(chartExtrema([]),[]);assert.deepEqual(chartExtrema([{date:'undated',value:20}]),[]);
 assert.deepEqual(chartExtrema([{date:'2026-10-01',value:50},{date:'2026-10-02',value:50}]),[{date:'2026-10-02',value:50,index:1,kind:'flat'}]);
});
test('held cursor clamps beyond either end and handles empty or narrow plots',()=>{
 assert.equal(clampedChartIndex(500,100,200,11),10);assert.equal(clampedChartIndex(-10,100,200,11),0);assert.equal(clampedChartIndex(200,100,200,11),5);
 assert.equal(clampedChartIndex(200,100,0,11),null);assert.equal(clampedChartIndex(200,100,200,0),null);assert.equal(clampedChartIndex(200,100,200,1),0);
});
