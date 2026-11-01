/** Read-only R11: diagnose exactly the four unverified S&P 500 breadth dates.
 * Reports aggregate schema, source, and history mismatch causes only.
 * No provider calls, D1 access, PC SQLite changes, or schedule operations.
 */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath,pathToFileURL} from 'node:url';

const folder=path.dirname(fileURLToPath(import.meta.url));
const output=path.join(folder,'US_BREADTH_PC_R11_FOUR_GAP_READONLY_RESULT.txt');
const evidence=path.join(folder,'US_BREADTH_PC_R9_HISTORY_COVERAGE_RESULT.txt');
const evidenceSha='4fc6688d326c21145a2c35ce3dbb951851b3a5bdbd507f8e64b271efe3dac47d';
const home=process.env.ZGMINI_PC_HOME??'E:\\ZGmini\\data\\pc-writer';
const root=process.env.ZGMINI_PC_REPO??'E:\\ZGmini\\projects\\zgmini-earnings-history-pc-release';
const approvedSha='43e0ffa392a9e655bcb4ca7b151c26ad43567e14';
const days=['2026-03-26','2026-03-27','2026-09-23','2026-10-14'];
const table={universe:'market_score_breadth_b1_r3_universe_v1',
  current:'market_score_breadth_b1_r3_current_v1',
  history:'market_score_breadth_b1_r3_history_v1'};
const cols='trade_date,ticker,previous_date,previous_close,current_close,current_volume,source,feed,provenance_json';
const result={REPORT:'US_BREADTH_PC_R11_FOUR_GAP_READONLY',
  RUN_AT_UTC:new Date().toISOString(),MODE:'READ_ONLY_NO_FETCH_NO_INSTALL_NO_PUBLISH_NO_SCHEDULE_CHANGE',
  APPROVED_PC_SOURCE_SHA:approvedSha,STATUS:'STARTED'};
function set(k,v){result[k]=typeof v==='object'&&v!==null?JSON.stringify(v):v;}
function save(){fs.writeFileSync(output,Object.entries(result).map(([k,v])=>`${k}=${String(v??'NULL').replace(/[\r\n\t]/g,' ').slice(0,1600)}`).join('\r\n')+'\r\n','utf8');}
function step(v){set('STAGE',v);save();}
function git(args){return execFileSync('git',['-C',root,...args],{encoding:'utf8',windowsHide:true,timeout:12000,stdio:['ignore','pipe','ignore']}).trim();}
function errorCode(e){const s=String(e?.message??'');return /^[A-Z0-9_-]{1,110}$/.test(s)?s:e?.code==='ERR_MODULE_NOT_FOUND'?'APPROVED_AUDIT_MODULE_MISSING':'READONLY_RUNTIME_ERROR';}
function readRows(db,t,day){return db.prepare(`SELECT ${cols} FROM ${t} WHERE trade_date=?`).all(day);}
function countValues(xs,fn){
  const map=new Map();for(const x of xs){const raw=fn(x);const key=String(raw??'NULL').replace(/[^-+A-Za-z0-9_ .]/g,'_').slice(0,64);map.set(key,(map.get(key)??0)+1);}
  return Object.fromEntries([...map].sort((a,b)=>b[1]-a[1]).slice(0,12));
}
function parse(p){try{return JSON.parse(p??'null')??{};}catch{return {};}}
const sameNumber=(a,b)=>a!==null&&a!==undefined&&a!==''&&b!==null&&b!==undefined&&b!==''
  &&Number.isFinite(Number(a))&&Number.isFinite(Number(b))&&Number(a)===Number(b);
const safeProvenanceFields=['provider','sourceContractRevision','splitAdjusted','dividendAdjusted',
  'currentResolvedSymbol','previousResolvedSymbol'];
function mismatch(current,historical){
  const out=[];
  for(const field of ['previous_date','source','feed','provenance_json'])if(String(current[field])!==String(historical[field]))out.push(field);
  for(const field of ['previous_close','current_close','current_volume'])if(!sameNumber(current[field],historical[field]))out.push(field);
  return out;
}
function lineageSummary(members,priceRows,historyRows){
  const allowed=new Set(members),current=new Map(),versions=new Map();
  for(const r of priceRows)if(allowed.has(r.ticker))current.set(r.ticker,r);
  for(const r of historyRows){if(!allowed.has(r.ticker))continue;const a=versions.get(r.ticker)??[];a.push(r);versions.set(r.ticker,a);}
  const diff={},provenanceDiff={},versionCounts={},fullyMatching=[],matchingSome=[],missing=[];
  for(const ticker of members){
    const p=current.get(ticker),items=versions.get(ticker)??[];
    versionCounts[String(items.length)]=(versionCounts[String(items.length)]??0)+1;
    if(!p||items.length===0){missing.push(1);continue;}
    const checks=items.map(h=>mismatch(p,h));
    if(checks.every(x=>x.length===0))fullyMatching.push(1);
    else if(checks.some(x=>x.length===0))matchingSome.push(1);
    for(const field of new Set(checks.flat()))diff[field]=(diff[field]??0)+1;
    if(checks.some(c=>c.includes('provenance_json'))){
      const a=parse(p.provenance_json);
      for(const field of safeProvenanceFields){
        if(items.some(h=>String(parse(h.provenance_json)[field])!==String(a[field])))
          provenanceDiff[field]=(provenanceDiff[field]??0)+1;
      }
      if(items.some(h=>JSON.stringify(parse(h.provenance_json))!==JSON.stringify(a))
        &&safeProvenanceFields.every(field=>items.every(h=>String(parse(h.provenance_json)[field])===String(a[field]))))
        provenanceDiff.otherMetadata=(provenanceDiff.otherMetadata??0)+1;
    }
  }
  return {mismatchFieldsByTicker:diff,provenanceFieldMismatchByTicker:provenanceDiff,historyVersionsPerTicker:versionCounts,
    fullyMatchingTickers:fullyMatching.length,someMatchingVersions:matchingSome.length,missingPriceOrHistory:missing.length};
}
function qualificationSummary(rows,day){
  const reasons={};const count=reason=>{reasons[reason]=(reasons[reason]??0)+1;};
  for(const row of rows){
    const p=parse(row.provenance_json);
    if(row.trade_date!==day)count('tradeDate');
    if(row.source!=='MarketParquet Free Sample')count('source');
    if(row.feed!=='stock_daily')count('feed');
    if(p.provider!=='MARKETPARQUET_FREE_SAMPLE')count('provider');
    if(!['ZGMINI_B1_PRICE_SOURCE_CONTRACT_R4','ZGMINI_B1_PRICE_SOURCE_CONTRACT_R5'].includes(p.sourceContractRevision))count('contractRevision');
    if(p.splitAdjusted!==true)count('splitAdjusted');
    if(p.dividendAdjusted!==false)count('dividendAdjusted');
    if(!String(p.currentResolvedSymbol??'').trim())count('currentSymbol');
    if(!String(p.previousResolvedSymbol??'').trim())count('previousSymbol');
  }
  return reasons;
}
function providerSummary(rows){
  return {source:countValues(rows,r=>r.source),feed:countValues(rows,r=>r.feed),
    provider:countValues(rows,r=>parse(r.provenance_json).provider),
    sourceContractRevision:countValues(rows,r=>parse(r.provenance_json).sourceContractRevision),
    splitAdjusted:countValues(rows,r=>String(parse(r.provenance_json).splitAdjusted)),
    dividendAdjusted:countValues(rows,r=>String(parse(r.provenance_json).dividendAdjusted)),
    missingResolvedSymbols:rows.filter(r=>!String(parse(r.provenance_json).currentResolvedSymbol??'').trim()
      ||!String(parse(r.provenance_json).previousResolvedSymbol??'').trim()).length};
}
async function execute(){
  step('RUNTIME');
  if(process.platform!=='win32'||Number(process.versions.node.split('.')[0])<24)throw Error('WINDOWS_NODE_24_REQUIRED');
  if(createHash('sha256').update(fs.readFileSync(evidence)).digest('hex')!==evidenceSha)throw Error('R9_EVIDENCE_HASH_MISMATCH');
  step('SOURCE_IDENTITY');
  const cfg=JSON.parse(fs.readFileSync(path.join(home,'config.json'),'utf8'));
  const sha=git(['rev-parse','HEAD']);
  if(sha!==approvedSha||cfg.source!==sha||cfg.enabled!==true||cfg.collectionTarget!=='pc')throw Error('APPROVED_SOURCE_IDENTITY_DRIFT');
  set('LIVE_PC_SOURCE_SHA',sha);
  try{execFileSync('git',['-C',root,'diff','--quiet','HEAD','--',
    'scripts/pc-writer/breadth-r10-v9-shadow/audit.mjs'],{windowsHide:true,timeout:12000,stdio:['ignore','ignore','ignore']});}
  catch{throw Error('APPROVED_AUDIT_WORKTREE_MODIFIED');}
  step('IMPORT_APPROVED_AUDIT');
  const module=await import(pathToFileURL(path.join(root,'scripts','pc-writer','breadth-r10-v9-shadow','audit.mjs')).href);
  if(typeof module.auditDay!=='function')throw Error('APPROVED_AUDIT_INTERFACE_MISSING');
  step('OPEN_PC_SQLITE_READ_ONLY');
  const db=new DatabaseSync(path.join(home,'storage','core.sqlite'),{readOnly:true});
  try{
    for(const name of Object.values(table)){
      if(!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name))throw Error('APPROVED_SOURCE_TABLE_MISSING');
    }
    for(const day of days){
      const prefix=`DAY_${day.replaceAll('-','_')}`;
      step(`INSPECT_${day}`);
      const u=db.prepare(`SELECT trade_date,members_json,member_count FROM ${table.universe} WHERE trade_date=?`).get(day);
      const price=readRows(db,table.current,day),history=readRows(db,table.history,day);
      const prev=db.prepare(`SELECT MAX(trade_date) AS d FROM ${table.universe} WHERE trade_date<?`).get(day)?.d??'NONE';
      const next=db.prepare(`SELECT MIN(trade_date) AS d FROM ${table.universe} WHERE trade_date>?`).get(day)?.d??'NONE';
      set(prefix+'_PRESENCE',{universe:!!u,currentRows:price.length,historyRows:history.length,previousUniverseDate:prev,nextUniverseDate:next});
      set(prefix+'_CURRENT_SOURCE',providerSummary(price));
      set(prefix+'_HISTORY_SOURCE',providerSummary(history));
      set(prefix+'_SOURCE_QUALIFICATION_FAILURES',qualificationSummary(price,day));
      let members;
      try{members=JSON.parse(u?.members_json);}catch{members=null;}
      if(!Array.isArray(members)){set(prefix+'_STATUS','UNIVERSE_NOT_STORED_OR_INVALID');save();continue;}
      set(prefix+'_UNIVERSE',{members:members.length,storedCount:u.member_count,unique:new Set(members).size});
      set(prefix+'_HISTORY_COMPARISON',lineageSummary(members,price,history));
      const audit=module.auditDay({date:day,universe:{trade_date:u.trade_date,member_count:u.member_count,members},priceRows:price,historyRows:history});
      set(prefix+'_AUDIT',{pass:audit.pass,eligible:audit.eligible,required:audit.required,reject:audit.reject});
      save();
    }
  }finally{db.close();}
  set('STATUS','READ_ONLY_COMPLETE');step('COMPLETE');
}
try{save();await execute();}catch(e){set('STATUS','FAILED');set('ERROR_CODE',errorCode(e));process.exitCode=1;}
finally{try{save();}catch{process.exitCode=2;}console.log(`R11_GAP_STATUS=${result.STATUS}`);console.log(`RESULT_FILE=${output}`);}
