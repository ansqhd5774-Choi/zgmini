import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {summarizeAxeResults,finalizeAccessibilityReport,AXE_TAGS}
 from '../scripts/ci-accessibility-axe.mjs';

const blank=()=>({violations:[],incomplete:[],passes:[{id:'region'}],inapplicable:[]});
test('zero violations is a measured zero, not an unknown value',()=>{
 const report=summarizeAxeResults(blank(),'mobile-390');
 assert.equal(report.violatedRules,0);
 assert.equal(report.violatedNodes,0);
 assert.equal(report.checkedPassRules,1);
 assert.deepEqual(report.violations,[]);
});

test('only rule ID and counts survive; no PII, selectors or HTML in report',()=>{
 const r=blank();
 r.violations=[{id:'color-contrast',impact:'serious',
  nodes:[{target:['#private-email'],html:'secret@example.com'},
   {target:['#private-name'],html:'confidential'}]}];
 const o=summarizeAxeResults(r,'desktop-1440');
 assert.deepEqual(o.violations,[{
  ruleId:'color-contrast',impact:'serious',affectedNodes:2
 }]);
 assert.doesNotMatch(JSON.stringify(o),/private|example\.com|confidential/);
});

test('incomplete results remain unverified and do not masquerade as passes',()=>{
 const r=blank();
 r.incomplete=[{id:'aria-hidden-focus',impact:null,nodes:[{}]}];
 const o=summarizeAxeResults(r,'mobile-390');
 assert.equal(o.unverifiedRules,1);
 assert.deepEqual(o.incomplete,[{ruleId:'aria-hidden-focus',
  impact:'unknown',affectedNodes:1}]);
});

test('malformed scan, duplicate rule ids and invalid impact fail closed',()=>{
 assert.throws(()=>summarizeAxeResults({},'mobile-390'),/CI_AXE_RESULT_INVALID/);
 assert.throws(()=>summarizeAxeResults(blank(),'unknown'),/CI_AXE_RESULT_INVALID/);
 const r=blank();
 r.violations=[{id:'test-rule',impact:'serious',nodes:[{}]},
  {id:'test-rule',impact:'minor',nodes:[{}]}];
 assert.throws(()=>summarizeAxeResults(r,'desktop-1440'),/CI_AXE_RULE_INVALID/);
 r.violations=[{id:'x',impact:'invalid',nodes:[{}]}];
 assert.throws(()=>summarizeAxeResults(r,'mobile-390'),/CI_AXE_RULE_INVALID/);
});

test('two expected viewports and standard WCAG tags are fixed',()=>{
 const a=summarizeAxeResults(blank(),'mobile-390');
 const b=summarizeAxeResults(blank(),'desktop-1440');
 const report=finalizeAccessibilityReport([a,b]);
 assert.equal(report.viewports.length,2);
 assert.equal(report.operationalClaims,false);
 assert.equal(report.baselineStatus,'OBSERVED_ONLY_NO_GATING');
 assert.deepEqual(AXE_TAGS,['wcag2a','wcag2aa','wcag21a','wcag21aa']);
 assert.throws(()=>finalizeAccessibilityReport([a,a]),/CI_AXE_VIEWPORT_SET_INVALID/);
});

test('existing Playwright CI installs exact test-only tool and preserves browser checks',()=>{
 const y=readFileSync(new URL('../.github/workflows/community-chat-browser.yml',import.meta.url),'utf8');
 assert.match(y,/npm install --no-save --package-lock=false --ignore-scripts playwright@1\.56\.1 axe-core@4\.14\.1/);
 assert.match(y,/node scripts\/ci-accessibility-axe\.mjs/);
 assert.match(y,/artifacts\/ci-accessibility\//);
 assert.match(y,/retention-days: 7/);
 assert.match(y,/npx playwright install --with-deps chromium/);
 assert.match(y,/node tests\/community-chat-browser-r1\.mjs/);
 assert.doesNotMatch(y,/continue-on-error:\s*true/);
});
