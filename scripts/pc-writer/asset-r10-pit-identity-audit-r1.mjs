// R10-only, research-only PIT ticker/security identity audit.
// This module never repairs membership, rewrites prices, publishes a score,
// or treats two corporate-action securities as automatically interchangeable.
import {createHash} from 'node:crypto';

export const R10_IDENTITY_EVIDENCE=Object.freeze({
  legacyClassB:{ticker:'PARA',cusip:'92556H206',lastTradeDate:'2025-08-06',
    source:'https://www.nasdaqtrader.com/TraderNews.aspx?id=ECA2025-414'},
  mergedClassB:{ticker:'PSKY',cusip:'69932A204',firstTradeDate:'2025-08-07',
    source:'https://www.nasdaqtrader.com/TraderNews.aspx?id=ECA2025-414'},
  renamedClassB:{ticker:'SKYD',firstTradeDate:'2026-10-06',
    source:'https://www.sec.gov/Archives/edgar/data/2041610/000110465926113913/tm2626659d7_8k.htm'},
});

const isoDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
  !Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const ticker=s=>typeof s==='string'&&/^[A-Z0-9.\-]{1,15}$/.test(s);
const digest=s=>createHash('sha256').update(JSON.stringify(s)).digest('hex');
const sorted=s=>[...s].sort();
const stop=(status,more={})=>({status,productionEligible:false,canPromote:false,
  pcWrites:0,d1Writes:0,providerCalls:0,originalsPreserved:true,...more});
function validateRows(rows,dateKey){
 if(!Array.isArray(rows)||!rows.length)return null;
 const map=new Map();
 for(const row of rows){
  const date=row?.[dateKey],members=row?.members;
  if(!isoDate(date)||map.has(date)||!Array.isArray(members)||members.length<490||members.length>520||
     members.some(symbol=>!ticker(symbol))||new Set(members).size!==members.length||
     (row?.memberCount!=null&&row.memberCount!==members.length))return null;
  map.set(date,new Set(members));
 }
 return map;
}

function classifyDate(date){
 if(date<R10_IDENTITY_EVIDENCE.mergedClassB.firstTradeDate)return 'PRE_MERGER_SECURITY_IDENTITY_UNRESOLVED';
 if(date<R10_IDENTITY_EVIDENCE.renamedClassB.firstTradeDate)return 'RENAME_LABEL_BACKCAST_SUSPECT';
 return 'APPROVED_PSKY_LABEL_AFTER_SKYD_RENAME';
}

// Exact member comparison remains authoritative for any operational decision.
// A single PSKY/SKYD substitution is *diagnosed*, never silently normalized.
export function auditR10PitIdentityLabels({approvedPit,officialPit}={}){
 if(!isoDate(approvedPit?.verifiedThrough)||!Array.isArray(approvedPit?.eligibleUniverses))
  return stop('R10_APPROVED_PIT_CONTRACT_INVALID');
 if(officialPit?.status!=='READY'||officialPit?.membershipLookAheadSafe!==true||
    officialPit?.currentUniverseSurvivorshipBiasRemoved!==true||officialPit?.publicMutation!==false||
    !/^[0-9a-f]{64}$/.test(officialPit?.eventDigest??''))
  return stop('R7_OFFICIAL_PIT_CONTRACT_INVALID');
 const approved=validateRows(approvedPit.eligibleUniverses,'tradeDate');
 const official=validateRows(officialPit.universes,'tradeDate');
 if(!approved||!official)return stop('PIT_ROW_INTEGRITY_INVALID');

 const counts={exact:0,preMerger:0,backcast:0,postRename:0,other:0};
 const samples=[],overlapDates=[];
 for(const [date,a] of [...approved.entries()].sort((x,y)=>x[0].localeCompare(y[0]))){
  if(date>approvedPit.verifiedThrough) return stop('APPROVED_PIT_DATE_FUTURE');
  const b=official.get(date);if(!b)continue;
  overlapDates.push(date);
  const approvedOnly=sorted([...a].filter(symbol=>!b.has(symbol)));
  const officialOnly=sorted([...b].filter(symbol=>!a.has(symbol)));
  if(!approvedOnly.length&&!officialOnly.length){counts.exact++;continue;}
  const knownLabelPair=approvedOnly.length===1&&officialOnly.length===1&&
    approvedOnly[0]==='PSKY'&&officialOnly[0]==='SKYD';
  if(!knownLabelPair){counts.other++;if(samples.length<12)samples.push({date,kind:'OTHER_MEMBERSHIP_DRIFT',
    approvedOnlyCount:approvedOnly.length,officialOnlyCount:officialOnly.length});continue;}
  const kind=classifyDate(date);
  if(kind==='PRE_MERGER_SECURITY_IDENTITY_UNRESOLVED')counts.preMerger++;
  else if(kind==='RENAME_LABEL_BACKCAST_SUSPECT')counts.backcast++;
  else counts.postRename++;
  if(samples.length<12)samples.push({date,kind,approvedOnly:'PSKY',officialOnly:'SKYD',
    priceContinuityAllowed:false,membershipRepaired:false});
 }
 if(!overlapDates.length)return stop('PIT_OVERLAP_MISSING');
 const overlapFirst=overlapDates[0],overlapLast=overlapDates.at(-1);
 return stop(counts.other?'PIT_ADDITIONAL_MEMBERSHIP_DRIFT':'PIT_LABEL_IDENTITY_AUDITED_NOT_PROMOTABLE',{
  overlapDays:overlapDates.length,overlapFirst,overlapLast,
  counts,sourceEventDigest:officialPit.eventDigest,
  approvedMemberSeriesHash:digest([...approved.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([date,members])=>[date,sorted(members)])),
  officialMemberSeriesHash:digest([...official.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([date,members])=>[date,sorted(members)])),
  samples,requires:counts.preMerger?[
   'OFFICIAL_SP500_PRE_MERGER_MEMBERSHIP_AND_CUSIP',
   'PARA_TO_PSKY_CORPORATE_ACTION_PRICE_RIGHTS',
   'ALPACA_EXPLICIT_ASOF_UNMAPPED_PRICE_PROVENANCE',
  ]:['S_P_DJI_MEMBERSHIP_SOURCE_RECONCILIATION','PRICE_RIGHTS_AND_CHECKPOINT_PARITY'],
 });
}
