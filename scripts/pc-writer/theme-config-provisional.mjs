// Generic saved-only provisional adapter. Uses the exact approved R25/R32
// functions and existing audited EOD decoder, without a fixed theme roster.
import fs from 'node:fs';
import path from 'node:path';
import {readRegistered,safeDirectory,digest,ensure} from './theme-config-registry.mjs';
import {readConfiguredEvidence,readConfiguredSessions,scoreConfiguredR32Sessions} from './theme-config-score.mjs';
import {preflightConfiguredPublication} from './theme-config-publication-preflight.mjs';
import {publishPreparedConfiguredThemeD1} from './theme-config-publication-d1.mjs';
import {readNineR45SavedDates,normalizeSavedParquetDate} from './theme-nine-r45-private-eod-feed.mjs';
import {CONFIGURED_PROVISIONAL_MODE} from '../../worker/theme-configured-r32-contract.mjs';
export function configuredProvisionalCandidate({definition,sessions,aum,confirmed,rows,hashes,sourceStoredAt,prior=null}){
 const anchor=confirmed.observationDate;
 const dates=[...rows.keys()].sort();ensure(dates.length===2&&dates[0]===anchor&&dates[1]>anchor,'CONFIG_PROVISIONAL_DATES');
 const target=dates[1],symbols=[...definition.etfs,definition.benchmark];
 const series=new Map(dates.map(date=>{
  const found=new Map();
  for(const row of rows.get(date)){
   const symbol=typeof row?.symbol==='string'?row.symbol.toUpperCase():null;if(!symbols.includes(symbol))continue;
   ensure(!found.has(symbol)&&normalizeSavedParquetDate(row.date??row.timestamp)===date&&typeof row.close==='number'&&Number.isFinite(row.close)&&row.close>0&&(!row.asset_type||String(row.asset_type).toLowerCase()==='etf'),'CONFIG_PROVISIONAL_ROW');found.set(symbol,row.close);
  }
  ensure(/^[a-f0-9]{64}$/.test(hashes.get(date)),'CONFIG_PROVISIONAL_SOURCE_SHA');return [date,found];
 }));
 const overlaps={},extended=new Map(),missing=new Set();
 for(const symbol of symbols){
  const history=sessions.get(symbol)??[],raw=history.find(p=>p.date===anchor)?.close;
  const overlap=series.get(anchor).get(symbol),next=series.get(target).get(symbol);
  if(!(raw>0&&overlap>0&&next>0)){
   ensure(symbol!==definition.benchmark,'CONFIG_PROVISIONAL_SPY_MISSING');missing.add(symbol);extended.set(symbol,history);continue;
  }
  const delta=Math.abs(overlap/raw-1);ensure(delta<=0.05,'CONFIG_PROVISIONAL_PRICE_MODE_DIFFERENCE');overlaps[symbol]=delta;
  ensure(history.at(-1)?.date<=anchor,'CONFIG_PROVISIONAL_CONFIRMED_INPUT_AHEAD');
  extended.set(symbol,[...history,{date:target,close:next}]);
 }
 const calculated=scoreConfiguredR32Sessions({definition,sessions:extended,aum:Object.fromEntries(aum.rows.map(r=>[r.ticker,r])),allowDatedOfficialAum:aum.datedOfficialAumApproved});
 const latest=calculated.history.at(-1);ensure(latest.date===target&&latest.score!==null,'CONFIG_PROVISIONAL_SCORE_PENDING');
 for(const ticker of missing)ensure(!latest.contributingETFs.includes(ticker),'CONFIG_PROVISIONAL_MISSING_USED');
 const history=prior?.history??[];const existing=history.find(p=>p.date===target);
 ensure(!existing||JSON.stringify(existing)===JSON.stringify(latest),'CONFIG_PROVISIONAL_SAME_DATE_CHANGED');
 ensure(!history.length||history.at(-1).date<=target,'CONFIG_PROVISIONAL_NEWER_PRESERVED');
 const sourceFiles=dates.map(date=>({date,sha256:hashes.get(date)}));
 return {...confirmed,phase:'PROVISIONAL',confirmedObservationDate:anchor,observationDate:target,score:latest.score,
  history:(existing?history:[...history,latest]).slice(-252),sourceFiles,sourceStoredAt,
  sourceVersion:'R32_PROVISIONAL_SHA256_'+digest(JSON.stringify({baseline:confirmed.sourceVersion,sourceFiles,definition:confirmed.definitionSha256})),
  sourcePriceMode:CONFIGURED_PROVISIONAL_MODE,sourcePriceReconciled:false,overlapPriceDifferences:overlaps};
}
export async function publishConfiguredProvisional({dataRoot,id,query,now=Date.now(),decoder=null}={}){
 const r=readRegistered(dataRoot,id);if(r.definition.schema!=='ZGMINI_THEME_CONFIG_V2')return {status:'LEGACY_V1_UNCHANGED',written:0};
 const prepared=preflightConfiguredPublication({dataRoot,id,now});ensure(prepared.status==='PREFLIGHT_PASS_NO_REMOTE_ACCESS',prepared.reason??'CONFIG_PROVISIONAL_PREFLIGHT');
 const confirmedKey='theme-configured:'+id,select="SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'";
 const current=(await query(select,[confirmedKey],{write:false}))?.results?.[0];
 ensure(current,'CONFIG_PROVISIONAL_CONFIRMED_NOT_PUBLISHED');
 const visible=JSON.parse(current.body);ensure(visible.definitionSha256===r.sha256&&visible.observationDate===prepared.candidate.observationDate&&visible.score===prepared.candidate.score,'CONFIG_PROVISIONAL_CONFIRMED_IDENTITY');
 const dir=safeDirectory(dataRoot,'theme-market-history-r131/marketparquet-r165');
 const pending=fs.readdirSync(dir).flatMap(n=>{const m=/^etf_daily_(\d{4}-\d{2}-\d{2})\.parquet$/.exec(n);return m&&m[1]>visible.observationDate?[m[1]]:[];}).sort();
 if(!pending.length)return {status:'WAIT_PROVISIONAL_SOURCE',written:0};
 const target=pending[0]; // next actual saved session; never invent today's price.
 const saved=await readNineR45SavedDates({dataRoot,dates:[visible.observationDate,target],decoder});
 const key='theme-configured-provisional:'+id,old=(await query(select,[key],{write:false}))?.results?.[0];
 const prior=old?JSON.parse(old.body):null;
 if(prior)ensure(prior.definitionSha256===r.sha256&&prior.methodologyVersion===r.definition.profile,'CONFIG_PROVISIONAL_PRIOR_IDENTITY');
 const {sessions}=readConfiguredSessions({dataRoot,registration:r});
 const candidate=configuredProvisionalCandidate({definition:r.definition,sessions,aum:readConfiguredEvidence(dataRoot,r.definition.aumEvidence),confirmed:prepared.candidate,rows:saved.rows,hashes:saved.hashes,sourceStoredAt:saved.sourceStoredAt,prior});
 const home=safeDirectory(dataRoot,'themes/'+r.internalId+'/derived');
 const bytes=Buffer.from(JSON.stringify(candidate,null,2)+'\n'),candidateSha256=digest(bytes),file=path.join(home,'provisional-'+candidateSha256+'.json');
 if(!fs.existsSync(file))fs.writeFileSync(file,bytes,{flag:'wx'});
 ensure(digest(fs.readFileSync(file))===candidateSha256,'CONFIG_PROVISIONAL_ARTIFACT_SHA');
 // Candidate hash points at the immutable calculation before the publication
 // envelope adds that hash, as in the existing confirmed publisher.
 const record={...candidate,candidateSha256};
 return publishPreparedConfiguredThemeD1({query,now,expectedStoredAt:old?Number(old.stored_at):null,
  preflight:{...prepared,feedKey:key,candidateSha256,observationDate:record.observationDate,sourceStoredAt:record.sourceStoredAt,candidate:record}});
}
