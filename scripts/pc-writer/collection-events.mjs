import fs from 'node:fs';import path from 'node:path';
import {safeMacroDiagnostic} from '../../worker/macro-result-contract-r61.mjs';
import {DIAGNOSTIC_FRED_SERIES} from '../../lib/diagnostic-layer/input-registry.mjs';
import {safeCollectionFailure} from '../../worker/collection-failure-diagnostic.mjs';
const code=value=>typeof value==='string'&&/^[A-Za-z0-9_.:-]{1,120}$/.test(value)?value:null;
export function appendCollectionEvent(base,report){
 const at=typeof report.at==='string'&&Number.isFinite(Date.parse(report.at))?report.at:null;
 const providers=Object.fromEntries(Object.entries(report.providers??{}).filter(([host])=>/^[a-z0-9.-]{1,200}$/.test(host)).map(([host,v])=>[host,{requests:Number.isSafeInteger(v.requests)?v.requests:null,statuses:Object.fromEntries(Object.entries(v.statuses??{}).filter(([status,n])=>(/^[1-5][0-9]{2}$/.test(status)||['NETWORK_ERROR','PROVIDER_QUOTA_GUARD'].includes(status))&&Number.isSafeInteger(n)&&n>=0))}]));
 const wiki=report.sourceDiagnostic;
 const sourceDiagnostic=safeMacroDiagnostic(report.sourceDiagnostic)??(report.sourceDiagnostic?.provider==='BLS'?{provider:'BLS',httpStatus:Number.isInteger(report.sourceDiagnostic.httpStatus)?report.sourceDiagnostic.httpStatus:null,attempts:[1,2].includes(report.sourceDiagnostic.attempts)?report.sourceDiagnostic.attempts:null}:null)??(report.job==='earnings'&&wiki?.provider==='WIKIPEDIA'&&wiki.stage==='UNIVERSE_REQUEST'&&Number.isInteger(wiki.httpStatus)&&wiki.httpStatus>=100&&wiki.httpStatus<=599?{provider:'WIKIPEDIA',stage:'UNIVERSE_REQUEST',httpStatus:wiki.httpStatus}:null);
 const feeds=(report.feeds??[]).filter(x=>['fear-greed','market-data','core-pce'].includes(x.key)).map(x=>({key:x.key,status:code(x.status)}));
 const d=report.failureDiagnostic;
 const failureDiagnostic=d?{...safeCollectionFailure({name:d.name,code:d.code}),location:typeof d.location?.module==='string'&&/^(worker|lib|scripts\/pc-writer)\/[A-Za-z0-9_./-]+\.(mjs|js|ts)$/.test(d.location.module)&&!d.location.module.includes('..')&&Number.isInteger(d.location.line)&&Number.isInteger(d.location.column)?{module:d.location.module,line:d.location.line,column:d.location.column}:null}:null;
 fs.appendFileSync(path.join(base,'collection-events.jsonl'),JSON.stringify({at,lane:code(report.lane),job:code(report.job),status:code(report.status),reason:code(report.reason),phase:code(report.phase),sourceStatus:code(report.sourceStatus),sourceDiagnostic,...(failureDiagnostic?{failureDiagnostic}:{}),providers,feeds})+'\n');
}
export function appendProviderFailure(base,input,{phase,httpStatus=null,error=null,now=Date.now()}={}){
 const url=new URL(typeof input==='string'||input instanceof URL?input:input.url),raw=error?.cause?.code??error?.code;
 const networkCode=error?.name==='TimeoutError'?'TIMEOUT':error?.name==='AbortError'?'ABORTED':typeof raw==='string'&&/^[A-Z0-9_]{1,64}$/.test(raw)?raw:null;
 const series=url.hostname==='api.stlouisfed.org'?url.searchParams.get('series_id'):null;
 fs.appendFileSync(path.join(base,'provider-request-failures.jsonl'),JSON.stringify({at:new Date(now).toISOString(),host:url.hostname,...(url.hostname==='api.census.gov'?{dataset:['/data/timeseries/eits/m3','/data/timeseries/eits/bfs'].includes(url.pathname)?url.pathname.split('/').at(-1):null,category:['MTM','MDM','NXA'].includes(url.searchParams.get('category_code'))?url.searchParams.get('category_code'):null}:{}),seriesId:Object.hasOwn(DIAGNOSTIC_FRED_SERIES,series??'')?series:null,phase:['HTTP','FETCH'].includes(phase)?phase:'UNKNOWN',httpStatus:Number.isInteger(httpStatus)?httpStatus:null,networkCode})+'\n');
}
