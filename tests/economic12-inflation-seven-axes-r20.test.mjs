import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {INFLATION_R2_AXES} from '../lib/diagnostic-layer/inflation-r2-stored.mjs';
import {INFLATION_R2_AXIS_DISPLAY,inflationR2PublicAxisIndicators} from '../lib/market-score/inflation-r2-axis-display-r1.mjs';

test('economic inflation detail exports all seven actual scoring axes, no phantom factors',()=>{
 assert.equal(INFLATION_R2_AXES.length,7);
 assert.deepEqual(Object.keys(INFLATION_R2_AXIS_DISPLAY),[...INFLATION_R2_AXES]);
 const points=Object.fromEntries(INFLATION_R2_AXES.map((id,i)=>[id,i===0?0:12+i]));
 const list=inflationR2PublicAxisIndicators(points,'2026-10-20');
 assert.deepEqual(list.map(x=>x.id),[...INFLATION_R2_AXES]);
 assert.equal(list.length,7);
 assert.equal(list[0].score,0,'actual zero is not missing');
 assert.ok(list.every(x=>x.name&&x.description&&x.source==='STORED_PIT_HISTORY'&&x.status==='READY'));
 assert.ok(list.every(x=>!Object.hasOwn(x,'weight')&&!Object.hasOwn(x,'rawValue')&&!Object.hasOwn(x,'features')));
});

test('missing axis stays PARTIAL with null score, not zero or guessed value',()=>{
 const list=inflationR2PublicAxisIndicators({TARGET_STABILITY:0},'2026-10-20');
 assert.equal(list[0].status,'READY');
 assert.equal(list[0].score,0);
 assert.equal(list[1].status,'PARTIAL');
 assert.equal(list[1].score,null);
 assert.equal(list.length,7);
});

test('economy R2 publisher uses seven actual axes; the independent risk page still uses its original sixteen-feature endpoint',()=>{
 const reader=readFileSync('worker/inflation-r2-reader.mjs','utf8');
 const market=readFileSync('app/economic-indicators/economic-detail-page.tsx','utf8');
 const risk=readFileSync('app/inflation/inflation-panel.tsx','utf8');
 assert.match(reader,/indicators:inflationR2PublicAxisIndicators\(current\.axes,asOf\)/);
 assert.ok(market.includes('<EconomicDetailPanel id={id}/>'));
 assert.ok(risk.includes("useStoredIndex<InflationPayload>('/api/inflation-detail')"));
 assert.ok(risk.includes('const featureOrder=['));
});
