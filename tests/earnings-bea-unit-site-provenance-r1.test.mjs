import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {earningsCostPublicationKst,earningsCostSparkGeometry} from '../app/earnings-recession/earnings-cost-observation-display-r1.mjs';

const panel=fs.readFileSync(new URL('../app/earnings-recession/earnings-risk-only-panel.tsx',import.meta.url),'utf8');
const sources=fs.readFileSync(new URL('../app/data-sources/page.tsx',import.meta.url),'utf8');

test('BEA official JSON source links are provenance-bound in both desktop and mobile help',()=>{
 assert.match(panel,/unitRow\?\.transport===\"BEA_API_JSON\"/);
 assert.match(panel,/unitRow\?\.seriesId===\"A463RD\"/);
 assert.match(panel,/unitRow\?\.sourceURL===\"https:\/\/apps\.bea\.gov\/api\/data\"/);
 assert.match(panel,/const unitSourceUrl=unitNativeBea\?/);
 assert.match(panel,/const unitSourceLabel=unitNativeBea\?/);
 assert.equal((panel.match(/href=\{unitSourceUrl\}/g)||[]).length,2);
 assert.equal((panel.match(/\{unitSourceLabel\}/g)||[]).length,2);
 assert.ok(panel.includes('https://fred.stlouisfed.org/series/A463RD3Q052SBEA'));
 assert.doesNotMatch(panel,/href=\"https:\/\/fred\.stlouisfed\.org\/series\/A463RD3Q052SBEA\"/);
});

test('data sources disclose native BEA non-endorsement without removing FRED notice',()=>{
 assert.match(sources,/This product uses the Bureau of Economic Analysis \(BEA\) Data API but is not endorsed or certified by BEA\./);
 assert.match(sources,/https:\/\/apps\.bea\.gov\/api\/_pdf\/bea_api_tos\.pdf/);
 assert.match(sources,/This product uses the FRED® API but is not endorsed or certified/);
});

test('BEA source archive and D1 publication times are separate KST labels in both help surfaces',()=>{
 assert.match(panel,/sourceStoredAt\?:number;publishedAt\?:string/);
 assert.match(panel,/const unitPcSavedKst=/);
 assert.match(panel,/unitPayload!\.sourceStoredAt!/);
 assert.match(panel,/const unitD1PublishedKst=/);
 assert.equal((panel.match(/PC 원자료 저장: \{unitPcSavedKst\}/g)||[]).length,2);
 assert.equal((panel.match(/D1 공개 게시: \{unitD1PublishedKst\}/g)||[]).length,2);
 assert.equal(earningsCostPublicationKst('2026-11-23T11:58:05.956Z'),
  '2026-11-23 20:58:05 KST');
 assert.equal(earningsCostPublicationKst('2026-11-23T15:20:20.972Z'),
  '2026-11-24 00:20:20 KST');
 assert.equal(earningsCostPublicationKst(''), '—');
});

test('BEA 5-quarter spark uses the true first value and final plotted marker',()=>{
 const history=[0.216,0.219,0.222,0.231,0.250].map(value=>({value}));
 const geometry=earningsCostSparkGeometry(history);
 assert(geometry);
 assert(geometry.path.startsWith('M5.0 30.0'),geometry.path);
 assert(geometry.path.endsWith('L115.0 6.0'),geometry.path);
 assert.deepEqual(geometry.marker,{cx:115,cy:6});
 assert.equal(earningsCostSparkGeometry([...history.slice(0,4),{value:null}]).marker,null,
  'missing last point must not falsely mark a historical value as current');
});
