// R75: read-only, date-specific audit of the existing ten public themes.
// No price bytes, token, D1 body, personal account, or full path is exported.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const DATA='E:/ZGmini/data';
const API='https://zgmini.kr/api/theme-fear-greed/';
const SYMBOLS=['SPY','UFO','NASA','WARP','ROKT','IBB','XBI','DTCR','GRID'];
const DAYS=['2026-10-27','2026-10-28'];
const D1_KEYS=['theme-legacy-nine-r37','theme-space-satellite-r2',
  'theme-biotech-optional-r2','theme-data-center-power-r1'];
const TASKS=['ZGMINI-PC-Theme-Nine-R47-Private','ZGMINI-PC-Theme-Nine-R54-Public',
  'ZGMINI-PC-Theme-Biotech','ZGMINI-PC-Theme-Data-Center-Power'];
const SHA=v=>createHash('sha256').update(v).digest('hex');
const date=v=>typeof v==='string'&&/^20\d\d-\d\d-\d\d$/.test(v)?v:null;
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const lastDate=history=>Array.isArray(history)?date(history.at(-1)?.date):null;
const safeJson=file=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}};

export function summarizePublic(body){
  return {status:body?.status??null,modelRevision:body?.modelRevision??null,
    methodologyVersion:body?.methodologyVersion??null,
    confirmedDate:date(body?.confirmedObservationDate),
    sourceStoredAt:body?.sourceStoredAt??null,
    provisionalDates:body?.provisional?.points?.map(p=>date(p.date))??[],
    themes:(body?.themes??[]).map(t=>({theme:t.theme,
      confirmedHistoryLastDate:lastDate(t.history),
      historyLength:Array.isArray(t.history)?t.history.length:0,
      provisionalDates:body?.provisional?.points?.filter(p=>
        Object.hasOwn(obj(p.scores),t.theme)).map(p=>date(p.date))??[]}))};
}

export function summarizeManifest(file){
  const doc=safeJson(file);
  if(!doc)return {status:fs.existsSync(file)?'INVALID_JSON':'NOT_FOUND'};
  const files=Array.isArray(doc.files)?doc.files:[];
  return {status:'READ_ONLY',fileCount:files.length,
    symbols:SYMBOLS.map(symbol=>{
      const rows=files.filter(f=>f.symbol===symbol||
        typeof f.path==='string'&&f.path.startsWith(`raw/${symbol}_`));
      return {symbol,files:rows.length,
        latestSession:rows.map(f=>date(f.lastVerifiedNYDay)||
          date(f.observationThrough)).filter(Boolean).sort().at(-1)??null,
        datesInWindow:DAYS.map(day=>({date:day,
          manifestEntries:rows.filter(f=>
            f.lastVerifiedNYDay===day||f.observationThrough===day).length}))};
    })};
}

function latestMetadata(dir,pattern){
  if(!fs.existsSync(dir))return {status:'DIRECTORY_MISSING',files:[]};
  const files=fs.readdirSync(dir).filter(name=>pattern.test(name))
    .map(name=>({name,file:path.join(dir,name)}))
    .filter(x=>fs.lstatSync(x.file).isFile())
    .sort((a,b)=>fs.statSync(b.file).mtimeMs-fs.statSync(a.file).mtimeMs)
    .slice(0,5).map(x=>({name:x.name,
      modifiedAt:fs.statSync(x.file).mtime.toISOString(),
      metadata:(()=>{const value=safeJson(x.file);return value?{
        status:value.status??null,
        observationDate:date(value.observationDate)||date(value.benchmarkDate)||null,
        verifiedSpyDay:date(value.lastVerifiedSpyNYDay)||
          date(value.latestSeenSpyNYDay)||null,
        providerCalls:value.providerCalls??null,
        dataOutcome:value.dataOutcome??null,
        themeCount:value.counts?.themes??null}:null;})()}));
  return {status:files.length?'FOUND':'NO_MATCH',files};
}

function readTaskSummary(spawn=spawnSync){
  return TASKS.map(name=>{
    const r=spawn('schtasks',['/Query','/TN',name,'/XML'],
      {encoding:null,windowsHide:true,timeout:15000,maxBuffer:1024*1024});
    const raw=Buffer.from(r.stdout??'');
    const xml=r.status===0?(raw[0]===0xff&&raw[1]===0xfe?
      raw.toString('utf16le'):raw.toString('utf8')):'';
    return {name,queryExit:r.status??null,
      expectedTaskExists:r.status===0,
      triggerCount:(xml.match(/<CalendarTrigger>/gi)??[]).length,
      taskEnabled:/<Enabled>true<\/Enabled>/i.test(xml),
      hasExec:/<Exec>/i.test(xml),
      actionMentionsApprovedThemeNine:
        name.includes('Theme-Nine')?xml.includes('THEME_NINE_R'):null};
  });
}

async function readPublic(fetchImpl,now){
  try{
    const res=await fetchImpl(`${API}?r75=${now}`,{
      headers:{accept:'application/json','cache-control':'no-cache'},
      signal:AbortSignal.timeout(20000)});
    if(!res.ok)return {status:'HTTP_'+res.status};
    return summarizePublic(await res.json());
  }catch{return {status:'FETCH_FAILED'};}
}

async function readProvider(fetchImpl){
  return await Promise.all(SYMBOLS.map(async symbol=>{
    try{
      const url=`https://getmarkethistory.com/api/v1/bars/stocks/${symbol}/1h?start=2026-10-27&end=2026-10-29&format=jsonl`;
      const response=await fetchImpl(url,{signal:AbortSignal.timeout(20000)});
      if(!response.ok)return {symbol,status:'HTTP_'+response.status};
      const text=await response.text();
      const counts=Object.fromEntries(DAYS.map(d=>[d,0]));
      for(const line of text.split(/\r?\n/).filter(Boolean)){
        const d=JSON.parse(line)?.timestamp?.slice(0,10);
        if(Object.hasOwn(counts,d))counts[d]++;
      }
      return {symbol,status:'HTTP_200',rowsByUTCDate:counts,
        dataThrough:response.headers.get('x-data-through')??null};
    }catch{return {symbol,status:'FETCH_OR_PARSE_FAILED'};}
  }));
}

async function readD1(dataRoot){
  const home=path.join(dataRoot,'pc-writer','theme-nine-r54','scripts','pc-writer');
  const client=path.join(home,'theme-nine-r54-d1-client.mjs');
  const token=path.join(home,'theme-biotech-auth-r7.mjs');
  if(!fs.existsSync(client)||!fs.existsSync(token))
    return {status:'EXISTING_D1_CLIENT_NOT_INSTALLED',records:[]};
  try{
    const [{createNineR54D1Query},{biotechCloudflareTokenR7}]=await Promise.all([
      import(pathToFileURL(client).href),import(pathToFileURL(token).href)]);
    const query=createNineR54D1Query({dataRoot,tokenFn:biotechCloudflareTokenR7});
    const placeholders=D1_KEYS.map(()=>'?').join(',');
    const sql=`SELECT feed_key,body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND snapshot_key='current' AND feed_key IN (${placeholders})`;
    const result=await query(sql,D1_KEYS,{write:false});
    const rows=Array.isArray(result.results)?result.results:[];
    return {status:'D1_READ_ONLY_OK',records:D1_KEYS.map(key=>{
      const row=rows.find(r=>r.feed_key===key);
      const data=row?JSON.parse(row.body):null;
      return {key,exists:!!row,storedAt:row?.stored_at??null,
        version:data?.version??null,confirmedDate:date(data?.observationDate),
        sourceStoredAt:data?.sourceStoredAt??null,
        historyLast:date(data?.history?.at(-1)?.date)||
          date(data?.themes?.at(0)?.history?.at(-1)?.date)||null,
        status:data?.status??null};
    })};
  }catch(error){return {status:'D1_READ_NOT_VERIFIED',reason:
    /^THEME_[A-Z0-9_]+$/.test(error?.code??'')?error.code:'AUTH_OR_QUERY_FAILED',
    records:[]};}
}

export async function runR75Audit({dataRoot=DATA,fetchImpl=fetch,
  spawn=spawnSync,platform=process.platform,now=Date.now()}={}){
  if(platform!=='win32')throw Error('R75_WINDOWS_PC_REQUIRED');
  const r48=path.join(dataRoot,'pc-writer','theme-nine-r48');
  const privateRoot=path.join(dataRoot,'themes','legacy-nine-r47-private');
  const candidates=path.join(dataRoot,'themes','legacy-nine-r48-private-candidate');
  const existingR47=path.join(r48,'THEME_NINE_R47_RECURRING_PRIVATE_UPDATE.cmd');
  const fileSha=fs.existsSync(existingR47)?SHA(fs.readFileSync(existingR47)):null;
  return {report:'R75_EXISTING_TEN_THEME_READ_ONLY_FIRST_MISSING',
    inspectedAt:new Date(now).toISOString(),
    approvedDates:DAYS,restrictedThemes:['우주·위성','바이오·신약','데이터센터·전력'],
    installedR47Sha256:fileSha,
    sourceManifest:{nineR32:summarizeManifest(path.join(dataRoot,'themes',
      'legacy-nine-r35-delta','raw-manifest.json')),
      space:summarizeManifest(path.join(dataRoot,'themes','space-satellite','raw-manifest.json')),
      biotech:summarizeManifest(path.join(dataRoot,'themes','biotech','raw-manifest.json')),
      dcPower:summarizeManifest(path.join(dataRoot,'themes','data-center-power','raw-manifest.json'))},
    privateResults:{r47:latestMetadata(privateRoot,/^THEME_NINE_R47_PRIVATE_.*_NINE\.json$/),
      r48:latestMetadata(candidates,/^THEME_NINE_R48_PRIVATE_CANDIDATE_.*\.json$/)},
    taskInventory:readTaskSummary(spawn),
    sourceLive:await readProvider(fetchImpl),
    d1:await readD1(dataRoot),
    publicApi:await readPublic(fetchImpl,now),
    privateFileWrites:0,d1Writes:0,taskWrites:0,scoreWrites:0,
    conclusion:'READ_ONLY_EVIDENCE_NOT_OPERATIONAL_RECOVERY'};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    if(process.argv.length!==3||process.argv[2]!=='--audit')throw Error('R75_USAGE');
    console.log(JSON.stringify(await runR75Audit(),null,2));
  }catch(error){console.log(JSON.stringify({report:'R75_READ_ONLY_FAILED',
    reason:error?.message??'UNEXPECTED',privateFileWrites:0,d1Writes:0,
    taskWrites:0}));process.exitCode=1;}
}
