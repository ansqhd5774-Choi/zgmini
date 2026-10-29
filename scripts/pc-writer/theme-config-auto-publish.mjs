// Runs after the existing configured-theme private schedule. Publication is
// opt-in per independently approved theme and uses no price-provider GETs.
// Neither a new task nor a per-theme launcher is created here.
import fs from 'node:fs';
import path from 'node:path';

const READ="SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'";
const errorCode=e=>typeof e?.code==='string'?e.code:'CONFIGURED_PUBLICATION_UNEXPECTED';
const ensure=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
const secureDirectory=dir=>{
 const st=fs.lstatSync(dir);
 ensure(st.isDirectory()&&!st.isSymbolicLink()&&fs.realpathSync(dir)===dir,
  'CONFIG_PUBLIC_APPROVAL_DIR_REDIRECT');
 return dir;
};
export async function runConfiguredAutoPublish({dataRoot,now=Date.now(),
 registrations=null,preflight=null,publish=null,queryFactory=null,tokenFn=null}={}){
 ensure(Number.isSafeInteger(now)&&now>0,'CONFIG_PUBLIC_SCHEDULE_CLOCK');
 const entries=registrations??
  (await import('./theme-config-tool.mjs')).listRegistered(dataRoot);
 if(!entries.length)return {status:'NO_REGISTERED_THEMES',
  registered:0,approvalFiles:0,eligible:0,d1Queries:0,d1Writes:0,providerCalls:0,results:[]};
 const root=fs.realpathSync(dataRoot);
 const approvals=path.join(root,'theme-config','public-approvals');
 if(!fs.existsSync(approvals))return {status:'NO_OPERATOR_APPROVALS',
  registered:entries.length,approvalFiles:0,eligible:0,d1Queries:0,d1Writes:0,
  providerCalls:0,results:[]};
 secureDirectory(path.join(root,'theme-config'));
 const dir=secureDirectory(approvals);
 let query=null,queryAttempted=false,queryFailure=null;
 const results=[];let approvalFiles=0,eligible=0,d1Queries=0,d1Writes=0;
 for(const {definition} of entries){
  const id=definition.id,approvalFile=path.join(dir,id+'.json');
  if(!fs.existsSync(approvalFile))continue;
  approvalFiles++;
  let verified;
  try{
   preflight??=(await import('./theme-config-publication-preflight.mjs'))
    .preflightConfiguredPublication;
   verified=preflight({dataRoot:root,id,now});
  }
  catch(e){results.push({id,status:'PUBLICATION_BLOCKED',reason:errorCode(e)});continue;}
  if(verified?.status!=='PREFLIGHT_PASS_NO_REMOTE_ACCESS'){
   results.push({id,status:'PUBLICATION_BLOCKED',reason:verified?.reason??'PREFLIGHT_BLOCKED'});
   continue;
  }
  eligible++;
  if(!queryAttempted){
   queryAttempted=true;
   try{
    queryFactory??=(await import('./theme-nine-r54-d1-client.mjs'))
     .createNineR54D1Query;
    tokenFn??=(await import('./theme-biotech-auth-r7.mjs'))
     .biotechCloudflareTokenR7;
    query=queryFactory({dataRoot:root,tokenFn});
   }
   catch(e){queryFailure=errorCode(e);}
  }
  if(!query){
   results.push({id,status:'PUBLICATION_BLOCKED',reason:queryFailure??'D1_AUTH_UNAVAILABLE'});
   continue;
  }
  try{
   const measuredQuery=async(sql,params,options)=>{
    d1Queries++;
    return query(sql,params,options);
   };
   const before=await measuredQuery(READ,['theme-configured:'+id],{write:false});
   ensure(Array.isArray(before?.results),'CONFIG_PUBLIC_D1_READ_INVALID');
   const existing=before.results[0],expectedStoredAt=existing?Number(existing.stored_at):null;
   ensure(expectedStoredAt===null||
    Number.isSafeInteger(expectedStoredAt)&&expectedStoredAt>0,
    'CONFIG_PUBLIC_D1_STAMP_INVALID');
   // The publisher replays source/approval at execution time and performs
   // its own CAS select, optional write and exact D1 readback.
   publish??=(await import('./theme-config-publication-d1.mjs'))
    .publishConfiguredThemeD1;
   const result=await publish({dataRoot:root,id,query:measuredQuery,now,expectedStoredAt});
   d1Writes+=result.written??0;
   results.push({id,status:result.status,
    observationDate:result.observationDate,storedAt:result.storedAt});
  }catch(e){
   results.push({id,status:'PUBLICATION_BLOCKED',reason:errorCode(e)});
  }
 }
 const blocked=results.some(r=>r.status==='PUBLICATION_BLOCKED');
 return {status:blocked?'PUBLICATION_PARTIAL_REVIEW_REQUIRED':
  eligible?'PUBLICATION_SCHEDULE_COMPLETED':'NO_ELIGIBLE_PUBLICATION',
  registered:entries.length,approvalFiles,eligible,d1Queries,
  // Counts D1 writes successfully verified; uncertain writes remain unknown.
  d1Writes,providerCalls:0,results};
}
