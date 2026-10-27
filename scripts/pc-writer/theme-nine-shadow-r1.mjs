// EXISTING NINE: read-only private comparison, no provider/network/D1/schedule/writes.
// The supplied price export is NOT a substitute for original SHA/license audits.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {scoreAll252} from './theme-optional-score-r188.mjs';
import {scoreAdaptiveTimeline} from './theme-optional-adaptive-r2.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const WINDOW=252;
const REQUIRED=628;
const PARITY_TOLERANCE=1e-10;
const isPrice=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
const isScore=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100;
const isDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const fail=code=>{throw Object.assign(new Error('THEME_NINE_R1_'+code),{code:'THEME_NINE_R1_'+code});};
const maxAbs=values=>values.length?Math.max(...values.map(Math.abs)):null;
const meanAbs=values=>values.length?values.reduce((sum,value)=>sum+Math.abs(value),0)/values.length:null;

function validatedScope(registry,scope){
 if(registry?.themes===undefined||!Array.isArray(registry.themes)||
  scope?.contractVersion!=='THEME_NINE_REMODEL_SCOPE_R1'||
  !Array.isArray(scope.themeIds)||scope.themeIds.length!==9||
  new Set(scope.themeIds).size!==9||
  scope.shadowOnly!==true||scope.allowProductionWrites!==false||
  scope.allowLegacyHistoryOverwrite!==false||scope.allowSchedulerChanges!==false||
  scope.allow11thTheme!==false)fail('INVALID_SCOPE');
 const registryMap=new Map(registry.themes.map(item=>[item.id,item]));
 return scope.themeIds.map(id=>{
  const item=registryMap.get(id);
  if(!item||item.methodologyVersion!==scope.expectedLegacyMethodology||
   !Array.isArray(item.symbols)||item.symbols.length!==2||
   item.symbols[0]===item.symbols[1]||item.benchmark!=='SPY')fail('REGISTRY_DRIFT');
  return {id,label:item.label,symbols:item.symbols};
 });
}

function validatedRows(record,symbols){
 if(typeof record?.priceMode!=='string'||!record.priceMode.trim()||
  typeof record?.sourceEvidence!=='string'||!record.sourceEvidence.trim()||
  !Array.isArray(record.rows)||record.rows.length>2500)fail('INVALID_PRICE_EXPORT');
 let previous='';
 for(const row of record.rows){
  if(!isDate(row?.date)||row.date<=previous)fail('INVALID_SESSION_DATE');
  previous=row.date;
  for(const symbol of ['SPY',...symbols]){
   if(!(symbol in row)||!(row[symbol]===null||isPrice(row[symbol])))
    fail('INVALID_REAL_PRICE');
  }
 }
 const published=new Map();
 if(record.published!==undefined&&!Array.isArray(record.published))fail('INVALID_PUBLISHED_ROWS');
 for(const row of record.published||[]){
  if(!isDate(row?.date)||published.has(row.date)||
   !(row.score===null||isScore(row.score)))fail('INVALID_PUBLISHED_ROWS');
  published.set(row.date,row.score);
 }
 return published;
}

function legacyReference(rows,symbol){
 if(rows.length<REQUIRED)return null;
 const tail=rows.slice(-REQUIRED);
 if(!tail.every(row=>isPrice(row[symbol])&&isPrice(row.SPY)))return null;
 return scoreAll252(tail.map(row=>row[symbol]),tail.map(row=>row.SPY));
}

function auditOne(item,record,{includeHistory=false}={}){
 const {id,label,symbols}=item;
 if(!record)return {id,label,symbols,status:'INPUT_NOT_PROVIDED',scoredDays:0,
  referenceComparableDays:0,publishedComparableDays:0};
 const published=validatedRows(record,symbols);
 const rows=record.rows;
 if(rows.length<WINDOW)return {id,label,symbols,status:'INSUFFICIENT_YEAR_WINDOW',
  suppliedSessionDates:rows.length,scoredDays:0,referenceComparableDays:0,
  publishedComparableDays:0,sourceEvidenceDeclared:true};
 const bySymbol=Object.fromEntries(symbols.map(symbol=>[symbol,
  scoreAdaptiveTimeline(rows.map(row=>({date:row.date,own:row[symbol],spy:row.SPY})))]));
 const byLegacy=Object.fromEntries(symbols.map(symbol=>[symbol,legacyReference(rows,symbol)]));
 const latestRows=rows.slice(-WINDOW);
 const history=latestRows.map((row,offset)=>{
  const index=rows.length-WINDOW+offset;
  const a=bySymbol[symbols[0]][index],b=bySymbol[symbols[1]][index];
  const scored=isScore(a.score)&&isScore(b.score);
  const candidate=scored?(a.score+b.score)/2:null;
  const refA=byLegacy[symbols[0]]?.[offset];
  const refB=byLegacy[symbols[1]]?.[offset];
  const reference=isScore(refA)&&isScore(refB)?(refA+refB)/2:null;
  const actualPublished=published.get(row.date)??null;
  return {date:row.date,legacyR188Reference:reference,adaptiveR2Pair50:candidate,
   published:actualPublished,
   adaptiveStatus:!scored?'MISSING_REAL_SCORE':
    a.status==='R188_COMPATIBLE'&&b.status==='R188_COMPATIBLE'?
     'R188_COMPATIBLE':'ADAPTIVE_PROVISIONAL'};
 });
 const referenceDiff=history.filter(x=>x.legacyR188Reference!==null&&x.adaptiveR2Pair50!==null)
  .map(x=>x.adaptiveR2Pair50-x.legacyR188Reference);
 const publishedDiff=history.filter(x=>x.published!==null&&x.adaptiveR2Pair50!==null)
  .map(x=>x.adaptiveR2Pair50-x.published);
 const scored=history.filter(x=>x.adaptiveR2Pair50!==null).length;
 const summary={id,label,symbols,status:'SHADOW_COMPUTED_SOURCE_UNVERIFIED',
  suppliedSessionDates:rows.length,yearWindowDates:WINDOW,scoredDays:scored,
  provisionalDays:history.filter(x=>x.adaptiveStatus==='ADAPTIVE_PROVISIONAL').length,
  missingDays:WINDOW-scored,
  referenceComparableDays:referenceDiff.length,
  referenceMaxAbsDifference:maxAbs(referenceDiff),
  referenceMeanAbsDifference:meanAbs(referenceDiff),
  referenceParityViolations:referenceDiff.filter(x=>Math.abs(x)>PARITY_TOLERANCE).length,
  publishedComparableDays:publishedDiff.length,
  publishedMaxAbsDifference:maxAbs(publishedDiff),
  publishedMeanAbsDifference:meanAbs(publishedDiff),
  latest:history.at(-1),
  priceModeDeclared:true,sourceEvidenceDeclared:true,
  sourceProvenanceShaVerified:false,priceRightsVerified:false};
 if(includeHistory)summary.history=history;
 return summary;
}

export function auditLegacyNine({registry,scope,exported,includeHistory=false}={}){
 const cohort=validatedScope(registry,scope);
 if(exported?.contractVersion!=='THEME_NINE_SHADOW_R1'||
  !Array.isArray(exported.themes))fail('INVALID_EXPORT_CONTRACT');
 const provided=new Map();
 const ids=new Set(cohort.map(item=>item.id));
 for(const record of exported.themes){
  if(typeof record?.id!=='string'||!ids.has(record.id)||provided.has(record.id))
   fail('UNAUTHORIZED_OR_DUPLICATE_THEME');
  provided.set(record.id,record);
 }
 const themes=cohort.map(item=>auditOne(item,provided.get(item.id),{includeHistory}));
 return {contractVersion:'THEME_NINE_SHADOW_R1',scopeSize:cohort.length,
  providedThemes:provided.size,missingInputThemes:themes.filter(x=>x.status==='INPUT_NOT_PROVIDED').map(x=>x.id),
  status:'READ_ONLY_CANDIDATE_NOT_PUBLICATION_APPROVED',
  priceSourceVerification:'NOT_PERFORMED_BY_THIS_TOOL',
  approvedForCutover:false,approvedForD1Writes:false,approvedForSchedulerChanges:false,
  noPriceInterpolation:true,comparisonTolerance:PARITY_TOLERANCE,themes};
}

function cli(argv){
 if(argv.length===0||argv.includes('--help')){
  process.stdout.write('node scripts/pc-writer/theme-nine-shadow-r1.mjs --input <verified-PC-export.json> [--include-history]\n');
  return;
 }
 const allowed=new Set(['--input','--include-history']);
 if(argv.some(x=>x.startsWith('--')&&!allowed.has(x))||
  argv.filter(x=>x==='--input').length!==1)fail('CLI_ARGUMENTS');
 const inputIndex=argv.indexOf('--input');
 if(inputIndex===-1||!argv[inputIndex+1]||argv[inputIndex+1].startsWith('--'))
  fail('INPUT_PATH_REQUIRED');
 const inputPath=path.resolve(argv[inputIndex+1]);
 const registry=JSON.parse(fs.readFileSync(path.join(ROOT,'config/theme-data-registry.json'),'utf8'));
 const scope=JSON.parse(fs.readFileSync(path.join(ROOT,'config/theme-nine-remodel-scope-r1.json'),'utf8'));
 const exported=JSON.parse(fs.readFileSync(inputPath,'utf8'));
 const report=auditLegacyNine({registry,scope,exported,includeHistory:argv.includes('--include-history')});
 process.stdout.write(JSON.stringify(report,null,2)+'\n');
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{cli(process.argv.slice(2));}
 catch(error){process.stderr.write(`THEME_NINE_R1_ERROR=${error.code||error.message}\n`);process.exitCode=1;}
}
