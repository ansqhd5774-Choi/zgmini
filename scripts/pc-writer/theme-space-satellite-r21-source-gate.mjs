// R21: private source-availability gate. Never retries unavailable issuer data.
// Does not alter the R18 universe, ETF prices, R2 score, R4-A formula or history.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runSpaceVariableBasketShadow} from './theme-space-satellite-r18-variable-basket-shadow.mjs';
import {scoreRelativeThemeBasket} from './theme-optional-relative-weight-r4.mjs';

const EXPECT_MANIFEST='1e046a0487548a00231da92da48c6d9fb690e8e95bba64e2071078b02e57f00b';
const EXPECT_SPY='76dfaca72fd0ded5e648ee15cceca5628288c11463214bd14ede01c2b5c4746e';
const EXPECT_R18='94011b38f4d31cf21b74eac36b988a0a2565c34bf2b2e5522dc27106ac4d1216';
const need=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
const SYMBOL=/^[A-Z][A-Z0-9.-]{0,15}$/;
const ISSUER_STATES=new Set(['OFFICIAL_NUMERIC_OBSERVED',
 'NOT_RETRIEVED_AFTER_BOUNDED_CHECK','UNASSESSED_NO_CURRENT_SCORE']);

// Read-only, pure classification. An unusable source is excluded from *this*
// private snapshot, without deleting raw prices or modifying past R18 scores.
export function classifySpaceIssuerSources({records,evidence}={}){
 need(Array.isArray(records)&&records.length>0&&evidence?.version===1&&
  typeof evidence.checkedAt==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(evidence.checkedAt)&&
  Array.isArray(evidence.candidates),'R21_EVIDENCE_FORMAT_INVALID');
 const seen=new Set(),sources=new Map();
 for(const e of evidence.candidates){
  need(SYMBOL.test(e?.ticker??'')&&!seen.has(e.ticker)&&
   ISSUER_STATES.has(e.state),'R21_EVIDENCE_TICKER_DUPLICATE_OR_BAD_STATE');
  seen.add(e.ticker);
  if(e.state==='OFFICIAL_NUMERIC_OBSERVED')
   need(/^https:\/\//.test(e.issuerUrl??'')&&
    /^\d{4}-\d{2}-\d{2}$/.test(e.holdingsAsOf??''),
    'R21_OFFICIAL_PROVENANCE_MISSING');
  sources.set(e.ticker,e);
 }
 const unique=new Set();
 const decisions=records.map(r=>{
  need(SYMBOL.test(r?.ticker??'')&&!unique.has(r.ticker)&&
   (r.currentScore===null||Number.isFinite(r.currentScore)),
   'R21_RECORD_INVALID');
  unique.add(r.ticker);
  const source=sources.get(r.ticker);
  // Do not search holdings repeatedly to fix absent actual NY15/R2 score.
  if(r.currentScore===null)return {ticker:r.ticker,decision:'EXCLUDE_CURRENT',
   reason:'NO_ACTUAL_CURRENT_ETF_SCORE',issuerState:source?.state??null};
  if(!source||source.state!=='OFFICIAL_NUMERIC_OBSERVED')
   return {ticker:r.ticker,decision:'EXCLUDE_CURRENT',
    reason:'OFFICIAL_HOLDINGS_UNAVAILABLE_THIS_REVIEW',
    issuerState:source?.state??null};
  return {ticker:r.ticker,decision:'INCLUDE_PRIVATE',
   reason:'ACTUAL_SCORE_AND_OFFICIAL_ISSUER_EVIDENCE',
   issuerState:source.state,issuerHoldingsAsOf:source.holdingsAsOf};
 });
 need(sources.size===records.length&&
  [...sources.keys()].every(x=>unique.has(x)),
  'R21_SOURCE_RECORD_SET_DIFFERENT');
 return {checkedAt:evidence.checkedAt,candidateCount:records.length,decisions,
  included:decisions.filter(x=>x.decision==='INCLUDE_PRIVATE').map(x=>x.ticker),
  excluded:decisions.filter(x=>x.decision==='EXCLUDE_CURRENT'),
  collectionRetries:0,rawFilesDeleted:0,permanentCandidateDeletion:false};
}

export function runSpaceIssuerSourceGate({dataRoot,evidenceFile,
 r18Audit=runSpaceVariableBasketShadow,
 expectedManifest=EXPECT_MANIFEST,expectedSpy=EXPECT_SPY,
 expectedHistory=EXPECT_R18}={}){
 need(typeof evidenceFile==='string'&&fs.existsSync(evidenceFile),
  'R21_EVIDENCE_FILE_MISSING');
 const evidence=JSON.parse(fs.readFileSync(evidenceFile,'utf8'));
 const audit=r18Audit({dataRoot,includePrivateTrace:true});
 need(audit?.report==='SPACE_SATELLITE_R18_PC_PRIVATE_VARIABLE_BASKET_SHADOW'&&
  audit.sourceManifestSha256===expectedManifest&&
  audit.sharedSpyManifestSha256===expectedSpy&&
  audit.shadowHistorySha256===expectedHistory,
  'R21_R18_SOURCE_OR_HISTORY_CHANGED');
 const source=classifySpaceIssuerSources({records:audit.candidateStatus,
  evidence});
 const trace=audit.privateTrace;
 need(Array.isArray(trace?.dates)&&trace.dates.at(-1)===audit.benchmarkLastDate&&
  trace.dates.length>=audit.last252DisplayDays&&
  audit.latestPrivateProposal?.date===audit.benchmarkLastDate,
  'R21_R18_PRIVATE_TRACE_MISSING');
 const selected=source.included.map(symbol=>{
  const row=trace.timelines?.[symbol]?.at(-1);
  const sessions=trace.sessionCounts?.[symbol]?.get(audit.benchmarkLastDate);
  const rec=audit.candidateStatus.find(x=>x.ticker===symbol);
  need(row&&Number.isFinite(row.score)&&Number.isInteger(sessions)&&
   Number.isFinite(rec?.currentScore)&&
   Math.abs(Number(row.score.toFixed(5))-rec.currentScore)<.000011,
   'R21_REAL_SCORE_TRACE_MISMATCH');
  return {symbol,score:row.score,sessions,status:row.status};
 });
 // Lack of two usable sources is a factual no-score result, not a fabricated
 // equal-weight/single-ETF theme or an endless all-conditions-failed loop.
 const mixed=selected.length>=2?scoreRelativeThemeBasket({etfs:selected}):null;
 return {report:'SPACE_SATELLITE_R21_PC_PRIVATE_SOURCE_EXCLUSION',
  status:'PRIVATE_ELIGIBILITY_ONLY_R4_A_UNAPPROVED',
  sourceManifestSha256:expectedManifest,sharedSpyManifestSha256:expectedSpy,
  priorR18HistorySha256:expectedHistory,asOf:audit.benchmarkLastDate,
  issuerEvidenceCheckedAt:source.checkedAt,candidateCount:source.candidateCount,
  includedCurrentCount:source.included.length,includedCurrent:source.included,
  excludedCurrent:source.excluded,
  latestSourceScreenedPrivateScore:mixed?Number(mixed.score.toFixed(5)):null,
  latestSourceScreenedWeightsPercent:mixed?Object.fromEntries(
   Object.entries(mixed.weights).map(([ticker,w])=>[ticker,
    Number((w*100).toFixed(4))])):null,
  originalR18PrivateScore:audit.latestPrivateProposal.score,
  newSeriesPublished:false,privateHistoryRewritten:false,
  weightsMethod:'R4_A_RELATIVE_MATURITY_UNAPPROVED',
  rationale:'UNAVAILABLE_ISSUER_SOURCE_EXCLUDED_THIS_REVIEW_NO_RETRY',
  noAutomaticIssuerRetry:true,collectionRetries:0,
  oldPriceSeriesPreserved:true,originalR18ScorePreserved:true,
  finalBasketSelected:false,weightsApproved:false,rightsVerified:false,
  publicationAuthorized:false,providerCalls:0,rawFilesWritten:0,
  publicWrites:0,d1Writes:0,schedulerWrites:0};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.slice(2).join(' ')!=='--audit')
  console.log('READ_ONLY_DEFAULT: --audit uses dated source evidence, no collection/retries.');
 else try{console.log(JSON.stringify(runSpaceIssuerSourceGate({
  dataRoot:process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data',
  evidenceFile:path.join(path.dirname(fileURLToPath(import.meta.url)),
   'theme-space-satellite-r21-issuer-evidence.json')}),null,2));}
 catch(e){console.error(JSON.stringify({
  report:'SPACE_SATELLITE_R21_PC_PRIVATE_SOURCE_EXCLUSION',
  status:'BLOCKED',reason:e.code??String(e.message??e).slice(0,100),
  providerCalls:0,rawFilesWritten:0,publicWrites:0,d1Writes:0,
  schedulerWrites:0}));process.exitCode=1;}
}
