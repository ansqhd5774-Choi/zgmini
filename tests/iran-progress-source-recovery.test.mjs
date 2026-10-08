import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGdeltArchiveManifest,inspectMaradAlertsListing,planIranSourceRecovery} from '../scripts/iran-progress/source-recovery.mjs';

const manifest=[
 '106658 914eb90b89fdf6e959de43f156980913 http://data.gdeltproject.org/gdeltv2/20261008153000.export.CSV.zip',
 '164475 f494f73ea7610c70e14c02773d2b874a http://data.gdeltproject.org/gdeltv2/20261008153000.mentions.CSV.zip',
 '7635048 0628f840c32b39b187b76ee3db73484 http://data.gdeltproject.org/gdeltv2/20261008153000.gkg.csv.zip',
].join('\n');

test('official GDELT manifest is source metadata, never verified incidents',()=>{
 const result=parseGdeltArchiveManifest(manifest);
 assert.equal(result.status,'MANIFEST_ONLY');
 assert.equal(result.archives.length,3);
 assert.equal(result.archives[0].type,'export.CSV.zip');
 assert.equal(result.publishedAt,Date.parse('2026-10-08T15:30:00Z'));
 assert.equal(result.attackCount,null);
 assert.equal(result.coverageVerified,false);
 assert.equal(result.productionEligible,false);
});
test('GDELT manifest rejects foreign hosts, wrong file order, mixed timestamps and invalid calendar dates',()=>{
 for(const invalid of [
  manifest.replace('data.gdeltproject.org','evil.example'),
  manifest.replace('export.CSV.zip','mentions.CSV.zip'),
  manifest.replace('20261008153000.gkg','20261008154500.gkg'),
  manifest.replace('20261008153000.export','20260230153000.export'),
  manifest.split('\n').slice(0,2).join('\n'),
  manifest+'\n'+manifest.split('\n')[0],
 ])assert.throws(()=>parseGdeltArchiveManifest(invalid));
});
test('MARAD missing active alerts never means absence of attacks',()=>{
 const noAlerts=inspectMaradAlertsListing('<h2>Active Alerts</h2><p>There are no active alerts at this time.</p>');
 assert.equal(noAlerts.status,'NO_ACTIVE_ALERTS_LISTED');
 assert.equal(noAlerts.attackCount,null);
 assert.equal(noAlerts.coverageVerified,false);
 assert.equal(inspectMaradAlertsListing('<h2>Active Alerts</h2><table><tr><td>2026-011A</td></tr></table>').status,'ALERT_DETAILS_REQUIRED');
 assert.equal(inspectMaradAlertsListing('<h1>Error</h1>').status,'UNPARSEABLE');
});
test('UKMTO 403 and GDELT 429 report safe candidate paths without data promotion',()=>{
 const state={sources:{ukmto:{status:'SOURCE_FAILED',httpStatus:403}},discovery:{status:'SOURCE_FAILED',error:'GDELT_HTTP_429',retryAt:Date.parse('2026-10-09T06:00:00Z')}};
 const before=structuredClone(state);
 const plan=planIranSourceRecovery(state);
 assert.deepEqual(state,before);
 assert.equal(plan.ukmto.reason,'UKMTO_403');
 assert.equal(plan.ukmto.alternatives[0].id,'MARAD_MSCI_ALERTS');
 assert.equal(plan.gdelt.reason,'GDELT_DOC_429');
 assert.equal(plan.gdelt.status,'COOLDOWN_PRESERVED');
 assert.equal(plan.gdelt.retryAt,state.discovery.retryAt);
 assert.equal(plan.ukmto.eventVerified,false);
 assert.equal(plan.gdelt.productionEligible,false);
});
test('normal access does not activate other data sources',()=>{
 const plan=planIranSourceRecovery({sources:{ukmto:{status:'COLLECTED',httpStatus:200}},discovery:{status:'NOT_REQUESTED'}});
 assert.equal(plan.ukmto.alternatives.length,0);
 assert.equal(plan.gdelt.alternatives.length,0);
});
