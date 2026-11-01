// R46: minimal, fail-closed PC patch for the already approved R45 implementation.
// Input files are never overwritten wholesale: unrelated approved code survives.

export const R46_PATCH_REVISION='MARKET_CALENDAR_R46_PC_APPLY_R1';
export const R46_PATCH_PATHS=Object.freeze([
 'lib/market-score/breadth-b1-r6-marketparquet-provider.mjs',
 'lib/market-score/breadth-b1-r3-collector.mjs',
 'scripts/pc-writer/collect-local.mjs',
]);
export const R46_SIDECAR='scripts/pc-writer/market-calendar-r45-marketparquet-capture.mjs';
export const R46_ALL_PATHS=Object.freeze([...R46_PATCH_PATHS,R46_SIDECAR]);

function replaceOnce(source,before,after,label){
 const first=source.indexOf(before);
 if(first<0||source.indexOf(before,first+1)>=0)throw Error('R46_ANCHOR_CHANGED_STOP_'+label);
 return source.slice(0,first)+after+source.slice(first+before.length);
}

function patchProvider(source){
 let next=replaceOnce(source,
  '  B1_R3_MARKETPARQUET_SOURCE_CONTRACT,\n',
  '  B1_R3_MARKETPARQUET_SOURCE_CONTRACT,\n  B1_R3_MIN_COVERAGE,\n','PROVIDER_IMPORT');
 next=replaceOnce(next,
  '  symbols,asOfDate,fetchImpl=globalThis.fetch,baseUrl=B1_R3_MARKETPARQUET_BASE,\n',
  '  symbols,asOfDate,fetchImpl=globalThis.fetch,baseUrl=B1_R3_MARKETPARQUET_BASE,\n  snapshotObserver=null,\n','PROVIDER_SIGNATURE');
 return replaceOnce(next,
  '  const built=buildMarketParquetPairs({symbols,currentRows,previousRows,tradeDate,previousDate});\n  return {\n',
  '  const built=buildMarketParquetPairs({symbols,currentRows,previousRows,tradeDate,previousDate});\n'+
  '  // An optional PC-private R45 observer reuses the two already downloaded files.\n'+
  '  // Its failure cannot change B1 source coverage, scoring, or fallbacks.\n'+
  '  if(typeof snapshotObserver==="function"&&built.coverage>=B1_R3_MIN_COVERAGE){\n'+
  '    try{await snapshotObserver({tradeDate,previousDate,currentRows,previousRows});}\n'+
  '    catch{/* Sidecar capture is strictly best effort. */}\n'+
  '  }\n  return {\n','PROVIDER_OBSERVER');
}

function patchCollector(source){
 let next=replaceOnce(source,
  '  recoveryFetcher=fetchMarketParquetLatestPairs,\n',
  '  recoveryFetcher=fetchMarketParquetLatestPairs,\n  snapshotObserver=env?.R45_MARKETPARQUET_SNAPSHOT_OBSERVER??null,\n','COLLECTOR_OBSERVER');
 return replaceOnce(next,
  '      const primary=await recoveryFetcher({symbols:universe.symbols,asOfDate,fetchImpl});\n',
  '      const primary=await recoveryFetcher({symbols:universe.symbols,asOfDate,fetchImpl,snapshotObserver});\n','COLLECTOR_PASSTHROUGH');
}

function patchPc(source){
 let next=replaceOnce(source,
  "import {collectReleaseCalendar} from './release-calendar.mjs';\n",
  "import {collectReleaseCalendar} from './release-calendar.mjs';\n"+
  "import {captureR45MarketParquetPair} from './market-calendar-r45-marketparquet-capture.mjs';\n",'PC_IMPORT');
 next=replaceOnce(next,
  " const env={...loadLocalProviders(base),DB:core,DB_CORE:core,DB_HISTORY:history,ZGMINI_COMPUTE_TARGET:'pc'};\n",
  " const env={...loadLocalProviders(base),DB:core,DB_CORE:core,DB_HISTORY:history,ZGMINI_COMPUTE_TARGET:'pc'};\n"+
  " let r45Capture={status:'NOT_OBSERVED'};\n"+
  " env.R45_MARKETPARQUET_SNAPSHOT_OBSERVER=async snapshot=>{\n"+
  "  try{r45Capture=captureR45MarketParquetPair({base,...snapshot});}\n"+
  "  catch{r45Capture={status:'R45_CAPTURE_FAILED_PRESERVE_B1'};}\n"+
  " };\n",'PC_OBSERVER');
 return replaceOnce(next,
  "  for(const key of ['phase','reason','sourceStatus'])",
  "  report.marketCalendarR45={status:r45Capture.status,previous:r45Capture.previous?.status??null,\n"+
  "   current:r45Capture.current?.status??null,previousTickerCount:r45Capture.previous?.tickerCount??null,\n"+
  "   currentTickerCount:r45Capture.current?.tickerCount??null,providerCallsAdded:0,\n"+
  "   dbWrites:0,remoteWrites:0,published:false};\n"+
  "  for(const key of ['phase','reason','sourceStatus'])",'PC_REPORT');
}

export function patchR46Source(relativePath,original){
 if(!R46_PATCH_PATHS.includes(relativePath)||typeof original!=='string')
  throw Error('R46_UNSUPPORTED_PATCH_TARGET');
 if(original.includes('\r')&&!original.includes('\r\n'))throw Error('R46_UNSUPPORTED_LINE_ENDING');
 const ending=original.includes('\r\n')?'\r\n':'\n';
 const before=original.replaceAll('\r\n','\n');
 if(/R45_MARKETPARQUET_SNAPSHOT_OBSERVER|snapshotObserver|market-calendar-r45-marketparquet-capture/.test(before))
  throw Error('R46_ALREADY_MODIFIED_OR_PARTIAL_STOP');
 const patched=relativePath===R46_PATCH_PATHS[0]?patchProvider(before):
  relativePath===R46_PATCH_PATHS[1]?patchCollector(before):patchPc(before);
 if(patched===before)throw Error('R46_NO_CHANGE_STOP');
 return patched.replaceAll('\n',ending);
}
