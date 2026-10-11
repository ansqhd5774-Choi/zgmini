export const E1_R5_INPUT_CONTRACT_VERSION="E1-R5-INPUT-R2";

export const E1_R5_SEC_CONTRACT=Object.freeze({
  authority:"SEC EDGAR",
  preferredBulkSource:"COMPANYFACTS_ZIP",
  secondaryBulkSource:"FINANCIAL_STATEMENT_DATA_SETS",
  forms:Object.freeze(["10-Q","10-K"]),
  taxonomy:"us-gaap",
  consolidatedOnly:true,
  customTagPolicy:"REJECT_UNMAPPED_CUSTOM_TAGS",
  companyFactsPolicy:Object.freeze({
    requireEntityFacts:true,
    preferExplicitCalendarQuarterFrame:true,
    explicitQuarterFramePattern:"^CY\\d{4}Q[1-4]$",
    q4EpsAnnualMinusNineMonths:"FORBIDDEN",
    additiveFlowQ4Derivation:"MATCHED_CONCEPT_UNIT_ENTITY_PERIOD_ONLY",
    ambiguousFactPolicy:"MISSING",
  }),
  submissionFields:Object.freeze(["adsh","cik","form","period","filed","fy","fp","sic"]),
  numberFields:Object.freeze(["adsh","tag","version","ddate","qtrs","uom","value","coreg"]),
  tags:Object.freeze({
    eps:Object.freeze(["EarningsPerShareDiluted"]),
    revenue:Object.freeze([
      "RevenueFromContractWithCustomerExcludingAssessedTax",
      "Revenues",
      "SalesRevenueNet",
    ]),
    operatingIncome:Object.freeze(["OperatingIncomeLoss"]),
    netIncome:Object.freeze(["NetIncomeLoss"]),
    operatingCashFlow:Object.freeze(["NetCashProvidedByUsedInOperatingActivities"]),
    capex:Object.freeze([
      "PaymentsToAcquirePropertyPlantAndEquipment",
      "PaymentsForAdditionsToPropertyPlantAndEquipment",
    ]),
  }),
  units:Object.freeze({
    eps:Object.freeze(["USD/shares","USD-per-shares"]),
    monetary:Object.freeze(["USD"]),
  }),
  fsdsDurationPolicy:Object.freeze({
    eps:Object.freeze([1]),
    revenue:Object.freeze([1]),
    operatingIncome:Object.freeze([1]),
    netIncome:Object.freeze([1]),
    operatingCashFlow:Object.freeze([1,2,3,4]),
    capex:Object.freeze([1,2,3,4]),
  }),
  q4DerivableAdditiveMetrics:Object.freeze([
    "revenue",
    "operatingIncome",
    "netIncome",
    "operatingCashFlow",
    "capex",
  ]),
});

export const E1_R5_BEA_CONTRACT=Object.freeze({
  authority:"U.S. Bureau of Economic Analysis",
  delivery:"DIRECT_DOWNLOAD_CSV_XLS_ZIP",
  seriesCode:"A051RC",
  label:"Corporate profits with inventory valuation and capital consumption adjustments",
  frequency:"QUARTERLY",
  revisionPolicy:"PRESERVE_SOURCE_FILE_HASH_RELEASE_TIME_AND_REVISION",
  apiRequired:false,
});

export const E1_R5_BLS_CONTRACT=Object.freeze({
  authority:"U.S. Bureau of Labor Statistics",
  producerInput:Object.freeze({
    delivery:"SATELLITE_INPUT_TO_INDUSTRY_XLSX",
    frequency:"MONTHLY",
    industryLevel:"NAICS_3_DIGIT",
    includesImports:true,
    excludesLabor:true,
    excludesCapitalInvestment:true,
    historyStartTypical:"2018-12",
    currentOverallImportLagMonths:1,
    revisionWindowMonths:4,
    experimental:true,
    apiRequired:false,
  }),
  unitLaborCost:Object.freeze({
    delivery:"BLS_PR_FLAT_TEXT",
    seriesId:"PRS85006111",
    frequency:"QUARTERLY",
    semantic:"PERCENT_CHANGE_FROM_SAME_QUARTER_YEAR_AGO",
    recalculateGrowth:false,
    apiRequired:false,
  }),
});

export const E1_R5_FORWARD_CONTRACT=Object.freeze({
  forwardEpsRevision:Object.freeze({
    status:"SOURCE_UNRESOLVED",
    requirement:"FREE_COMMERCIAL_USE_PIT_CONSENSUS_HISTORY",
    apiKeyRequired:"UNKNOWN_UNTIL_PROVIDER_APPROVED",
  }),
  guidance:Object.freeze({
    status:"SEC_TEXT_EXTRACTION_RESEARCH",
    noGuidancePolicy:"MISSING_NOT_NEUTRAL",
    apiRequired:false,
  }),
});

const text=value=>typeof value==="string"?value.trim():"";

export function missingHeaders(actual,required){
  const set=new Set((actual??[]).map(value=>text(value).toLowerCase()).filter(Boolean));
  return (required??[]).filter(value=>!set.has(String(value).toLowerCase()));
}

export function validateSecFsdsHeaders({submissionHeaders=[],numberHeaders=[]}={}){
  const missingSubmission=missingHeaders(submissionHeaders,E1_R5_SEC_CONTRACT.submissionFields);
  const missingNumber=missingHeaders(numberHeaders,E1_R5_SEC_CONTRACT.numberFields);
  return {
    status:missingSubmission.length||missingNumber.length?"FAIL":"PASS",
    missingSubmission,
    missingNumber,
  };
}

export function validateSecCompanyFactsDocument(document){
  const cik=text(document?.cik).replace(/\D/g,"");
  const facts=document?.facts?.[E1_R5_SEC_CONTRACT.taxonomy];
  if(!cik)return {status:"FAIL",reason:"COMPANYFACTS_CIK_MISSING"};
  if(!facts||typeof facts!=="object"||Array.isArray(facts))return {status:"FAIL",reason:"COMPANYFACTS_US_GAAP_MISSING"};
  return {status:"PASS",reason:null,cik:cik.padStart(10,"0")};
}

export function isExplicitCalendarQuarterFrame(frame){
  return new RegExp(E1_R5_SEC_CONTRACT.companyFactsPolicy.explicitQuarterFramePattern).test(text(frame));
}

export function canDeriveQ4FromAnnualMinusNineMonths(metric){
  if(metric==="eps")return false;
  return E1_R5_SEC_CONTRACT.q4DerivableAdditiveMetrics.includes(metric);
}

export function secMetricForTag(tag){
  const value=text(tag);
  if(!value)return null;
  for(const [metric,tags] of Object.entries(E1_R5_SEC_CONTRACT.tags)){
    if(tags.includes(value))return metric;
  }
  return null;
}

export function secDurationAllowed(metric,qtrs){
  if(!Number.isInteger(qtrs))return false;
  return E1_R5_SEC_CONTRACT.fsdsDurationPolicy?.[metric]?.includes(qtrs)??false;
}

export function secUnitAllowed(metric,uom){
  const value=text(uom);
  if(!value)return false;
  return metric==="eps"
    ? E1_R5_SEC_CONTRACT.units.eps.includes(value)
    : ["revenue","operatingIncome","netIncome","operatingCashFlow","capex"].includes(metric)
      ? E1_R5_SEC_CONTRACT.units.monetary.includes(value)
      : false;
}

export function isConsolidatedSecFact(coreg){
  return coreg==null||text(coreg)==="";
}

export function classifySecFact({tag,qtrs,uom,coreg}={}){
  const metric=secMetricForTag(tag);
  if(!metric)return {status:"REJECT",reason:"UNMAPPED_TAG",metric:null};
  if(!isConsolidatedSecFact(coreg))return {status:"REJECT",reason:"COREGISTRANT_FACT",metric};
  if(!secDurationAllowed(metric,Number(qtrs)))return {status:"REJECT",reason:"INVALID_DURATION",metric};
  if(!secUnitAllowed(metric,uom))return {status:"REJECT",reason:"INVALID_UNIT",metric};
  return {status:"ACCEPT",reason:null,metric};
}
