import {createProgressiveComputationCache} from './market-score-computation-cache.mjs';
import {buildCompositeMarketScore} from "../lib/market-score/composite-model-r1.mjs";
import {buildLegacyMarketInflationDomain} from "../lib/market-score/inflation-legacy-public-domain.mjs";
import {buildCmR1DomainResults} from "../lib/market-score/domain-adapter-r1.mjs";
import {buildConsumptionC1} from "../lib/market-score/public-domain-producers-r1.mjs";
import {buildCommoditiesK1R2} from "../lib/market-score/public-domain-producers-r2.mjs";
import {loadStoredConsumptionR5} from "./consumption-r5-reader.mjs";
import {loadEmploymentR54CandidateFromStored,EMPLOYMENT_R54_METHOD} from "../lib/market-score/employment-r54-candidate.mjs";
import {
  buildDollarFxR54,
  buildFundFlowR54,
} from "../lib/diagnostic-layer/open-resolution-r53-components.mjs";
import {buildRateR3} from "../lib/market-score/rate-r3.mjs";
import {buildCreditR2} from "../lib/market-score/credit-r2.mjs";
import {loadStoredInflationR2Domain} from "./inflation-r2-reader.mjs";
import {readBreadthB1R5StoredPublicDomainR1,buildBreadthB1R5UnavailablePublicDomain} from "../lib/market-score/breadth-b1-r5-worker-domain.mjs";
import {
  INFLATION_SCORING_SERIES,
  loadStoredInflationSeries,
  buildStoredInflationScoringSeries,
} from "./inflation-history-reader.mjs";

import {buildLiquidityActivePublicDomainR1,selectLiquidityPublicDomainR1} from "../lib/market-score/liquidity-active-public-domain-r1.mjs";
import {loadLiquidityActiveHistory} from "./liquidity-active-history-reader.mjs";
import {loadStoredGrowthR2PublicDomainR1} from "../lib/market-score/growth-r2-worker-domain-r1.mjs";
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);

function safeJson(body,status=200){
  return Response.json(body,{
    status,
    headers:{
      "cache-control":status===200?"public, max-age=300, must-revalidate":"no-store",
      "x-content-type-options":"nosniff",
    },
  });
}

function diagnostics8(snapshot){
  return Object.fromEntries(
    Object.entries(snapshot?.diagnostics??{}).map(([id,value])=>[
      id,
      {
        status:value?.status??"UNAVAILABLE",
        score:finite(value?.score)?value.score:null,
        missingFactors:Array.isArray(value?.missing)?value.missing:[],
      },
    ]),
  );
}

export function projectInflationMethodologyVersion(compositeDomains=[],sourceDomains=[]){
  const methodologyVersion=sourceDomains.find(domain=>domain?.id==="inflation")?.methodologyVersion??null;
  return (Array.isArray(compositeDomains)?compositeDomains:[]).map(domain=>
    domain?.id==="inflation"
      ? {...domain,methodologyVersion}
      : domain
  );
}

function inflationR2Partial(reason="INFLATION_R2_STORAGE_PENDING"){
  return {status:"PARTIAL",score:null,missingFactors:[reason],indicators:[],trend:[],freshness:"STORED_INITIAL_RELEASE_HISTORY_ONLY",updatedAt:null,methodologyVersion:"INFLATION_R2_R29_56",interpretation:"Inflation R2: stored PIT history only; live fallback forbidden"};
}

function employmentR54Partial(reason="EMPLOYMENT_R54_STORAGE_PENDING",asOf=null){
  return {status:"PARTIAL",score:null,missingFactors:[reason],indicators:[],trend:[],freshness:"STORED_ONLY",updatedAt:null,methodologyVersion:EMPLOYMENT_R54_METHOD,interpretation:"Employment R54 candidate: stored data only; missing factors are not reweighted",asOfDate:asOf};
}

export function createMarketScoreR1Handler({
  env,
  fetchImpl=globalThis.fetch,
  collectInputs,
  orchestrate,
  now=()=>new Date(),
  collectBreadthDomain=readBreadthB1R5StoredPublicDomainR1,

  loadConsumptionDomain=loadStoredConsumptionR5,
  loadInflationDomain=loadStoredInflationR2Domain,
  loadLiquidityHistory=loadLiquidityActiveHistory,
  loadGrowthDomain=loadStoredGrowthR2PublicDomainR1,
  loadEmploymentDomain=loadEmploymentR54CandidateFromStored,
}={}){
  if(typeof collectInputs!=="function")throw new Error("COLLECT_INPUTS_REQUIRED");
  if(typeof orchestrate!=="function")throw new Error("ORCHESTRATE_REQUIRED");

  return async (request,onProgress)=>{
    if(request.method!=="GET")return safeJson({status:"FAILED",reason:"METHOD_NOT_ALLOWED"},405);

    const instant=now();
    const asOf=instant instanceof Date&&!Number.isNaN(instant.valueOf())
      ? instant.toISOString().slice(0,10)
      : null;
    if(!validDate(asOf))return safeJson({status:"FAILED",reason:"INVALID_SERVER_TIME"},500);

    const compute=createProgressiveComputationCache();
    let progressTimer;
    const state={collected:{series:{},external:{}},storedInflation:{series:{}},inflationR2Domain:inflationR2Partial(),employmentR54Domain:employmentR54Partial("EMPLOYMENT_R54_PENDING",asOf),breadthDomain:null,consumptionDomain:null,liquidityHistory:[],growthDomain:null};
    const emit=()=>{
      if(typeof onProgress!=='function')return;
      try { onProgress(composeMarketSnapshot({...state,orchestrate,asOf,instant,compute})); } catch { /* Pending inputs are not a request failure. */ }
    };
    const update=(key,value)=>{
      state[key]=value;
      if(typeof onProgress==='function'&&!progressTimer)progressTimer=setTimeout(()=>{progressTimer=null;emit();},50);
      return value;
    };
    try{
      const [collectionState,storageState,inflationR2State,breadthState,consumptionState,growthState,liquidityHistoryState]=await Promise.allSettled([
        collectInputs({env,asOf,fetchImpl,onProgress:value=>update('collected',value)}).then(value=>update('collected',value)),
        loadStoredInflationSeries(env?.DB,{asOf}).then(value=>update('storedInflation',value)),
        Promise.resolve().then(()=>loadInflationDomain(env?.DB,{asOf})).then(value=>update('inflationR2Domain',value)),
        Promise.resolve().then(()=>collectBreadthDomain({
          env,
          asOf,
          fetchImpl,
          runtimeOptions:{now:()=>instant},
        })).then(value=>update('breadthDomain',value)),
        Promise.resolve().then(()=>loadConsumptionDomain(env?.DB,{asOf})).then(value=>update('consumptionDomain',value)),
        Promise.resolve().then(()=>loadGrowthDomain(env?.DB,{asOf})).then(value=>update('growthDomain',value)),
        Promise.resolve().then(()=>loadLiquidityHistory(env?.DB,{asOf})).then(value=>update("liquidityHistory",value)),
      ]);
      const collected=collectionState.status==="fulfilled"
        ? collectionState.value
        : {series:{},external:{},rateR2:{series:{}}};
      const employmentR54Domain=await Promise.resolve().then(()=>loadEmploymentDomain(env?.DB,{
        unemploymentRows:collected?.series?.UNRATE??[],
        payrollLevelRows:collected?.series?.PAYEMS??[],
        asOfDate:asOf,
      })).catch(()=>employmentR54Partial("EMPLOYMENT_R54_STORAGE_READ_FAILED",asOf));
      update("employmentR54Domain",employmentR54Domain);
      const storedInflation=storageState.status==="fulfilled"
        ? storageState.value
        : {
            status:"STORAGE_READ_FAILED",
            source:"STORED_HISTORY_ONLY",
            asOf,
            series:{},
            snapshots:{},
            missing:[...INFLATION_SCORING_SERIES],
            issues:["STORAGE_READ_FAILED"],
          };
      const inflationR2Domain=inflationR2State.status==="fulfilled"
        ? inflationR2State.value
        : inflationR2Partial("INFLATION_R2_STORAGE_READ_FAILED");
      const breadthDomain=breadthState.status==="fulfilled"
        ? breadthState.value
        : buildBreadthB1R5UnavailablePublicDomain("B1_R5_RUNTIME_UNAVAILABLE",asOf,instant.toISOString());
      const consumptionDomain=consumptionState.status==="fulfilled"
        ? consumptionState.value
        : {status:"PARTIAL",score:null,missingFactors:["CONSUMPTION_R5_STORAGE_READ_FAILED"],indicators:[],trend:[],freshness:"STORED_MONTHLY_R5",updatedAt:null,methodologyVersion:"CONSUMPTION_R5",interpretation:"Consumption R5: stored data only; live fallback forbidden"};
      const growthDomain=growthState.status==="fulfilled"
        ? growthState.value
        : {status:"NOT_READY",score:null,coverage:0,requiredCoverage:24,missingFactors:["GROWTH_R2_STORAGE_READ_FAILED"],staleFactors:[],methodologyVersion:"GROWTH_R2_G16_CANDIDATE_R1"};

      clearTimeout(progressTimer);
      const liquidityHistory=liquidityHistoryState.status==="fulfilled"&&Array.isArray(liquidityHistoryState.value)
        ? liquidityHistoryState.value
        : [];
      const body=composeMarketSnapshot({liquidityHistory,collected,storedInflation,inflationR2Domain,employmentR54Domain,breadthDomain,consumptionDomain,growthDomain,orchestrate,asOf,instant,compute});
      if(collectionState.status==='rejected'&&!body.domains.some(domain=>domain.status==='READY'))throw collectionState.reason;
      return safeJson(body);
    }catch(error){
      clearTimeout(progressTimer);
      emit();
      return safeJson({
        status:"FAILED",
        reason:error?.status??"MARKET_SCORE_UNAVAILABLE",
        overall:{score:null,status:"UNAVAILABLE",state:null,trend:[]},
        domains:[],
        updatedAt:null,
        dataQuality:{overallComputable:false,reweighted:false},
      },503);
    }
  };
}

function composeMarketSnapshot({liquidityHistory,collected,storedInflation,inflationR2Domain,employmentR54Domain,breadthDomain,consumptionDomain,growthDomain,orchestrate,asOf,instant,compute}) {
      const scoringSeries=buildStoredInflationScoringSeries(
        collected?.series??{},
        storedInflation,
      );
      const scoringExternal={...(collected?.external??{})};
      delete scoringExternal.inflationExpectationsRows;
      const storedEarnings=scoringExternal?.publicDomainScores?.earnings;
      scoringExternal.earningsScores=storedEarnings?.status==="READY"?{
        epsGrowth:finite(storedEarnings?.components?.epsGrowth?.score)?storedEarnings.components.epsGrowth.score:null,
        margin:finite(storedEarnings?.components?.margin?.score)?storedEarnings.components.margin.score:null,
        revenueGrowth:finite(storedEarnings?.components?.revenueGrowth?.score)?storedEarnings.components.revenueGrowth.score:null,
        earningsGrowthBreadth:finite(storedEarnings?.components?.earningsGrowthBreadth?.score)?storedEarnings.components.earningsGrowthBreadth.score:null,
      }:null;

      const diagnostic=orchestrate({
        asOfDate:asOf,
        baseOverall:null,
        compute,
        series:scoringSeries,
        external:scoringExternal,
      });

      const diagnostics=diagnostic?.snapshot?.diagnostics??{};
      const employment=employmentR54Domain??employmentR54Partial("EMPLOYMENT_R54_PENDING",asOf);
      const rateSeries=collected?.rateR2?.series??{};
      const rate=compute(buildRateR3,{
        effrRows:rateSeries.EFFR??[],
        policyLowerRows:rateSeries.DFEDTARL??[],
        policyUpperRows:rateSeries.DFEDTARU??[],
        twoYearRows:rateSeries.DGS2??[],
        realTenYearRows:rateSeries.DFII10??[],
        threeMonthRows:rateSeries.DGS3MO??[],
        tenYearRows:rateSeries.DGS10??[],
        asOfDate:asOf,
      });
      const credit=compute(buildCreditR2,{
        compute,
        cmdi:collected?.external?.cmdiRows??[],
        nfciCredit:collected?.series?.NFCICREDIT??[],
        y2:collected?.series?.DGS2??[],
        y5:collected?.series?.DGS5??[],
        y10:collected?.series?.DGS10??[],
        y30:collected?.series?.DGS30??[],
        asOfDate:asOf,
      });
      const fundFlow=compute(buildFundFlowR54,
        collected?.external?.registeredFundFlowRows??[],
        {asOfDate:asOf},
      );
      const dollarFx=compute(buildDollarFxR54,
        collected?.series?.DTWEXBGS??[],
        {asOfDate:asOf},
      );

      const liquidityDomain=buildLiquidityActivePublicDomainR1({
        diagnostic,
        storedTrend:liquidityHistory,
        asOfDate:asOf,
      });

      const approvedPublicDomains={
        ...(collected?.external?.publicDomainScores??{}),
        inflation:buildLegacyMarketInflationDomain(diagnostic,asOf),
        consumption:consumptionDomain,
        growth:growthDomain,
        commodities:compute(buildCommoditiesK1R2,{
          wtiRows:collected?.series?.MCOILWTICO??[],
          brentRows:collected?.series?.MCOILBRENTEU??[],
          copperRows:collected?.external?.copperRows??[],
          gasolineRows:collected?.series?.GASREGCOVM??[],
          asOfDate:asOf,
        }),
        // B1-R5 stored four-factor breadth score is authoritative for the public breadth slot.
        // Any legacy external.publicDomainScores.breadth value is intentionally overridden.
        breadth:breadthDomain,
      };
      approvedPublicDomains.liquidity=selectLiquidityPublicDomainR1(approvedPublicDomains.liquidity,liquidityDomain);


      const domains=buildCmR1DomainResults({
        diagnostics,
        employment,
        rates:rate,
        credit,
        fundFlows:fundFlow,
        dollarFx,
        publicDomains:approvedPublicDomains,
      });
      // A monthly supply union must not briefly publish an older score while a
      // later-dated input is still in flight. This is a domain-local gate only.
      if(Array.isArray(collected?.inputSettled)){
        const supplyInputs=['MCOILWTICO','MCOILBRENTEU','GASREGCOVM','INDPRO','gscpi','copper'];
        if(!supplyInputs.every(id=>collected.inputSettled.includes(id))||!storedInflation?.status){
          const domain=domains.find(d=>d.id==='commodities');
          Object.assign(domain,{status:'PARTIAL',score:null,trend:[],indicators:[]});
        }
      }
      const growthR2CompositeBase=buildCompositeMarketScore(domains,{updatedAt:instant.toISOString()});
      const composite=growthDomain?.status==="READY"
        ? {...growthR2CompositeBase,domains:growthR2CompositeBase.domains.map(domain=>domain?.id==="growth"
          ? {...domain,methodologyVersion:growthDomain?.methodologyVersion??"GROWTH_R2_G16_CANDIDATE_R1"}
          : domain)}
        : growthR2CompositeBase;
      const publicCompositeDomains=projectInflationMethodologyVersion(composite.domains,domains).map(domain=>domain.id==='consumption'
        ? {...domain,methodologyVersion:consumptionDomain?.methodologyVersion??'CONSUMPTION_R5',asOfDate:asOf,historyMode:'CURRENT_VINTAGE_ONLY',lookAheadSafe:false}
        : domain);

      return {
        status:"SUCCESS",
        modelVersion:composite.modelVersion,
        asOfDate:asOf,
        overall:composite.overall,
        domains:publicCompositeDomains,
        diagnostics8:diagnostics8(diagnostic?.snapshot),
        updatedAt:composite.updatedAt,
        dataQuality:{
          ...composite.dataQuality,
          historyMode:diagnostic?.historyMode??"CURRENT_VINTAGE_ONLY",
          lookAheadSafe:diagnostic?.lookAheadSafe??false,
          limitations:diagnostic?.limitations??{},
        },
      };
}
