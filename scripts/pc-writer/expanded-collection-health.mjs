import fs from 'node:fs';import path from 'node:path';
// Count independent collection lanes, not symbols, API URLs, shadow research or
// publication retries. Missing evidence remains in the denominator as unknown.
export const EXPANDED_HEALTH_JOBS=Object.freeze(['sectorEtf','themePrimary','themeSecondary','themeBiotech','themeDataCenterPower']);
const stamp=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):Number.isFinite(x)?x:null;
const manifestSuccess=manifest=>manifest?.version===1&&Array.isArray(manifest.files)&&manifest.files.length&&manifest.files.every(x=>/^[a-f0-9]{64}$/.test(x.sha256??'')&&stamp(x.collectedAt)!==null)?Math.max(...manifest.files.map(x=>stamp(x.collectedAt))):null;
export function expandedCollectionEntries({sector=null,primary=null,secondary=null,biotechManifest=null,powerManifest=null}={}){
 const sectorAt=stamp(sector?.checkedAt),primaryAt=stamp(primary?.at);
 const primaryReady=['NO_NEW_COMPLETE_PRIMARY_DATE','PRIMARY_RAW_STORED'].includes(primary?.status)&&primary?.providerCalls>0&&Object.keys(primary?.coverage??{}).length===14&&Object.values(primary.coverage).every(x=>x.bars>0&&typeof x.latest15NY==='string');
 const failed=x=>/FAILED|ERROR|BLOCKED/.test(x?.status??'');
 return [
  {id:'job:sectorEtf',checkedAt:sector?.providerRequests>0?sectorAt:null,storedAt:sector?.storageVerified?sectorAt:null,outcome:failed(sector)?'failure':sector?.status==='COLLECTED'&&sector.storageVerified===true&&sector.providerRequests>0?'success':'unknown'},
  {id:'job:themePrimary',checkedAt:primary?.providerCalls>0?primaryAt:null,storedAt:primaryReady?primaryAt:null,outcome:failed(primary)?'failure':primaryReady?'success':'unknown'},
  // A private score, a cache replay or an old manifest cannot prove the latest
  // source request succeeded. Retain observed success separately, if available.
  {id:'job:themeSecondary',checkedAt:null,outcome:'unknown',storedAt:null},
  {id:'job:themeBiotech',checkedAt:null,outcome:'unknown',storedAt:null,lastSuccessAt:manifestSuccess(biotechManifest)},
  {id:'job:themeDataCenterPower',checkedAt:null,outcome:'unknown',storedAt:null,lastSuccessAt:manifestSuccess(powerManifest)},
 ];
}
export function readExpandedCollectionEntries(base){
 const root=process.env.ZGMINI_DATA_ROOT??path.dirname(base),read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}};
 return expandedCollectionEntries({sector:read(path.join(base,'local-sector-fear-greed-r3-etf-incremental-last-run.json')),primary:read(path.join(root,'theme-market-history-r131/marketparquet-r167/R181_PRIMARY_LAST_RUN.json')),secondary:read(path.join(root,'theme-market-history-r131/marketparquet-r167/ZGMINI_R167_LAST_RUN.json')),biotechManifest:read(path.join(root,'themes/biotech/raw-manifest.json')),powerManifest:read(path.join(root,'themes/data-center-power/raw-manifest.json'))});
}
