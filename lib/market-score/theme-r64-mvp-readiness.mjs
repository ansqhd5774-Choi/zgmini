/**
 * R64 offline research-only, 12-theme MVP readiness.
 * Never calculates scores, changes approved formulas, imports vendor data,
 * infers historical ETF composition, or publishes a production payload.
 * Inputs: independently recorded PC R53, optionally R57/R59/R61 evidence.
 */
export const R64_VERSION='THEME-R64-12-THEME-OFFLINE-MVP-READINESS-V1';
export const R64_R21_SHA='03612f0bc4a1b6ce2cd62f2706142c1aac8a08a1c84f610afdcc8bf6dca2b880';
const CANDIDATES=Object.freeze([
 ['사이버보안','CIBR','BUG',4.21],['AI 신약개발','GNOM','ARKG',4.33],['원전·SMR','NLR','URA',5.30],
 ['로봇·자동화','BOTZ','ROBO',6.79],['AI 반도체','SMH','SOXX',9.19],['자율주행','DRIV','BOTZ',12.02],
 ['클라우드·SaaS','SKYY','CLOU',12.14],['바이오테크','IBB','GNOM',13.12],['게임·e스포츠','HERO','ESPO',14.33],
 ['핀테크','FINX','ARKF',24.88],['방산','ITA','SHLD',32.78],['블록체인·디지털자산','BLOK','ARKF',66.96],
].map(([theme,a,b,maxGap])=>Object.freeze({theme,etfs:Object.freeze([a,b]),maxGap})));
const AXES=['trend','relativeStrength','volatility'];
const fail=code=>{throw Error('R64_INPUT_'+code);};
const validScore=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const round2=x=>Math.round((x+Number.EPSILON)*100)/100;
function validateR53(r53){
 if(r53?.audit!=='R53_R21_12_THEME_EXISTING_RESEARCH_EVIDENCE'||r53.source?.verified!==true||r53.source?.sha256!==R64_R21_SHA||r53.source?.observationTarget!=='2026-10-16')fail('R53_SOURCE');
 const top=r53.topLevel?.metrics;
 if(top?.status!=='THREE_APPROVED_R3_PRICE_AXES_RESEARCH_ONLY'||top.fundsWith252ActuallyScoredResearchAxes!==30||top.stockBreadthActualScores!==0||top.stockDemandActualScores!==0||top.reference756StillRequiresUpstreamProof!==true)fail('R53_FIVE_AXIS');
 if(r53.policy?.fiveAxisCompositeComputed!==false||r53.policy?.pricePublicationAuthorized!==false||r53.policy?.dbOrDeploymentModified!==false||r53.verdict!=='READ_ONLY_SHADOW_EVIDENCE_ONLY')fail('R53_PUBLISH_POLICY');
 if(!Array.isArray(r53.themes)||r53.themes.length!==12||!r53.funds||typeof r53.funds!=='object')fail('R53_SCHEMA');
 const map=new Map(r53.themes.map(item=>[item.theme,item]));
 if(map.size!==12)fail('R53_DUPLICATE_THEME');
 return map;
}
function validateCyber(r57,r59,r61){
 if(!r57&&!r59&&!r61)return null;
 if(!r57||!r59||!r61)fail('INCOMPLETE_CYBER_PROVENANCE');
 if(r57.audit!=='R57_CIBR_45_EXISTING_BASE_AND_INCREMENTAL_STOCK_COVERAGE'||r57.asof!=='2026-10-16'||r57.sourceComplete!==true||r57.auditStatus!=='CONFLICTS_REQUIRE_REVIEW')fail('R57_SOURCE');
 if(r57.source?.base?.filesParsed!==55||r57.source?.incremental?.filesParsed!==605||r57.coverage?.cib45?.tracked!==45||r57.coverage.cib45.withTargetDate!==16||r57.coverage.cib45.missingCompletely?.length!==29||r57.coverage?.integrity?.conflictingTickerDatePairs!==16)fail('R57_COVERAGE');
 if(r59.audit!=='R59_CIBR_2026_10_15_INCREMENTAL_VOLUME_PROVENANCE'||r59.targetConflictDate!=='2026-10-15'||r59.sourceUnchangedFromR58!==true||r59.counts?.uniqueVolumeOnlyConflicts!==16||r59.approvedReplacementValues!==0||r59.provenanceStatus!=='METADATA_LOCATED_VOLUME_REVISION_UNRESOLVED')fail('R59_PROVENANCE');
 if(!Array.isArray(r59.conflictSourceFiles)||r59.conflictSourceFiles.length!==16||r59.conflictSourceFiles.some(x=>x.priceUnchanged!==true||x.selection!=='NO_AUTOMATIC_WINNER'))fail('R59_UNRESOLVED');
 if(r61.audit!=='R61_CIBR_MISSING_29_ALTERNATE_STORED_SOURCE_METADATA'||r61.overall?.fullyAuditedSources!==5||r61.overall?.matchedSymbols!==0||r61.overall?.incompleteSources!==0)fail('R61_ALT_SOURCE');
 for(const r of [r57,r59,r61])if(r.policy?.providerCalls!==0||r.policy.networkCalls!==0||r.policy.dbWrites!==0||r.policy.productionMutation!==false)fail('EVIDENCE_MUTATION');
 return Object.freeze({issuerSingleDayMembers:45,storedMembersOnTargetDate:16,missingMembers:29,unresolvedVolumeOnlyPairs:16,unresolvedAsOf:'2026-10-15',otherNamedFilesInspected:5,additionalMembersRecovered:0,
 membershipPITReady:false,memberPriceVolumeReady:false,reference756Verified:false});
}
export function buildR64MvpReadiness({r53,r57=null,r59=null,r61=null}={}){
 const themes=validateR53(r53),cyber=validateCyber(r57,r59,r61);
 const unique=new Set(CANDIDATES.flatMap(c=>c.etfs));
 if(Object.keys(r53.funds).length!==unique.size)fail('R53_UNEXPECTED_FUND_COUNT');
 const verified=new Map();
 for(const ticker of unique){
  const x=r53.funds[ticker];
  if(x?.matches!==1||x?.review!=='UNIQUE_R21_TICKER_OBJECT'||x.items?.length!==1)fail('FUND_IDENTITY_'+ticker);
  const m=x.items[0].metrics;
  if(m?.history252Ready!==true||!Number.isInteger(m.eligiblePriceBars)||m.eligiblePriceBars<252||m.reference756Verified!==false||m.breadthScored!==false||m.demandScored!==false||!AXES.every(key=>validScore(m.researchAxisScores?.[key])))fail('FUND_AXES_'+ticker);
  verified.set(ticker,m);
 }
 const items=CANDIDATES.map(candidate=>{
  const t=themes.get(candidate.theme);
  if(!t||JSON.stringify(t.etfs)!==JSON.stringify(candidate.etfs)||t.r21PriceHistoryClaim!=='RESEARCH_252_CLAIM_BOTH'||t.fiveAxisStatus!=='NOT_VERIFIED'||t.rights!=='NOT_VERIFIED')fail('THEME_DRIFT_'+candidate.theme);
  const [a,b]=candidate.etfs.map(ticker=>verified.get(ticker));
  const gap=round2(Math.max(...AXES.map(k=>Math.abs(a.researchAxisScores[k]-b.researchAxisScores[k]))));
  if(Math.abs(gap-candidate.maxGap)>.011)fail('R22_GAP_DRIFT_'+candidate.theme);
  const missing=['ETF_DAILY_MEMBERSHIP_PIT','MEMBER_STOCK_BREADTH','MEMBER_VOLUME_DEMAND','REFERENCE_756_VERIFICATION','COMMERCIAL_RIGHTS'];
  if(candidate.theme==='사이버보안'&&cyber)missing.push('CIBR_MISSING_29_STORED_SERIES','SINGLE_DATE_VOLUME_REVISION_16','BUG_FULL_HOLDINGS_IDENTITIES');
  return Object.freeze({theme:candidate.theme,etfs:candidate.etfs,observationDate:'2026-10-16',priceAxisResearch252Both:true,sourcePriceBars:[a.eligiblePriceBars,b.eligiblePriceBars],maxInterEtfPriceAxisGap:gap,
   validatedFiveAxisScore:null,publishedScore:null,memberCoverage:candidate.theme==='사이버보안'?cyber:null,missingInputs:Object.freeze(missing),status:'RESEARCH_PRICE_3_AXIS_ONLY'});
 });
 return Object.freeze({version:R64_VERSION,observationDate:'2026-10-16',sourceR21Sha256:R64_R21_SHA,themeCandidates:12,uniqueEtfs:unique.size,priceResearchThemes:12,
  validatedFiveAxisScores:0,publishedThemes:0,prohibitedFormulaChange:true,prohibitedMarketDataPublication:true,items:Object.freeze(items),status:'RESEARCH_ONLY_NOT_DEPLOYABLE'});
}
