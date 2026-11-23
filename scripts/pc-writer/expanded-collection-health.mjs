import fs from 'node:fs';import path from 'node:path';
// Count independent collection lanes, not symbols, API URLs, shadow research or
// publication retries. Missing active-lane evidence remains unknown; retired
// Alpaca collections are not active jobs and must not dilute paid-feed health.
export const EXPANDED_HEALTH_JOBS=Object.freeze(['themePrimary','themeBiotech','themeDataCenterPower','themeSpaceSatellite']);
const stamp=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):Number.isFinite(x)?x:null;
const PRIMARY_TICKERS=Object.freeze(['SPY','BOTZ','ROBO','SKYY','CLOU','DRIV','NLR','URA','ITA','SHLD','FINX','ARKF','CIBR','BUG']);
const realDay=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
// A count of 14 arbitrary keys is NOT evidence that the mandatory R181 ETF
// universe was collected. This is a ledger-only completeness decision;
// actual SQLite bytes, SHA/checkpoint and publication remain separately gated.
const fullPrimaryCoverage=coverage=>coverage!==null&&typeof coverage==='object'&&
 !Array.isArray(coverage)&&Object.getPrototypeOf(coverage)===Object.prototype&&
 Object.keys(coverage).length===PRIMARY_TICKERS.length&&
 PRIMARY_TICKERS.every(symbol=>{
  const item=Object.hasOwn(coverage,symbol)?coverage[symbol]:null;
  return item!==null&&typeof item==='object'&&!Array.isArray(item)&&
   Number.isSafeInteger(item.bars)&&item.bars>0&&realDay(item.latest15NY);
 });
const manifestSuccess=manifest=>manifest?.version===1&&Array.isArray(manifest.files)&&manifest.files.length&&manifest.files.every(x=>/^[a-f0-9]{64}$/.test(x.sha256??'')&&stamp(x.collectedAt)!==null)?Math.max(...manifest.files.map(x=>stamp(x.collectedAt))):null;
export function expandedCollectionEntries({primary=null,secondary=null,biotechManifest=null,powerManifest=null,spaceManifest=null}={}){
 const primaryAt=stamp(primary?.at);
 const primaryReady=primaryAt!==null&&['NO_NEW_COMPLETE_PRIMARY_DATE','PRIMARY_RAW_STORED','LOCAL_PRIMARY_STORED'].includes(primary?.status)&&Number.isSafeInteger(primary?.providerCalls)&&primary.providerCalls>0&&fullPrimaryCoverage(primary?.coverage);
 const failed=x=>/FAILED|ERROR|BLOCKED/.test(x?.status??'');
 return [
  {id:'job:themePrimary',checkedAt:primary?.providerCalls>0?primaryAt:null,storedAt:primaryReady?primaryAt:null,outcome:failed(primary)?'failure':primaryReady?'success':'unknown'},
  // A private score, a cache replay or an old manifest cannot prove the latest
  // source request succeeded. Retain observed success separately, if available.
  {id:'job:themeBiotech',checkedAt:null,outcome:'unknown',storedAt:null,lastSuccessAt:manifestSuccess(biotechManifest)},
  {id:'job:themeDataCenterPower',checkedAt:null,outcome:'unknown',storedAt:null,lastSuccessAt:manifestSuccess(powerManifest)},
  {id:'job:themeSpaceSatellite',checkedAt:null,outcome:'unknown',storedAt:null,lastSuccessAt:manifestSuccess(spaceManifest)},
 ];
}
export function readExpandedCollectionEntries(base){
 const root=process.env.ZGMINI_DATA_ROOT??path.dirname(base),read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}};
 return expandedCollectionEntries({primary:read(path.join(root,'theme-market-history-r131/marketparquet-r167/R181_PRIMARY_LAST_RUN.json')),biotechManifest:read(path.join(root,'themes/biotech/raw-manifest.json')),powerManifest:read(path.join(root,'themes/data-center-power/raw-manifest.json')),spaceManifest:read(path.join(root,'themes/space-satellite/raw-manifest.json'))});
}
