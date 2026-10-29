// Private validation helper for the offline R3 Windows recovery package.
// Never fetches URLs, calls Ollama, changes files, or publishes to D1.
import fs from 'node:fs';

function read(file){
 const data=fs.readFileSync(file,'utf8');
 if(data.length>1200000)throw Error('R3_FILE_TOO_LARGE');
 return JSON.parse(data);
}

export function verifyR3Preview(previous,next){
 if(!Array.isArray(previous?.items)||!Array.isArray(next?.items)||
    !Array.isArray(next.pending)||!Number.isSafeInteger(next.publishedAt))
  throw Error('R3_PREVIEW_INVALID');
 const ready=new Set(next.items.map(row=>row.id));
 const previousReady=previous.items.filter(row=>ready.has(row.id));
 if(previousReady.length!==previous.items.length||next.items.length<1||
    next.items.some(row=>row.analysisStatus!=='READY'||
     typeof row.keyPointKo!=='string'||!Array.isArray(row.keyFactsKo)||
     row.keyFactsKo.length<2||row.keyFactsKo.length>3))
  throw Error('R3_PREVIEW_FAILED_TO_PRESERVE_READY');
 return {status:'R3_PREVIEW_VALID',oldReady:previous.items.length,
  newReady:next.items.length,newPending:next.pending.length,
  newlyAnalyzed:next.items.length-previous.items.length};
}

export function verifyR3PublisherLog(log,minimumReady){
 const entries=log.trim().split(/\r?\n/).filter(Boolean);
 let result=null;
 for(let i=entries.length-1;i>=0;i--){
  try{result=JSON.parse(entries[i]);break;}catch{}
 }
 if(!result||!['VERIFIED','UNCHANGED'].includes(result.status)||
    !Number.isSafeInteger(result.itemCount)||result.itemCount<minimumReady)
  throw Error('R3_D1_READBACK_NOT_VERIFIED');
 return {status:'R3_D1_READBACK_VERIFIED',publication:result.status,
  ready:result.itemCount};
}

if(process.argv[1]?.endsWith('news-analysis-r3-pc-check.mjs')){
 try{
  const [mode,...args]=process.argv.slice(2);
  let result;
  if(mode==='preview'&&args.length===2)result=verifyR3Preview(read(args[0]),read(args[1]));
  else if(mode==='publish'&&args.length===2){
   if(!/^\d+$/.test(args[1]))throw Error('R3_EXPECTED_READY_INVALID');
   result=verifyR3PublisherLog(fs.readFileSync(args[0],'utf8'),Number(args[1]));
  }else throw Error('R3_ARGUMENTS_INVALID');
  console.log(JSON.stringify(result));
 }catch(error){
  console.error(JSON.stringify({status:'R3_CHECK_FAILED',reason:error.message}));
  process.exitCode=1;
 }
}
