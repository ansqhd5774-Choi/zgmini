/** Stage05 runner: explicit 01-04 snapshot OR read-only source-coverage audit. */
import {readFile} from 'node:fs/promises';
import {calculateFusionStage05,SCHEMA_VERSION} from './stage05-fusion-core.mjs';

const print = value => process.stdout.write(`${JSON.stringify(value,null,2)}\n`);
const args = process.argv.slice(2);

async function run() {
  if (args.length === 1 && args[0] === '--help') {
    process.stdout.write('Usage:\n  node stage05-fusion-readonly.mjs --audit-live\n'
      + '  node stage05-fusion-readonly.mjs --input verified-stage01-04-snapshot.json\n'
      + '  node stage05-fusion-readonly.mjs --audit-contract\n'
      + `Schema: ${SCHEMA_VERSION}; output is stdout JSON, read-only.\n`);
    return;
  }
  if (args.length === 2 && args[0] === '--input') {
    const raw = await readFile(args[1],'utf8');
    const result = calculateFusionStage05(JSON.parse(raw));
    print({runType:'EXPLICIT_VERIFIED_SNAPSHOT',...result});
    if (result.summary.rankableCount === 0) process.exitCode = 2;
    return;
  }
  if (args.length === 1 && args[0] === '--audit-contract') {
    print({runType:'STATIC_CODE_CONTRACT_AUDIT',status:'INPUT_GAPS_NOT_RESOLVED',
      meaning:'Local contract audit only; does not prove current PC/web accessibility.',
      feeds:['/api/fear-greed','/api/sector-fear-greed','/api/theme-fear-greed'],
      verifiedAvailability:{stage01:'REQUIRES_LIVE_CHECK',stage02:'FEAR_GREED_SCORE_NOT_PRICE_RS',
        stage03:'FEAR_GREED_SCORE_NOT_PRICE_TREND',stage04:'FORECAST_CAGR_NOT_REALIZED_M4'},
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
    const missing=['STAGE02_VERIFIED_ETF_PRICE_RELATIVE_STRENGTH',
      'STAGE03_VERIFIED_ETF_PRICE_TREND',
      'STAGE03_APPROVED_CANDIDATE_ID_MAPPING',
      'STAGE04_REALIZED_G1_G2_F_G_D_M4_QUANTIFIED'];
    print({runType:'LIVE_STAGE01_03_FEED_COVERAGE',retrievedAt:live.retrievedAt,
      status:'S5_INPUT_INCOMPLETE',feedStatus:live.status,feeds:statuses,
      marketRisk:'UNVERIFIED_FROM_FEAR_GREED_ONLY',
      feedAudit:live.audit?.status||'UNAVAILABLE',
      missingContracts:missing,S5:null,selectedThemeId:null,
      interpretation:'Feed availability is not verified Stage02 ETF price RS, Stage03 ETF price trend, or Stage04 actual growth.'});
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
