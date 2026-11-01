import fs from 'node:fs/promises';
import path from 'node:path';
import {renameWithRetrySync} from './pc-writer/d1.mjs';

export function assertSourceAvailable(bytes, httpStatus=200){
 const text=new TextDecoder().decode(bytes.slice(0,16384));
 if(/(?:site|scheduled|temporary)\s+maintenance|temporarily unavailable|under maintenance/i.test(text))throw Error('PROVIDER_MAINTENANCE');
 if(httpStatus<200||httpStatus>=300)throw Error('PROVIDER_HTTP_ERROR');
}
export function parseSupplyFredCsv(bytes,id){
 assertSourceAvailable(bytes);
 const lines=new TextDecoder().decode(bytes).replace(/^\uFEFF/,'').trim().split(/\r?\n/);
 const header=lines[0].split(',');
 if(!['DATE','observation_date'].includes(header[0])||header.length!==2||header[1]!==id)throw Error('FRED_CSV_SCHEMA');
 const rows=[];let previous='';
 for(const line of lines.slice(1)){
  const columns=line.split(','),[observationDate,raw]=columns;
  if(columns.length!==2||!/^\d{4}-\d{2}-\d{2}$/.test(observationDate)||!Number.isFinite(Date.parse(observationDate))||new Date(observationDate).toISOString().slice(0,10)!==observationDate||observationDate<=previous)throw Error('FRED_CSV_SCHEMA');
  previous=observationDate;
  if(raw==='.'||raw==='')continue;
  if(!Number.isFinite(Number(raw)))throw Error('FRED_CSV_SCHEMA');
  rows.push({observationDate,value:Number(raw)});
 }
 if(!rows.length)throw Error('FRED_CSV_SCHEMA');
 return rows;
}
// Called only after parsing/validation. Invalid responses never replace good files.
export async function storeValidatedSupplySource(directory,id,extension,bytes,parsed){
 const raw=path.join(directory,`${id}.${extension}`),json=path.join(directory,`${id}.json`);
 await fs.writeFile(raw+'.next',bytes);await fs.writeFile(json+'.next',JSON.stringify(parsed));
 renameWithRetrySync(raw+'.next',raw);renameWithRetrySync(json+'.next',json);
}
export function supplyFailureReason(failures=[]){
 if(failures.some(x=>x.error==='PROVIDER_MAINTENANCE'))return 'PROVIDER_MAINTENANCE';
 if(failures.some(x=>x.error==='PROVIDER_HTTP_ERROR'||/^HTTP_/.test(x.error??'')))return 'PROVIDER_HTTP_ERROR';
 if(failures.some(x=>/SCHEMA|INVALID|SHEET|COLUMN/.test(x.error??'')))return 'SOURCE_FORMAT_ERROR';
 return 'SOURCE_FAILED';
}
