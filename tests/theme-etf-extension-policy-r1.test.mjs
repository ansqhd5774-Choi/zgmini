import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assessThemeEtfExtension,themeEtfRiskScope,THEME_ETF_EXTENSION_POLICY_VERSION} from '../lib/market-score/theme-etf-extension-policy-r1.mjs';

const now=Date.parse('2026-10-23T12:00:00Z');
const history=()=>Array.from({length:252},(_,i)=>({
 date:new Date(Date.parse('2026-10-22T00:00:00Z')-(251-i)*86400000).toISOString().slice(0,10),
 ...(i<92?{score:null,missingReason:'INSUFFICIENT_LOOKBACK'}:{score:25+i*.05}),
}));
const record=()=>({
 policyVersion:THEME_ETF_EXTENSION_POLICY_VERSION,themeId:'quantum',theme:'양자컴퓨팅',
 etfs:[{kind:'ETF',symbol:'QTUM',weight:1}],benchmark:'SPY',
 methodologyVersion:'QTUM_R158_SHADOW',priceMethodVersion:'HOURLY_CLOSE_PROVISIONAL',
 history:history(),latestScore:25+251*.05,sourceAsOf:'2026-10-22T22:00:00Z',
 publicationAuthorized:true,publicationFormat:'DERIVED_SCORE_ONLY',
 sourceEvidence:[{
  provider:'GetMarketHistory',dataset:'US_ETF_1H',accountMode:'ANONYMOUS_PREVIEW',
  evidenceId:'TERMS_2026_10_19',termsUrl:'https://getmarkethistory.com/docs/terms',checkedOn:'2026-10-23',
  rights:{derivedDistribution:'UNKNOWN',internalStorage:'UNKNOWN'},
 }],
 priceEvidence:{verification:'LIMITED_CHECK',checkedAt:'2026-10-23T05:00:00Z',referenceSamples:6,adjustmentBasis:'RAW_UNADJUSTED'},
});
const ownerAcceptance={decisionId:'OWNER_20261023_001',themeId:'quantum',acceptedOn:'2026-10-23',
 unknownRightsAcknowledged:true,limitedPriceCheckAcknowledged:true,disclosureRequired:true};
const acceptRisk=candidate=>{candidate.publisherRiskAcceptance={...ownerAcceptance,acceptedScope:themeEtfRiskScope(candidate)};};

test('single ETF and 92 legitimately immature dates remain researchable, regardless of rights uncertainty',()=>{
 const result=assessThemeEtfExtension(record(),{now});
 assert.equal(result.researchReady,true);
 assert.equal(result.chartReady,true);
 assert.equal(result.currentScoreReady,true);
 assert.equal(result.publicationReady,false);
 assert.ok(result.publicationProblems.includes('LICENSE_SCOPE_UNCONFIRMED'));
});

test('multiple ETF portfolio sizes/weights and arbitrary provider names do not inherit seven-pair or two-source whitelist',()=>{
 for(const components of [
  [{kind:'ETF',symbol:'X',weight:.5},{kind:'ETF',symbol:'Y',weight:.5}],
  [{kind:'ETF',symbol:'A',weight:.2},{kind:'ETF',symbol:'B',weight:.3},{kind:'ETF',symbol:'C',weight:.5}],
 ]){
  const candidate=record();candidate.etfs=components;
  candidate.sourceEvidence[0].provider='DifferentLicensedProvider';
  assert.equal(assessThemeEtfExtension(candidate,{now}).researchReady,true);
 }
});

test('even missing prices, sources, methods and ETF weights never block candidate discovery',()=>{
 const candidate=record();candidate.history=[];delete candidate.sourceEvidence;
 delete candidate.methodologyVersion;delete candidate.priceMethodVersion;delete candidate.benchmark;
 delete candidate.etfs[0].weight;
 const result=assessThemeEtfExtension(candidate,{now});
 assert.equal(result.researchReady,true);
 assert.equal(result.calculationReady,false);
 assert.equal(result.chartReady,false);
 assert.equal(result.publicationReady,false);
});

test('publisher risk acceptance preserves the explicitly unverified status, never manufactures license verification',()=>{
 const candidate=record();acceptRisk(candidate);
 const result=assessThemeEtfExtension(candidate,{now});
 assert.equal(result.publicationReady,true);
 assert.equal(result.publicationBasis,'OWNER_ACCEPTED_LIMITATIONS');
 assert.ok(result.warnings.includes('PUBLISHER_ACCEPTED_LICENSE_AMBIGUITY_NOT_INDEPENDENTLY_VERIFIED'));
});

test('explicit provider prohibition blocks publication regardless of owner acceptance',()=>{
 const candidate=record();acceptRisk(candidate);
 candidate.sourceEvidence[0].rights.derivedDistribution='PROHIBITED';
 const result=assessThemeEtfExtension(candidate,{now});
 assert.equal(result.researchReady,true);
 assert.equal(result.publicationReady,false);
 assert.ok(result.publicationProblems.includes('EXPLICIT_LICENSE_RESTRICTION'));
});

test('publisher acceptance is not reusable after account, source or terms evidence changes',()=>{
 const candidate=record();acceptRisk(candidate);
 candidate.sourceEvidence[0].accountMode='NEW_FREE_ACCOUNT';
 const result=assessThemeEtfExtension(candidate,{now});
 assert.equal(result.publicationReady,false);
 assert.ok(result.publicationProblems.includes('LICENSE_SCOPE_UNCONFIRMED'));
});

test('new daily verification evidence does not retroactively revoke previously approved contract',()=>{
 const candidate=record();acceptRisk(candidate);
 const originalScope=candidate.publisherRiskAcceptance.acceptedScope;
 candidate.priceEvidence.checkedAt='2026-10-23T08:00:00Z';
 candidate.priceEvidence.referenceSamples=9;
 candidate.sourceEvidence[0].checkedOn='2026-10-22';
 assert.equal(themeEtfRiskScope(candidate),originalScope);
 const next=assessThemeEtfExtension(candidate,{now});
 assert.equal(next.publicationReady,true);
 assert.equal(next.publicationBasis,'OWNER_ACCEPTED_LIMITATIONS');
});

test('an actual change in ETF basket, formula, provider identity, terms or price adjustment requires a fresh decision',()=>{
 const mutations=[
  candidate=>{candidate.etfs=[{kind:'ETF',symbol:'QNTM',weight:1}];},
  candidate=>{candidate.methodologyVersion='QTUM_R159_NEW_FORMULA';},
  candidate=>{candidate.priceMethodVersion='DAILY_ADJUSTED_CLOSE';},
  candidate=>{candidate.sourceEvidence[0].dataset='US_ETF_DAILY';},
  candidate=>{candidate.sourceEvidence[0].evidenceId='TERMS_2026_11_01';},
  candidate=>{candidate.priceEvidence.adjustmentBasis='SPLIT_ADJUSTED';},
 ];
 for(const change of mutations){
  const candidate=record();acceptRisk(candidate);change(candidate);
  const result=assessThemeEtfExtension(candidate,{now});
  assert.equal(result.publicationReady,false);
  assert.ok(result.publicationProblems.includes('LICENSE_SCOPE_UNCONFIRMED'));
 }
});

test('missing reason, fabricated score, duplicate ETFs or total weights other than one fail independently',()=>{
 const missing=record();missing.history[0]={date:missing.history[0].date,score:null};
 assert.ok(assessThemeEtfExtension(missing,{now}).chartProblems.includes('MISSING_REASON_REQUIRED'));
 const invented=record();invented.history[0].score=101;
 assert.ok(assessThemeEtfExtension(invented,{now}).chartProblems.includes('CHART_SCORE_INVALID'));
 const invalid=record();invalid.etfs=[{kind:'ETF',symbol:'QTUM',weight:.5},{kind:'ETF',symbol:'QTUM',weight:.5}];
 assert.equal(assessThemeEtfExtension(invalid,{now}).researchReady,false);
 const wrongWeight=record();wrongWeight.etfs[0].weight=.8;
 const result=assessThemeEtfExtension(wrongWeight,{now});
 assert.equal(result.researchReady,true);
 assert.equal(result.calculationReady,false);
 assert.ok(result.calculationProblems.includes('ETF_WEIGHT_NOT_FINALIZED'));
});

test('fully reconciled and documented allowed rights can pass without GetMarketHistory and without owner-risk path',()=>{
 const candidate=record();candidate.sourceEvidence=[{
  provider:'OfficialProvider',dataset:'ETF_CLOSE',accountMode:'LICENSED_FREE_ACCOUNT',
  evidenceId:'PROVIDER_WRITTEN_CONFIRMATION',termsUrl:'https://example.org/official-terms',checkedOn:'2026-10-23',
  rights:{derivedDistribution:'ALLOWED',internalStorage:'ALLOWED'},
  review:{decision:'VERIFIED_FOR_ACCOUNT_MODE',reviewer:'RIGHTS_REVIEWER',supportingEvidence:'OFFICIAL_PERMISSION_DOC_001'},
 }];
 candidate.priceEvidence.verification='FULLY_RECONCILED';
 candidate.priceEvidence.reconciliationEvidenceId='PRICE_COMPARISON_001';
 const result=assessThemeEtfExtension(candidate,{now});
 assert.equal(result.publicationReady,true);
 assert.equal(result.publicationBasis,'RECORDED_SOURCE_RIGHTS_REVIEW');
});

test('an ALLOWED boolean without account-specific review remains ambiguous, not verified',()=>{
 const candidate=record();candidate.sourceEvidence[0].rights={derivedDistribution:'ALLOWED',internalStorage:'ALLOWED'};
 candidate.priceEvidence.verification='FULLY_RECONCILED';
 candidate.priceEvidence.reconciliationEvidenceId='PRICE_AUDIT_001';
 const result=assessThemeEtfExtension(candidate,{now});
 assert.equal(result.publicationReady,false);
 assert.ok(result.publicationProblems.includes('LICENSE_SCOPE_UNCONFIRMED'));
});

test('extension validation never imports or modifies legacy seven-theme/AI/biotech reader source',()=>{
 const source=readFileSync('lib/market-score/theme-etf-extension-policy-r1.mjs','utf8');
 assert.doesNotMatch(source,/\bimport\b|\bfetch\s*\(|\bprepare\s*\(/);
 assert.match(source,/standalone|Standalone/);
 const publicReader=readFileSync('worker/theme-etf-only-public.mjs','utf8');
 const aiReader=readFileSync('worker/theme-ai-semiconductor-optional.mjs','utf8');
 const biotechReader=readFileSync('worker/theme-biotech-optional.mjs','utf8');
 for(const code of [publicReader,aiReader,biotechReader])
  assert.doesNotMatch(code,/theme-etf-extension-policy-r1|assessThemeEtfExtension/);
});
