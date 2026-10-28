// Actual publication times, never reconstructed incident times or interpolated daily values.
export const IRAN_UPDATE_HISTORY_VERSION='IRAN_PUBLISHED_UPDATES_R1';
export const IRAN_UPDATE_PREFIX='iran-r5-published-update:';
const DAY=86400000;
export const iranUpdateWindowStart=body=>Date.parse(body.asOfDate+'T00:00:00+09:00')-13*DAY;
const lineage=b=>b.version+':'+b.sourceVersion;
export function iranPublicationPoint(body){
 return {at:body.publishedAt,value:body.score,collectionCheckedAt:body.collectionCheckedAt,
  sourceStoredAt:body.sourceStoredAt,eventCount:body.acceptedEventCount,lineage:lineage(body)};
}
function validPoint(p,body){return p&&Number.isSafeInteger(p.at)&&p.at>=iranUpdateWindowStart(body)&&p.at<=body.publishedAt&&
 Number.isFinite(p.value)&&p.value>=0&&p.value<=100&&p.lineage===lineage(body)&&
 Number.isSafeInteger(p.collectionCheckedAt)&&p.collectionCheckedAt>0&&p.collectionCheckedAt<=p.at&&
 Number.isSafeInteger(p.sourceStoredAt)&&p.sourceStoredAt>0&&p.sourceStoredAt<=p.at&&
 Number.isSafeInteger(p.eventCount)&&p.eventCount>=0;}
export function validateIranUpdateHistory(body){
 if(body.updateHistory===undefined&&body.updateHistoryVersion===undefined)return true;
 if(body.updateHistoryVersion!==IRAN_UPDATE_HISTORY_VERSION||!Array.isArray(body.updateHistory)||body.updateHistory.length<1||body.updateHistory.length>4096)return false;
 let previous=0;for(const p of body.updateHistory){if(!validPoint(p,body)||p.at<=previous)return false;previous=p.at;}
 const last=body.updateHistory.at(-1);return last.at===body.publishedAt&&last.value===body.score&&last.sourceStoredAt===body.sourceStoredAt&&last.collectionCheckedAt===body.collectionCheckedAt&&last.eventCount===body.acceptedEventCount;
}
export function attachIranUpdateHistory(body,verifiedRecords=[]){
 const byTime=new Map();
 for(const record of verifiedRecords){
  if(record?.version!==IRAN_UPDATE_HISTORY_VERSION||record.verification!=='D1_READBACK_VERIFIED')continue;
  const p=record.point;
  if(!p||typeof p.lineage!=='string'||!Number.isSafeInteger(p.at))throw Error('IRAN_UPDATE_LEDGER_INVALID');
  if(p.lineage!==lineage(body)||p.at<iranUpdateWindowStart(body))continue;
  if(!validPoint(p,body))throw Error('IRAN_UPDATE_LEDGER_INVALID');
  const old=byTime.get(p.at);if(old&&JSON.stringify(old)!==JSON.stringify(p))throw Error('IRAN_UPDATE_TIME_COLLISION');
  byTime.set(p.at,p);
 }
 const current=iranPublicationPoint(body),old=byTime.get(current.at);
 if(old&&JSON.stringify(old)!==JSON.stringify(current))throw Error('IRAN_UPDATE_TIME_COLLISION');
 byTime.set(current.at,current);
 const result={...body,updateHistoryVersion:IRAN_UPDATE_HISTORY_VERSION,updateHistory:[...byTime.values()].sort((a,b)=>a.at-b.at)};
 if(!validateIranUpdateHistory(result))throw Error('IRAN_UPDATE_HISTORY_INVALID');return result;
}
