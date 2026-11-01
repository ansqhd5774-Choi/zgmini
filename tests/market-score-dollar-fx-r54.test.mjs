import test from 'node:test';
import assert from 'node:assert/strict';
import {marketDetailRows} from '../lib/market-score/detail-catalog.mjs';
import {buildCmR1DomainResults} from '../lib/market-score/domain-adapter-r1.mjs';

const dollarFx={
 status:'READY',
 score:44,
 observationDate:'2026-09-25',
 methodologyVersion:'DOLLAR_FX_R54_1',
 rows:[{
  observationDate:'2026-09-25',
  score:44,
  stress:56,
  broadDollarIndex:119.2,
  shortMomentum:1.4,
  mediumMomentum:3.1,
  volatility20:0.52,
  levelScore:38,
  shortMomentumScore:42,
  mediumMomentumScore:47,
  volatilityScore:55,
 }],
};

test('R54 dollar FX public domain exposes four stable factors',()=>{
 const domain=buildCmR1DomainResults({dollarFx}).find(x=>x.id==='dollarFx');
 assert.equal(domain.status,'READY');
 assert.equal(domain.methodologyVersion,'DOLLAR_FX_R54_1');
 assert.deepEqual(domain.indicators.map(x=>x.id),['dollar-fx-54-1','dollar-fx-54-2','dollar-fx-54-3','dollar-fx-54-4']);
 assert.deepEqual(domain.indicators.map(x=>x.score),[38,42,47,55]);
 assert.deepEqual(domain.indicators.map(x=>x.value),[119.2,1.4,3.1,0.52]);
});

test('R54 dollar FX detail catalog maps by stable factor id',()=>{
 const domain=buildCmR1DomainResults({dollarFx}).find(x=>x.id==='dollarFx');
 const rows=marketDetailRows('dollarFx',[...domain.indicators].reverse());
 assert.deepEqual(rows.map(x=>x.label),['달러 강세 부담','단기 달러 추세','중기 달러 추세','달러 변동성']);
 assert.deepEqual(rows.map(x=>x.score),[38,42,47,55]);
 assert.ok(rows.every(x=>x.raw===false));
});

test('legacy dollar FX input cannot be substituted into R54 factor ids',()=>{
 const rows=marketDetailRows('dollarFx',[{name:'Broad Dollar Index',status:'READY',score:50}]);
 assert.deepEqual(rows.map(x=>x.label),['Broad Dollar Index','달러 3개월 변화율','EME Dollar Index','달러 변동성']);
 assert.deepEqual(rows.map(x=>x.score),[50,null,null,null]);
});


test('R54 dollar FX public trend retains up to one year of stored score rows',()=>{
 const rows=Array.from({length:40},(_,i)=>({
  ...dollarFx.rows[0],
  observationDate:`2026-08-${String((i%28)+1).padStart(2,'0')}`,
  score:40+i/10,
 }));
 const domain=buildCmR1DomainResults({dollarFx:{...dollarFx,rows}}).find(x=>x.id==='dollarFx');
 assert.equal(domain.trend.length,40);
 assert.equal(domain.trend.at(0).value,40);
 assert.equal(domain.trend.at(-1).value,43.9);
});
