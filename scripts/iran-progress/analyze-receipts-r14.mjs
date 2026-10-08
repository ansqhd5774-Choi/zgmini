// Bounded local interpretation of previously stored excerpts; never fact promotion.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {openStore,hash} from './store.mjs';
import {interpretSource,PROMPT_VERSION} from './ai.mjs';

export async function analyzeReceipts({store,sourceIds,model,modelDigest,fetcher=fetch}={}){
 if(!Array.isArray(sourceIds)||!sourceIds.length||sourceIds.length>3||new Set(sourceIds).size!==sourceIds.length
  ||typeof model!=='string'||!model||!modelDigest)throw Error('AI_RECEIPT_ARGS_INVALID');
 const rows=sourceIds.map(id=>{
  const row=store.db.prepare('SELECT body FROM sources WHERE id=?').get(id);
  if(!row)throw Error('AI_SOURCE_MISSING');
  const body=JSON.parse(row.body),text=body.excerpt;
  if(typeof text!=='string'||text.length<8||text.length>12000||body.excerptHash!==hash(text))throw Error('AI_SOURCE_EXCERPT_INVALID');
  return {id,text,sourceUrl:body.sourceUrl};
 });
 const inferenceConfig={...(model.startsWith('qwen3:')?{think:false}:{}),format:{type:'object',properties:{candidates:{type:'array',maxItems:20,items:{type:'object',properties:{quote:{type:'string'},eventAt:{type:['string','null']},actors:{type:'array',items:{type:'string'}},type:{type:'string'}},required:['quote','eventAt','actors','type'],additionalProperties:false}}},required:['candidates'],additionalProperties:false}};
 const modelFetcher=(url,options)=>fetcher(url,{...options,body:JSON.stringify({...JSON.parse(options.body),...inferenceConfig})});
 const reports=[];
 for(const row of rows){
  const id='receipt-ai:'+hash({sourceId:row.id,sourceHash:hash(row.text),model,modelDigest,promptVersion:PROMPT_VERSION,inferenceConfig});
  const old=store.db.prepare('SELECT body FROM decisions WHERE id=?').get(id);
  if(old){reports.push({sourceId:row.id,status:'UNCHANGED',candidateCount:JSON.parse(old.body).candidates.length});continue;}
  try{
   const result=await interpretSource(row.text,{fetcher:modelFetcher,model,modelDigest});
   const decision={...result,inferenceConfig,sourceId:row.id,sourceUrl:row.sourceUrl,sourceLevel:'EXCERPT_ONLY',eventVerification:'PENDING',scoreInputVerified:false};
   store.putDecision(id,decision,result.interpretedAt);
   if(store.db.prepare('SELECT body FROM decisions WHERE id=?').get(id)?.body!==JSON.stringify(decision))throw Error('AI_DECISION_READBACK_FAILED');
   reports.push({sourceId:row.id,status:result.status,candidateCount:result.candidates.length,storageVerified:true});
  }catch(error){const reason=error?.name==='TimeoutError'?'AI_EXECUTION_TIMEOUT'
    :['AI_SCHEMA_INVALID','AI_UNSUPPORTED_CANDIDATE','OLLAMA_REQUEST_FAILED','AI_DECISION_READBACK_FAILED'].includes(error?.message)?error.message:'AI_INTERPRETATION_OR_VALIDATION_FAILED';
   reports.push({sourceId:row.id,status:'PENDING',reason});}
 }
 return {sourceLevel:'EXCERPT_ONLY',reports,eventVerified:false,scoreInputVerified:false,publication:'NOT_REQUESTED'};
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 const args=process.argv.slice(2),modelArg=args.find(a=>a.startsWith('--model=')),ids=args.filter(a=>a.startsWith('--source=')).map(a=>a.slice(9));
 if(!modelArg||args.length!==ids.length+1)throw Error('AI_RECEIPT_ARGS_INVALID');
 const model=modelArg.slice(8),r=await fetch('http://127.0.0.1:11434/api/tags',{signal:AbortSignal.timeout(5000)});
 if(!r.ok)throw Error('OLLAMA_TAGS_FAILED');
 const matches=(await r.json()).models?.filter(m=>m.name===model)??[];
 if(matches.length!==1||!matches[0].digest)throw Error('OLLAMA_MODEL_IDENTITY_AMBIGUOUS');
 const file=path.join(process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13'),'iran.sqlite');
 if(!fs.existsSync(file))throw Error('IRAN_SQLITE_NOT_FOUND');
 const store=openStore(file),owner=randomUUID();
 try{if(!store.claim(owner,Date.now()))throw Error('LEASE_HELD');
  console.log(JSON.stringify(await analyzeReceipts({store,sourceIds:ids,model,modelDigest:matches[0].digest})));}
 finally{store.release(owner);store.close();}
}
