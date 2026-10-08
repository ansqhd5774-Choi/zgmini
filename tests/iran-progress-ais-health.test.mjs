import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseAisHealth} from '../scripts/iran-progress/ais.mjs';
const now=1791500000000,feed={lastGood:now-1000,tilesOk:6,tiles:6,failures:0,polls:32101,goodPolls:32101};
test('AIS health allowlist excludes PortWatch and never verifies a daily row',()=>{
 const r=parseAisHealth(JSON.stringify({feed,portwatch:{average:84},config:{private:'omit'}}),{now});
 assert.deepEqual(r.feed,feed);assert.equal(r.scope,'POINT_IN_TIME_FEED_SAMPLE');assert.equal(r.qualityVerified,false);
 assert.equal(r.coverageVerified,false);assert.equal(r.upstreamTermsVerified,false);assert.equal(r.portwatch,undefined);assert.equal(r.config,undefined);
});
test('AIS health rejects impossible counters and future feed time',()=>{
 for(const patch of [{lastGood:now+1},{tilesOk:7},{goodPolls:32102},{polls:-1},{failures:0.5}])assert.throws(()=>parseAisHealth(JSON.stringify({feed:{...feed,...patch}}),{now}),/AIS_HEALTH_INVALID/);
});
test('provider counter reset is retained as a new sample, never historical quality proof',()=>{
 const r=parseAisHealth(JSON.stringify({feed:{...feed,polls:1,goodPolls:1}}),{now});assert.equal(r.feed.polls,1);assert.equal(r.qualityVerified,false);
});
