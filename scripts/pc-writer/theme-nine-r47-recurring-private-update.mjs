// R47 one-shot entrypoint. Suitable for a separately configured PC scheduler;
// intentionally does NOT register, change, trigger or delete any PC task.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {runNineR47Recurring,planNineR47Recurring} from './theme-nine-r47-recurring-private-refresh.mjs';
import {calculateNineR47PrivateScores} from './theme-nine-r47-private-score.mjs';
import {calculateNineR47PrivateThemes,loadNineR47OfficialEvidence} from
  './theme-nine-r47-private-theme-aggregate.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const sha=x=>createHash('sha256').update(x).digest('hex');
const fail=code=>{throw Object.assign(new Error('THEME_NINE_R47_'+code),
  {code:'THEME_NINE_R47_'+code});};
const evidenceFile=name=>{
  const adjacent=path.join(HERE,name);
  return fs.existsSync(adjacent)?adjacent:path.join(HERE,'../../config',name);
};
const settings=({dataRoot,rosterPath}={})=>({
  dataRoot:dataRoot||process.env.ZGMINI_DATA_ROOT||'E:/ZGmini/data',
  rosterPath:rosterPath||process.env.ZGMINI_R47_ROSTER_PATH||
    evidenceFile('theme-nine-r20-approved-candidates.json')});

function savePrivateShadow(dataRoot,scores,themes){
  const storage=path.join(fs.realpathSync(dataRoot),'themes','legacy-nine-r47-private');
  fs.mkdirSync(storage,{recursive:true});
  const real=fs.realpathSync(storage);
  if(real!==path.resolve(storage))fail('PRIVATE_SHADOW_DIRECTORY_REDIRECT');
  const scoreBytes=Buffer.from(JSON.stringify(scores,null,2)+'\n');
  const themeBytes=Buffer.from(JSON.stringify(themes,null,2)+'\n');
  const digest=sha(Buffer.concat([scoreBytes,themeBytes])).slice(0,16);
  const prefix=`THEME_NINE_R47_PRIVATE_${themes.benchmarkDate}_${digest}`;
  const first=path.join(storage,prefix+'_ETF.json');
  const second=path.join(storage,prefix+'_NINE.json');
  if(fs.existsSync(first)!==fs.existsSync(second))fail('PRIVATE_SHADOW_PAIR_INCOMPLETE');
  if(fs.existsSync(first)){
    if(sha(fs.readFileSync(first))!==sha(scoreBytes)||
       sha(fs.readFileSync(second))!==sha(themeBytes))fail('PRIVATE_SHADOW_SHA_DRIFT');
    return {status:'PRIVATE_SHADOW_ALREADY_VERIFIED',
      scoreFile:first,themeFile:second,scoreSha256:sha(scoreBytes),
      themeSha256:sha(themeBytes),writtenFiles:0};
  }
  fs.writeFileSync(first,scoreBytes,{flag:'wx'});
  fs.writeFileSync(second,themeBytes,{flag:'wx'});
  return {status:'PRIVATE_SHADOW_SAVED_NOT_PUBLISHED',
    scoreFile:first,themeFile:second,scoreSha256:sha(scoreBytes),
    themeSha256:sha(themeBytes),writtenFiles:2};
}

export async function updateNineR47Private({dataRoot,rosterPath,now=new Date(),
  fetchImpl=fetch,sleep,auto=true,officialEvidence=null}={}){
  const arg=settings({dataRoot,rosterPath});
  const collected=await runNineR47Recurring({...arg,now,fetchImpl,auto,
    ...(sleep?{sleep}:{})});
  if(collected.status.startsWith('STOP'))return {status:collected.status,
    stage:'SOURCE_COLLECTION',collection:collected,publicationAuthorized:false};
  const after=planNineR47Recurring({...arg,now});
  if(!after.verifiedCompletedWindows.length){
    return {contract:'THEME_NINE_R47_PRIVATE_AUTOMATIC_UPDATE_V1',
      status:collected.status,stage:'WAIT_FIRST_COMPLETE_PRIVATE_SOURCE',
      collection:collected,shadow:null,publicationAuthorized:false,
      d1Writes:0,schedulerWrites:0,publicationWrites:0};
  }
  const scores=calculateNineR47PrivateScores({...arg,now});
  const configDirectory=path.dirname(evidenceFile('theme-nine-r26-official-aum-evidence.json'));
  const evidence=officialEvidence??loadNineR47OfficialEvidence({configDirectory,
    rosterPath:arg.rosterPath});
  const themes=calculateNineR47PrivateThemes({scores,...evidence});
  const shadow=savePrivateShadow(arg.dataRoot,scores,themes);
  return {contract:'THEME_NINE_R47_PRIVATE_AUTOMATIC_UPDATE_V1',
    status:shadow.status,stage:'COLLECT_MERGE_R25_R32_PRIVATE_COMPLETE',
    benchmarkDate:themes.benchmarkDate,collection:collected,
    shadow,counts:themes.counts,
    sourceMode:scores.priceMode,formulaChanged:false,rosterChanged:false,
    publicationAuthorized:false,d1Writes:0,schedulerWrites:0,
    publicationWrites:0};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    if(process.argv.length!==3||!['--plan','--update-private'].includes(process.argv[2]))
      fail('USAGE');
    const args=settings();
    const result=process.argv[2]==='--plan'?planNineR47Recurring(args):
      await updateNineR47Private(args);
    process.stdout.write(JSON.stringify(result,null,2)+'\n');
    if(result.status.startsWith('STOP'))process.exitCode=2;
  }catch(e){process.stderr.write(JSON.stringify({status:'STOP_R47_PRIVATE_UPDATE',
    error:e.code||'UNEXPECTED_ERROR',message:e.code?undefined:e.message})+'\n');
    process.exitCode=1;}
}
