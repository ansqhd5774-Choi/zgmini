// R47: recurring private 1h price refresh for the *existing* approved nine themes.
// Resumes frozen R35 windows, then advances from the last real SPY day. No ETF,
// formula, registry, task, D1 or public-site mutation; no licensed data export.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {auditNineR34RefreshPreflight} from './theme-nine-r34-refresh-preflight.mjs';
import {collectNineR35Delta, collectNineR35Auto} from './theme-nine-r35-delta-collect.mjs';

const fail = code => {throw Object.assign(new Error('THEME_NINE_R47_'+code),
  {code:'THEME_NINE_R47_'+code});};
const sha = data => createHash('sha256').update(data).digest('hex');
const goodDate = d => typeof d==='string' && /^\d{4}-\d{2}-\d{2}$/.test(d) &&
  !Number.isNaN(Date.parse(d+'T00:00:00Z')) &&
  new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
const addDays = (date, days) => new Date(Date.parse(date+'T00:00:00Z')+
  days*86_400_000).toISOString().slice(0,10);
const ny = new Intl.DateTimeFormat('en-US', {timeZone:'America/New_York',
  year:'numeric',month:'2-digit',day:'2-digit'});
function nyDate(instant) {
  const parts=Object.fromEntries(ny.formatToParts(instant)
    .filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
const read = filename => JSON.parse(fs.readFileSync(filename,'utf8'));
function inside(root,target) {
  const rel=path.relative(root,target);
  return Boolean(rel)&&rel!=='..'&&!rel.startsWith('..'+path.sep)&&
    !path.isAbsolute(rel);
}

function verifyDeltaState(home, name, rosterSha, symbols, manifest) {
  if(!/^delta-[a-f0-9]{20}\.json$/.test(name)) fail('CHECKPOINT_NAME_INVALID');
  const state=read(path.join(home,'state',name));
  if(state.version!==1||state.project!=='legacy-nine-r35-delta'||
     state.rosterSha256!==rosterSha||!goodDate(state.start)||!goodDate(state.end)||
     state.end<=state.start||
     name!==`delta-${sha(JSON.stringify({roster:rosterSha,start:state.start,end:state.end})).slice(0,20)}.json`||
     !state.symbols||Object.keys(state.symbols).length!==symbols.length||
     symbols.some(s=>!Object.hasOwn(state.symbols,s)))fail('CHECKPOINT_IDENTITY');
  const indexed=new Map(manifest.files.map(e=>[e.path,e]));
  for(const symbol of symbols) {
    const s=state.symbols[symbol];
    if(!s||!Array.isArray(s.files)||typeof s.complete!=='boolean'||
       s.files.some(f=>indexed.get(f.path)?.symbol!==symbol||
         indexed.get(f.path)?.sha256!==f.sha256)||
       (s.complete&&!s.files.length&&!s.noBars))fail('CHECKPOINT_PAGE_REFERENCES');
    for(const f of s.files) {
      const entry=indexed.get(f.path);
      let requested;
      try{requested=new URL(f.requestedUrl??entry.requestedUrl);}catch{fail('PAGE_REQUEST_IDENTITY');}
      if(requested.origin!=='https://getmarkethistory.com'||
         requested.pathname!==`/api/v1/bars/stocks/${symbol}/1h`||
         requested.searchParams.get('start')!==state.start||
         requested.searchParams.get('end')!==state.end||
         requested.searchParams.get('format')!=='jsonl'||
         entry.priceMode!=='RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE'||
         entry.schemaVersion!=='GMH_1H_OHLCV_NDJSON_R35')fail('PAGE_REQUEST_IDENTITY');
    }
  }
  const spy=state.symbols.SPY;
  const spyDay=spy.files.map(f=>indexed.get(f.path)?.lastVerifiedNYDay)
    .filter(goodDate).at(-1)??null;
  return {start:state.start,end:state.end,completed:symbols.every(s=>state.symbols[s].complete),
    failure:state.failedAt?state.failure??'UNKNOWN_FAILED_REQUEST':null,
    spyDay, name};
}

export function planNineR47Recurring({dataRoot,rosterPath,now=new Date(),
  maximumWindowDays=7}={}) {
  if(!(now instanceof Date)||Number.isNaN(now.getTime())||
     !Number.isInteger(maximumWindowDays)||maximumWindowDays<2||
     maximumWindowDays>14)fail('ARGUMENTS');
  const baseline=auditNineR34RefreshPreflight({dataRoot,rosterPath});
  const cutoff=addDays(nyDate(now),-1); // never score an unfinished New York day
  const roster=read(rosterPath);
  const symbols=['SPY',...[...new Set(roster.groups.flatMap(g=>g.tickers.map(t=>t.ticker)))]
    .filter(s=>s!=='SPY').sort()];
  if(symbols.length!==64)fail('ROSTER_IDENTITY');
  const result={contract:'THEME_NINE_R47_RECURRING_PRIVATE_PLAN_V1',
    source:'GETMARKETHISTORY_1H_RAW_UNADJUSTED',latestBaselineSpyNYDay:baseline.latestSpyNYDay,
    cutoffNYDay:cutoff,priceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',
    approvedETFs:63,approvedPositions:64,themes:9,
    existingFormulaUnchanged:true,publicationAuthorized:false,
    providerCalls:0,baseRawWrites:0,d1Writes:0,schedulerWrites:0,publicationWrites:0};
  if(cutoff<=baseline.latestSpyNYDay)return {...result,status:'WAIT_CLOSED_NY_DATE',window:null,
    verifiedCompletedWindows:[]};
  const root=fs.realpathSync(dataRoot);
  const home=path.join(root,'themes','legacy-nine-r35-delta');
  if(!fs.existsSync(home))return {...result,status:'READY_NEW_WINDOW',verifiedCompletedWindows:[],
    window:{start:baseline.latestSpyNYDay,
      end:[cutoff,addDays(baseline.latestSpyNYDay,maximumWindowDays)].sort()[0]},
    previousWindow:null};
  const actual=fs.realpathSync(home);
  if(!inside(root,actual))fail('DELTA_ROOT_ESCAPE');
  const manifest=read(path.join(actual,'raw-manifest.json'));
  if(manifest.version!==1||manifest.project!=='legacy-nine-r35-delta'||
     manifest.rosterSha256!==baseline.rosterSha256||
     manifest.source!=='https://getmarkethistory.com'||
     manifest.licenseStatus!=='PRIVATE_RESEARCH_ONLY_PUBLICATION_NOT_APPROVED'||
     !Array.isArray(manifest.files))fail('DELTA_MANIFEST_IDENTITY');
  const paths=new Set();
  for(const entry of manifest.files) {
    if(typeof entry.path!=='string'||
       !/^raw\/[A-Z][A-Z0-9.]{0,11}_[a-f0-9]{64}\.jsonl$/.test(entry.path)||
       paths.has(entry.path)||!symbols.includes(entry.symbol)||
       entry.path!==`raw/${entry.symbol}_${entry.sha256}.jsonl`)fail('DELTA_PAGE_IDENTITY');
    paths.add(entry.path);
    const actualPage=fs.realpathSync(path.join(actual,entry.path));
    if(!inside(actual,actualPage)||sha(fs.readFileSync(actualPage))!==entry.sha256)
      fail('DELTA_PAGE_SHA');
  }
  const states=fs.readdirSync(path.join(actual,'state'))
    .filter(n=>n.startsWith('delta-')&&n.endsWith('.json'))
    .map(n=>verifyDeltaState(actual,n,baseline.rosterSha256,symbols,manifest));
  if(!states.length)fail('DELTA_MANIFEST_WITHOUT_STATE');
  let remaining=[...states],anchor=baseline.latestSpyNYDay,prior=null;
  const verifiedCompletedWindows=[];
  while(remaining.length) {
    const choices=remaining.filter(s=>s.start===anchor);
    if(choices.length!==1)fail('CHAIN_AMBIGUOUS_OR_ORPHANED');
    const state=choices[0];
    remaining=remaining.filter(s=>s!==state);
    if(prior&&state.end<=prior.end)fail('CHAIN_WINDOW_NOT_ADVANCING');
    if(state.failure)fail('PRIOR_PROVIDER_FAILURE_REVIEW_REQUIRED');
    if(!state.completed) {
      if(remaining.length)fail('CHAIN_AFTER_INCOMPLETE_WINDOW');
      return {...result,status:'RESUME_FROZEN_WINDOW',window:{start:state.start,end:state.end},
        verifiedCompletedWindows,
        previousWindow:prior&&{start:prior.start,end:prior.end}};
    }
    if(!goodDate(state.spyDay)||state.spyDay<=anchor||state.spyDay>state.end)
      fail('CHAIN_SPY_DAY_NOT_ADVANCING');
    anchor=state.spyDay;
    verifiedCompletedWindows.push({start:state.start,end:state.end,
      spyDay:state.spyDay,stateFile:state.name});
    prior=state;
  }
  if(prior.end>=cutoff)return {...result,status:'WAIT_WINDOW_ALREADY_CHECKED',
    window:null,lastCompletedWindow:{start:prior.start,end:prior.end},
    verifiedCompletedWindows,
    lastVerifiedSpyNYDay:anchor};
  const nextEnd=[cutoff,addDays(prior.end,maximumWindowDays)].sort()[0];
  if(nextEnd<=anchor)fail('CHAIN_NEXT_WINDOW_NOT_FORWARD');
  return {...result,status:'READY_NEW_WINDOW',verifiedCompletedWindows,
    window:{start:anchor,end:nextEnd},
    previousWindow:{start:prior.start,end:prior.end},
    lastVerifiedSpyNYDay:anchor};
}

export async function runNineR47Recurring({auto=true,fetchImpl=fetch,sleep,
  maxBatches,maximumWindowDays,dataRoot,rosterPath,now}={}) {
  const plan=planNineR47Recurring({dataRoot,rosterPath,now,maximumWindowDays});
  if(!plan.window)return plan;
  const args={dataRoot,rosterPath,...plan.window,previousWindow:plan.previousWindow,fetchImpl};
  const collection=auto?await collectNineR35Auto({...args,
    ...(sleep?{sleep}:{}),...(maxBatches?{maxBatches}:{})}):
    await collectNineR35Delta(args);
  return {contract:'THEME_NINE_R47_RECURRING_PRIVATE_EXECUTION_V1',
    status:collection.status,planned:plan.status,window:plan.window,
    previousWindow:plan.previousWindow,
    providerCalls:collection.totalProviderCalls??collection.providerCalls,
    rawFilesStored:collection.totalRawFilesStored??collection.rawFilesStored,
    completedSymbols:collection.completedSymbols,
    source:plan.source,priceMode:plan.priceMode,
    immutableR23:true,existingFormulaUnchanged:true,publicationAuthorized:false,
    d1Writes:0,schedulerWrites:0,publicationWrites:0};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    if(process.argv.length!==3||!['--plan','--run-private','--batch-private'].includes(process.argv[2]))
      fail('USAGE');
    const dataRoot=process.env.ZGMINI_DATA_ROOT||'E:/ZGmini/data';
    const rosterPath=process.env.ZGMINI_R47_ROSTER_PATH||path.join(path.dirname(
      fileURLToPath(import.meta.url)),'theme-nine-r20-approved-candidates.json');
    const mode=process.argv[2];
    const result=mode==='--plan'?planNineR47Recurring({dataRoot,rosterPath}):
      await runNineR47Recurring({dataRoot,rosterPath,auto:mode==='--run-private'});
    process.stdout.write(JSON.stringify(result,null,2)+'\n');
    if(result.status.startsWith('STOP'))process.exitCode=2;
  }catch(error){process.stderr.write(JSON.stringify({status:'STOP_R47_PRIVATE_REFRESH',
    error:error.code||'UNEXPECTED_ERROR',message:error.code?undefined:error.message})+'\n');
    process.exitCode=1;}
}
