/** R25: explicitly requested, in-memory 250-session R2 year chart preview. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {verifyMarketParquetProviderYear} from './us-breadth-confirmed-provider-manifest-r24.mjs';
import {prepareFullMarketYearPreview,US_FULL_MARKET_YEAR_SESSIONS}
 from './us-breadth-confirmed-history-r21.mjs';
import {decodeStoredParquet} from './us-breadth-confirmed-staging-r20.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=(status,reason=null)=>({status,prepared:false,publicationAllowed:false,
  publicationStage:'PREVIEW_ONLY',reason});

/** Retain only two decoded trading sessions, not 251 full stock tables. */
export function rollingParquetDecoder(readParquet,{maxEntries=2}={}){
 if(typeof readParquet!=='function'||!Number.isInteger(maxEntries)||maxEntries<2)
  throw Error('YEAR_PREVIEW_DECODER_INVALID');
 const cache=new Map();
 const decode=bytes=>{
  const key=hash(bytes);
  if(cache.has(key)){
   const cached=cache.get(key);
   cache.delete(key);cache.set(key,cached);
   return cached;
  }
  const result=Promise.resolve().then(()=>readParquet(bytes));
  cache.set(key,result);
  if(cache.size>maxEntries)cache.delete(cache.keys().next().value);
  return result;
 };
 return decode;
}

/** The caller has explicitly selected preview; R24 verification remains a prerequisite. */
export async function prepareProviderVerifiedYearPreview({dataRoot,pcHome,now=new Date(),
  sessionCount=US_FULL_MARKET_YEAR_SESSIONS,apiKey,
  verifyProvider=verifyMarketParquetProviderYear,readParquet=decodeStoredParquet}={}){
 if(typeof dataRoot!=='string'||!dataRoot||typeof pcHome!=='string'||!pcHome)
  return fail('PREVIEW_PC_ROOTS_REQUIRED');
 if(!Number.isSafeInteger(sessionCount)||sessionCount<1||sessionCount>US_FULL_MARKET_YEAR_SESSIONS)
  return fail('PREVIEW_SESSION_COUNT_INVALID');
 let evidence;
 try{evidence=await verifyProvider({dataRoot,pcHome,now,sessionCount,apiKey});}
 catch{return fail('PREVIEW_PROVIDER_VERIFICATION_UNAVAILABLE');}
 if(evidence?.status!=='PROVIDER_BYTES_MATCHED_ALL_DATES'||
   evidence?.providerAuthenticityVerified!==true||
   !Array.isArray(evidence?.candidateManifestEntries)||
   evidence.candidateManifestEntries.length!==sessionCount+1)
  return {...fail('PREVIEW_PROVIDER_NOT_VERIFIED',evidence?.status??null),
   providerCalls:evidence?.providerCalls??null,localFound:evidence?.localFound??null};

 // One approved source root only; crossing into another user/home path is not
 // justified by a valid manifest alone. R20 revalidates every path and SHA.
 let root;
 try{
  root=fs.realpathSync(dataRoot);
  if(root===path.parse(root).root)throw Error('PREVIEW_DATA_ROOT_TOO_BROAD');
  for(const entry of evidence.candidateManifestEntries){
   if(typeof entry?.path!=='string')throw Error('PREVIEW_SOURCE_PATH_INVALID');
   const real=fs.realpathSync(entry.path);
   if(!real.startsWith(root+path.sep))throw Error('PREVIEW_SOURCE_OUTSIDE_DATA_ROOT');
  }
 }catch{return {...fail('PREVIEW_SOURCE_ROOT_NOT_APPROVED'),
   providerCalls:evidence.providerCalls??null};}
 const cached=rollingParquetDecoder(readParquet);
 let result;
 try{result=await prepareFullMarketYearPreview({approvedSourceRoot:root,
   manifestEntries:evidence.candidateManifestEntries,now,sessionCount,readParquet:cached});}
 catch{return {...fail('PREVIEW_CALCULATION_UNAVAILABLE'),providerCalls:evidence.providerCalls??null};}
 if(result?.prepared!==true)return {...fail('PREVIEW_HISTORY_NOT_READY',result?.status??null),
  providerCalls:evidence.providerCalls??null};
 return {status:'YEAR_PREVIEW_READY_UNPUBLISHED',prepared:true,
  publicationAllowed:false,publicationStage:'PREVIEW_ONLY',manualReviewRequired:true,
  providerAuthenticityVerified:true,providerCalls:evidence.providerCalls??null,
  chart:result};
}

/** No per-security prices, provider credentials, signed URLs, or PC paths. */
export function publicYearPreviewSummary(result){
 if(result?.prepared!==true)return {status:result?.status??'PREVIEW_UNAVAILABLE',
  prepared:false,publicationAllowed:false,reason:result?.reason??null,
  providerCalls:result?.providerCalls??null,localFound:result?.localFound??null};
 const chart=result.chart;
 return {status:result.status,prepared:true,publicationAllowed:false,
  publicationStage:'PREVIEW_ONLY',manualReviewRequired:true,
  providerAuthenticityVerified:true,providerCalls:result.providerCalls,
  source:chart.source,methodologyVersion:chart.methodologyVersion,
  sessionCount:chart.sessionCount,firstDate:chart.firstDate,lastDate:chart.lastDate,
  points:chart.points};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--preview-only')
  throw Error('EXPLICIT_PREVIEW_ONLY_ARGUMENT_REQUIRED');
 const result=await prepareProviderVerifiedYearPreview({
  dataRoot:process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data',
  pcHome:process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer'),
 });
 process.stdout.write(JSON.stringify(publicYearPreviewSummary(result))+'\n');
}
