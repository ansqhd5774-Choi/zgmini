// R13: all-candidate PC raw-manifest/SHA + shared-SPY NY15 coverage audit.
// Read-only and network-free. No score recomputation, raw changes or publishing.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {SPACE_CANDIDATES} from './theme-space-satellite-r12-provider-probe.mjs';
import {selectRealHourlySessions} from './theme-space-satellite-adaptive-r2.mjs';
import {readVerifiedSharedSpy} from './theme-shared-spy-readonly-r1.mjs';

const sha=body=>createHash('sha256').update(body).digest('hex');
const SOURCE='https://getmarkethistory.com';
const MODE='RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE';
const fail=(code)=>{throw Object.assign(new Error(code),{code});};
const need=(ok,code)=>{if(!ok)fail(code);};
const within=(base,real)=>{const r=path.relative(base,real);
 return r!==''&&r!=='..'&&!r.startsWith('..'+path.sep)&&!path.isAbsolute(r);};

export function auditSpaceUniverse({dataRoot,
  symbols=SPACE_CANDIDATES,spyReader=readVerifiedSharedSpy}={}){
  need(typeof dataRoot==='string'&&fs.existsSync(dataRoot),'R13_ROOT_MISSING');
  need(Array.isArray(symbols)&&symbols.length>0&&
    symbols.every(s=>typeof s==='string'&&/^[A-Z][A-Z0-9.-]{0,15}$/.test(s)&&s!=='SPY')&&
    new Set(symbols).size===symbols.length,'R13_SYMBOLS_INVALID');
  const root=fs.realpathSync(dataRoot),homePath=path.join(root,'themes','space-satellite');
  need(fs.existsSync(homePath),'R13_SPACE_HOME_MISSING');
  const home=fs.realpathSync(homePath);
  need(within(root,home),'R13_SPACE_HOME_ESCAPE');
  const manifestPath=path.join(home,'raw-manifest.json');
  need(fs.existsSync(manifestPath)&&fs.statSync(manifestPath).size<=2_000_000,
    'R13_MANIFEST_MISSING_OR_TOO_LARGE');
  need(within(home,fs.realpathSync(manifestPath)),'R13_MANIFEST_ESCAPE');
  const bytes=fs.readFileSync(manifestPath),manifest=JSON.parse(bytes);
  need(manifest.version===1&&manifest.themeId==='space-satellite'&&
    Array.isArray(manifest.files),'R13_MANIFEST_IDENTITY');
  const series=new Map(symbols.map(s=>[s,new Map()]));
  const rawFiles=new Map(symbols.map(s=>[s,0]));
  let ignoredOtherEntries=0;
  for(const entry of manifest.files){
    need(typeof entry?.path==='string'&&
      /^raw\/[A-Z][A-Z0-9.-]*_[a-f0-9]{64}\.jsonl$/.test(entry.path)&&
      /^[a-f0-9]{64}$/.test(entry.sha256??'')&&
      entry.path.endsWith(entry.sha256+'.jsonl'),'R13_MANIFEST_ENTRY_PATH');
    const ticker=entry.path.slice(4).split('_')[0];
    if(!series.has(ticker)){ignoredOtherEntries++;continue;}
    need(entry.source===SOURCE&&entry.priceMode===MODE,
      'R13_RAW_SOURCE_OR_MODE_INVALID');
    const file=path.join(home,entry.path);
    need(fs.existsSync(file)&&fs.statSync(file).size<=6_000_000,
      'R13_RAW_MISSING_OR_TOO_LARGE');
    const real=fs.realpathSync(file);
    need(within(home,real),'R13_RAW_PATH_ESCAPE');
    const raw=fs.readFileSync(real);
    need(sha(raw)===entry.sha256,'R13_RAW_SHA_MISMATCH');
    rawFiles.set(ticker,rawFiles.get(ticker)+1);
    let last='',count=0;
    for(const line of raw.toString('utf8').split(/\r?\n/)){
      if(!line)continue;
      count++;need(count<=5000,'R13_RAW_ROWS_OVER_5000');
      const row=JSON.parse(line);
      need(row.symbol===ticker&&typeof row.timestamp==='string'&&
        Number.isFinite(Date.parse(row.timestamp))&&
        typeof row.close==='number'&&Number.isFinite(row.close)&&row.close>0&&
        (!last||row.timestamp>last),'R13_RAW_BAR_INVALID');
      last=row.timestamp;
      if(row.is_gap===true)continue;
      const prev=series.get(ticker).get(row.timestamp);
      need(!prev||prev.close===row.close,'R13_OVERLAP_CLOSE_CONFLICT');
      series.get(ticker).set(row.timestamp,row);
    }
  }
  const spy=spyReader({dataRoot,sourceTheme:'data-center-power'});
  need(Array.isArray(spy?.bars)&&spy.bars.length>0,
    'R13_SHARED_SPY_SOURCE_NOT_VERIFIED');
  const spySessions=selectRealHourlySessions(spy.bars);
  const spyDates=new Set(spySessions.map(x=>x.date));
  const lastSpyDate=spySessions.at(-1)?.date??null;
  const rows=symbols.map(ticker=>{
    const bars=[...series.get(ticker).values()].sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
    const sessions=selectRealHourlySessions(bars);
    const common=sessions.filter(x=>spyDates.has(x.date));
    const n=common.length;
    const stage=rawFiles.get(ticker)===0?'NO_LOCAL_RAW':n<40?
      'PRIVATE_SHA_AUDITED_UNDER_40':n<628?
      'PRIVATE_SHA_AUDITED_40_OR_MORE':'PRIVATE_SHA_AUDITED_628_OR_MORE';
    return {ticker,stage,rawFiles:rawFiles.get(ticker),
      nonGapHourlyRows:bars.length,ny15ProxyDates:sessions.length,
      spyCommonNy15Dates:n,lastEtfNy15Date:sessions.at(-1)?.date??null,
      spyLastNy15Date:lastSpyDate,
      latestDatesAgree:sessions.at(-1)?.date===lastSpyDate&&lastSpyDate!==null,
      rawShaAudited:rawFiles.get(ticker)>0,
      // Meeting the date threshold alone is NOT a score or publication pass.
      r2ScoringVerified:false};
  });
  return {report:'SPACE_SATELLITE_R13_EXISTING_PC_UNIVERSE_RAW_AUDIT',
    status:'PRIVATE_READ_ONLY_SHA_AND_COMMON_DATES_ONLY',
    sourceManifestSha256:sha(bytes),sharedSpySource:spy.sourceTheme??'data-center-power',
    sharedSpyManifestSha256:spy.manifestSha256??null,
    sharedSpyNy15Dates:spySessions.length,
    candidateCount:rows.length,ignoredOtherEntries,records:rows,
    rightsVerified:false,finalBasketSelected:false,publicationAuthorized:false,
    r2ScoresVerified:false,providerCalls:0,rawFilesWritten:0,
    publicWrites:0,d1Writes:0,schedulerWrites:0};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.slice(2).join(' ')!=='--audit'){
    console.log('READ_ONLY_DEFAULT: --audit; no provider, no writes; reads existing ETF raw SHA + shared SPY');
  }else try{
    const result=auditSpaceUniverse({dataRoot:process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data'});
    console.log(JSON.stringify(result,null,2));
  }catch(error){
    console.error(JSON.stringify({report:'SPACE_SATELLITE_R13_EXISTING_PC_UNIVERSE_RAW_AUDIT',
      status:'BLOCKED',reason:error.code??'R13_UNCLASSIFIED',
      providerCalls:0,rawFilesWritten:0,publicWrites:0,d1Writes:0,schedulerWrites:0}));
    process.exitCode=1;
  }
}
