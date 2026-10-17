import test from 'node:test';import assert from 'node:assert/strict';
import {chartExtrema,clampedChartIndex,placeExtremaLabels,extremaLeader} from '../lib/chart-extrema.mjs';
test('displayed extrema preserve zero, ignore gaps and choose latest ties',()=>{
 const result=chartExtrema([{date:'2026-10-01',value:0},{date:'2026-10-02',value:null},{date:'2026-10-03',value:90},{date:'2026-10-04',value:90},{date:'2026-10-05',value:NaN}]);
 assert.deepEqual(result,[{date:'2026-10-01',value:0,index:0,kind:'min'},{date:'2026-10-04',value:90,index:3,kind:'max'}]);
 assert.deepEqual(chartExtrema([]),[]);assert.deepEqual(chartExtrema([{date:'undated',value:20}]),[]);
 assert.deepEqual(chartExtrema([{date:'2026-10-01',value:50},{date:'2026-10-02',value:50}]),[{date:'2026-10-02',value:50,index:1,kind:'flat'}]);
});
test('leaders choose the closest eligible face on all four sides',()=>{
 const label={x:100,y:100};
 for(const [point,side,end] of [[{x:40,y:102},'left','H 73'],[{x:160,y:102},'right','H 127'],[{x:100,y:40},'top','V 87'],[{x:100,y:160},'bottom','V 117']]){
  const leader=extremaLeader(point,label);assert.equal(leader.side,side);assert.ok(leader.path.endsWith(end));
 }
 assert.equal(extremaLeader({x:40,y:80},label).side,'left');
 assert.equal(extremaLeader({x:85,y:30},label).side,'top');
});
test('label placement finds clear space without mutating plot dimensions',()=>{
 const plot={x:32,y:6,width:300,height:84},before={...plot};
 const points=Array.from({length:31},(_,i)=>({x:32+i*10,y:45+Math.sin(i)*12}));
 const labels=placeExtremaLabels(points,[{kind:'min',...points[2]},{kind:'max',...points[3]}],plot);
 assert.equal(labels.length,2);assert.ok(labels.every(p=>p.hits===0));assert.deepEqual(plot,before);
 const [a,b]=labels;assert.ok(Math.abs(a.x-b.x)>=48||Math.abs(a.y-b.y)>=28);
 assert.deepEqual(labels,placeExtremaLabels(points,[{kind:'max',...points[3]},{kind:'min',...points[2]}],plot));
});
test('held cursor clamps beyond either end and handles empty or narrow plots',()=>{
 assert.equal(clampedChartIndex(500,100,200,11),10);assert.equal(clampedChartIndex(-10,100,200,11),0);assert.equal(clampedChartIndex(200,100,200,11),5);
 assert.equal(clampedChartIndex(200,100,0,11),null);assert.equal(clampedChartIndex(200,100,200,0),null);assert.equal(clampedChartIndex(200,100,200,1),0);
});
