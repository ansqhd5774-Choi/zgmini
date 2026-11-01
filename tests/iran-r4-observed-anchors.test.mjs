import test from 'node:test';
import assert from 'node:assert/strict';
import {examineR4RealityAnchors,auditR4ScoreAgainstAnchors} from '../lib/iran-progress/observed-anchors-r4.mjs';
const HOUR=3600000;
const stamp=s=>Date.parse(s);
const CURRENT=stamp('2026-10-18T05:00:00Z');
const source=(overrides={})=>({
 sourceId:'REUTERS_2026_10_17_EGYPT_SAUDI',
 sourceUrl:'https://www.reuters.com/world/middle-east/egypts-sisi-seeks-parliaments-backing-help-defend-saudi-arabia-if-asked-2026-10-17/',
 sourceKind:'INDEPENDENT_REPORT',reviewStatus:'SOURCE_TEXT_REVIEWED',
 front:'YEMEN_HOUTHI',condition:'ACTIVE_COMBAT',reportedAsOngoing:true,
 observationAt:stamp('2026-10-17T14:23:00Z'),
 publishedAt:stamp('2026-10-17T14:23:00Z'),reviewedAt:stamp('2026-10-18T04:00:00Z'),
 ...overrides
});
const UN=source({
 sourceId:'UN_2026_10_09_ENVOY_YEMEN',
 sourceUrl:'https://dppa.un.org/en/news/yemen-has-returned-to-full-scale-war-special-envoy-warns',
 sourceKind:'OFFICIAL',condition:'FULL_SCALE_WAR',
 observationAt:stamp('2026-10-09T12:00:00Z'),
 publishedAt:stamp('2026-10-09T12:00:00Z'),
 reviewedAt:stamp('2026-10-09T15:00:00Z')
});
test('October 17 Reuters ongoing fighting contradicts 50 or 80, not proof of exact 18',()=>{
 const e=examineR4RealityAnchors([source()],CURRENT);
 assert.equal(e.status,'CONSTRAINT_ONLY');
 assert.equal(e.maximumCompatibleScore,39);
 assert.equal(e.score,null);
 assert.equal(e.calibrationStatus,'EXACT_SCORE_UNDETERMINED');
 assert.equal(auditR4ScoreAgainstAnchors(80,[source()],CURRENT).status,'CONTRADICTED_BY_CURRENT_COMBAT');
 assert.equal(auditR4ScoreAgainstAnchors(50,[source()],CURRENT).status,'CONTRADICTED_BY_CURRENT_COMBAT');
 assert.equal(auditR4ScoreAgainstAnchors(18,[source()],CURRENT).status,'NOT_CONTRADICTED_BUT_UNCALIBRATED');
});
test('UN October 9 full-war assessment is contemporaneous October 9, not fresh October 18',()=>{
 const then=stamp('2026-10-09T18:00:00Z');
 assert.equal(examineR4RealityAnchors([UN],then).maximumCompatibleScore,24);
 const now=examineR4RealityAnchors([UN],CURRENT);
 assert.equal(now.status,'INSUFFICIENT_EVIDENCE');
 assert.equal(now.maximumCompatibleScore,null);
 assert.equal(auditR4ScoreAgainstAnchors(80,[UN],CURRENT).status,'UNASSESSABLE');
});
test('current Reuters and older UN source cannot be treated as a fresh 10-point certainty',()=>{
 const x=examineR4RealityAnchors([UN,source()],CURRENT);
 assert.equal(x.maximumCompatibleScore,39);
 assert.equal(x.eligibleCount,1);
 assert.equal(x.excludedCount,1);
});
test('Egypt conditional defense statements, shipping warnings, commentary are not executed battles',()=>{
 const conditional=source({condition:'INTERVENTION_CONTINGENT'});
 const advice=source({condition:'ADVISORY_ONLY'});
 const hypothetical=source({reportedAsOngoing:false});
 const x=examineR4RealityAnchors([conditional,advice,hypothetical],CURRENT);
 assert.equal(x.status,'INSUFFICIENT_EVIDENCE');
 assert.equal(x.score,null);
});
test('duplicate syndicated reports cannot inflate supported source counts',()=>{
 const a=source();
 const x=examineR4RealityAnchors([a,{...a}],CURRENT);
 assert.equal(x.eligibleCount,1);
 assert.equal(x.excluded[0].reason,'DUPLICATE_SOURCE_CONDITION');
});
test('a future-dated review, non-HTTPS source or unreviewed Ollama claim cannot constrain score',()=>{
 const a=source({reviewedAt:CURRENT+HOUR});
 const b=source({sourceUrl:'http://example.invalid/not-safe'});
 const c=source({reviewStatus:'OLLAMA_CANDIDATE_ONLY'});
 const e=examineR4RealityAnchors([a,b,c],CURRENT);
 assert.equal(e.status,'INSUFFICIENT_EVIDENCE');
 assert.equal(e.excludedCount,3);
});
test('unobserved USD-Iran front cannot be silently declared ended from Yemen evidence',()=>{
 const x=examineR4RealityAnchors([source()],CURRENT);
 assert.equal(x.perFront.YEMEN_HOUTHI.reportedCondition,'ACTIVE_COMBAT');
 assert.equal(x.perFront.IRN_USA,undefined);
 assert.equal(x.perFront.IRN_ISR,undefined);
 assert.equal(x.fullInputCoverageVerified,false);
});
test('an old article reread today remains stale instead of refreshing observedAt',()=>{
 const stale=source({observationAt:CURRENT-12*24*HOUR,publishedAt:CURRENT-12*24*HOUR,reviewedAt:CURRENT-HOUR});
 assert.equal(examineR4RealityAnchors([stale],CURRENT).status,'INSUFFICIENT_EVIDENCE');
});
