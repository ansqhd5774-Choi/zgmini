import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('CNN checked history stays separate from authentic source observed archive and is a stored-only reader',()=>{
 const route=read('app/api/fear-greed/observations/route.ts');
 assert.match(route,/fear-greed-verified-checks/);
 assert.match(route,/CNN_VERIFIED_CHECKS_R1/);
 assert.match(route,/checkedPoints/);
 assert.match(route,/checkTimeMeaning:'PC_VERIFIED_STORED_AT'/);
 assert.match(route,/totalObservedPoints:all.length/);
 assert.doesNotMatch(route,/fetch\(['"]https:/);
});
test('US chart reuses original 1D and uses successful PC check times only after two real points',()=>{
 const panel=read('app/fear-greed/usa/cnn-panel.tsx');
 assert.match(panel,/includeOneDay/);
 assert.match(panel,/archived.checkedPoints.length>=2/);
 assert.match(panel,/timestamp:point.checkedAt/);
 assert.match(panel,/sourceObservedAt/);
 assert.doesNotMatch(panel,/label:'1일',days:1/);
 const korea=read('app/korea-composite-view.tsx');
 assert.doesNotMatch(korea,/checkedPoints/);
});
test('current CNN collector 15m policy remains and public endpoint cannot trigger it',()=>{
 const feed=read('worker/public-feed-store.mjs');
 assert.match(feed,/intervalMs:15\*60000/);
 const route=read('app/api/fear-greed/observations/route.ts');
 assert.match(route,/SELECT snapshot_key,body/);
 assert.doesNotMatch(route,/runPublicFeeds|refreshPublicFeeds|collectLocal/);
});
