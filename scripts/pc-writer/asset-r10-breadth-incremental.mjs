import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {isMarketSession} from '../../lib/market-score/breadth-b1-r3-calendar.mjs';
import {priceWindowQuarantined} from '../../lib/market-score/asset-r10-price-quarantine.mjs';
import {auditR10PitIdentityLabels} from './asset-r10-pit-identity-audit-r1.mjs';

// The approved R10 files remain immutable here. This diagnostic never promotes a
// research-only R7 PIT universe or an Alpaca incremental download to publication.
const DEFAULT_BASE=path.join(os.homedir(),'.zgmini','pc-writer');
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T00:00:00Z'));
const validTicker=value=>typeof value==='string'&&/^[A-Z0-9.\-]{1,15}$/.test(value);
const fingerprint=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const memberDigest=members=>fingerprint([...members].sort());
const uniqueSorted=members=>[...new Set(members)].sort();

function stop(code,more={}){return {status:code,productionEligible:false,canPromote:false,...more};}
function validMembers(members){return Array.isArray(members)&&members.length>=490&&members.length<=520&&members.every(validTicker)&&new Set(members).size===members.length;}
function monthEndSession(month){
 const [year,number]=month.split('-').map(Number);
 const end=new Date(Date.UTC(year,number,0)).toISOString().slice(0,10);
 let cursor=end;
 // A market-session lookup, not a calendar-day approximation of monthly data.
 for(let n=0;n<10;n++){
  if(isMarketSession(cursor))return cursor;
  cursor=new Date(Date.parse(cursor+'T00:00:00Z')-86400000).toISOString().slice(0,10);
 }
 throw Error('R10_MONTH_END_MARKET_SESSION_MISSING');
}

// Pure read-only preflight: requires the original approved R10 membership to
// remain exactly consistent wherever the newer official PIT series overlaps.
export function inspectR10BreadthIncremental({approvedPit,officialPit,baseGroups=[],incrementalGroups=[],asOfDate}={}){
 if(!validDate(asOfDate))return stop('INVALID_ASOF_DATE');
 if(!approvedPit||!validDate(approvedPit.verifiedThrough)||!Array.isArray(approvedPit.eligibleUniverses)||!approvedPit.eligibleUniverses.length)
  return stop('R10_APPROVED_PIT_MISSING');
 if(officialPit?.status!=='READY'||officialPit?.membershipLookAheadSafe!==true||officialPit?.currentUniverseSurvivorshipBiasRemoved!==true||officialPit?.publicMutation!==false||!/^([0-9a-f]{64})$/.test(officialPit?.eventDigest??'')||!Array.isArray(officialPit?.universes))
  return stop('OFFICIAL_PIT_NOT_VERIFIED');
 const universes=new Map();
 for(const row of officialPit.universes){
  if(!validDate(row?.tradeDate)||!validMembers(row.members)||row.memberCount!==row.members.length||universes.has(row.tradeDate))
   return stop('OFFICIAL_PIT_ROWS_INVALID');
  universes.set(row.tradeDate,uniqueSorted(row.members));
 }
 const dates=[...universes.keys()].sort();
 if(dates.length<200||dates.at(-1)!==officialPit.last||dates[0]!==officialPit.first||officialPit.currentDate!==officialPit.last)
  return stop('OFFICIAL_PIT_SESSION_WINDOW_INVALID');
 if(officialPit.currentMemberHash!==memberDigest(universes.get(officialPit.last)))
  return stop('OFFICIAL_PIT_ANCHOR_HASH_INVALID');
 const approvedDates=new Set();let overlap=0;
 for(const row of approvedPit.eligibleUniverses){
  if(!validDate(row?.tradeDate)||!validMembers(row.members)||approvedDates.has(row.tradeDate)||row.tradeDate>approvedPit.verifiedThrough)
   return stop('R10_APPROVED_PIT_ROWS_INVALID');
  approvedDates.add(row.tradeDate);
  const official=universes.get(row.tradeDate);
  if(official){
   overlap++;
   if(fingerprint(uniqueSorted(row.members))!==fingerprint(official)){
    const audit=auditR10PitIdentityLabels({approvedPit,officialPit});
    return stop('PIT_OVERLAP_MEMBERSHIP_DRIFT',{
     firstMismatchDate:row.tradeDate,overlapChecked:overlap,
     identityAuditStatus:audit.status,identityAuditCounts:audit.counts??null,
     identityAuditRequires:audit.requires??[],
    });
   }
  }
 }
 if(!overlap)return stop('PIT_OVERLAP_EVIDENCE_MISSING');
 if(officialPit.last<=approvedPit.verifiedThrough)return stop('NO_NEW_OFFICIAL_PIT_SESSIONS',{overlapChecked:overlap});

 const prices=new Map(),baseSymbols=new Set(),incrementalKeys=new Set(),unmappedIncrementalKeys=new Set(),badAsOfKeys=new Set();let originalRows=0,incrementalRows=0;
 const addPrice=(row,incremental)=>{
  if(!validTicker(row?.ticker)||!validDate(row?.tradeDate)||!Number.isFinite(row?.currentClose)||row.currentClose<=0||
    (incremental&&(row.source!=='ALPACA'||row.feed!=='iex'||row.adjustmentStatus!=='split')))
   return 'ALPACA_PRICE_ROW_INVALID';
  const key=row.ticker+'|'+row.tradeDate;
  if(prices.has(key)&&prices.get(key)!==row.currentClose)return 'ALPACA_PRICE_CONFLICT';
  prices.set(key,row.currentClose);
  if(incremental){
   incrementalKeys.add(key);
   if(row.asof==='-'&&row.symbolMappingMode==='UNMAPPED_ASOF_DASH'){
    if(!badAsOfKeys.has(key))unmappedIncrementalKeys.add(key);
   }else{
    badAsOfKeys.add(key);
    unmappedIncrementalKeys.delete(key);
   }
  }else baseSymbols.add(row.ticker);
  return null;
 };
 for(const group of baseGroups){
  if(!Array.isArray(group))return stop('ALPACA_BASE_GROUP_INVALID');
  for(const row of group){const error=addPrice(row,false);if(error)return stop(error);originalRows++;}
 }
 for(const group of incrementalGroups){
  if(!Array.isArray(group))return stop('ALPACA_INCREMENTAL_GROUP_INVALID');
  for(const row of group){const error=addPrice(row,true);if(error)return stop(error);incrementalRows++;}
 }
 if(!originalRows)return stop('ALPACA_BASE_HISTORY_MISSING');

 const completedMonths=[...new Set(dates.filter(date=>date>approvedPit.verifiedThrough&&date.slice(0,7)<asOfDate.slice(0,7)).map(date=>date.slice(0,7)))].sort();
 if(!completedMonths.length)return stop('NO_NEW_COMPLETED_MONTHS',{overlapChecked:overlap,officialLast:officialPit.last});
 const candidateRows=[];
 for(const month of completedMonths){
  const last=monthEndSession(month),members=universes.get(last);
  if(!members)return stop('PIT_MONTH_END_SESSION_MISSING',{month,expectedDate:last});
  const historyDates=dates.filter(date=>date<=last).slice(-200);
  if(historyDates.length!==200)return stop('PIT_200_SESSION_WINDOW_MISSING',{month});
  // A new member can advance to *research-only* coverage only when all
  // 200 sessions were collected with explicit unmapped Alpaca asof='-'.
  // An unlabeled 200-day response may contain relabeled former tickers.
  const unknown=members.filter(ticker=>!baseSymbols.has(ticker)&&
   !historyDates.every(date=>incrementalKeys.has(ticker+'|'+date)));
  if(unknown.length)return stop('PIT_NEW_SYMBOL_BACKFILL_REQUIRED',{month,missingSymbolCount:unknown.length,missingSymbols:unknown.slice(0,20)});
  const unmappedMissing=members.filter(ticker=>!baseSymbols.has(ticker)&&
   !historyDates.every(date=>unmappedIncrementalKeys.has(ticker+'|'+date)));
  if(unmappedMissing.length)return stop('PIT_NEW_SYMBOL_ASOF_PROVENANCE_REQUIRED',{
   month,missingSymbolCount:unmappedMissing.length,missingSymbols:unmappedMissing.slice(0,20)});
  let valid200=0;
  for(const ticker of members){
   if(priceWindowQuarantined(ticker,historyDates))continue;
   if(historyDates.every(date=>prices.has(ticker+'|'+date)))valid200++;
  }
  const coverage=valid200/members.length;
  if(coverage<.98)return stop('PIT_PRICE_200MA_COVERAGE_INSUFFICIENT',{month,observationDate:last,valid200,memberCount:members.length,coverage});
  candidateRows.push({observationDate:last,memberCount:members.length,valid200,coverage});
 }

 // Full PIT source, adjusted-price audit and existing 252-pair R10 calculation
 // must still complete before an operator may promote this private candidate.
 return stop('CANDIDATE_INPUTS_VALIDATED_AUDIT_PENDING',{
  overlapChecked:overlap,officialLast:officialPit.last,originalRows,incrementalRows,
  candidateRows,officialPitDigest:officialPit.eventDigest,
 });
}

function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
export function inspectR10BreadthIncrementalStored(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{asOfDate=new Date().toISOString().slice(0,10)}={}){
 const groups=dir=>fs.readdirSync(dir).filter(name=>/^group-\d+\.json$/.test(name)).sort().map(name=>readJson(path.join(dir,name)));
 const incrementalDir=path.join(base,'asset-r10-alpaca','incremental');
 const incrementalGroups=fs.existsSync(incrementalDir)?fs.readdirSync(incrementalDir).filter(name=>/^\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}-group-\d+\.json$/.test(name)).sort().map(name=>readJson(path.join(incrementalDir,name))):[];
 return inspectR10BreadthIncremental({
  approvedPit:readJson(path.join(base,'local-asset-bubble-r10-pit-compatible-universe.json')),
  officialPit:readJson(path.join(base,'local-breadth-r7-pit-universe.json')),
  baseGroups:groups(path.join(base,'asset-r10-alpaca')),
  incrementalGroups,asOfDate,
 });
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(inspectR10BreadthIncrementalStored(),null,2));}
 catch{console.log(JSON.stringify(stop('R10_B_STORED_INPUTS_UNAVAILABLE')));process.exitCode=1;}
}
