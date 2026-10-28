// Existing PC Cloudflare credential chain; D1 SQL is restricted by the R48
// CAS publisher to the new nine-theme key and includes a readback.
import fs from 'node:fs';
import path from 'node:path';

const need=(ok,code)=>{
 if(!ok)throw Object.assign(new Error('THEME_NINE_R54_'+code),
  {code:'THEME_NINE_R54_'+code});
};

export function createNineR54D1Query({dataRoot,tokenFn,fetchImpl=fetch}={}){
 need(typeof tokenFn==='function','PC_AUTH_ADAPTER_REQUIRED');
 const config=JSON.parse(fs.readFileSync(path.join(dataRoot,'pc-writer','config.json'),'utf8'));
 need(/^[a-f0-9]{32}$/.test(config.account)&&
  /^[a-f0-9-]{36}$/.test(config.core),'PC_D1_CONFIG_INVALID');
 const token=tokenFn({dataRoot});
 need(typeof token==='string'&&token.length>8,'PC_AUTH_TOKEN_UNAVAILABLE');
 let writeAttempted=false;
 return async function query(sql,params,{write=false}={}){
  need(typeof sql==='string'&&sql.includes('public_feed_snapshots_v1')&&
   Array.isArray(params),'D1_SQL_DENIED');
  if(write)writeAttempted=true;
  let response,json;
  try{
   response=await fetchImpl(`https://api.cloudflare.com/client/v4/accounts/${config.account}/d1/database/${config.core}/query`,{
    method:'POST',headers:{Authorization:`Bearer ${token}`,'content-type':'application/json'},
    body:JSON.stringify({batch:[{sql,params}]}),
    redirect:'error',signal:AbortSignal.timeout(30000)});
   json=await response.json();
  }catch{
   need(false,writeAttempted?'D1_WRITE_OUTCOME_UNKNOWN':'D1_READ_FAILED');
  }
  need(response.ok&&json.success!==false&&json.result?.length===1&&
   json.result[0].success!==false,
   writeAttempted?'D1_WRITE_OUTCOME_UNKNOWN':'D1_READ_FAILED');
  return json.result[0];
 };
}
