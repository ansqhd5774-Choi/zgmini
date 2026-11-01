import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const source=fs.readFileSync(path.join(here,'..','scripts','pc-writer','earnings-r5-production-cycle-r1.mjs'),'utf8');

test('E1-R5 keeps R1 for current score and uses R2 only for reconstructed trend',()=>{
 assert.match(source,/E1-R5-TREND-HISTORY-R2/);
 assert.match(source,/historical-backfill-r1\.json/);
 assert.match(source,/historical-backfill-r2\.json/);
 assert.match(source,/productionTimeline=buildGuidanceTimeline/);
 assert.match(source,/trendTimeline=buildGuidanceTimeline/);
 assert.match(source,/currentForward=guidanceAsOf\(productionTimeline,currentDate\)/);
 assert.match(source,/forwardRows:trendForwardHistory/);
 assert.doesNotMatch(source,/currentForward=guidanceAsOf\(trendTimeline,currentDate\)/);
});

test('R2 ledger participates in the trend fingerprint without becoming current source metadata',()=>{
 assert.match(source,/TREND_HISTORY:/);
 assert.match(source,/const source=latestSource\(allLocalSourceFiles\(base\)\)/);
});
