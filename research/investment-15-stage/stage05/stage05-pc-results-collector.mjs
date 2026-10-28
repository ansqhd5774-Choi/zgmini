/**
 * Stage05-only Windows inventory: inspect saved result JSON files by filename
 * and known handoff fields. Never execute, fetch or score Stage01-04 again.
 * Output contains only paths and whitelisted status/score coverage, no raw JSON.
 */
import {readdir,readFile,stat,writeFile} from 'node:fs/promises';
import {resolve,join,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {calculateFusionStage05,SCHEMA_VERSION} from './stage05-fusion-core.mjs';
import {loadCompletedStageFiles,FILES_MANIFEST_VERSION} from './stage05-completed-files.mjs';

const ignoredDirs=new Set(['.git','.next','node_modules','.venv','venv',
  'cache','__pycache__','.aws','.codex','.agents','secrets','private']);
const candidateName=/(stage0?[1-5]|R7[027]|M4|result|score|snapshot|handoff|manifest|output)/i;
const isScore=value=>typeof value==='number'&&Number.isFinite(value)
  &&value>=0&&value<=100;

export function summarizeSavedJson(file,content){
  if(!content||typeof content!=='object'||Array.isArray(content))return null;
  const fields=content.schemaVersion===SCHEMA_VERSION
    ?content:content.stage01||content.stage02||content.stage03||content.stage04
      ?content:null;
  if(content.schemaVersion===SCHEMA_VERSION){
    let result;
    try{
      result=calculateFusionStage05(content);
    }catch(error){return {path:file,kind:'FOUR_STAGE_SNAPSHOT_INVALID',error:error.message};}
    return {path:file,kind:'FOUR_STAGE_SNAPSHOT',snapshotDate:content.snapshotDate,
      approvedCount:result.summary.approvedCandidateCount,
      scoredCount:result.summary.rankableCount,
      blockedCount:result.summary.blockedCount,
      ranking:result.ranking};
  }
  if(content.version===FILES_MANIFEST_VERSION)
    return {path:file,kind:'STAGE05_COMPLETED_FILES_MANIFEST'};

  const stages={};
  for(const stage of ['stage01','stage02','stage03','stage04']){
    const object=content[stage]??(basename(file).toLowerCase().includes(stage)?content:null);
    if(!object||typeof object!=='object'||Array.isArray(object))continue;
    if(stage==='stage01'&&('risk'in object||'date'in object))
      stages.stage01={status:object.status??null,risk:object.risk??null};
    if(stage==='stage02'&&Array.isArray(object.sectors))
      stages.stage02={status:object.status??null,
        sectors:object.sectors.length,
        withScore:object.sectors.filter(x=>isScore(x?.score)).length};
    if(stage==='stage03'&&Array.isArray(object.themes))
      stages.stage03={status:object.status??null,
        themes:object.themes.length,
        approved:object.themes.filter(x=>x?.approved===true).length,
        withScore:object.themes.filter(x=>isScore(x?.score)).length};
    if(stage==='stage04'&&Array.isArray(object.themes))
      stages.stage04={status:object.status??null,
        themes:object.themes.length,
        verifiedM4:object.themes.filter(x=>isScore(x?.M4)
          &&x?.scoreKind==='STAGE04_M4_FINAL'
          &&x?.scoreValidation==='VERIFIED').length};
  }
  if(Object.keys(stages).length)return {path:file,kind:'STAGE_RESULTS',stages};
  if(content.schema==='ZGMINI_M2_STAGE4_SELECTION_V1')
    return {path:file,kind:'OLD_SELECTION_NOT_FINAL_M4',
      investmentAttractiveness:content.investmentAttractiveness??null};
  if(content.schema==='ZGMINI_M2_STAGE5_SELECTION_V1')
    return {path:file,kind:'OLD_SELECTION_NOT_FINAL_M4',
      investmentScoreAvailable:isScore(content.industryInvestmentScore)};
  if(/(R72|R77|forecast)/i.test(basename(file))
    ||'publisher_adapter_revision'in content ||'run_state'in content)
    return {path:file,kind:'FORECAST_OR_RUN_LOG_NOT_FINAL_M4'};
  if(fields)return {path:file,kind:'UNKNOWN_STAGE_RESULT_SHAPE'};
  return null;
}

export async function collectStage05ResultInventory({roots,maxFiles=3000,
  maxDepth=7,readJson=readFile,readDir=readdir,fileStat=stat}={}){
  if(!Array.isArray(roots)||!roots.length)throw new Error('STAGE05_ROOT_REQUIRED');
  const report={version:'STAGE05_R87_PC_RESULT_INVENTORY',
    examinedAt:new Date().toISOString(),roots:[],files:[],
    summary:{candidateCount:0,completeSnapshots:0,verifiedM4Rows:0,
      readyForOllama:false,limitReached:false}};
  let visited=0;
  const seen=new Set();
  async function walk(path,depth){
    if(depth>maxDepth||visited>=maxFiles)return;
    let entries;
    try{entries=await readDir(path,{withFileTypes:true});}
    catch{return;}
    for(const entry of entries){
      if(visited>=maxFiles){report.summary.limitReached=true;break;}
      const child=join(path,entry.name);
      if(entry.isDirectory()){
        if(!ignoredDirs.has(entry.name)&&depth<maxDepth)await walk(child,depth+1);
        continue;
      }
      if(!entry.isFile()||!entry.name.toLowerCase().endsWith('.json'))continue;
      if(!candidateName.test(entry.name))continue;
      visited++;
      let size;
      try{size=(await fileStat(child)).size;}catch{continue;}
      if(size>5_000_000)continue;
      let parsed;
      try{parsed=JSON.parse(await readJson(child,'utf8'));}catch{continue;}
      const record=summarizeSavedJson(child,parsed);
      if(!record)continue;
      if(record.kind==='STAGE05_COMPLETED_FILES_MANIFEST'){
        try{
          const {snapshot}=await loadCompletedStageFiles(child,{readText:readJson});
          const fusion=calculateFusionStage05(snapshot);
          record.approvedCount=fusion.summary.approvedCandidateCount;
          record.scoredCount=fusion.summary.rankableCount;
          record.ranking=fusion.ranking;
        }catch(error){record.connectionError=error.message;}
      }
      report.files.push(record);
    }
  }
  for(const root of roots){
    const absolute=resolve(root);
    if(seen.has(absolute))continue;
    seen.add(absolute);
    try{
      const info=await fileStat(absolute);
      if(!info.isDirectory())throw new Error('NOT_DIRECTORY');
      report.roots.push({path:absolute,status:'AVAILABLE'});
      await walk(absolute,0);
    }catch(error){report.roots.push({path:absolute,status:'UNAVAILABLE'});}
  }
  report.summary.candidateCount=report.files.length;
  report.summary.completeSnapshots=report.files.filter(x=>
    x.kind==='FOUR_STAGE_SNAPSHOT'||x.kind==='STAGE05_COMPLETED_FILES_MANIFEST').length;
  report.summary.verifiedM4Rows=Math.max(0,...report.files.map(x=>
    x.kind==='STAGE_RESULTS'?x.stages.stage04?.verifiedM4??0:x.scoredCount??0));
  report.summary.readyForOllama=report.files.some(x=>x.scoredCount===9
    &&x.approvedCount===9);
  return report;
}

async function main(){
  const args=process.argv.slice(2);
  if(args.length===1&&args[0]==='--help'){
    process.stdout.write('Usage: node stage05-pc-results-collector.mjs --root DIR [--extra-root DIR] [--output-dir DIR]\n');
    return;
  }
  let root=null,outputDir=null;
  const extra=[];
  for(let i=0;i<args.length;i+=2){
    const flag=args[i],value=args[i+1];
    if(!value)throw new Error('STAGE05_COLLECTOR_ARGUMENT_MISSING');
    if(flag==='--root'&&!root)root=value;
    else if(flag==='--extra-root')extra.push(value);
    else if(flag==='--output-dir'&&!outputDir)outputDir=value;
    else throw new Error('STAGE05_COLLECTOR_ARGUMENT_INVALID');
  }
  if(!root||!outputDir)throw new Error('STAGE05_COLLECTOR_ROOT_AND_OUTPUT_REQUIRED');
  const report=await collectStage05ResultInventory({roots:[root,...extra]});
  const filename=`STAGE05_R87_PC_LOG_${new Date().toISOString().replace(/[:.]/g,'-')}_${process.pid}.json`;
  const filepath=join(resolve(outputDir),filename);
  await writeFile(filepath,`${JSON.stringify(report,null,2)}\n`,{encoding:'utf8',flag:'wx'});
  process.stdout.write(`STAGE05_R87_STATUS=${report.summary.readyForOllama?'READY':'WAITING_FOR_COMPLETED_SCORE_FILES'}\n`);
  process.stdout.write(`STAGE05_R87_CANDIDATES=${report.summary.candidateCount}\n`);
  process.stdout.write(`STAGE05_R87_VERIFIED_M4_ROWS=${report.summary.verifiedM4Rows}\n`);
  process.stdout.write(`STAGE05_R87_LOG_JSON=${filepath}\n`);
  if(!report.summary.readyForOllama)process.exitCode=2;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
  main().catch(error=>{
    process.stderr.write(`STAGE05_R87_FAILED=${error.message}\n`);
    process.exitCode=1;
  });
