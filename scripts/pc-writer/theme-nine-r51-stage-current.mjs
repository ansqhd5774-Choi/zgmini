// Private-only R51 provisional stage. Align existing R48 scores with the
// public feed's actual confirmed/provisional session dates. No D1, no writes
// to the existing public feed or confirmed R48 files, no new price formula.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildNineR51PrivateProvisionalOverlay}
 from './theme-nine-r51-provisional-overlay.mjs';

const fail=code=>{throw Object.assign(new Error('THEME_NINE_R51_'+code),
  {code:'THEME_NINE_R51_'+code});};
const sha=b=>createHash('sha256').update(b).digest('hex');
const fmt=/^THEME_NINE_R48_PRIVATE_CANDIDATE_(\d{4}-\d{2}-\d{2})_([a-f0-9]{16})\.json$/;
const publicUrl='https://zgmini.kr/api/theme-fear-greed';
const safeFile=(dir,name)=>{
  const file=fs.realpathSync(path.join(dir,name));
  if(path.dirname(file)!==fs.realpathSync(dir)||!fs.statSync(file).isFile())
    fail('CANDIDATE_PATH_ESCAPE');
  const bytes=fs.readFileSync(file);
  if(sha(bytes).slice(0,16)!==name.match(fmt)?.[2])fail('R48_FILENAME_SHA');
  return JSON.parse(bytes);
};

export async function stageNineR51Current({dataRoot='E:/ZGmini/data',
  publicBase=null,fetchImpl=fetch}={}){
  if(!publicBase){
    // Fixed, unauthenticated same-site public read. No API key or raw data GET.
    const response=await fetchImpl(publicUrl,{method:'GET',redirect:'error',
      signal:AbortSignal.timeout(10000),headers:{accept:'application/json'}});
    if(!response?.ok)return {status:'WAIT_PUBLIC_FEED_UNAVAILABLE',
      httpStatus:response?.status??null,d1Writes:0,publicationWrites:0};
    publicBase=await response.json();
  }
  if(publicBase?.status!=='READY'||publicBase.phase!=='PROVISIONAL'||
    !Array.isArray(publicBase.provisional?.points)||
    !publicBase.provisional.points.length)
    return {status:'WAIT_PUBLIC_PROVISIONAL_DATES',d1Writes:0,publicationWrites:0};
  const base=publicBase.confirmedObservationDate??publicBase.observationDate;
  const final=publicBase.provisional.points.at(-1)?.date;
  if(!/^\d{4}-\d\d-\d\d$/.test(base??'')||
     !/^\d{4}-\d\d-\d\d$/.test(final??''))fail('PUBLIC_DATES_INVALID');
  const root=fs.realpathSync(dataRoot);
  const dir=path.join(root,'themes','legacy-nine-r48-private-candidate');
  if(!fs.existsSync(dir))return {status:'WAIT_R48_PRIVATE_CANDIDATES',
    d1Writes:0,publicationWrites:0};
  if(fs.realpathSync(dir)!==path.resolve(dir))fail('R48_CANDIDATE_DIR_REDIRECT');
  const files=fs.readdirSync(dir).filter(n=>fmt.test(n));
  const one=date=>{
    const options=files.filter(n=>n.match(fmt)[1]===date);
    if(options.length>1)fail('R48_CANDIDATE_DATE_AMBIGUOUS');
    return options[0]??null;
  };
  const confirmedFile=one(base);
  // A later R48 run can contain the public provisional day in its 252-day
  // history. Choose the earliest SHA-verified candidate at/after that day.
  // The pure overlay independently verifies every requested date and that
  // all overlapping confirmed scores are unchanged.
  const laterDates=[...new Set(files.map(n=>n.match(fmt)[1]))]
    .filter(d=>d>=final).sort();
  const latestFile=laterDates.length?one(laterDates[0]):null;
  if(!confirmedFile||!latestFile)return {
    status:'WAIT_R48_ALIGNED_SNAPSHOTS',confirmedDate:base,latestDate:final,
    missing:[...(!confirmedFile?['CONFIRMED_ANCHOR']:[]),
      ...(!latestFile?['LATEST_PROVISIONAL']:[])],
    d1Writes:0,publicationWrites:0};
  const confirmed=safeFile(dir,confirmedFile),latest=safeFile(dir,latestFile);
  const overlay=buildNineR51PrivateProvisionalOverlay({confirmed,latest,publicBase});
  const bytes=Buffer.from(JSON.stringify(overlay,null,2)+'\n');
  const outputDir=path.join(root,'themes','legacy-nine-r51-private-provisional');
  fs.mkdirSync(outputDir,{recursive:true});
  if(fs.realpathSync(outputDir)!==path.resolve(outputDir))fail('STAGE_REDIRECT');
  const name=`THEME_NINE_R51_PRIVATE_PROVISIONAL_${base}_${final}_${sha(bytes).slice(0,16)}.json`;
  const target=path.join(outputDir,name);
  if(fs.existsSync(target)){
    if(sha(fs.readFileSync(target))!==sha(bytes))fail('EXISTING_STAGE_DRIFT');
  }else fs.writeFileSync(target,bytes,{flag:'wx'});
  return {status:'R51_PRIVATE_PROVISIONAL_STAGED_NOT_PUBLISHED',
    confirmedDate:base,provisionalDates:overlay.provisional.points.map(p=>p.date),
    latestR48SourceDate:latest.observationDate,
    themeCount:9,scoreCount:9*overlay.provisional.points.length,
    priceMode:overlay.sourcePriceMode,sourceFormulaChanged:false,
    candidateSha256:sha(bytes),candidatePath:target,
    publicationAuthorized:false,d1Writes:0,publicationWrites:0};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    if(process.argv.length!==3||process.argv[2]!=='--stage-private')fail('USAGE');
    process.stdout.write(JSON.stringify(await stageNineR51Current({
      dataRoot:process.env.ZGMINI_DATA_ROOT||'E:/ZGmini/data'}),null,2)+'\n');
  }catch(e){process.stderr.write(JSON.stringify({status:'STOP_R51_PRIVATE_PROVISIONAL',
    error:e.code??'R51_UNEXPECTED',detail:e.code?undefined:String(e.message)})+'\n');
    process.exitCode=1;}
}
