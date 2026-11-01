// Offline audit only. Caller supplies saved public reference and prior record.
// Never publishes or treats the last available price as a missing day's price.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {containedFile,inspectManifest} from './theme-data-inventory.mjs';
import {scoreAll252,regularHour15Rows} from './theme-optional-score-r188.mjs';
const registry=JSON.parse(fs.readFileSync(new URL('../../config/theme-data-registry.json',import.meta.url)));
const hash=b=>createHash('sha256').update(b).digest('hex');
export function auditThroughDate(themeId,commonDates,publicObservationDate){
 return themeId==='ai-semiconductor'
  ?commonDates.filter(d=>d<=publicObservationDate).at(-1)
  :publicObservationDate;
}
export function auditOptionalPrices({themeId,dataRoot,reference,priorRecord,includePrivatePrices=false}){
 const entry=registry.themes.find(t=>t.id===themeId);if(!['ai-semiconductor','biotech'].includes(themeId)||!entry)throw Error('OPTIONAL_THEME_ID');
 if(reference?.status!=='READY'||!reference.observationDate||!Array.isArray(priorRecord?.history)||priorRecord.history.length!==252||priorRecord.methodologyVersion!==entry.methodologyVersion)throw Error('REFERENCE_CONTRACT');
 const manifestCheck=inspectManifest(dataRoot,entry.rawManifest,themeId);if(manifestCheck.status!=='SHA_VERIFIED')throw Error('RAW_MANIFEST_NOT_VERIFIED');
 const manifestFile=containedFile(dataRoot,entry.rawManifest),home=path.dirname(manifestFile),manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
 const legacy=entry.rawAssets?.[0];let original=null;
 if(legacy){const bytes=fs.readFileSync(containedFile(dataRoot,legacy.path));if(hash(bytes)!==legacy.sha256)throw Error('LEGACY_RAW_HASH');original=JSON.parse(bytes);}
 const symbols=[...entry.symbols,entry.benchmark],tables={};let overlaps=0;
 for(const symbol of symbols){
  const oldRows=original?.instruments?.[symbol]?.rows??[],bars=new Map(oldRows.map(b=>[b.timestamp,b]));
  for(const f of manifest.files.filter(f=>path.basename(f.path).startsWith(symbol+'_'))){
   const rows=fs.readFileSync(containedFile(home,f.path),'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
   for(const b of rows){if(b.symbol!==symbol)throw Error('RAW_SYMBOL');if(b.is_gap===true)continue;
    if(bars.has(b.timestamp)){overlaps++;if(Math.abs(bars.get(b.timestamp).close-b.close)>1e-9)throw Error('OVERLAPPING_PRICE_REVISION');}bars.set(b.timestamp,b);
   }
  }
  tables[symbol]=new Map(regularHour15Rows([...bars.values()].sort((a,b)=>a.timestamp.localeCompare(b.timestamp))).map(p=>[p.date,p.close]));
 }
 const dates=[...tables[entry.benchmark].keys()].filter(d=>symbols.every(s=>tables[s].has(d))).sort();
 const calculate=through=>{const selected=dates.filter(d=>d<=through).slice(-628);if(selected.length!==628||selected.at(-1)!==through)throw Error('REAL_PRICE_DATE_OR_HISTORY_MISSING');
  const axes=entry.symbols.map(s=>scoreAll252(selected.map(d=>tables[s].get(d)),selected.map(d=>tables[entry.benchmark].get(d))));
  return selected.slice(-252).map((date,i)=>({date,score:Number(((axes[0][i]+axes[1][i])/2).toFixed(5))}));};
 const old=calculate(priorRecord.observationDate);if(old.some((p,i)=>p.date!==priorRecord.history[i]?.date))throw Error('PRIOR_HISTORY_DATE_ALIGNMENT');
 const differences=old.map((p,i)=>Math.abs(p.score-priorRecord.history[i].score)),maxDifference=Math.max(...differences);
 // AI is collected separately from the seven-theme feed and the upstream hourly
 // bars can lag it. Use the most recent *observed common* session, never a
 // fabricated bar for the newer public reference date. Biotech's independent
 // forensic audit retains its existing reference-date contract.
 const through=auditThroughDate(themeId,dates,reference.observationDate);
 const history=calculate(through),wanted=reference.provisional?.points??[];
 // An older AI confirmed point is displayed independently; it must not inherit
 // the seven themes' newer provisional dates without real same-day prices.
 const pending=through===reference.observationDate
  ?wanted.filter(p=>dates.includes(p.date)).map(p=>calculate(p.date).at(-1))
  :[];
 return {status:maxDifference===0?'PRIVATE_CANDIDATE_PARITY_VERIFIED':'CONFIRMED_SCORE_REVISION_REVIEW',themeId,methodologyVersion:entry.methodologyVersion,
  observationDate:through,score:history.at(-1).score,history,provisional:{points:pending},
  audit:{commonSessions:dates.length,latestCommon:dates.at(-1),sourceOverlapBars:overlaps,comparisonDate:priorRecord.observationDate,comparedPoints:252,maxDifference,missingProvisionalDates:wanted.filter(p=>!dates.includes(p.date)).map(p=>p.date)},
  ...(includePrivatePrices&&themeId==='ai-semiconductor'?{privateVerifiedPrices:{tables,dates}}:{}),
  providerCalls:0,publicWrites:0,d1Writes:0};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [themeId,referenceFile,priorFile]=process.argv.slice(2);
 try{const read=f=>{const x=JSON.parse(fs.readFileSync(f,'utf8'));return typeof x.body==='string'?JSON.parse(x.body):x};
  const result=auditOptionalPrices({themeId,dataRoot:process.env.ZGMINI_DATA_ROOT??registry.defaultDataRoot,reference:read(referenceFile),priorRecord:read(priorFile)});
  console.log(JSON.stringify({status:result.status,themeId,...result.audit,score:result.score,providerCalls:0,publicWrites:0}));if(result.status!=='PRIVATE_CANDIDATE_PARITY_VERIFIED')process.exitCode=2;
 }catch{console.error('OPTIONAL_AUDIT_STOP_CHECK_LOCAL_REFERENCE_AND_RAW');process.exitCode=1;}
}
