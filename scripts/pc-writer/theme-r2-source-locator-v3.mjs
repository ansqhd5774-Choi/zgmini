// R2 V3: filename/size inventory only. No price rows, user documents,
// databases, API, or provider credentials are opened. No site/data changes.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const OUT=path.join(HERE,'THEME_R2_SOURCE_LOCATOR_RESULT.json');
const TICKERS=['BOTZ','ROBO','SKYY','CLOU','DRIV','NLR','URA','ITA','SHLD','FINX','ARKF','CIBR','BUG','QTUM','WQTM','SPY'];
const TICKER_RE=new RegExp('(^|[^A-Z0-9])('+TICKERS.join('|')+')([^A-Z0-9]|$)','i');
const CANDIDATE=/theme|etf|price|histor|raw|joined|spy|fear.greed|R158|R186|R190|R192|qtum|wqtm|BOTZ|ROBO|SKYY|CLOU|DRIV|NLR|URA|ITA|SHLD|FINX|ARKF|CIBR|BUG/i;
const SENSITIVE=/secret|password|token|credential|cookie|private.?key|oauth|auth|\.env|ssh|\.git/i;
const SKIP_DIR=/node_modules|\.git|\.venv|__pycache__|appdata|system.volume|recycle.bin|runtime|\.next/i;
const DESKTOP_DIR=/zgmini|theme|sector|etf|market|pc.writer|^R\d{2,4}|data|source|project|biotech|space/i;
const EXT=/\.(json|csv|parquet|sqlite|db|zip)$/i;
const MAX_DIRS=3500, MAX_ENTRIES=120000, MAX_CANDIDATES=1500;

function rank(name) {
  const ticker=TICKER_RE.test(name);
  const raw=/price|raw|histor|joined|hour|close/i.test(name);
  const theme=/theme|R158|R186|qtum|wqtm/i.test(name);
  const score=/score|result|report/i.test(name);
  if (ticker&&raw) return 0;
  if (theme&&raw&&!score) return 1;
  if (ticker) return 2;
  if (theme) return 3;
  if (raw&&!/sector/i.test(name)) return 4;
  if (raw) return 5;
  return 6;
}

export function locateThemeR2SourceNames({roots}={}) {
  const profile=process.env.USERPROFILE;
  const requested=roots??[
    {id:'ZGMINI_PROJECT',dir:'E:\\ZGmini',maxDepth:5,projectOnly:false},
    ...(profile?[{id:'DESKTOP',dir:path.join(profile,'Desktop'),maxDepth:5,projectOnly:true},
      {id:'DOWNLOADS',dir:path.join(profile,'Downloads'),maxDepth:3,projectOnly:true}]:[]),
  ];
  const summary={version:'THEME_R2_FILE_LOCATION_AUDIT_V3',status:'NAMES_ONLY_NOT_SOURCE_VALIDATION',
    checkedAt:new Date().toISOString(),roots:[],limits:{MAX_DIRS,MAX_ENTRIES,MAX_CANDIDATES},
    scan:{directories:0,entries:0,matchingFiles:0,skippedUnreadable:0,truncated:false},
    candidates:[],priceValuesRead:0,providerCalls:0,dbWrites:0,sourceWrites:0,published:false,
    warning:'Filenames and file sizes only; not evidence of valid licensed ETF price or fund AUM data.'};
  const candidate=[];
  for(const root of requested) {
    const base=path.resolve(root.dir);
    const exists=fs.existsSync(base)&&fs.statSync(base).isDirectory();
    const counters={id:root.id,root:base,exists,matchingFiles:0,visitedDirs:0};
    summary.roots.push(counters);
    if(!exists) continue;
    const queue=[{dir:base,depth:0}];
    while(queue.length) {
      if(summary.scan.directories>=MAX_DIRS||summary.scan.entries>=MAX_ENTRIES||candidate.length>=MAX_CANDIDATES){summary.scan.truncated=true;break;}
      const {dir,depth}=queue.shift();
      let items;
      try{items=fs.readdirSync(dir,{withFileTypes:true});}catch{summary.scan.skippedUnreadable++;continue;}
      summary.scan.directories++;counters.visitedDirs++;
      for(const item of items) {
        if(summary.scan.entries++>=MAX_ENTRIES||candidate.length>=MAX_CANDIDATES){summary.scan.truncated=true;break;}
        if(item.isSymbolicLink()||SENSITIVE.test(item.name)) continue;
        if(item.isDirectory()) {
          if(depth<root.maxDepth&&!SKIP_DIR.test(item.name)&&(!root.projectOnly||DESKTOP_DIR.test(item.name)))
            queue.push({dir:path.join(dir,item.name),depth:depth+1});
        } else if(item.isFile()&&EXT.test(item.name)&&CANDIDATE.test(item.name)) {
          let stat;
          try{stat=fs.statSync(path.join(dir,item.name));}catch{summary.scan.skippedUnreadable++;continue;}
          candidate.push({rootId:root.id,path:path.join(dir,item.name),bytes:stat.size,
            modifiedAt:stat.mtime.toISOString(),priority:rank(item.name),tooLargeForR2V2:stat.size>24*1024*1024});
          counters.matchingFiles++;
        }
      }
    }
    if(summary.scan.truncated) break;
  }
  candidate.sort((a,b)=>a.priority-b.priority||a.rootId.localeCompare(b.rootId)||a.path.localeCompare(b.path));
  summary.scan.matchingFiles=candidate.length;
  summary.scan.priorityCounts=Object.fromEntries(Array.from({length:7},(_,i)=>['P'+i,candidate.filter(x=>x.priority===i).length]));
  summary.candidates=candidate.slice(0,180);
  summary.scan.candidateListTruncated=candidate.length>summary.candidates.length;
  return summary;
}

if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url))) {
  const result=locateThemeR2SourceNames();
  const stage=OUT+'.'+process.pid+'.tmp';
  try{fs.writeFileSync(stage,JSON.stringify(result,null,2)+'\r\n',{flag:'wx'});fs.renameSync(stage,OUT);}
  finally{if(fs.existsSync(stage))fs.unlinkSync(stage);}
  console.log('THEME_R2_FILE_LOCATOR='+result.status);
  console.log('MATCHING_FILENAMES='+result.scan.matchingFiles);
  console.log('RESULT='+OUT);
  console.log('RAW_PRICE_READ=NO PUBLICATION=NO');
}
