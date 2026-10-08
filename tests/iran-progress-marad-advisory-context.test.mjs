import test from 'node:test';import assert from 'node:assert/strict';
import {parseMaradAdvisoryContext as parse} from '../scripts/iran-progress/marad-advisory-context.mjs';
test('advisory identity stays context only despite attack title',()=>{
 const r=parse('<a href="/msci/2026-011-persian-gulf">2026-011-Persian Gulf-Iranian Attacks</a>');
 assert.equal(r.candidates.length,1);assert.equal(r.candidates[0].id,'2026-011');
 assert.equal(r.attackCount,null);assert.equal(r.coverageVerified,false);assert.equal(r.restrictionVerified,false);
});
test('empty or unrelated list is never zero attacks or unrestricted traffic',()=>{
 const r=parse('There are no active alerts at this time');assert.equal(r.status,'NO_MATCHING_ADVISORY_PARSED');assert.equal(r.attackCount,null);
});
test('foreign links and non-advisory paths cannot become official context',()=>{
 const r=parse('<a href="https://other.test/msci/x">2026-011-Iran</a><a href="/news/x">2026-012-Hormuz</a>');
 assert.equal(r.candidates.length,0);
});
