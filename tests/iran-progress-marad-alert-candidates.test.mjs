import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMaradAlertsPage} from '../scripts/iran-progress/marad-alert-candidates.mjs';

const active='<a href="/msci/2026-014-test-maritime-alert">2026-014A-Persian Gulf-Security Alert</a>';
const cancelled='<a href="/msci/2026-001a-strait-hormuz">2026-001A-Strait of Hormuz-Military Operations and Potential Retaliatory Strikes</a>';
const page=(current='There are no active alerts at this time.')=>'<h2>Active Alerts</h2><p>'+current+'</p><h2>Cancelled Alerts</h2>'+cancelled;

test('MARAD no active alerts is never interpreted as zero military events',()=>{
 const r=parseMaradAlertsPage(page());
 assert.equal(r.status,'NO_ACTIVE_ALERTS_LISTED');
 assert.equal(r.activeCount,0);
 assert.equal(r.cancelledCount,1);
 assert.equal(r.attackCount,null);
 assert.equal(r.eventVerified,false);
 assert.equal(r.coverageVerified,false);
 assert.equal(r.candidates[0].eventAt,null);
 assert.equal(r.candidates[0].listingStatus,'CANCELLED');
});
test('linked government alerts become candidates, never confirmed attacks',()=>{
 const r=parseMaradAlertsPage(page(active));
 assert.equal(r.status,'DISCOVERY_ONLY');
 assert.equal(r.activeCount,1);
 assert.equal(r.cancelledCount,1);
 assert.equal(r.candidates[0].eventType,null);
 assert.equal(r.candidates[0].occurrenceVerified,false);
 assert.equal(r.productionEligible,false);
});
test('MARAD parser rejects unrelated links, host spoofing and excess candidates',()=>{
 const bad='<a href="https://www.maritime.dot.gov.attacker.test/msci/2026-050-fake">2026-050A fake</a>'
  +'<a href="javascript:alert(1)">2026-051A fake</a>'
  +'<a href="https://www.maritime.dot.gov/other/2026-052">2026-052A fake</a>';
 const r=parseMaradAlertsPage(page(bad));
 assert.equal(r.candidates.length,1);
 assert.throws(()=>parseMaradAlertsPage(page(active),{maxCandidates:1}),/CANDIDATE_LIMIT/);
 assert.throws(()=>parseMaradAlertsPage('<h2>Active Alerts</h2>'),/SECTIONS_MISSING/);
});
test('MARAD contradictory active-empty text never silently reports zero',()=>{
 assert.throws(()=>parseMaradAlertsPage(page('There are no active alerts at this time. '+active)),/CONTRADICTION/);
});
