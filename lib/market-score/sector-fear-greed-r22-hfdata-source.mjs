export const SECTOR_R22_HFDATA_SOURCE_METHOD="SECTOR-FEAR-GREED-R2.2-HFDATA-BACKFILL-SOURCE-R1";
export const SECTOR_R22_HFDATA_API_BASE="https://api.hfdatalibrary.com/v1";
export const SECTOR_R22_HFDATA_SYMBOLS_URL=`${SECTOR_R22_HFDATA_API_BASE}/symbols`;
export const SECTOR_R22_HFDATA_HISTORY_START="2022-03-07";
export const SECTOR_R22_HFDATA_REFERENCE_REQUIREMENT=756;
export const SECTOR_R22_HFDATA_FEATURE_WARMUP=60;
export const SECTOR_R22_HFDATA_ATTRIBUTION="Data provided for free by IEX. By accessing or using IEX Historical Data, you agree to the IEX Historical Data Terms of Use.";
export const SECTOR_R22_HFDATA_LIBRARY_CITATION="Elkassabgi, A. (2026). HF Data Library: Free 1-Minute Intraday U.S. Equity Data. Zenodo. https://doi.org/10.5281/zenodo.19501604";
export const SECTOR_R22_HFDATA_RIGHTS=Object.freeze({
  libraryCompilation:"CC BY 4.0",
  upstream:"IEX Historical Data Terms of Use",
  rawStorage:"LOCAL_ONLY",
  publicOutput:"DERIVED_SCORE_ONLY",
  attributionRequired:true,
});

const TICKER_ALIASES=Object.freeze({"BRK.B":"BRK-B","BF.B":"BF-B"});

export function normalizeSectorR22HfTicker(value){
  const ticker=String(value??"").trim().toUpperCase();
  return TICKER_ALIASES[ticker]??ticker;
}

export function parseSectorR22HfSymbolCatalogue(payload){
  const input=Array.isArray(payload)?payload:Array.isArray(payload?.symbols)?payload.symbols:[];
  const symbols=new Map();
  for(const item of input){
    const raw=typeof item==="string"?item:item?.ticker;
    const ticker=normalizeSectorR22HfTicker(raw);
    if(!ticker)continue;
    const sizeBytes=typeof item==="object"&&item!==null&&Number.isFinite(Number(item.size_bytes))?Number(item.size_bytes):null;
    const lastModified=typeof item==="object"&&item!==null&&item.last_modified?String(item.last_modified):null;
    const old=symbols.get(ticker);
    if(old&&(old.sizeBytes!==sizeBytes||old.lastModified!==lastModified))throw new Error("SECTOR_R22_HFDATA_CATALOGUE_DUPLICATE_CONFLICT");
    symbols.set(ticker,{ticker,sizeBytes,lastModified});
  }
  if(symbols.size<500)throw new Error("SECTOR_R22_HFDATA_CATALOGUE_TOO_SMALL");
  return {count:symbols.size,symbols,source:"HF Data Library",historyStart:SECTOR_R22_HFDATA_HISTORY_START};
}

export function assessSectorR22HfCatalogue({catalogue,pitHistory,requiredBenchmarks=[]}={}){
  if(!(catalogue?.symbols instanceof Map))throw new TypeError("SECTOR_R22_HFDATA_CATALOGUE_REQUIRED");
  if(!pitHistory?.byTicker)throw new TypeError("SECTOR_R22_HFDATA_PIT_HISTORY_REQUIRED");
  const required=new Set(Object.keys(pitHistory.byTicker).map(normalizeSectorR22HfTicker).filter(Boolean));
  const available=[...required].filter(ticker=>catalogue.symbols.has(ticker)).sort();
  const missing=[...required].filter(ticker=>!catalogue.symbols.has(ticker)).sort();
  const bySector={};
  for(const [rawTicker,entries] of Object.entries(pitHistory.byTicker)){
    const ticker=normalizeSectorR22HfTicker(rawTicker),isAvailable=catalogue.symbols.has(ticker);
    for(const entry of entries??[]){
      const sectorId=entry?.sectorId;if(!sectorId)continue;
      const bucket=bySector[sectorId]??={required:new Set(),available:new Set(),missing:new Set()};
      bucket.required.add(ticker);
      (isAvailable?bucket.available:bucket.missing).add(ticker);
    }
  }
  const sectors=Object.fromEntries(Object.entries(bySector).map(([sectorId,bucket])=>[sectorId,{
    required:bucket.required.size,
    available:bucket.available.size,
    missing:bucket.missing.size,
    coverage:bucket.required.size?bucket.available.size/bucket.required.size:null,
    missingTickers:[...bucket.missing].sort(),
  }]));
  const benchmarks=[...new Set(requiredBenchmarks.map(normalizeSectorR22HfTicker).filter(Boolean))].map(ticker=>({ticker,available:catalogue.symbols.has(ticker)}));
  return {
    methodologyVersion:SECTOR_R22_HFDATA_SOURCE_METHOD,
    sourceHistoryStart:SECTOR_R22_HFDATA_HISTORY_START,
    referenceRequirement:SECTOR_R22_HFDATA_REFERENCE_REQUIREMENT,
    featureWarmup:SECTOR_R22_HFDATA_FEATURE_WARMUP,
    pitTickers:required.size,
    availableTickers:available.length,
    missingTickers:missing.length,
    coverage:required.size?available.length/required.size:null,
    missingTickerList:missing,
    sectors,
    benchmarks,
    benchmarksComplete:benchmarks.every(item=>item.available),
    rights:{...SECTOR_R22_HFDATA_RIGHTS},
  };
}
