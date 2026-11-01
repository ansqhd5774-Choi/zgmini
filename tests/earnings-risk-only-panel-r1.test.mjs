import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const risk=read('app/earnings-recession/earnings-risk-only-panel.tsx');
const legacy=read('app/earnings-recession/earnings-recession-panel.tsx');
test('new eight-risk candidate renders independent diagnostic score, chart and exactly four risk factors',()=>{
 assert.match(risk,/score\.toFixed\(1\)/);
 assert.match(risk,/riskTrend/);
 assert.match(risk,/riskHistoryKind/);
 assert.match(risk,/riskFactorsMethodologyVersion===payload\?\.methodologyVersion/);
 for(const id of ['epsGrowth','margin','revenueGrowth','earningsGrowthBreadth'])assert.ok(risk.includes(id),id);
 assert.doesNotMatch(risk,/storedE1|E1-R5|r5Order|S1.*S13/);
 assert.match(risk,/저장된 동일 산식의 과거 점수 미확보/);
 assert.match(risk,/fiscalReconstruction/);
 assert.match(risk,/사후 재구성/);
 assert.match(legacy,/storedE1/); // Legacy stays unmodified until validated cutover; not a production assertion.
});
test('risk-only candidate never fabricates one-year points, deltas or source scores',()=>{
 assert.doesNotMatch(risk,/fakeMiniTrend|synthesizedPrior|scoreComparisons\?\./);
 assert.match(risk,/trend\.length>=2/);
 assert.match(risk,/score===null/);
 assert.match(risk,/factor\?\.score\?\?null/);
});
