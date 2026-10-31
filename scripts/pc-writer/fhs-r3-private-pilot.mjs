// R58: one-shot OFFLINE R3 credit-health scoring pilot on existing PC SEC ZIP.
// No new SEC collection, no provider requests, no DB/D1 writes, no public star update.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {calendarTickers,secTickerMap,openZip,readZipCompany} from './sec-r57-credit-coverage.mjs';
import {extractFhsR3Annual} from './fhs-r3-sec-extract.mjs';
import {scoreFhsR3,FHS_R3_VERSION,validDay} from './fhs-r3-score.mjs';
const PC=String.raw`E:\ZGmini\data\pc-writer`;
const TXT='MARKET_CALENDAR_R58_FHS_R3_RESULT.txt',PRIVATE='MARKET_CALENDAR_R58_FHS_R3_PRIVATE_SHADOW.json';
const inc=(c,k,w=1)=>{c[k]=(c[k]??0)+w;};
export function runPilot({pcHome=PC,asOf=new Date(Date.now()+9*3600000).toISOString().slice(0,10),progress=()=>{}}={}){
 if(!validDay(asOf))throw Error('ASOF_INVALID_STOP');
 const calendar=calendarTickers(pcHome),mapping=secTickerMap(pcHome);
 const zipFile=path.join(pcHome,'manual-input','e1-r5','incoming','companyfacts.zip');
 const zip=openZip(zipFile);
 try{
  const byCik=new Map();let unmapped=0;
  for(const ticker of calendar.tickers){const cik=mapping.map.get(ticker);if(!cik){unmapped++;continue;}if(!byCik.has(cik))byCik.set(cik,[]);byCik.get(cik).push(ticker);}
  const missing={},distribution={1:0,2:0,3:0},scores=[];
  let entriesFound=0,computed=0,processed=0;
  for(const [cik,tickers] of byCik){
   processed++;const w=tickers.length;
   if(!zip.index.has(cik)){inc(missing,'ZIP_MISSING',w);continue;}
   entriesFound++;
   // An invalid archive member is a STOP, never a successful partial run.
   const doc=readZipCompany(zip,cik);
   const input=extractFhsR3Annual(doc,cik,asOf);
   if(input.status!=='R3_SEC_INPUT_CANDIDATE'){inc(missing,input.reason,w);continue;}
   const result=scoreFhsR3(input.financial,{asOf});
   if(result.status==='UNRATED'){inc(missing,result.reason,w);continue;}
   computed+=w;inc(distribution,String(result.stars),w);
   // No raw financial values or public-ready flag; per-ticker file must remain on PC.
   for(const ticker of tickers)scores.push({ticker,status:result.status,version:result.version,
    asOf,annualEnd:result.annualEnd,score:result.score,stars:result.stars,
    risk:result.risk,publishReady:false,sectorVerified:false,cashUnrestrictedVerified:false,
    filingContextVerified:false});
   if(processed%250===0)progress(processed,byCik.size);
  }
  const report={status:'R58_LOCAL_PROVISIONAL_SCORING_COMPLETE',asOf,version:FHS_R3_VERSION,
   calendarTickers:calendar.tickers.size,secMappedTickers:calendar.tickers.size-unmapped,unmappedTickers:unmapped,
   mappedIssuers:byCik.size,zipIssuerEntriesFound:entriesFound,zipTotalEntries:zip.totalEntries,
   sourceCheckedAt:calendar.sourceCheckedAt,sourceStoredAt:calendar.sourceStoredAt,
   provisionalScoreTickers:computed,provisionalStarCounts:distribution,excludedOrMissingTickers:calendar.tickers.size-computed,
   missingReasons:missing,actualVerifiedCreditRatings:0,sectorModelsVerified:false,
   unrestrictedCashVerified:false,companyFactsDimensionalCompletenessVerified:false,
   publicImportanceStarsChanged:false,providerRequests:0,dbWrites:0,d1Writes:0,
   note:'PRIVATE_CANDIDATES_ONLY; NO_VALIDATED_CREDIT_GRADES; NO_PUBLICATION; NO_CASH_OR_SECTOR_VERIFICATION'};
  return {report,privateShadow:{version:FHS_R3_VERSION,status:'PRIVATE_PROVISIONAL_ONLY',asOf,
   publishReady:false,publicStarsChanged:false,sourceStoredAt:calendar.sourceStoredAt,
   recordCount:scores.length,items:scores}};
 }finally{zip.close();}
}
export function runOnce({pcHome=PC,outputDir=path.dirname(fileURLToPath(import.meta.url)),asOf}={}){
 const txt=path.join(outputDir,TXT),privateFile=path.join(outputDir,PRIVATE);
 if(fs.existsSync(txt)||fs.existsSync(privateFile))throw Error('R58_RESULTS_ALREADY_EXIST_STOP');
 const {report,privateShadow}=runPilot({pcHome,asOf,progress:(a,b)=>process.stdout.write(`R58_PROGRESS=${a}/${b}\n`)});
 const output=['AUDIT=MARKET_CALENDAR_R58_FHS_R3',...Object.entries(report).map(([k,v])=>`${k}=${JSON.stringify(v)}`)].join('\r\n')+'\r\n';
 // Both outputs are audit files in the ZIP extraction directory, NOT database writes.
 // Avoid leaving a private file after a failed creation of the public aggregate.
 fs.writeFileSync(privateFile,JSON.stringify(privateShadow,null,2)+'\n',{flag:'wx',mode:0o600,encoding:'utf8'});
 try{fs.writeFileSync(txt,output,{flag:'wx',encoding:'utf8'});}catch(err){try{fs.unlinkSync(privateFile);}catch{}throw err;}
 return {status:report.status,aggregateFile:txt,privateFile};
}
const self=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(self){
 try{
  const result=runOnce({pcHome:process.argv[2]||PC,outputDir:process.argv[3]||path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')});
  process.stdout.write(`STATUS=${result.status}\nRESULT_FILE=${TXT}\nPRIVATE_FILE_STAYS_ON_PC=${PRIVATE}\n`);
 }catch(error){
  const code=/^[A-Z0-9_]+$/.test(String(error.message))?error.message:'R58_UNEXPECTED_LOCAL_ERROR_STOP';
  process.stdout.write(`STATUS=${code}\n`);process.exitCode=2;
 }
}
