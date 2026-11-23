import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

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
