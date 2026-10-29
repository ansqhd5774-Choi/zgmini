/** Stage05 R89: read-only user-confirmed theme handoff. */
import {readFile} from 'node:fs/promises';
import {calculateFusionStage05,SCHEMA_VERSION} from './stage05-fusion-core.mjs';

const print=value=>process.stdout.write(`${JSON.stringify(value,null,2)}\n`);
const args=process.argv.slice(2);
async function run(){
  if(args.length===1&&args[0]==='--help'){
    process.stdout.write('Usage:\n'
      +'  node stage05-fusion-readonly.mjs --input confirmed-stage01-04-results.json\n'
      +'  node stage05-fusion-readonly.mjs --handoff-input confirmed-stage01-04-results.json [--r77-report SAVED_R77.json]\n'
      +'  node stage05-fusion-readonly.mjs --stage-files completed-files-manifest.json\n'
      +'  node stage05-fusion-readonly.mjs --handoff-stage-files completed-files-manifest.json\n'
      +'  node stage05-fusion-readonly.mjs --audit-live\n'
      +'  node stage05-fusion-readonly.mjs --audit-contract\n'
      +`Schema: ${SCHEMA_VERSION}. Historic industry YoY/accel and G/D/M4/S5 programs retired.\n`);
    return;
  }
  if(args.length===2&&args[0]==='--input'){
    const snapshot=JSON.parse(await readFile(args[1],'utf8'));
    const result=calculateFusionStage05(snapshot);
    print({runType:'EXPLICIT_USER_CONFIRMED_SNAPSHOT',...result});
    if(!result.summary.confirmedCount)process.exitCode=2;
    return;
  }
  if(args.length===2&&['--stage-files','--handoff-stage-files'].includes(args[0])){
    const {loadCompletedStageFiles}=await import('./stage05-completed-files.mjs');
    const {snapshot}=await loadCompletedStageFiles(args[1]);
    const fusion=calculateFusionStage05(snapshot);
    if(args[0]==='--stage-files'){
      print({runType:'EXPLICIT_FOUR_COMPLETED_FILES',...fusion});
      if(!fusion.summary.confirmedCount)process.exitCode=2;
    }else{
      const {buildVerifiedResultsHandoff}=await import('./stage05-verified-results-handoff.mjs');
      const handoff=buildVerifiedResultsHandoff({completedSnapshot:snapshot,fusion});
      print(handoff);
      if(!handoff.ollamaInput)process.exitCode=2;
    }
    return;
  }
  if(args[0]==='--handoff-input'&&args[1]){
    if(args.length!==2&&!(args.length===4&&args[2]==='--r77-report'))
      throw new Error('STAGE05_HANDOFF_ARGUMENT_INVALID');
    const snapshot=JSON.parse(await readFile(args[1],'utf8'));
    const fusion=calculateFusionStage05(snapshot);
    const {buildVerifiedResultsHandoff}=await import('./stage05-verified-results-handoff.mjs');
    let handoff=buildVerifiedResultsHandoff({completedSnapshot:snapshot,fusion});
    if(args.length===4){
      const {attachSavedR77ToStage05}=await import('./stage05-r77-result-bridge.mjs');
      handoff=attachSavedR77ToStage05({handoff,
        savedR77:JSON.parse(await readFile(args[3],'utf8'))});
    }
    print(handoff);
    if(!handoff.ollamaInput)process.exitCode=2;
    return;
  }
  if(args.length===1&&args[0]==='--audit-contract'){
    print({runType:'STATIC_CODE_CONTRACT_AUDIT',status:'INPUT_GAPS_NOT_RESOLVED',
      required:['STAGE01_MARKET_SCORE','STAGE02_COMPLETED_CONTEXT',
        'STAGE03_APPROVED_ROSTER','STAGE04_EXPLICIT_USER_CONFIRMED_SELECTION'],
      forecastCagr:'RESEARCH_ONLY',newScoreCalculation:false,
      selectedThemeIds:[],tradeState:'NO_TRADE'});
    process.exitCode=2;
    return;
  }
  if(args.length===1&&args[0]==='--audit-live'){
    const {downloadFeed,buildLiveModel,FEEDS}=await import('../m2/m2-live-feeds.mjs');
    const response=await Promise.all(Object.keys(FEEDS).map(async kind=>{
      try{return [kind,{body:await downloadFeed(kind)}];}
      catch(error){return [kind,{error:String(error?.message||error)}];}
    }));
    const live=buildLiveModel(Object.fromEntries(response));
    print({runType:'LIVE_F_COVERAGE_ONLY',status:'STAGE04_USER_CONFIRMATION_NOT_VERIFIED',
      feedStatus:live.status,
      feeds:Object.fromEntries(Object.entries(live.feeds).map(([name,value])=>
        [name,{status:value.status,date:value.date??null}])),
      confirmedThemeIds:[],tradeState:'NO_TRADE'});
    process.exitCode=2;
    return;
  }
  throw new Error('INVALID_ARGUMENTS_USE_--help');
}
run().catch(error=>{print({status:'FAILED',error:String(error?.message||error),
  confirmedThemeIds:[],tradeState:'NO_TRADE'});process.exitCode=1;});
