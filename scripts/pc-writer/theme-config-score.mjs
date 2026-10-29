// Registered pair adapter, reusing approved pure scorers without modifying them.
import fs from 'node:fs';
import path from 'node:path';
import {selectRealHourlySessions} from './theme-space-satellite-adaptive-r2.mjs';
import {scoreAdaptiveTimeline} from './theme-optional-adaptive-r2.mjs';
import {adaptivePairWeights} from './theme-optional-pair-weight-r3.mjs';
import {ensure,digest,safeDirectory} from './theme-config-registry.mjs';
export function scoreRegistered({dataRoot,registration}){
 const {definition:d,internalId}=registration,symbols=[...d.etfs,'SPY'];
 const home=safeDirectory(dataRoot,'themes/'+internalId),manifestFile=path.join(home,'raw-manifest.json');
 ensure(fs.lstatSync(manifestFile).isFile()&&!fs.lstatSync(manifestFile).isSymbolicLink(),'CONFIG_MANIFEST_REDIRECT');
 const bytes=fs.readFileSync(manifestFile),manifest=JSON.parse(bytes);
 ensure(manifest.version===1&&manifest.themeId===internalId&&Array.isArray(manifest.files),'CONFIG_MANIFEST_IDENTITY');
 const tables=Object.fromEntries(symbols.map(s=>[s,new Map()]));
 for(const f of manifest.files){
  const match=/^raw\/([A-Z]{1,6})_([a-f0-9]{64})\.jsonl$/.exec(f.path??'');
  ensure(match&&symbols.includes(match[1])&&match[2]===f.sha256,'CONFIG_RAW_PATH');
  ensure(f.source==='https://getmarkethistory.com'&&f.priceMode==='RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE','CONFIG_RAW_MODE');
  const raw=safeDirectory(home,'raw'),file=path.join(raw,path.basename(f.path));
  ensure(fs.lstatSync(file).isFile()&&!fs.lstatSync(file).isSymbolicLink(),'CONFIG_RAW_REDIRECT');
  const data=fs.readFileSync(file);ensure(digest(data)===f.sha256,'CONFIG_RAW_SHA');
  let previous='';
  for(const row of data.toString('utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse)){
   ensure(row.symbol===match[1]&&typeof row.timestamp==='string'&&Number.isFinite(Date.parse(row.timestamp))&&typeof row.close==='number'&&Number.isFinite(row.close)&&row.close>0&&(!previous||row.timestamp>previous),'CONFIG_RAW_BAR');
   previous=row.timestamp;if(row.is_gap===true)continue;
   const old=tables[row.symbol].get(row.timestamp);ensure(!old||old.close===row.close,'CONFIG_PRICE_REVISION');
   tables[row.symbol].set(row.timestamp,row);
  }
 }
 const daily=Object.fromEntries(symbols.map(s=>[s,new Map(selectRealHourlySessions([...tables[s].values()].sort((a,b)=>a.timestamp.localeCompare(b.timestamp))).map(r=>[r.date,r.close]))]));
 const dates=[...new Set(symbols.flatMap(s=>[...daily[s].keys()]))].sort();
 ensure(!dates.length||dates.at(-1)<='2028-12-31','CONFIG_EARLY_CLOSE_CALENDAR_REVIEW');
 const timelines=d.etfs.map(s=>scoreAdaptiveTimeline(dates.map(date=>({date,own:daily[s].get(date)??null,spy:daily.SPY.get(date)??null}))));
 const counts=[0,0];
 const history=dates.map((date,i)=>{
  d.etfs.forEach((s,j)=>{if(daily[s].has(date)&&daily.SPY.has(date))counts[j]++;});
  const [a,b]=timelines.map(t=>t[i]);let weights=null;
  if(a.score!==null&&b.score!==null)try{weights=adaptivePairWeights({firstSessions:counts[0],secondSessions:counts[1],firstStatus:a.status,secondStatus:b.status});}
  catch(e){if(e.message!=='THEME_R3_UNAPPROVED_PAIR_OR_INCOMPLETE_SOURCE')throw e;}
  return {date,score:weights?Number((a.score*weights.first+b.score*weights.second).toFixed(5)):null,
   status:!weights?'INSUFFICIENT_OR_UNAPPROVED_PAIR':a.status==='R188_COMPATIBLE'&&b.status==='R188_COMPATIBLE'?'R188_COMPATIBLE':'ADAPTIVE_PROVISIONAL',weights};
 }).slice(-252);
 const last=history.at(-1);
 return {version:'ZGMINI_CONFIGURED_THEME_PRIVATE_V1',themeId:d.id,label:d.label,etfs:d.etfs,benchmark:'SPY',profile:d.profile,
  definitionSha256:registration.sha256,sourceVersion:'GMH_MANIFEST_SHA256_'+digest(bytes),
  status:last?.score!=null?'PRIVATE_SCORE_READY':'PRIVATE_HISTORY_PENDING',observationDate:last?.date??null,score:last?.score??null,history,
  publicationAuthorized:false,d1Writes:0,schedulerWrites:0};
}
