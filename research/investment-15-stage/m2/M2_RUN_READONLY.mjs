// Double-click M2_RUN_READONLY.cmd. Stage 4 and 5 TEST selections are bundled.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildLiveModel,downloadFeed} from './m2-live-feeds.mjs';
import {renderHtml,renderSummary} from './m2-live-report.mjs';
import {loadStage4Selection,buildStage5Research} from './m2-stage5-robotics.mjs';
import {loadStage5Selection,buildStage6Research} from './m2-stage6-company-exposure.mjs';
import {SOURCE_POLICY,withoutProhibitedStage6Evidence,blockedLegacyFinancials} from './m2-source-policy.mjs';
import {downloadUsListingFeed,buildUsMarketUniverse} from './m2-stage6-us-universe.mjs';
import {downloadRoboticsCompanyList,downloadRoboticsUsCategory,
 parseRoboticsCompanyList,parseRoboticsUsCategory,mergeRoboticsNames,
 discoverRoboticsListedCompanies} from './m2-stage6-robotics-discovery.mjs';
import {runBusinessQuantPrivate} from './m2-stage6-businessquant.mjs';
import {runIssuerProductVerification} from './m2-stage6-issuer-products-r23.mjs';
import {runAllowedEarningsVerification} from './m2-stage7-issuer-earnings-r24.mjs';
import {buildStage8ScorecardBridge} from './m2-stage8-scorecard-bridge.mjs';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
export const OUTPUT_HTML='M2_LATEST_REPORT.html';
export const OUTPUT_STATUS='M2_LATEST_STATUS.txt';

export async function collectLive({loader=downloadFeed,now=()=>new Date().toISOString()}={}) {
 const results=await Promise.all(['market','sector','theme'].map(async kind=>{
  try{return [kind,{body:await loader(kind)}]}
  catch(error){return [kind,{error:String(error?.message||'NETWORK_ERROR')}]}
 }));
 return buildLiveModel(Object.fromEntries(results),{retrievedAt:now()});
}

function writeAtomic(destination,data){
 const temporary=destination+`.tmp-${process.pid}`;
 try {fs.writeFileSync(temporary,data,{encoding:'utf8',flag:'wx'});fs.renameSync(temporary,destination)}
 finally {if(fs.existsSync(temporary))fs.unlinkSync(temporary)}
}

export async function runLocal({loader=downloadFeed,now=()=>new Date().toISOString(),directory=ROOT,
 universeLoader=loader===downloadFeed?downloadUsListingFeed:null,
 roboticsLoader=loader===downloadFeed?downloadRoboticsCompanyList:null,
 roboticsUsLoader=loader===downloadFeed?downloadRoboticsUsCategory:null,
 businessQuantKey=loader===downloadFeed?process.env.M2_BUSINESSQUANT_API_KEY||'':'',
 businessQuantRunner=runBusinessQuantPrivate,
 productVerificationRunner=null,earningsVerificationRunner=null}={}){
 const model=await collectLive({loader,now});
 model.sourcePolicy=SOURCE_POLICY;
 const listingPromise=Promise.all(['nasdaq','other'].map(async kind=>{
  if(!universeLoader)return [kind,{error:'UNIVERSE_LOADER_NOT_CONFIGURED'}];
  try{return [kind,await universeLoader(kind)];}
  catch(error){return [kind,{error:String(error?.message||'LISTING_NETWORK_ERROR')}];}
 }));
 const roboticsPromise=roboticsLoader?roboticsLoader().then(body=>({body}),
  error=>({error:String(error?.message||'WIKIMEDIA_NETWORK_ERROR')})):
  Promise.resolve({error:'ROBOTICS_LOADER_NOT_CONFIGURED'});
 const roboticsUsPromise=roboticsUsLoader?roboticsUsLoader().then(body=>({body}),
  error=>({error:String(error?.message||'WIKIMEDIA_US_CATEGORY_NETWORK_ERROR')})):
  Promise.resolve({error:'ROBOTICS_US_LOADER_NOT_CONFIGURED'});
 const [listingEntries,roboticsResponse,roboticsUsResponse]=await Promise.all([listingPromise,roboticsPromise,roboticsUsPromise]);
 model.usUniverse=buildUsMarketUniverse(Object.fromEntries(listingEntries),model.retrievedAt);
 // Optional PERSONAL screen; no key -> zero vendor requests; never mix in
 // vendor data as verified humanoid businesses or override archived evidence.
 model.businessQuant=await businessQuantRunner({apiKey:businessQuantKey,
  usUniverse:model.usUniverse,retrievedAt:model.retrievedAt});
 // Every run independently checks the four currently identified companies'
 // own publicly posted product statements. Failures never become positive facts.
 const verifyProducts=productVerificationRunner||
  (loader===downloadFeed?runIssuerProductVerification:
   async()=>({status:'BLOCKED',reason:'OFFLINE_TEST_NO_PRODUCT_SOURCE_REQUESTS',items:[],matched:0,requested:0}));
 model.productEvidence=await verifyProducts({businessQuant:model.businessQuant,
  retrievedAt:model.retrievedAt});
 // Fresh standalone issuer-issued earnings releases: this NEW lane is not an
 // exception to the permanent ban on historical regulator-derived snapshots.
 const verifyEarnings=earningsVerificationRunner||
  (loader===downloadFeed?runAllowedEarningsVerification:
   async()=>({status:'BLOCKED',reason:'OFFLINE_TEST_NO_EARNINGS_SOURCE_REQUESTS',
    items:[],matched:0,requested:0}));
 model.allowedEarnings=await verifyEarnings({businessQuant:model.businessQuant,
  retrievedAt:model.retrievedAt});
 // Absolute source ban: never import, fetch, parse, re-display or score its facts.
 model.liveIssuer={status:'DISABLED_BY_SOURCE_POLICY',items:[],selectedCount:0};
 // Stage 8 is independent of market readiness: a missing/corrupt original
 // standard blocks scorecards only, never rewrites the original market audit.
 model.stage8=buildStage8ScorecardBridge({businessQuant:model.businessQuant,
  productEvidence:model.productEvidence,retrievedAt:model.retrievedAt});
 try{
  if(roboticsResponse.error)throw Error(roboticsResponse.error);
  const world=parseRoboticsCompanyList(roboticsResponse.body);
  let category=[];let categoryIssue=null;
  try{
   if(roboticsUsResponse.error)throw Error(roboticsUsResponse.error);
   category=parseRoboticsUsCategory(roboticsUsResponse.body);
  }catch(error){categoryIssue=String(error?.message||'WIKIMEDIA_US_CATEGORY_ERROR');}
  const names=mergeRoboticsNames(world,category);
  model.roboticsDiscovery=discoverRoboticsListedCompanies(names,model.usUniverse,model.retrievedAt);
  model.roboticsDiscovery.worldCandidatePool=world.length;
  model.roboticsDiscovery.usCategoryPool=category.length;
  model.roboticsDiscovery.usCategoryIssue=categoryIssue;
 }catch(error){model.roboticsDiscovery={status:'BLOCKED',reason:String(error?.message||'WIKIMEDIA_PARSE_ERROR'),
  companyCandidates:[],matchingCount:0,candidatePool:null};}
 model.stage5=buildStage5Research(loadStage4Selection(directory),model,model.retrievedAt);
 model.stage6=withoutProhibitedStage6Evidence(
  buildStage6Research(loadStage5Selection(directory),model.stage5,model.retrievedAt));
 model.stage7=blockedLegacyFinancials(model.stage6);
 // Only these two program-owned report files are overwritten on subsequent runs.
 writeAtomic(path.join(directory,OUTPUT_HTML),renderHtml(model));
 writeAtomic(path.join(directory,OUTPUT_STATUS),renderSummary(model));
 return {status:model.status,model,report:path.join(directory,OUTPUT_HTML),statusFile:path.join(directory,OUTPUT_STATUS)};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  console.log('Fetching ZGMINI score feeds and official US exchange symbol directories (READ ONLY)...');
  const report=await runLocal();
  console.log(`STATUS=${report.status}`);
  for(const [name,f] of Object.entries(report.model.feeds)){
   console.log(`${name.toUpperCase()}=${f.status}${f.date?` DATE=${f.date}`:` REASON=${f.reason}`}`);
  }
  console.log(`US_UNIVERSE=${report.model.usUniverse.status}${report.model.usUniverse.totalRows===null?` REASON=${report.model.usUniverse.reason}`:` POTENTIAL_LISTINGS=${report.model.usUniverse.totalRows}`}`);
  console.log(`ROBOTICS_DISCOVERY=${report.model.roboticsDiscovery.status} US_MATCHED=${report.model.roboticsDiscovery.matchingCount}${report.model.roboticsDiscovery.reason?` REASON=${report.model.roboticsDiscovery.reason}`:''}`);
  console.log(`WIKIMEDIA_US_CATEGORY=${report.model.roboticsDiscovery.usCategoryIssue||'READY'} ENTRIES=${report.model.roboticsDiscovery.usCategoryPool||0}`);
  console.log(`AUTOMATED_COMPANY_SCREENING=${report.model.usUniverse.screeningStatus}`);
  console.log(`BUSINESSQUANT_PRIVATE_SCREEN=${report.model.businessQuant.status} MATCHED=${report.model.businessQuant.screenedMatchCount||0}`);
  console.log(`ISSUER_PRODUCT_STATEMENTS=${report.model.productEvidence.status} OBSERVED=${report.model.productEvidence.matched||0}/${report.model.productEvidence.requested||0}`);
  console.log(`ALLOWED_ISSUER_EARNINGS=${report.model.allowedEarnings.status} OBSERVED=${report.model.allowedEarnings.matched||0}/${report.model.allowedEarnings.requested||0}`);
  console.log(`HTML=${report.report}`);
  console.log(`STATUS_FILE=${report.statusFile}`);
 }catch(error){
  console.error(`M2_FATAL_ERROR=${error?.message||'UNKNOWN'}`);
  process.exitCode=1;
 }
}
