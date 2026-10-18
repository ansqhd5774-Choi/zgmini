/**
 * R60: offline comparison of R57/R59 diagnostic summaries.
 * NO_PROVIDER_NO_DB_NO_WRITER_NO_MARKET_DATA_NO_PUBLICATION.
 * Research-only; never selects or overwrites an ambiguous price/volume row.
 */
export const R60_VERSION='THEME-R60-R57-R59-FORENSIC-JOIN-RESEARCH-V1';
const fail=id=>{throw Error('R60_EVIDENCE_'+id);};
const unique=x=>new Set(x).size===x.length;
export function auditR60(r57,r59){
 if(r57?.audit!=='R57_CIBR_45_EXISTING_BASE_AND_INCREMENTAL_STOCK_COVERAGE'||r57.asof!=='2026-10-16'||r57.sourceComplete!==true)fail('R57_INCOMPLETE_OR_WRONG_DATE');
 if(r59?.audit!=='R59_CIBR_2026_10_15_INCREMENTAL_VOLUME_PROVENANCE'||r59.asof!=='2026-10-16'||r59.targetConflictDate!=='2026-10-15')fail('R59_WRONG_DATE');
 for(const r of [r57,r59]){const p=r.policy;if(!p||p.networkCalls!==0||p.providerCalls!==0||p.dbWrites!==0||p.writerCalls!==0||p.productionMutation!==false)fail('NO_MUTATION_POLICY');}
 if(r57.source?.totalFiles!==660||r57.source?.base?.filesParsed!==55||r57.source?.incremental?.filesParsed!==605)fail('R57_SOURCE_COUNTS');
 if(r57.auditStatus!=='CONFLICTS_REQUIRE_REVIEW'||r57.coverage?.integrity?.conflictingTickerDatePairs!==16)fail('R57_UNRESOLVED_CONFLICTS');
 if(r59.sourceUnchangedFromR58!==true||r59.provenanceStatus!=='METADATA_LOCATED_VOLUME_REVISION_UNRESOLVED'||r59.approvedReplacementValues!==0||r59.counts?.uniqueVolumeOnlyConflicts!==16||r59.counts?.matchedTargetRows!==32||r59.counts?.inspectedIncrementalFiles!==605)fail('R59_UNRESOLVED_PROVENANCE');
 const c=r57.coverage.cib45;
 if(c?.tracked!==45||c.withAtLeastOneDate!==16||c.withTargetDate!==16||c.atLeast756Dates!==16||c.missingCompletely?.length!==29||c.missingTargetDate?.length!==29||!unique(c.missingCompletely))fail('CIBR_COVERAGE');
 if(r57.staticSnapshotDateIntersection?.allMembersSharedObservedDates!==0||r57.staticSnapshotDateIntersection?.fullHistoricalConstituentMembershipVerified!==false)fail('PIT_NOT_VERIFIED');
 const keys=r59.conflictSourceFiles;
 if(!Array.isArray(keys)||keys.length!==16||!unique(keys.map(x=>x.symbol)))fail('CONFLICT_KEYS');
 const members=new Map((r57.coverage.perTicker??[]).map(x=>[x.symbol,x]));
 let lt10=0,lt25=0;
 for(const x of keys){
  if(x.date!=='2026-10-15'||x.records!==2||x.variants!==2||x.priceUnchanged!==true||x.allRowsAlpacaIexSplit!==true||x.selection!=='NO_AUTOMATIC_WINNER')fail('UNRESOLVED_KEY_'+x.symbol);
  if(!members.get(x.symbol)?.hasTargetDate)fail('CONFLICT_NOT_IN_R57_'+x.symbol);
  if(x.volumeDifferenceBand==='5_TO_LT_10_PCT')lt10++;else if(x.volumeDifferenceBand==='10_TO_LT_25_PCT')lt25++;else fail('UNEXPECTED_VOLUME_BAND');
  const v=x.versions;
  if(!Array.isArray(v)||v.length!==2||v.some(y=>y.observations!==1||y.fileModificationIsCaptureTimestamp!==false||y.requestWindowAtFirst?.targetInside!==true))fail('VERSION_INCOMPLETE');
  if(v[0].firstSeenFile===v[1].firstSeenFile||v[0].firstFileSha256===v[1].firstFileSha256)fail('NON_DISTINCT_VERSIONS');
  if(!v[0].firstSeenFile.startsWith('2026-10-14-2026-10-15-')||!v[1].firstSeenFile.startsWith('2026-10-15-2026-10-16-'))fail('UNKNOWN_WINDOWS');
 }
 if(lt10!==1||lt25!==15)fail('R58_BAND_COUNTS');
 return Object.freeze({
  version:R60_VERSION,asof:'2026-10-16',auditedBaseFiles:55,auditedIncrementalFiles:605,
  cibIssuerSingleDayMembers:45,storedMembersWithTargetDate:16,missingMembers:29,
  distinctVolumeOnlyConflicts:16,conflictDate:'2026-10-15',
  priceDifferences:0,volDiff5ToLt10:lt10,volDiff10ToLt25:lt25,
  overlapSourceWindowsVerified:true,officialVolumeRevisionResolved:false,
  eligibleVolumeRevisionSelections:0,historicalHoldingsPITVerified:false,
  reference756Verified:false,publicFiveAxisScoresAllowed:0,
  resolution:'QUARANTINE_2026_10_15_VOLUME_VARIANTS_PRESERVE_BOTH',
  blocker:'MISSING_29_MEMBER_PRICE_VOLUME_AND_HISTORICAL_THEME_HOLDINGS_PIT',
  note:'Diagnostic interpretation only; no raw record is mutated or discarded.'
 });
}
