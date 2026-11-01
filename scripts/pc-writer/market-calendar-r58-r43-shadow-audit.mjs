// R58: user-reviewed 132/100 reference compared with an R57 in-memory shadow.
// Never create PC files, fetch vendor data, publish grades, or touch Core state.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {r43IssuerKey,r43ImportanceIndex,R43_METHOD} from '../../lib/market-calendar-r43-issuer-rank.mjs';
import {buildR57R43Shadow,R57_METHOD} from './market-calendar-r57-r45-offline-r43.mjs';

export const R58_METHOD='R58_R43_132_REFERENCE_SHADOW_AUDIT_R1';
export const R58_REFERENCE_FILE='local-market-calendar-r58-user-reference.json';
export const R58_REFERENCE_METHOD='R58_USER_REVIEWED_TOP132_TOP100_R1';
const MAX_REFERENCE_BYTES=2_000_000;
const DATE=/^20\d\d-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
const WATCHLIST=Object.freeze(['AAPL','NVDA','MSFT','GOOG','AMZN','TSLA','META',
 'LLY','CAT','ARM','ANET','SHOP','DE','BRK-A']);
const readOnly=()=>({providerCalls:0,dbWrites:0,filesystemWrites:0,published:false,schedulerChanged:false});

function validDate(value){
 return typeof value==='string'&&DATE.test(value)&&
  !Number.isNaN(Date.parse(value+'T00:00:00Z'))&&
  new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
}
function issuerList(entries,count){
 if(!Array.isArray(entries)||entries.length!==count)throw Error('R58_REFERENCE_COUNT_INVALID');
 const values=new Set(),parsed=[];
 for(const raw of entries){
  let id,ticker;
  try{
   if(typeof raw==='string'){ticker=raw;id=r43IssuerKey(ticker);}
   else if(raw&&typeof raw==='object'&&!Array.isArray(raw)&&
    typeof raw.ticker==='string'){
     ticker=raw.ticker;id=r43IssuerKey(ticker,raw.issuerId??null);
    }
   else throw Error('invalid');
  }catch{throw Error('R58_REFERENCE_ISSUER_INVALID');}
  if(values.has(id))throw Error('R58_REFERENCE_DUPLICATE_ISSUER');
  values.add(id);
  parsed.push({ticker:ticker.trim().toUpperCase(),id});
 }
 return parsed;
}
function inspectedReference(source,asOf){
 if(source?.version!==1||source?.method!==R58_REFERENCE_METHOD||
  source?.userProvided!==true||source?.eligibilityReviewed!==true||
  source?.permissionForLocalComparison!==true||!validDate(source.referenceDate))
  throw Error('R58_REFERENCE_NOT_REVIEWED');
 if(source.referenceDate>asOf)throw Error('R58_REFERENCE_DATE_AFTER_SHADOW');
 const top132=issuerList(source.top132,132),top100=issuerList(source.top100,100);
 return {top132,top100,referenceDate:source.referenceDate};
}

export function auditR58R43Shadow({shadow,reference,now=Date.now()}={}){
 const report={method:R58_METHOD,status:'BLOCKED',reason:null,
  asOf:shadow?.asOf??null,referenceDate:null,agreementPct:null,
  ...readOnly()};
 if(shadow?.status!=='READY_SHADOW'||shadow?.method!==R57_METHOD||
  shadow?.scorer!==R43_METHOD||
  !r43ImportanceIndex({...shadow,method:R43_METHOD},{now})){
  report.reason='R58_R57_SHADOW_NOT_READY';return report;
 }
 try{
  const inspected=inspectedReference(reference,shadow.asOf);
  const {referenceDate}=inspected;
  const model=shadow.rankings,rankByIssuer=new Map(model.map(row=>[row.issuerId,row.rank]));
  const byTicker=new Map(model.flatMap(row=>row.tickers.map(ticker=>[ticker,row.issuerId])));
  const resolve=({ticker,id})=>{
   const fromTicker=byTicker.get(ticker),fromId=rankByIssuer.has(id)?id:null;
   if(fromTicker&&fromId&&fromTicker!==fromId)
    throw Error('R58_REFERENCE_ISSUER_ID_CONFLICT');
   return fromTicker??id;
  };
  const top132=inspected.top132.map(resolve),top100=inspected.top100.map(resolve);
  if(new Set(top132).size!==132||new Set(top100).size!==100)
   throw Error('R58_REFERENCE_DUPLICATE_ISSUER');
  const topSet=new Set(top132);
  if(top100.some(id=>!topSet.has(id)))throw Error('R58_TOP100_NOT_SUBSET_OF_TOP132');
  const modelTop=new Set(model.filter(row=>row.importance===3).map(row=>row.issuerId));
  const modelTop100=new Set(model.slice(0,100).map(row=>row.issuerId));
  const comparisonSet=new Set(top132);
  const matches=top132.filter(id=>modelTop.has(id)).length;
  const missing=top132.filter(id=>!modelTop.has(id)).map(issuerId=>({
   issuerId,modelRank:rankByIssuer.get(issuerId)??null,
   category:rankByIssuer.has(issuerId)?'BELOW_TOP_CUTOFF':'NOT_IN_REVIEWED_UNIVERSE',
  }));
  const modelOnly=model.filter(row=>row.importance===3&&!comparisonSet.has(row.issuerId))
   .map(row=>({issuerId:row.issuerId,modelRank:row.rank}));
  const top100InTop132=top100.filter(id=>modelTop.has(id)).length;
  const top100InTop100=top100.filter(id=>modelTop100.has(id)).length;
  const watchlist=WATCHLIST.map(ticker=>{
   const issuerId=byTicker.get(ticker)??r43IssuerKey(ticker);
   const rank=rankByIssuer.get(issuerId)??null;
   return {ticker,issuerId,modelRank:rank,inTop132:rank!==null&&modelTop.has(issuerId)};
  });
  return {...report,status:'READY_AUDIT',reason:null,referenceDate,
   sameDate:referenceDate===shadow.asOf,comparisonIsHistoricalReference:true,
   referenceCount:132,modelTopCount:shadow.topCount,
   matches,agreementPct:Math.round(matches/132*1000)/10,
   top100InModelTop132:top100InTop132,top100InModelTop100:top100InTop100,
   outsideTop132:missing.length,
   sourceGaps:missing.filter(row=>row.category==='NOT_IN_REVIEWED_UNIVERSE').length,
   belowCutoff:missing.filter(row=>row.category==='BELOW_TOP_CUTOFF').length,
   missingReference:missing,modelOnly,watchlist,
   modelCoverage:shadow.coverage,
   optionalFieldCoverage:shadow.optionalFieldCoverage??null,
  };
 }catch(error){
  report.reason=/^R58_[A-Z0-9_]+$/.test(error?.message??'')?
   error.message:'R58_REFERENCE_VALIDATION_FAILED';return report;
 }
}

export function runR58ShadowAudit({
 base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer'),
 now=Date.now(),referenceName=R58_REFERENCE_FILE,shadow=null,
}={}){
 const evaluated=shadow??buildR57R43Shadow({base,now});
 if(evaluated.status!=='READY_SHADOW')return {method:R58_METHOD,status:'BLOCKED',
  reason:'R58_R57_SHADOW_NOT_READY',shadowReason:evaluated.reason,...readOnly()};
 if(referenceName!==R58_REFERENCE_FILE||!path.isAbsolute(base))
  return {method:R58_METHOD,status:'BLOCKED',reason:'R58_REFERENCE_PATH_INVALID',...readOnly()};
 const file=path.join(base,referenceName);
 if(!fs.existsSync(file))return {method:R58_METHOD,status:'BLOCKED',
  reason:'R58_USER_REFERENCE_MISSING',...readOnly()};
 let reference;
 try{
  const stat=fs.lstatSync(file);
  if(!stat.isFile()||stat.size<1||stat.size>MAX_REFERENCE_BYTES)
   throw Error('R58_REFERENCE_FILE_INVALID');
  reference=JSON.parse(fs.readFileSync(file,'utf8'));
 }catch{return {method:R58_METHOD,status:'BLOCKED',
  reason:'R58_REFERENCE_FILE_INVALID',...readOnly()};}
 return auditR58R43Shadow({shadow:evaluated,reference,now});
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=runR58ShadowAudit();
 console.log(JSON.stringify(result));
 if(result.status!=='READY_AUDIT')process.exitCode=2;
}
