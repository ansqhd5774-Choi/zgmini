// R8 private read-only audit after a user-run NASA-only R7 collection.
// Existing UFO+NASA calculator and externally SHA-verified data-center SPY source.
// No network, no file mutation, no D1/production/scheduler writes, no raw output.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditSpaceSatelliteAdaptive} from './theme-space-satellite-adaptive-r2.mjs';

export function summarizeR8(result){
 const candidate=result.candidates.find(c=>c.etfs?.join('|')==='UFO|NASA');
 if(!candidate)throw Error('R8_PRIORITY_PAIR_AUDIT_MISSING');
 const all=[result.coverage.UFO,result.coverage.NASA,result.coverage.SPY];
 if(all.some(c=>!c||!Number.isInteger(c.dailySessions)))throw Error('R8_COVERAGE_MISSING');
 const nasaLast=result.coverage.NASA.lastObservationDate;
 const spyLast=result.coverage.SPY.lastObservationDate;
 const ufoLast=result.coverage.UFO.lastObservationDate;
 const score=Number.isFinite(candidate.score)?candidate.score:null;
 return {
  report:'SPACE_SATELLITE_R8_REAL_DATA_READ_ONLY_AUDIT',
  status:result.status,
  evidence:'PC_STORED_NASA_UFO_WITH_DATA_CENTER_SPY_SHA_READBACK',
  sourceVersion:result.sourceVersion,
  sharedSpySource:result.sharedSpySource?.themeId??null,
  sharedSpyVerifiedHourlyBars:result.sharedSpySource?.verifiedHourlyBars??null,
  priceMode:result.priceMode,
  coverage:result.coverage,
  ignoredExistingRawEntries:result.ignoredExistingRawEntries,
  candidate:{etfs:candidate.etfs,commonSessions:candidate.commonSessions,
   calendarSessions:candidate.calendarSessions,scoredSessions:candidate.scoredSessions,
   missingSessions:candidate.missingSessions,observationDate:candidate.observationDate,
   status:candidate.status,latestStatus:candidate.latestStatus,
   privateScore:score,weights:candidate.latestWeights,
   eligibility:candidate.eligibility},
  sourceLastDatesAgree:nasaLast!==null&&nasaLast===spyLast&&nasaLast===ufoLast,
  finalPairSelected:false,rightsVerified:false,publicationAuthorized:false,
  providerCalls:0,publicWrites:0,d1Writes:0,schedulerWrites:0,
  nextGate:'VERIFY_PROVENANCE_AND_HOLDINGS_OVERLAP_THEN_REQUEST_PAIR_APPROVAL'
 };
}

export function runR8({dataRoot}={}){
 return summarizeR8(auditSpaceSatelliteAdaptive({dataRoot,sharedSpyThemeId:'data-center-power'}));
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--audit'){
  console.error('READ_ONLY_DEFAULT: --audit; no data writes or API requests');
  process.exitCode=2;
 }else try{
  const result=runR8({dataRoot:process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data'});
  console.log(JSON.stringify(result,null,2));
  if(!result.sourceLastDatesAgree||result.candidate.commonSessions===0)process.exitCode=3;
 }catch(error){
  console.error(JSON.stringify({report:'SPACE_SATELLITE_R8_REAL_DATA_READ_ONLY_AUDIT',
   status:'BLOCKED',reason:error.code??error.message??'R8_UNCLASSIFIED',
   providerCalls:0,publicWrites:0,d1Writes:0,schedulerWrites:0}));
  process.exitCode=1;
 }
}
