import {DIAGNOSTIC_FRED_SERIES} from '../lib/diagnostic-layer/input-registry.mjs';
import {hasObservations} from './collection-input-safety.mjs';

// Fail closed before replacing a complete stored macro snapshot.
export function macroCollectionReadiness(collected){
 const required=Object.keys(DIAGNOSTIC_FRED_SERIES);
 const ready=required.filter(id=>hasObservations(collected?.series?.[id]));
 const failed=collected?.providerSummary?.fred?.failed??[];
 const complete=ready.length===required.length&&failed.length===0;
 return {complete,requested:required.length,ready:ready.length,
  missing:required.filter(id=>!ready.includes(id)),
  reason:complete?null:ready.length?'MACRO_REQUIRED_SERIES_MISSING':'MACRO_NO_READY_SERIES'};
}
export function safeMacroDiagnostic(value){
 if(value?.provider!=='FRED')return null;
 const ids=new Set(Object.keys(DIAGNOSTIC_FRED_SERIES)),count=n=>Number.isSafeInteger(n)&&n>=0?n:null;
 return {provider:'FRED',requested:count(value.requested),ready:count(value.ready),missing:Array.isArray(value.missing)?value.missing.filter(id=>ids.has(id)):[],failed:Array.isArray(value.failed)?value.failed.filter(x=>ids.has(x?.seriesId)).map(x=>({seriesId:x.seriesId,status:/^[A-Z0-9_]{1,64}$/.test(x.status??'')?x.status:'UNKNOWN',httpStatus:Number.isInteger(x.httpStatus)&&x.httpStatus>=100&&x.httpStatus<=599?x.httpStatus:null,networkCode:/^[A-Z0-9_]{1,64}$/.test(x.networkCode??'')?x.networkCode:null,requestCount:count(x.requestCount),durationMs:count(x.durationMs)})):[]};
}
export function mergeSuccessfulMacroCredit(previous,collected,storedAt){
 if(collected?.status!=='READY_CURRENT_VINTAGE'||!collected?.series?.NFCICREDIT?.length)throw Error('MACRO_CREDIT_NOT_READY');
 const body=previous?.body??{},series={...body.series,NFCICREDIT:collected.series.NFCICREDIT};
 const seriesStoredAt=Object.fromEntries(Object.keys(body.series??{}).map(id=>[id,body.seriesStoredAt?.[id]??previous.storedAt]));
 seriesStoredAt.NFCICREDIT=storedAt;
 return {...body,series,seriesStoredAt};
}
