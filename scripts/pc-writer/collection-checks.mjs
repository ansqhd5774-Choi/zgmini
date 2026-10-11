import fs from 'node:fs';
import path from 'node:path';
import {save} from './d1.mjs';

export function readCollectionChecks(base){
 const file=path.join(base,'collection-checks.json');
 if(!fs.existsSync(file))return {};
 return JSON.parse(fs.readFileSync(file,'utf8')).items??{};
}
// Keep transport/validation outcomes separate from observation and storage dates.
// Cache hits, quota deferrals and lease skips never create a successful check.
export function recordCollectionChecks(base,report){
 const items=readCollectionChecks(base),checkedAt=Date.parse(report.at);
 if(!Number.isFinite(checkedAt))throw Error('INVALID_CHECK_TIMESTAMP');
 const requests=Object.values(report.providers??{}).reduce((n,x)=>n+(x.requests??0),0);
 const put=(id,outcome)=>{const previous=items[id];items[id]={checkedAt,outcome,lastSuccessAt:outcome==='success'?checkedAt:previous?.lastSuccessAt??(previous?.outcome==='success'?previous.checkedAt:null)};};
 for(const feed of report.feeds??[]){
  if(feed.status==='COMPLETE'&&requests>0)put('feed:'+feed.key,'success');
  else if(feed.status==='FAILED')put('feed:'+feed.key,'failure');
 }
 if(report.lane==='korea'){
  if(requests>0&&['COMPLETE','BACKLOG','WAITING_PUBLICATION'].includes(report.status))put('korea','success');
  else if(['ERROR','FAILED','CONFIGURATION_MISSING'].includes(report.status))put('korea','failure');
 }else if(report.job){
  if(requests>0&&report.status==='COMPLETE')put('job:'+report.job,'success');
  else if(['ERROR','FAILED','SOURCE_FAILED','CONFIGURATION_MISSING'].includes(report.status))put('job:'+report.job,'failure');
 }
 save(path.join(base,'collection-checks.json'),{version:2,items});
}
