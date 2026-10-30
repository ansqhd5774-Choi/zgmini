// New versioned record: all dated real ETF scores, including single-ETF
// history before younger ETFs become eligible. Does not mutate the R1 key.
import {eligibleSpaceSatelliteR2,SPACE_SATELLITE_R2_PUBLIC_VERSION,
 SPACE_SATELLITE_R2_PUBLIC_METHOD,SPACE_SATELLITE_R2_HISTORY_MODE,
 SPACE_SATELLITE_R2_SINGLE_POLICY} from '../../worker/theme-space-satellite-r2.mjs';

const need=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
const validStamp=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const sha=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);

export function buildSpaceSatellitePublicR32({candidate,base,
 candidateFileSha256,allowPublish=false,now=Date.now()}={}){
 need(allowPublish===true,'SPACE_R32_PUBLICATION_NOT_REQUESTED');
 need(candidate?.report==='SPACE_SATELLITE_R28_PC_SAVED_SOURCE_ONLY'&&
  candidate.status==='PRIVATE_CURRENT_APPROVED_BASKET_READY'&&
  candidate.publicationCompleted===false&&candidate.providerCalls===0&&
  candidate.d1Writes===0&&candidate.publicWrites===0&&
  candidate.latest?.status==='APPROVED_THREE_PLUS_AUM'&&
  candidate.latest?.score!==null&&candidate.latest.date===candidate.scoreAsOf&&
  candidate.latest.etfs.join(',')===candidate.etfs.join(',')&&
  candidate.history?.length===252&&candidate.scoredDays>0&&
  candidate.scoredDays===candidate.history.filter(row=>
   typeof row?.score==='number'&&Number.isFinite(row.score)).length&&
  candidate.history.every((row,i)=>(row?.score===null||
   (typeof row?.score==='number'&&Number.isFinite(row.score)&&
    row.score>=0&&row.score<=100))&&
   (i===0||row.date>candidate.history[i-1].date))&&
  candidate.history.at(-1)?.score===candidate.latest.score&&
  candidate.historicalWeightMode===SPACE_SATELLITE_R2_HISTORY_MODE&&
  candidate.historyFallbackPolicy===SPACE_SATELLITE_R2_SINGLE_POLICY&&
  candidate.weighting==='APPROVED_NORMALIZED_CURRENT_ISSUER_AUM_FOR_THREE_PLUS'&&
  sha(candidate.sourceManifestSha256)&&sha(candidate.sharedSpyManifestSha256)&&
  sha(candidateFileSha256)&&validStamp(candidate.sourceStoredAt),
 'SPACE_R32_PRIVATE_RESULT_INCOMPLETE');
 need(base?.status==='READY'&&Array.isArray(base.themes)&&base.themes.length>=7&&
  candidate.scoreAsOf<=base.observationDate,'SPACE_R32_CORE_FEED_NOT_READY');
 const timestamp=Number(now);
 need(Number.isSafeInteger(timestamp)&&Date.parse(candidate.sourceStoredAt)<=timestamp,
 'SPACE_R32_SOURCE_TIMESTAMP_INVALID');
 const record={status:'READY',version:SPACE_SATELLITE_R2_PUBLIC_VERSION,
  theme:'우주·위성',etfs:[...candidate.etfs],referenceSymbol:'SPY',
  methodologyVersion:SPACE_SATELLITE_R2_PUBLIC_METHOD,
  weighting:candidate.weighting,
  historicalWeightMode:candidate.historicalWeightMode,
  historyFallbackPolicy:candidate.historyFallbackPolicy,
  sourcePriceMode:candidate.sourcePriceMode,
  individualStocksUsed:0,publicationAuthorized:true,approvedBasket:true,
  derivedOnlyNoRaw:true,priceManifestShaVerified:true,
  sourceVersion:`GMH_MANIFEST_SHA256_${candidate.sourceManifestSha256}`+
   `_SPY_SHA256_${candidate.sharedSpyManifestSha256}`,
  candidateFileSha256,sourceStoredAt:candidate.sourceStoredAt,
  publishedAt:new Date(timestamp).toISOString(),observationDate:candidate.scoreAsOf,
  score:candidate.latest.score,scoredDays:candidate.scoredDays,
  history:candidate.history.map(row=>({date:row.date,score:row.score})),
  aumAsOf:{...candidate.aumAsOf},phase:'CONFIRMED',provisional:{points:[]}};
 need(eligibleSpaceSatelliteR2(record,base,{now:timestamp,storedAt:timestamp}),
  'SPACE_R32_READER_VALIDATION_FAILED');
 return record;
}
