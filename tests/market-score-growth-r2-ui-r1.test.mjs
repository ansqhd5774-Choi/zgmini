import test from 'node:test';
import assert from 'node:assert/strict';
import {marketDetailRows} from '../lib/market-score/detail-catalog.mjs';
import {buildStoredGrowthR2Domain} from '../lib/market-score/growth-r2-worker-domain-r1.mjs';
import {GROWTH_R2_FEATURE_IDS} from '../lib/market-score/growth-r2-contract.mjs';

test('Growth R2 formula remains 24-feature while UI exposes four representative scores by stable ID',async()=>{
 const feature=[];
 for(const [j,id] of GROWTH_R2_FEATURE_IDS.entries())for(let m=1;m<=4;m++)feature.push({candidateId:id,observationDate:`2026-0${m}-01`,availableAt:`2026-0${m+1}-05T00:00:00.000Z`,pitEligible:true,harmonizedValue:j*10+m,sourceHash:`${id}-${m}`,frequency:'MONTHLY'});
 const domain=await buildStoredGrowthR2Domain(feature,{asOf:'2026-06-01'});
 assert.equal(domain.status,'READY');
 assert.equal(domain.coverage,24);
 assert.deepEqual(domain.indicators.map(x=>x.id),['G010','G019','G035','G060']);
 const rows=marketDetailRows('growth',domain.indicators);
 assert.deepEqual(rows.map(x=>x.label),['제조업 신규주문','산업생산','비농업고용 증감','신규 사업체 신청']);
 assert.ok(rows.every(x=>typeof x.score==='number'&&x.score>=0&&x.score<=100));
});
