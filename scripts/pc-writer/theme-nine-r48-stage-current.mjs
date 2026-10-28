// Windows PC local staging only. Never authorizes, schedules, publishes or
// communicates with Cloudflare. Reads completed R47 immutable private pairs.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildNineR48PrivatePublicationCandidate}
 from './theme-nine-r48-r47-bridge.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=code=>{throw Object.assign(new Error('THEME_NINE_R48_'+code),
  {code:'THEME_NINE_R48_'+code});};
const HERE=path.dirname(fileURLToPath(import.meta.url));
const namePattern=/^THEME_NINE_R47_PRIVATE_(\d{4}-\d{2}-\d{2})_([a-f0-9]{16})_NINE\.json$/;
const safeRead=(dir,name)=>{
  const loc=path.join(dir,name),real=fs.realpathSync(loc);
  if(path.dirname(real)!==fs.realpathSync(dir)||!fs.statSync(real).isFile())
    fail('PRIVATE_PATH_ESCAPE');
  return fs.readFileSync(real);
};

export function stageCurrentNineR48({dataRoot='E:/ZGmini/data',
  configDirectory=process.env.ZGMINI_R48_CONFIG_DIR||path.resolve(HERE,'../../config')}={}){
  const root=fs.realpathSync(dataRoot),priv=path.join(root,'themes','legacy-nine-r47-private');
  if(!fs.existsSync(priv)||fs.realpathSync(priv)!==path.resolve(priv))
    fail('R47_PRIVATE_DIR_INVALID');
  const files=fs.readdirSync(priv).filter(f=>namePattern.test(f)).sort();
  if(!files.length)fail('NO_R47_PRIVATE_NINE_FILES');
  const mostRecent=files.at(-1),parts=mostRecent.match(namePattern);
  if(files.filter(f=>f.slice(0,33)===mostRecent.slice(0,33)).length!==1)
    fail('MULTIPLE_LATEST_PRIVATE_PAIRS');
  const prefix=mostRecent.slice(0,-'NINE.json'.length);
  const scoreName=prefix+'ETF.json';
  if(!fs.existsSync(path.join(priv,scoreName)))fail('PRIVATE_ETF_PAIR_MISSING');
  const individualBytes=safeRead(priv,scoreName),themesBytes=safeRead(priv,mostRecent);
  const rosterBytes=fs.readFileSync(path.join(configDirectory,
    'theme-nine-r20-approved-candidates.json'));
  const aumEvidenceBytes=fs.readFileSync(path.join(configDirectory,
    'theme-nine-r26-official-aum-evidence.json'));
  const candidate=buildNineR48PrivatePublicationCandidate({
    individual:JSON.parse(individualBytes),individualBytes,
    themes:JSON.parse(themesBytes),themesBytes,
    roster:JSON.parse(rosterBytes),rosterBytes,aumEvidenceBytes});
  if(candidate.observationDate!==parts[1])fail('R47_FILENAME_DATE_DRIFT');
  const text=JSON.stringify(candidate,null,2)+'\n',bytes=Buffer.from(text);
  const targetDir=path.join(root,'themes','legacy-nine-r48-private-candidate');
  fs.mkdirSync(targetDir,{recursive:true});
  if(fs.realpathSync(targetDir)!==path.resolve(targetDir))fail('R48_STAGE_PATH_REDIRECT');
  const target=path.join(targetDir,`THEME_NINE_R48_PRIVATE_CANDIDATE_${parts[1]}_${sha(bytes).slice(0,16)}.json`);
  if(fs.existsSync(target)){
    if(sha(fs.readFileSync(target))!==sha(bytes))fail('R48_CANDIDATE_SHA_DRIFT');
  }else fs.writeFileSync(target,bytes,{flag:'wx'});
  return {status:'R48_PRIVATE_CANDIDATE_STAGED_NOT_PUBLISHED',
    sourceDate:parts[1],sourceEtfSha256:sha(individualBytes),
    sourceNineSha256:sha(themesBytes),candidateSha256:sha(bytes),
    candidatePath:target,themeCount:9,historyRows:2268,
    publicationAuthorized:false,d1Writes:0,schedulerWrites:0};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    if(process.argv.length!==3||process.argv[2]!=='--stage-private')fail('USAGE');
    process.stdout.write(JSON.stringify(stageCurrentNineR48({
      dataRoot:process.env.ZGMINI_DATA_ROOT||'E:/ZGmini/data'}),null,2)+'\n');
  }catch(e){process.stderr.write(JSON.stringify({status:'STOP_R48_PRIVATE_STAGE',
    error:e.code??'R48_UNEXPECTED',detail:e.code?undefined:String(e.message)})+'\n');
    process.exitCode=1;}
}
