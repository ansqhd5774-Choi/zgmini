/** Stage05 runner: consume completed 01-04 outputs; legacy coverage tools are separate. */
import {readFile,writeFile,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {calculateFusionStage05,SCHEMA_VERSION} from './stage05-fusion-core.mjs';

const print = value => process.stdout.write(`${JSON.stringify(value,null,2)}\n`);
const args = process.argv.slice(2);
const kstToday = () => new Intl.DateTimeFormat('en-CA',{
  year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Asia/Seoul',
}).format(new Date());
async function saveUniqueJson(outputDir,prefix,report) {
  if(!(await stat(outputDir)).isDirectory())throw new Error('OUTPUT_DIR_NOT_DIRECTORY');
  const timestamp=new Date().toISOString().replace(/[:.]/g,'-');
  const file=join(outputDir,`${prefix}_${timestamp}_${process.pid}.json`);
  await writeFile(file,`${JSON.stringify(report,null,2)}\n`,{encoding:'utf8',flag:'wx'});
  return file;
}

async function run() {
  if (args.length === 1 && args[0] === '--help') {
    process.stdout.write('Usage:\n  node stage05-fusion-readonly.mjs --audit-existing-live [--output-dir EXISTING_DIR]\n'
      + '  node stage05-fusion-readonly.mjs --audit-existing\n'
      + '  node stage05-fusion-readonly.mjs --handoff-existing\n'
      + '  node stage05-fusion-readonly.mjs --handoff-input completed-stage01-04-results.json\n'
      + '  node stage05-fusion-readonly.mjs --handoff-r77 [--output-dir EXISTING_DIR]\n'
      + '  node stage05-fusion-readonly.mjs --handoff-input SNAPSHOT.json --r77-report SAVED_R77.json [--output-dir EXISTING_DIR]\n'
      + '  node stage05-fusion-readonly.mjs --audit-live\n'
      + '  node stage05-fusion-readonly.mjs --audit-fda-growth-live [--output-dir EXISTING_DIR]\n'
      + '  node stage05-fusion-readonly.mjs --input completed-stage01-04-results.json\n'
      + '  node stage05-fusion-readonly.mjs --audit-contract\n'
      + `Schema: ${SCHEMA_VERSION}; output is stdout JSON, read-only.\n`);
    return;
  }
  if((args.length===1||args.length===3&&args[1]==='--output-dir')
    &&args[0]==='--audit-fda-growth-live') {
    const {fetchLatestOfficialFdaCder}=await import('../stage04/fda-cder-official-readonly.mjs');
    const {previewFdaCderFromOriginalVerifiedResult}=await import('./stage05-industry-series-research.mjs');
    const source=await fetchLatestOfficialFdaCder(); // existing official PDF, one explicit GET only
    const result=previewFdaCderFromOriginalVerifiedResult(source,{
      asOfDate:kstToday(),validatedDate:kstToday()});
    const report={runType:'R80_FDA_ONE_VINTAGE_INDUSTRY_PROXY_PREVIEW',
      status:'RESEARCH_ONLY_NOT_STAGE04_M4',...result};
    if(args.length===3){
      const file=await saveUniqueJson(args[2],'STAGE05_R80_FDA_PREVIEW',report);
      process.stdout.write(`STAGE05_R80_FDA_JSON=${file}\n`
        +'FDA PDF proof verified; historical growth preview only; M4/S5 NULL.\n');
    }else print(report);
    process.exitCode=2;
    return;
  }
  if ((args.length === 1 || args.length === 3 && args[1] === '--output-dir')
    && ['--audit-existing','--audit-existing-live'].includes(args[0])) {
    const isLive=args[0]==='--audit-existing-live';
    const outputDir=args.length===3?args[2]:null;
    const {buildExistingEvidenceAudit}=await import('./stage05-existing-evidence-bridge.mjs');
    const archiveText=await readFile(new URL(
      '../STAGE04_INVESTMENT_BOT_R17_SENTIMENT_INDUSTRY_CONTRAST_20261025.md',import.meta.url),'utf8');
    let liveModel=null,liveF=null,liveError=null;
    if(isLive){
      const {downloadFeed,buildLiveModel,FEEDS}=await import('../m2/m2-live-feeds.mjs');
      const {selectThemeF}=await import('../stage04/latest-f-readonly.mjs');
      const {normalizeSelectedThemeF}=await import('../stage04-r67/live-f-adapter-r67.mjs');
      const retrieved=await Promise.all(Object.keys(FEEDS).map(async kind=>{
        try{return [kind,{body:await downloadFeed(kind)}];}
        catch(error){return [kind,{error:String(error?.message||error)}];}
      }));
      const source=Object.fromEntries(retrieved);
      liveModel=buildLiveModel(source);
      try{
        if(source.theme?.error)throw new Error(source.theme.error);
        liveF=normalizeSelectedThemeF(selectThemeF(source.theme.body,{
          asOfDate:kstToday(),expectedThemes:source.theme.body?.themes?.length||9,
        }), 'https://zgmini.kr/api/theme-fear-greed');
      }catch(error){liveError=String(error?.message||error);}
    }
    const audit=buildExistingEvidenceAudit({r17Markdown:archiveText,
      asOfDate:kstToday(),liveF,liveModel});
    const report={...audit,liveFError:liveError,
      sourceMode:isLive?'LIVE_PUBLIC_GET_PLUS_ARCHIVE':'ARCHIVE_ONLY'};
    if(outputDir){
      const file=await saveUniqueJson(outputDir,'STAGE05_R79_AUDIT',report);
      process.stdout.write(`STAGE05_R79_AUDIT_JSON=${file}\n`
        + `APPROVED=${audit.coverage.approvedThemes} HISTORICAL_F=${audit.coverage.historicalF}`
        + ` INDUSTRY_SOURCES=${audit.coverage.historicalIndustrySourceObserved}`
        + ` CURRENT_F=${audit.coverage.currentFMatched} RANKABLE=${audit.selection.rankableCount}\n`);
    }else print(report);
    process.exitCode=2; // archive + source coverage is not an investable score.
    return;
  }
  if (args.length === 2 && args[0] === '--input') {
    const raw = await readFile(args[1],'utf8');
    const result = calculateFusionStage05(JSON.parse(raw));
    print({runType:'EXPLICIT_VERIFIED_SNAPSHOT',...result});
    if (result.summary.rankableCount === 0) process.exitCode = 2;
    return;
  }
  if (['--handoff-existing','--handoff-input','--handoff-r77'].includes(args[0])) {
    const explicit=args[0]==='--handoff-input';
    if (explicit && !args[1]) throw new Error('STAGE05_SNAPSHOT_PATH_REQUIRED');
    const options={r77Report:null,outputDir:null};
    const starting=explicit?2:1;
    for(let i=starting;i<args.length;i+=2){
      const flag=args[i],value=args[i+1];
      if(!['--r77-report','--output-dir'].includes(flag)||!value)
        throw new Error('STAGE05_HANDOFF_ARGUMENT_INVALID');
      const key=flag==='--r77-report'?'r77Report':'outputDir';
      if(options[key]!==null)throw new Error('STAGE05_HANDOFF_DUPLICATE_ARGUMENT');
      options[key]=value;
    }
    if(args[0]==='--handoff-r77'&&!options.r77Report)
      options.r77Report=new URL('../stage04/R72_OLLAMA_FORECAST_PIPELINE_RESULT.json',import.meta.url);
    const {buildVerifiedResultsHandoff}=await import('./stage05-verified-results-handoff.mjs');
    const snapshot=explicit?JSON.parse(await readFile(args[1],'utf8')):null;
    let audit=null;
    if(!explicit){
      // Legacy coverage-only mode. An explicit completed-results handoff never
      // reloads or re-evaluates any Stage01-04 archive or operational feed.
      const {buildExistingEvidenceAudit}=await import('./stage05-existing-evidence-bridge.mjs');
      const original=await readFile(new URL(
        '../STAGE04_INVESTMENT_BOT_R17_SENTIMENT_INDUSTRY_CONTRAST_20261025.md',import.meta.url),'utf8');
      audit=buildExistingEvidenceAudit({r17Markdown:original,asOfDate:kstToday()});
    }
    const fusion=explicit?calculateFusionStage05(snapshot):null;
    let handoff=buildVerifiedResultsHandoff({audit,completedSnapshot:snapshot,fusion});
    if(options.r77Report){
      const {attachSavedR77ToStage05}=await import('./stage05-r77-result-bridge.mjs');
      const savedR77=JSON.parse(await readFile(options.r77Report,'utf8'));
      handoff=attachSavedR77ToStage05({handoff,savedR77});
    }
    if(options.outputDir){
      const file=await saveUniqueJson(options.outputDir,'STAGE05_R83_SAVED_R77_HANDOFF',handoff);
      process.stdout.write(`STAGE05_HANDOFF_JSON=${file}\n`
        + `STATUS=${handoff.status} SAVED_R77=${handoff.stage04SavedR77Forecast?.status||'NOT_ATTACHED'}`
        + ` SCORED=${handoff.coverage.verifiedCompleteScores}/${handoff.coverage.requiredCompleteScores}\n`);
    }else print(handoff);
    if(handoff.ollamaInput===null)process.exitCode=2;
    return;
  }
  if (args.length === 1 && args[0] === '--audit-contract') {
    print({runType:'STATIC_CODE_CONTRACT_AUDIT',status:'INPUT_GAPS_NOT_RESOLVED',
      meaning:'Local contract audit only; does not prove current PC/web accessibility.',
      feeds:['/api/fear-greed','/api/sector-fear-greed','/api/theme-fear-greed'],
      verifiedAvailability:{stage01:'REQUIRES_PREVIOUS_STAGE_RESULT',
        stage02:'REQUIRES_COMPLETED_SECTOR_SCORE',
        stage03:'REQUIRES_COMPLETED_THEME_SCORE',
        stage04:'REQUIRES_COMPLETED_VERIFIED_M4_NOT_FORECAST_CAGR'},
      S5:null,selectedThemeId:null});
    process.exitCode = 2;
    return;
  }
  if (args.length === 1 && args[0] === '--audit-live') {
    // Reuse the existing M2 public endpoint loader; its scores are never converted
    // into ETF price RS/trend or Stage04 realized-industry G/D/M.
    const {downloadFeed,buildLiveModel,FEEDS} = await import('../m2/m2-live-feeds.mjs');
    const results = await Promise.all(Object.keys(FEEDS).map(async kind => {
      try { return [kind,{body:await downloadFeed(kind)}]; }
      catch(error) { return [kind,{error:String(error?.message||error)}]; }
    }));
    const live=buildLiveModel(Object.fromEntries(results));
    const statuses=Object.fromEntries(Object.entries(live.feeds).map(([key,feed])=>
      [key,{status:feed.status,date:feed.date||null,
        observationCount:feed.items?.length||feed.points?.length||0,
        reason:feed.reason||null}]));
    const missing=['STAGE02_COMPLETED_SECTOR_SCORE_HANDOFF',
      'STAGE03_COMPLETED_THEME_SCORE_HANDOFF',
      'STAGE03_APPROVED_CANDIDATE_ID_MAPPING',
      'STAGE04_COMPLETED_VERIFIED_FINAL_M4_HANDOFF'];
    print({runType:'LIVE_STAGE01_03_FEED_COVERAGE',retrievedAt:live.retrievedAt,
      status:'S5_INPUT_INCOMPLETE',feedStatus:live.status,feeds:statuses,
      marketRisk:'UNVERIFIED_FROM_FEAR_GREED_ONLY',
      feedAudit:live.audit?.status||'UNAVAILABLE',
      missingContracts:missing,S5:null,selectedThemeId:null,
      interpretation:'Legacy live-feed coverage is not a completed Stage01-04 handoff. Stage05 does not recalculate ETF relative strength, trend, or G1/G2/F.'});
    process.exitCode = 2;
    return;
  }
  throw new Error('INVALID_ARGUMENTS_USE_--help');
}

run().catch(error => {
  print({runType:'STAGE05_READONLY',status:'FAILED',error:String(error?.message||error),
    S5:null,selectedThemeId:null});
  process.exitCode = 1;
});
