import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 GROWTH_R2_FEATURES,GROWTH_R2_FEATURE_IDS,GROWTH_R2_METHOD,GROWTH_R2_WEIGHTS,
} from '../lib/market-score/growth-r2-contract.mjs';
import {attachStoredGrowthFactorTrends} from '../scripts/pc-writer/growth-r2-saved-factor-history.mjs';
import {verifiedEconomicGrowthScore} from '../lib/economic-growth-stored-display-r4.mjs';

const explanation='Growth R2: 24/24 stored feature history -> expanding percentile -> approved W2 weights; no missing reweight';
const score=(id,i,change=0)=>id==='G062'?0:id==='G044'?100:Math.max(0,Math.min(100,25+i*2+change));
const growth=(date,change=0)=>{
 const indicators=GROWTH_R2_FEATURES.map(({featureId,provider},i)=>({
  id:featureId,status:'READY',score:score(featureId,i,change),
  observationDate:'2026-09-01',availableAt:'2026-10-05T00:00:00.000Z',
  source:provider,
 }));
 return {
  id:'growth',source:GROWTH_R2_METHOD.methodologyVersion,
  methodologyVersion:GROWTH_R2_METHOD.methodologyVersion,
  status:'READY',freshness:'STORED_D1_HISTORY_ONLY',interpretation:explanation,
  missingFactors:[],indicators,
  score:indicators.reduce((sum,row)=>sum+GROWTH_R2_WEIGHTS[row.id]*row.score,0),
 };
};
const wrap=(date,g=growth(date))=>({status:'SUCCESS',asOfDate:date,domains:[g]});
const prior=(date,g=growth(date))=>({
 date,body:wrap(date,g),storedAt:Date.parse(date+'T15:22:00.000Z'),
});
const factor=(b,id)=>b.domains.find(d=>d.id==='growth').indicators.find(x=>x.id===id);

test('24 G16 score-only mini-lines use 3 genuine prior saved evaluation days and current exact endpoint',()=>{
 assert.equal(GROWTH_R2_FEATURE_IDS.length,24);
 assert.equal(GROWTH_R2_FEATURE_IDS.includes('G041'),false);
 const body=wrap('2026-11-18',growth('2026-11-18',4));
 const history=[
  prior('2026-10-11',growth('2026-10-11',-4)),
  prior('2026-11-05',growth('2026-11-05',-1)),
  prior('2026-11-17',growth('2026-11-17',2)),
 ];
 const old=structuredClone(history),oldScore=body.domains[0].score;
 assert.equal(verifiedEconomicGrowthScore(body.domains[0],body.asOfDate),oldScore);
 assert.equal(attachStoredGrowthFactorTrends(body,history),body);
 assert.deepEqual(history,old,'saved rows must remain immutable');
 assert.equal(body.domains[0].score,oldScore,'no formula/reweight changes');
 assert.equal(body.domains[0].indicators.filter(x=>x.trend?.length===4).length,24);
 for(const id of GROWTH_R2_FEATURE_IDS){
  const row=factor(body,id);
  assert.deepEqual(row.trend.map(p=>p.label),[
   '2026-10-11','2026-11-05','2026-11-17','2026-11-18'
  ]);
  assert.equal(row.trend.at(-1).value,row.score);
  assert.deepEqual(Object.keys(row.trend[0]),['label','value']);
  assert.ok(row.trend.every(p=>p.value>=0&&p.value<=100));
 }
 assert.equal(factor(body,'G062').trend.at(-1).value,0,'legitimate zero retained');
 assert.equal(factor(body,'G044').trend.at(-1).value,100,'legitimate hundred retained');
 assert.equal(Object.hasOwn(body.domains[0],'sourceVersion'),false,'do not invent source lineage');
});

test('absent genuine dated snapshots do not create a fake single-point line or copy total trend',()=>{
 const b=wrap('2026-11-18');
 b.domains[0].trend=[{label:'2025-12-01',value:60},{label:'2026-11-18',value:b.domains[0].score}];
 attachStoredGrowthFactorTrends(b,[]);
 assert.ok(b.domains[0].indicators.every(x=>!x.trend),'no fake factor history');
 assert.equal(b.domains[0].trend.length,2);
});

test('different version, D2 legacy, provider identity, missing/partial G16 and changed W2 total are excluded',()=>{
 const b=wrap('2026-11-18');
 const changedMethod=growth('2026-11-17',-3);
 changedMethod.methodologyVersion='GROWTH_R2_D2';
 const changedProvider=growth('2026-11-16',-3);
 changedProvider.indicators[0].source='UNLICENSED_MIRROR';
 const missing=growth('2026-11-15',-3);missing.indicators.pop();
 const badTotal=growth('2026-11-14',-3);badTotal.score+=1;
 const partial=growth('2026-11-13',-3);partial.indicators[1].status='PARTIAL';
 attachStoredGrowthFactorTrends(b,[
  prior('2026-11-17',changedMethod),prior('2026-11-16',changedProvider),
  prior('2026-11-15',missing),prior('2026-11-14',badTotal),
  prior('2026-11-13',partial),
 ]);
 assert.ok(b.domains[0].indicators.every(x=>!x.trend));
});

test('stored_at, evaluated date, future data and valid current score are separately checked',()=>{
 const b=wrap('2026-11-18');
 const futureGrowth=growth('2026-11-17',-1);
 futureGrowth.indicators[0].availableAt='2026-11-19T00:00:00.000Z';
 const mismatched=prior('2026-11-16',growth('2026-11-16',-2));
 mismatched.body.asOfDate='2026-11-15';
 const delayed=prior('2026-11-15',growth('2026-11-15',-2));
 delayed.storedAt=Date.parse('2026-11-17T15:00:00Z');
 const unverified=prior('2026-11-14',growth('2026-11-14',-2));unverified.storedAt=null;
 attachStoredGrowthFactorTrends(b,[
  prior('2026-11-17',futureGrowth),mismatched,delayed,unverified,
 ]);
 assert.ok(b.domains[0].indicators.every(x=>!x.trend));
});

test('same-day conflicting score revisions fail closed, but true 0 and unchanged days remain valid',()=>{
 const b=wrap('2026-11-18');
 const history=[
  prior('2026-11-15',growth('2026-11-15',-5)),
  prior('2026-11-15',growth('2026-11-15',-1)),
  prior('2026-11-17',growth('2026-11-17',1)),
 ];
 attachStoredGrowthFactorTrends(b,history);
 assert.deepEqual(factor(b,'G010').trend.map(r=>r.label),['2026-11-17','2026-11-18']);
 assert.deepEqual(factor(b,'G062').trend.map(r=>r.label),[
  '2026-11-15','2026-11-17','2026-11-18'
 ]);
 assert.equal(factor(b,'G062').trend[0].value,0);
});

test('preserve approved producer mini-history and wire G16 before local/D1 market publication',()=>{
 const b=wrap('2026-11-18');
 factor(b,'G010').trend=[{label:'2026-10-05',value:40}];
 attachStoredGrowthFactorTrends(b,[prior('2026-11-17')]);
 assert.deepEqual(factor(b,'G010').trend,[{label:'2026-10-05',value:40}]);
 assert.equal(factor(b,'G011').trend.length,2);
 const writer=readFileSync('scripts/pc-writer/run-local.mjs','utf8');
 const helper=readFileSync('scripts/pc-writer/growth-r2-saved-factor-history.mjs','utf8');
 const hook='attachStoredGrowthFactorTrends(body,storedHistory)';
 assert.match(writer,/from '.\/growth-r2-saved-factor-history\.mjs'/);
 assert.ok(writer.indexOf(hook)>-1&&writer.indexOf(hook)<writer.indexOf('assertCompleteMarket(body)'));
 assert.ok(writer.indexOf(hook)<writer.indexOf('writeScore(body,now)'));
 assert.ok(helper.includes('sameVerifiedLineage(current,previous)'));
 assert.doesNotMatch(helper,/fetch\(|providerRequests|harmonizedValue|private.*sourceUrl/);
});
