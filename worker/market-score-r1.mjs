import {buildCompositeMarketScore} from "../lib/market-score/composite-model-r1.mjs";
import {buildCmR1DomainResults} from "../lib/market-score/domain-adapter-r1.mjs";
import {buildConsumptionC1,buildCommoditiesK1} from "../lib/market-score/public-domain-producers-r1.mjs";
import {buildEmploymentR538} from "../lib/diagnostic-layer/employment-r538-components.mjs";
import {
  buildDollarFxR53,
  buildFundFlowR53,
} from "../lib/diagnostic-layer/open-resolution-r53-components.mjs";
import {buildRateR2} from "../lib/market-score/rate-r2.mjs";
import {collectBreadthR2PublicDomainR1} from "../lib/market-score/breadth-r2-worker-domain-r1.mjs";
import {buildBreadthR2UnavailablePublicDomain} from "../lib/market-score/breadth-r2-public-domain-r1.mjs";
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

export function createMarketScoreR1Handler({
  env,
  fetchImpl=globalThis.fetch,
  collectInputs,
  orchestrate,
  now=()=>new Date(),
  collectBreadthDomain=collectBreadthR2PublicDomainR1,
}={}){
  if(typeof collectInputs!=="function")throw new Error("COLLECT_INPUTS_REQUIRED");
  if(typeof orchestrate!=="function")throw new Error("ORCHESTRATE_REQUIRED");

  return async request=>{
    if(request.method!=="GET")return safeJson({status:"FAILED",reason:"METHOD_NOT_ALLOWED"},405);

    const instant=now();
    const asOf=instant instanceof Date&&!Number.isNaN(instant.valueOf())
      ? instant.toISOString().slice(0,10)
      : null;
    if(!validDate(asOf))return safeJson({status:"FAILED",reason:"INVALID_SERVER_TIME"},500);

    try{
      const [collectionState,storageState,breadthState]=await Promise.allSettled([
        collectInputs({env,asOf,fetchImpl}),
        loadStoredInflationSeries(env?.DB,{asOf}),
        Promise.resolve().then(()=>collectBreadthDomain({
          env,
          asOf,
          fetchImpl,
          runtimeOptions:{now:()=>instant},
        })),
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
      const breadthDomain=breadthState.status==="fulfilled"
        ? breadthState.value
        : buildBreadthR2UnavailablePublicDomain("BREADTH_R2_RUNTIME_UNAVAILABLE",instant.toISOString());

      if(
        collectionState.status==="rejected"
        && Object.keys(storedInflation?.series??{}).length===0
      ){
        throw collectionState.reason;
      }

      const scoringSeries=buildStoredInflationScoringSeries(
        collected?.series??{},
        storedInflation,
      );
      const scoringExternal={...(collected?.external??{})};
      delete scoringExternal.inflationExpectationsRows;

      const diagnostic=orchestrate({
        asOfDate:asOf,
        baseOverall:null,
        series:scoringSeries,
        external:scoringExternal,
      });

      const diagnostics=diagnostic?.snapshot?.diagnostics??{};
      const employment=buildEmploymentR538({
        unemploymentRows:collected?.series?.UNRATE??[],
        payrollLevelRows:collected?.series?.PAYEMS??[],
        asOfDate:asOf,
      });
      const rateSeries=collected?.rateR2?.series??{};
      const rate=buildRateR2({
        effrRows:rateSeries.EFFR??[],
        policyLowerRows:rateSeries.DFEDTARL??[],
        policyUpperRows:rateSeries.DFEDTARU??[],
        twoYearRows:rateSeries.DGS2??[],
        realTenYearRows:rateSeries.DFII10??[],
        threeMonthRows:rateSeries.DGS3MO??[],
        tenYearRows:rateSeries.DGS10??[],
        asOfDate:asOf,
      });
      const fundFlow=buildFundFlowR53(
        collected?.external?.registeredFundFlowRows??[],
        {asOfDate:asOf},
      );
      const dollarFx=buildDollarFxR53(
        collected?.series?.DTWEXBGS??[],
        {asOfDate:asOf},
      );

      const approvedPublicDomains={
        ...(collected?.external?.publicDomainScores??{}),
        consumption:buildConsumptionC1({
          recessionRows:diagnostic?.artifacts?.recession?.rows??[],
          asOfDate:asOf,
        }),
        commodities:buildCommoditiesK1({
          supplyRows:diagnostic?.artifacts?.supply?.rows??[],
          asOfDate:asOf,
        }),
        // Breadth-R2 is authoritative for the public breadth slot.
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
      const composite=buildCompositeMarketScore(domains,{updatedAt:instant.toISOString()});

      return safeJson({
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
      },200);
    }catch(error){
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
