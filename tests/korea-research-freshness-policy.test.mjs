import test from 'node:test';
import assert from 'node:assert/strict';
import {assessKoreaResearchFreshness} from '../worker/korea-market-d1.mjs';

test('months-old stored KRX snapshot cannot claim CURRENT',()=>{
 const x=assessKoreaResearchFreshness('20260909','20260909',Date.parse('2026-11-16T00:55:00Z'));
 assert.equal(x.status,'STALE_OBSERVATION');
 assert.equal(x.reasonCode,'OBSERVATION_TOO_OLD');
 assert.ok(x.observationAgeDays>60);
});
test('Friday research date remains current on Monday, avoiding simple weekend false alarms',()=>{
 const x=assessKoreaResearchFreshness('20261113','20261113',Date.parse('2026-11-16T00:55:00Z'));
 assert.equal(x.status,'CURRENT');
 assert.equal(x.observationAgeDays,3);
});
test('newer stored market date takes precedence over recent research snapshot',()=>{
 const x=assessKoreaResearchFreshness('20261113','20261116',Date.parse('2026-11-16T00:55:00Z'));
 assert.equal(x.status,'UPDATE_PENDING');
 assert.equal(x.reasonCode,'NEWER_MARKET_DATA_STORED');
});
test('future and invalid observation dates fail closed',()=>{
 assert.equal(assessKoreaResearchFreshness('20261132',null,Date.parse('2026-11-16T00:00:00Z')).status,'UNVERIFIED');
 assert.equal(assessKoreaResearchFreshness('20261117',null,Date.parse('2026-11-16T00:00:00Z')).status,'UNVERIFIED');
});
