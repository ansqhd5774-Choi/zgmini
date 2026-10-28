// Read-only PC inventory of existing BEA N400RC snapshots, before any optional capture.
// No Census, HTTP, SQLite SQL, file output, D1, scheduler or deployment.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {BEA_MFG_PROFIT_SERIES} from '../../lib/market-score/earnings-bea-manufacturing-profit-source-r1.mjs';

const CODE='N400RC';
const MAX_FILES=3000,MAX_DEPTH=5,MAX_BYTES=150_000;
const roots=['raw','manual-input'];
const exactCsvHeader=new RegExp(`^(?:observation_date|DATE),${BEA_MFG_PROFIT_SERIES}(?:\\r?\\n|$)`);
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const matchesMetadata=x=>{
  if(!isObject(x))return false;
  const keys=['series','seriesId','seriesID','sourceSeriesId','dataset','datasetId','fredId'];
  return keys.some(key=>typeof x[key]==='string'&&(x[key]===CODE||x[key]===BEA_MFG_PROFIT_SERIES));
};

export function inventoryExistingBeaMfg({root}={}){
  if(typeof root!=='string'||!path.isAbsolute(root))throw Error('BEA_MFG_PC_ROOT_REQUIRED');
  const base=path.resolve(root);
  if(!fs.existsSync(base)||!fs.statSync(base).isDirectory())throw Error('BEA_MFG_PC_ROOT_MISSING');
  if(!roots.some(folder=>fs.existsSync(path.join(base,folder)))
    &&!fs.existsSync(path.join(base,'storage')))
    throw Error('BEA_MFG_PC_ROOT_NOT_RECOGNIZED');
  let filesVisited=0,limited=false;
  const matches=[],warnings=[];
  const walk=(folder,depth)=>{
    if(depth>MAX_DEPTH){limited=true;return;}
    let entries;
    try{entries=fs.readdirSync(folder,{withFileTypes:true});}
    catch{warnings.push('FILE_ACCESS_RESTRICTED');return;}
    for(const entry of entries){
      if(filesVisited>=MAX_FILES){limited=true;return;}
      if(entry.isSymbolicLink())continue;
      const file=path.join(folder,entry.name);
      if(entry.isDirectory()){
        if(!['node_modules','.git','.cache','temp','tmp','backup'].includes(entry.name.toLowerCase()))
          walk(file,depth+1);
        continue;
      }
      if(!entry.isFile()||!/\.(?:csv|json)$/i.test(entry.name))continue;
      filesVisited++;
      let stat;
      try{stat=fs.statSync(file);}catch{warnings.push('FILE_ACCESS_RESTRICTED');continue;}
      if(stat.size<15||stat.size>MAX_BYTES)continue;
      try{
        const body=fs.readFileSync(file,'utf8');
        const ext=path.extname(file).toLowerCase();
        let match=ext==='.csv'&&exactCsvHeader.test(body);
        if(ext==='.json'){
          let parsed;
          try{parsed=JSON.parse(body);}catch{continue;}
          match=matchesMetadata(parsed)||
            (isObject(parsed.source)&&matchesMetadata(parsed.source))||
            (isObject(parsed.metadata)&&matchesMetadata(parsed.metadata));
        }
        if(match)matches.push(path.relative(base,file).replaceAll('\\','/'));
      }catch{warnings.push('FILE_ACCESS_RESTRICTED');}
    }
  };
  for(const folder of roots){
    const dir=path.join(base,folder);
    if(fs.existsSync(dir)&&fs.statSync(dir).isDirectory())walk(dir,0);
  }
  const sqliteFiles=['storage/core.sqlite','storage/history.sqlite'].filter(rel=>
    fs.existsSync(path.join(base,rel)));
  // Deliberately do not infer absence from this bounded file scan: SQLite/XLSX
  // and other stored sources require inspection under their own approved contracts.
  const status=matches.length?'CANDIDATE_EXISTING_RAW_FOUND':'NO_MATCH_IN_BOUNDED_TEXT_SCAN';
  return {status,seriesId:BEA_MFG_PROFIT_SERIES,matchCount:matches.length,
    matches,filesVisited,scanLimited:limited,sqliteFilesPresent:sqliteFiles,
    sqliteContentsInspected:false,xlsxContentsInspected:false,
    safeToAutoCapture:false,warnings:[...new Set(warnings)].sort(),
    d1Queries:0,d1Writes:0,localWrites:0};
}

const filename=fileURLToPath(import.meta.url);
if(process.argv[1]&&path.resolve(process.argv[1])===filename){
  const args=process.argv.slice(2);
  if(args.length>2||args.length===1&&args[0]!=='--read-only'
    ||args.length===2&&(args[0]!=='--root'||!args[1])){
    console.error('ERROR=BEA_MFG_INVALID_ARGUMENT');process.exitCode=2;
  }else{
    const root=args.length===2?args[1]:process.env.ZGMINI_PC_HOME||'E:\\ZGmini\\data\\pc-writer';
    try{console.log(JSON.stringify(inventoryExistingBeaMfg({root}),null,2));}
    catch(e){console.error('ERROR='+String(e?.message??'BEA_MFG_INVENTORY_FAILED'));process.exitCode=1;}
  }
}
