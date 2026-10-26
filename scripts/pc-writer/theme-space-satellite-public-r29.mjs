// Approved space ETF derived record, following the existing optional-theme D1
// contract. Only explicit PC publication can turn a verified private result
// into a D1 candidate; visitor GET never invokes this calculator.
import {eligibleSpaceSatellite,SPACE_SATELLITE_PUBLIC_METHOD,
 SPACE_SATELLITE_PUBLIC_VERSION} from '../../worker/theme-space-satellite-r1.mjs';

const need=(ok,reason)=>{if(!ok)throw Object.assign(new Error(reason),{code:reason});};
const validStamp=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);

export function buildSpaceSatellitePublicR29({candidate,base,
 candidateFileSha256,allowPublish=false,now=Date.now()}={}){
 need(allowPublish===true,'SPACE_R29_PUBLICATION_NOT_REQUESTED');
 need(candidate?.status==='PRIVATE_CURRENT_APPROVED_BASKET_READY'&&
  candidate.report==='SPACE_SATELLITE_R28_PC_SAVED_SOURCE_ONLY'&&
  candidate.publicationCompleted===false&&candidate.providerCalls===0&&
  candidate.d1Writes===0&&candidate.publicWrites===0&&
  candidate.latest?.status==='APPROVED_THREE_PLUS_AUM'&&
  candidate.latest?.score!==null&&candidate.latest?.date===candidate.scoreAsOf&&
  candidate.history?.length===252&&candidate.scoredDays===252&&
  candidate.history.every((row,i)=>Number.isFinite(row?.score)&&
   (i===0||row.date>candidate.history[i-1].date))&&
  candidate.latest.etfs.join(',')===candidate.etfs.join(',')&&
  candidate.history.at(-1)?.score===candidate.latest.score&&
  candidate.historicalWeightMode===
   'CURRENT_BASKET_FIXED_AUM_RETROSPECTIVE_NOT_HISTORICAL_AUM'&&
  candidate.weighting==='APPROVED_NORMALIZED_CURRENT_ISSUER_AUM_FOR_THREE_PLUS'&&
  hash(candidate.sourceManifestSha256)&&hash(candidate.sharedSpyManifestSha256)&&
  hash(candidateFileSha256)&&validStamp(candidate.sourceStoredAt),
 'SPACE_R29_PRIVATE_RESULT_INCOMPLETE');
 need(base?.status==='READY'&&Array.isArray(base.themes)&&base.themes.length>=7&&
  candidate.scoreAsOf<=base.observationDate,
 'SPACE_R29_CORE_FEED_NOT_READY');
 const timestamp=Number(now);
 need(Number.isSafeInteger(timestamp)&&Date.parse(candidate.sourceStoredAt)<=timestamp,
 'SPACE_R29_SOURCE_TIMESTAMP_INVALID');
 const publishedAt=new Date(timestamp).toISOString();
 const record={status:'READY',version:SPACE_SATELLITE_PUBLIC_VERSION,
  theme:'우주·위성',etfs:[...candidate.etfs],referenceSymbol:'SPY',
  methodologyVersion:SPACE_SATELLITE_PUBLIC_METHOD,
  weighting:candidate.weighting,
  historicalWeightMode:candidate.historicalWeightMode,
  sourcePriceMode:candidate.sourcePriceMode,
  individualStocksUsed:0,publicationAuthorized:true,approvedBasket:true,
  derivedOnlyNoRaw:true,priceManifestShaVerified:true,
  sourceVersion:`GMH_MANIFEST_SHA256_${candidate.sourceManifestSha256}`+
   `_SPY_SHA256_${candidate.sharedSpyManifestSha256}`,
  candidateFileSha256,sourceStoredAt:candidate.sourceStoredAt,
  publishedAt,observationDate:candidate.scoreAsOf,score:candidate.latest.score,
  history:candidate.history.map(row=>({date:row.date,score:row.score})),
  aumAsOf:{...candidate.aumAsOf},phase:'CONFIRMED',provisional:{points:[]}};
 need(eligibleSpaceSatellite(record,base,{now:timestamp,storedAt:timestamp}),
 'SPACE_R29_READER_VALIDATION_FAILED');
 return record;
}
