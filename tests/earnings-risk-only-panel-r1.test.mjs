import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {earningsCostRetrievalDay,earningsCostDisplayStatus} from '../app/earnings-recession/earnings-cost-observation-display-r1.mjs';
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

test('BLS retrieval date is canonical source day, not publication or observation day',()=>{
 assert.equal(earningsCostRetrievalDay('2026-11-18T00:30:15.000Z'),'2026-11-18');
 for(const malformed of [null,undefined,'2026-11-18','2026-02-30T00:00:00.000Z',
  '2026-11-18T24:00:00.000Z','2026-11-18T00:30:15+09:00','bad-date']){
  assert.equal(earningsCostRetrievalDay(malformed),'—');
 }
 assert.match(risk,/수집 \{earningsCostRetrievalDay\(row\?\.retrievedAt\)\}/);
 assert.equal((risk.match(/earningsCostRetrievalDay\(row\?\.retrievedAt\)/g)||[]).length,2);
});

test('BLS stale or partial never masks independent ready entries on desktop and mobile',()=>{
 assert.equal(earningsCostDisplayStatus({status:'READY',freshness:{status:'FRESH'}},true),'참고');
 assert.equal(earningsCostDisplayStatus({status:'READY',freshness:{status:'STALE'}},false),'갱신 지연');
 assert.equal(earningsCostDisplayStatus({status:'STALE',freshness:{status:'FRESH'}},false),'갱신 지연');
 assert.equal(earningsCostDisplayStatus({status:'PARTIAL',freshness:{status:'FRESH'}},false),'확인 대기');
 assert.equal(earningsCostDisplayStatus(undefined,false),'확인 대기');
 assert.equal((risk.match(/earningsCostDisplayStatus\(row,ok\)/g)||[]).length,2);
 assert.match(risk,/추가 \{costIndicators\.length\}개는 BLS 비용 압력 원자료/);
 assert.doesNotMatch(risk,/추가 5개는 BLS 비용 압력 원자료/);
 assert.equal((risk.match(/label=\{meta\.name\+" 저장된 BLS 관측 추이, 결측 구간은 연결하지 않음"\}/g)||[]).length,2);
 assert.match(risk,/const score=payload\?\.status==="READY"&&validScore\(payload\?\.score\)\?payload\.score:null;/);
});
