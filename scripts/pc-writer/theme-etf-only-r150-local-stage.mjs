import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {makeThemeEtfOnlyResearchCandidate} from './theme-etf-only-r149-stage.mjs';

export const R150_STAGE_FILE='local-theme-etf-only-r150-private-candidate.json';
const fail=code=>{throw Error('THEME_R150_'+code)};
const serialize=x=>JSON.stringify(x,null,2)+'\n';
const digest=x=>createHash('sha256').update(x).digest('hex');
const dateOnly=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x);

// Research-only. No scoring changes, provider calls, remote DB or publication.
export function stageR145ResearchText(sourceBytes,{fileModifiedAt}={}){
 if(typeof sourceBytes!=='string'||Buffer.byteLength(sourceBytes,'utf8')>3_000_000)fail('INPUT_OVERSIZE');
 if(typeof fileModifiedAt!=='string'||!Number.isFinite(Date.parse(fileModifiedAt)))fail('FILE_MTIME_REQUIRED');
 let record;try{record=JSON.parse(sourceBytes)}catch{fail('R145_JSON_INVALID')}
 if(!dateOnly(record?.observationDate)||record?.published!==false||record?.publicScore!==null)fail('RESEARCH_ONLY_EXPECTED');
 const sourceHash=digest(sourceBytes);
 const candidate=makeThemeEtfOnlyResearchCandidate(record,{
  sourceVersion:'R145_RESULT_SHA256_'+sourceHash,
  // Timestamp of R145 result FILE, not evidence of provider sourceStoredAt.
  sourceStoredAt:fileModifiedAt,
 });
 const result={...candidate,sourceStoredAtKind:'R145_REPORT_FILE_MTIME_NOT_PROVIDER',
  priceSourceStoredAtVerified:false,publicationAuthorized:false,upstreamCommercialRightsVerified:false,
  publishedAt:null};
 if(result.themes.length!==7||result.themes.some(t=>t.history.length!==252)||result.themes.some(t=>!t.history.every(p=>typeof p.score==='number')))fail('INCOMPLETE_RESEARCH');
 return {candidate:result,summary:{status:'PRIVATE_STAGED_NO_PUBLICATION',etfs:13,themes:7,points:1764,
  observationDate:record.observationDate,sourceHash,priceSourceStoredAtVerified:false,
  publicMutation:false,providerCalls:0,dbWrites:0}};
}
function assertApprovedPcHome(base){
 const actual=fs.realpathSync.native(base).replaceAll('/','\\').replace(/\\+$/,'').toLowerCase();
 if(actual!=='e:\\zgmini\\data\\pc-writer')fail('UNAPPROVED_E_ROOT');
 return base;
}
const safeError=e=>/^THEME_R1(?:49|50)_[A-Z0-9_]+$/.test(e?.message??'')?e.message:'THEME_R150_FAILED';
export function runR150LocalStage({inputPath,base,writeLocal=false}={}){
 if(!inputPath||!path.isAbsolute(inputPath))fail('ABSOLUTE_R145_INPUT_REQUIRED');
 const bytes=fs.readFileSync(inputPath,'utf8');
 const stat=fs.statSync(inputPath);
 if(!stat.isFile())fail('R145_INPUT_NOT_FILE');
 const {candidate,summary}=stageR145ResearchText(bytes,{fileModifiedAt:stat.mtime.toISOString()});
 if(!writeLocal)return {...summary,mode:'CHECK_ONLY',candidateFile:null};
 assertApprovedPcHome(base);
 const file=path.join(base,R150_STAGE_FILE),body=serialize(candidate),bodyHash=digest(body);
 if(fs.existsSync(file)){
  const before=fs.readFileSync(file,'utf8');
  if(digest(before)===bodyHash)return {...summary,mode:'LOCAL_PRIVATE',candidateFile:R150_STAGE_FILE,action:'UNCHANGED',candidateSha256:bodyHash};
  try{const previous=JSON.parse(before);if(dateOnly(previous.observationDate)&&previous.observationDate>candidate.observationDate)fail('PREVIOUS_NEWER_PRESERVED')}
  catch(e){if(e?.message?.startsWith('THEME_R150_'))throw e;fail('PREVIOUS_CANDIDATE_UNREADABLE')}
 }
 const temp=file+'.'+process.pid+'.tmp';
 try{fs.writeFileSync(temp,body,{flag:'wx'});fs.renameSync(temp,file)}
 finally{if(fs.existsSync(temp))fs.unlinkSync(temp)}
 return {...summary,mode:'LOCAL_PRIVATE',candidateFile:R150_STAGE_FILE,action:'STORED_PRIVATE',candidateSha256:bodyHash};
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url))){
 const now=new Date().toISOString(),enabled=process.env.ZGMINI_THEME_ETF_PRIVATE_STAGE_ENABLED==='1';
 const writeLocal=process.argv.includes('--write-local');
 const base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer');
 const report={at:now,scope:'PRIVATE_ETF_ONLY',enabled,mode:writeLocal?'LOCAL_PRIVATE':'CHECK_ONLY'};
 try{
  if(!enabled)report.status='DISABLED';
  else Object.assign(report,runR150LocalStage({inputPath:process.env.ZGMINI_THEME_ETF_R145_RESULT_FILE,base,writeLocal}));
 }catch(e){report.status='FAILED';report.error=safeError(e);process.exitCode=1}
 // stdout-only summary; no file changes on disabled/failed routes.
 console.log(JSON.stringify(report));
}
