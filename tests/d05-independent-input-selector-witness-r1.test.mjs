import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {observeD05EarningsR5Selection,observeD05PaidBreadthSelection,
 correlateD05IndependentInputs} from '../lib/score-history/d05-independent-input-selector-witness-r1.mjs';

const a='a'.repeat(64),b='b'.repeat(64),c='c'.repeat(64);
const earnings={id:'earnings',status:'READY',score:61,methodologyVersion:'E1-R5',
 noReweight:true,missing:[],inputFingerprint:a,asOfDate:'2026-11-20',
 sourceVersion:'E1-R5-PRODUCTION-CYCLE-R1',rawFacts:'PRIVATE_FACTS'};
const breadth={id:'breadth',name:'수급·폭',status:'READY',score:50,
 source:'MARKETPARQUET_PAID_SPLIT_ADJUSTED_DAILY',
 methodologyVersion:'B1-R5-STORED-BREADTH-4FACTOR-EMA3-R2',
 observationDate:'2026-11-20',asOfDate:'2026-11-20',
 trend:[{label:'2026-11-20',value:50}],
 indicators:[41,42,43,44].map((n,i)=>({id:'breadth-'+n,status:'READY',
  score:50,value:50,observationDate:'2026-11-20'})),
 paidSource:{version:'ZGMINI_BREADTH_PAID_B1_R5_V1',plan:'full',
  sourceVersion:a,pitSha256:b,inputSha256:[c],
  observationDate:'2026-11-20',sourceLatestDate:'2026-11-20',
  returnCoverage:1,tradingValueCoverage:1},
 rawPrices:'SECRET_PRICE_BARS'};

const earningsSelected=(candidate=earnings,report={status:'UPDATED',inputFingerprint:a},
 mergedInputs={external:{publicDomainScores:{earnings:candidate}}})=>
 observeD05EarningsR5Selection({candidate,report,mergedInputs});

test('actual E1-R5 merged candidate identity and its source descriptor are witnessed',()=>{
 const result=earningsSelected();
 assert.equal(result.status,'COLLECT_INPUT_SELECTED_ONLY');
 assert.equal(result.inputDescriptorFingerprint,a);
 assert.equal(result.inputDescriptorScope,'LOCAL_FILE_METADATA_AND_UNIVERSE_NOT_RAW_SHA');
 assert.equal(result.originalSecReleasePITVerified,false);
 assert.equal(earningsSelected(earnings,{status:'NOOP',inputFingerprint:a}).candidateReused,true);
 assert.equal(JSON.stringify(result).includes('PRIVATE_FACTS'),false);
});

test('E1-R5 prior retention, mismatched or absent fingerprint and unselected fallback fail closed',()=>{
 assert.equal(earningsSelected(earnings,{status:'FAILED_RETAINING_LAST_VALID',inputFingerprint:a}).status,'UNPROVEN');
 assert.equal(earningsSelected(earnings,{status:'UPDATED',inputFingerprint:b}).status,'UNPROVEN');
 assert.equal(earningsSelected({...earnings,inputFingerprint:'invalid'}).status,'UNPROVEN');
 assert.equal(earningsSelected(earnings,undefined,{external:{publicDomainScores:{earnings:{...earnings}}}}).code,'E1_R5_NOT_SELECTED');
 assert.equal(earningsSelected({...earnings,status:'PARTIAL'}).status,'UNPROVEN');
});

test('actual validated paid Breadth domain returns source and PIT SHA, not price observations',()=>{
 const result=observeD05PaidBreadthSelection(breadth);
 assert.equal(result.status,'VALIDATED_DERIVED_DOMAIN_SELECTED_ONLY');
 assert.deepEqual(result.inputSha256,[c]);
 assert.equal(result.pitSha256,b);
 assert.equal(result.rawSourcePITVerified,false);
 assert.equal(JSON.stringify(result).includes('SECRET_PRICE_BARS'),false);
 assert.equal(observeD05PaidBreadthSelection({...breadth,paidSource:{...breadth.paidSource,
  inputSha256:['not-a-sha']}}).code,'PAID_BREADTH_NOT_VALIDATED');
});

test('matching final two scored domains is not misreported as complete PIT evidence',()=>{
 const witness=correlateD05IndependentInputs({
  earningsWitness:earningsSelected(),
  breadthWitness:observeD05PaidBreadthSelection(breadth),
  earningsCandidate:earnings,breadthSelected:breadth,
  marketBody:{status:'SUCCESS',domains:[{...earnings},{...breadth}]}
 });
 assert.equal(witness.earningsOutputMatched,true);
 assert.equal(witness.breadthOutputMatched,true);
 assert.equal(witness.status,'PARTIAL_INDEPENDENT_SELECTION_ONLY');
 assert.equal(witness.completeD05InputLineage,false);
 assert.equal(witness.effectiveUseVerified,false);
 assert.equal(witness.publicD1Verified,false);
 assert.equal(witness.rawSecPITVerified,false);
 assert.equal(witness.rawBreadthPITVerified,false);
 assert.ok(!JSON.stringify(witness).includes('PRIVATE_FACTS'));
});

test('a different final score, paid source, or multiple domains cannot be falsely correlated',()=>{
 const ew=earningsSelected(),bw=observeD05PaidBreadthSelection(breadth);
 const build=domains=>correlateD05IndependentInputs({
  earningsWitness:ew,breadthWitness:bw,earningsCandidate:earnings,
  breadthSelected:breadth,marketBody:{domains}});
 const e=build([{...earnings,score:62},breadth]);
 assert.equal(e.earningsOutputMatched,false);
 assert.equal(e.breadthOutputMatched,true);
 const p=build([earnings,{...breadth,paidSource:{...breadth.paidSource,sourceVersion:c}}]);
 assert.equal(p.breadthOutputMatched,false);
 const dup=build([earnings,{...earnings},breadth]);
 assert.equal(dup.earningsOutputMatched,false);
 const missing=correlateD05IndependentInputs();
 assert.equal(missing.earnings.status,'UNPROVEN');
 assert.equal(missing.breadth.status,'UNPROVEN');
 assert.equal(missing.completeD05InputLineage,false);
});

test('approved production scorer uses the existing Reader/output and callback only',()=>{
 const source=readFileSync(new URL('../scripts/pc-writer/market.mjs',import.meta.url),'utf8');
 assert.match(source,/const merged=mergeEarningsProductionCandidate\(riskInput,candidate\)/);
 assert.match(source,/mergedInputs:merged/);
 assert.match(source,/collectBreadthDomain:\(\)=>paidCompositeBreadthDomain\(base,now\)/);
 assert.match(source,/const selected=approvedPaidCompositeBreadthDomain\(b,at\)/);
 assert.match(source,/return selected;/);
 assert.match(source,/independentEvidence=correlateD05IndependentInputs/);
 assert.match(source,/provider_NETWORK_FORBIDDEN|PROVIDER_NETWORK_FORBIDDEN/);
 assert.doesNotMatch(source,/\bINSERT\b|\bUPDATE\b|\bDELETE\b/);
});
