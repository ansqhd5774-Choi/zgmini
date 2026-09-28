import {createProgressiveComputationCache} from './market-score-computation-cache.mjs';
import {buildCompositeMarketScore} from "../lib/market-score/composite-model-r1.mjs";
import {buildCmR1DomainResults} from "../lib/market-score/domain-adapter-r1.mjs";
import {buildConsumptionC1,buildCommoditiesK1} from "../lib/market-score/public-domain-producers-r1.mjs";
import {loadStoredConsumptionC1R3} from "./consumption-r3-history-reader.mjs";
import {buildEmploymentR538} from "../lib/diagnostic-layer/employment-r538-components.mjs";
import {
  buildDollarFxR53,
  buildFundFlowR53,
} from "../lib/diagnostic-layer/open-resolution-r53-components.mjs";
import {buildRateR2} from "../lib/market-score/rate-r2.mjs";
import {loadStoredInflationR2Domain} from "./inflation-r2-reader.mjs";
import {readBreadthB1R3StoredPublicDomainR1,buildBreadthB1R3UnavailablePublicDomain} from "../lib/market-score/breadth-b1-r3-worker-domain.mjs";
import {
  INFLATION_SCORING_SERIES,
  loadStoredInflationSeries,
  buildStoredInflationScoringSeries,
} from "./inflation-history-reader.mjs";

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

function inflationR2Partial(reason="INFLATION_R2_STORAGE_PENDING"){
  return {status:"PARTIAL",score:null,missingFactors:[reason],indicators:[],trend:[],freshness:"STORED_INITIAL_RELEASE_HISTORY_ONLY",updatedAt:null,methodologyVersion:"INFLATION_R2_R29_56",interpretation:"Inflation R2: stored PIT history only; live fallback forbidden"};
}

export function createMarketScoreR1Handler({
  env,
  fetchImpl=globalThis.fetch,
  collectInputs,
  orchestrate,
  now=()=>new Date(),
  collectBreadthDomain=readBreadthB1R3StoredPublicDomainR1,

  loadConsumptionDomain=loadStoredConsumptionC1R3,
  loadInflationDomain=loadStoredInflationR2Domain,
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
    const state={collected:{series:{},external:{}},storedInflation:{series:{}},inflationR2Domain:inflationR2Partial(),breadthDomain:null,consumptionDomain:null};
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
      const [collectionState,storageState,inflationR2State,breadthState,consumptionState]=await Promise.allSettled([
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
      ]);
      const collected=collectionState.status==="fulfilled"
        ? collectionState.value
        : {series:{},external:{},rateR2:{series:{}}};
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
        : buildBreadthB1R3UnavailablePublicDomain("B1_R3_RUNTIME_UNAVAILABLE",asOf,instant.toISOString());
      const consumptionDomain=consumptionState.status==="fulfilled"
        ? consumptionState.value
        : {status:"PARTIAL",score:null,missingFactors:["C1_R3_STORAGE_READ_FAILED"],indicators:[],trend:[],freshness:"STORED_CALCULATION_HISTORY_ONLY",updatedAt:null,methodologyVersion:"R3.45P",interpretation:"C1-R3.45P: stored calculation history only; live fallback forbidden"};

      clearTimeout(progressTimer);
      const body=composeMarketSnapshot({collected,storedInflation,inflationR2Domain,breadthDomain,consumptionDomain,orchestrate,asOf,instant,compute});
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

function composeMarketSnapshot({collected,storedInflation,inflationR2Domain,breadthDomain,consumptionDomain,orchestrate,asOf,instant,compute}) {
      const scoringSeries=buildStoredInflationScoringSeries(
        collected?.series??{},
        storedInflation,
      );
      const scoringExternal={...(collected?.external??{})};
      delete scoringExternal.inflationExpectationsRows;

      const diagnostic=orchestrate({
        asOfDate:asOf,
        baseOverall:null,
        compute,
        series:scoringSeries,
        external:scoringExternal,
      });

      const diagnostics=diagnostic?.snapshot?.diagnostics??{};
      const employment=compute(buildEmploymentR538,{
        unemploymentRows:collected?.series?.UNRATE??[],
        payrollLevelRows:collected?.series?.PAYEMS??[],
        asOfDate:asOf,
      });
      const rateSeries=collected?.rateR2?.series??{};
      const rate=compute(buildRateR2,{
        effrRows:rateSeries.EFFR??[],
        policyLowerRows:rateSeries.DFEDTARL??[],
        policyUpperRows:rateSeries.DFEDTARU??[],
        twoYearRows:rateSeries.DGS2??[],
        realTenYearRows:rateSeries.DFII10??[],
        threeMonthRows:rateSeries.DGS3MO??[],
        tenYearRows:rateSeries.DGS10??[],
        asOfDate:asOf,
      });
      const fundFlow=compute(buildFundFlowR53,
        collected?.external?.registeredFundFlowRows??[],
        {asOfDate:asOf},
      );
      const dollarFx=compute(buildDollarFxR53,
        collected?.series?.DTWEXBGS??[],
        {asOfDate:asOf},
      );

      const approvedPublicDomains={
        ...(collected?.external?.publicDomainScores??{}),
        inflation:inflationR2Domain,
        consumption:consumptionDomain,
        commodities:compute(buildCommoditiesK1,{
          supplyRows:diagnostic?.artifacts?.supply?.rows??[],
          asOfDate:asOf,
        }),
        // B1-R3 stored breadth is authoritative for the public breadth slot.
        // Any legacy external.publicDomainScores.breadth value is intentionally overridden.
        breadth:breadthDomain,
      };

      const domains=buildCmR1DomainResults({
        diagnostics,
        employment,
        rates:rate,
        fundFlows:fundFlow,
        dollarFx,
        publicDomains:approvedPublicDomains,
      });
      // A monthly supply union must not briefly publish an older score while a
      // later-dated input is still in flight. This is a domain-local gate only.
      if(Array.isArray(collected?.inputSettled)){
        const supplyInputs=['MCOILWTICO','GASREGCOVM','INDPRO','gscpi','copper'];
        if(!supplyInputs.every(id=>collected.inputSettled.includes(id))||!storedInflation?.status){
          const domain=domains.find(d=>d.id==='commodities');
          Object.assign(domain,{status:'PARTIAL',score:null,trend:[],indicators:[]});
        }
      }
      const composite=buildCompositeMarketScore(domains,{updatedAt:instant.toISOString()});

      return {
        status:"SUCCESS",
        modelVersion:composite.modelVersion,
        asOfDate:asOf,
        overall:composite.overall,
        domains:composite.domains,
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
