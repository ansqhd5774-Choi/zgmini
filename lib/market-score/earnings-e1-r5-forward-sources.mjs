const DAY_MS=86400000;
const clean=value=>String(value??"").trim();
const upper=value=>clean(value).toUpperCase();

export const E1_R5_S12_SOURCE_AUDIT=Object.freeze([
  Object.freeze({
    id:"ALPHA_VANTAGE_EARNINGS_ESTIMATES",
    capability:"EPS_ESTIMATE_REVISION_HISTORY",
    apiKeyRequired:true,
    freeAccess:true,
    commercialUse:"NOT_FREE_COMMERCIAL",
    accepted:false,
    reason:"TERMS_DEFAULT_TO_PERSONAL_NON_COMMERCIAL_UNLESS_SEPARATELY_AGREED",
  }),
  Object.freeze({
    id:"FMP_ANALYST_ESTIMATES",
    capability:"ANALYST_EPS_ESTIMATES",
    apiKeyRequired:true,
    freeAccess:"TESTING_ONLY",
    commercialUse:"SEPARATE_COMMERCIAL_LICENSE_REQUIRED",
    accepted:false,
    reason:"FREE_PLAN_DOES_NOT_SATISFY_PUBLIC_COMMERCIAL_DERIVED_USE_REQUIREMENT",
  }),
  Object.freeze({
    id:"NASDAQ_WEB_EARNINGS_ESTIMATES",
    capability:"LAST_MONTH_EPS_REVISIONS",
    apiKeyRequired:false,
    freeAccess:true,
    commercialUse:"NOT_PERMITTED_BY_DEFAULT_SITE_TERMS",
    accepted:false,
    reason:"PERSONAL_NON_COMMERCIAL_ONLY_AND_AUTOMATED_EXTRACTION_RESTRICTED_WITHOUT_PERMISSION",
  }),
  Object.freeze({
    id:"FINNHUB_ESTIMATES",
    capability:"EPS_ESTIMATES",
    apiKeyRequired:true,
    freeAccess:false,
    commercialUse:"ENTERPRISE_COMMERCIAL_LICENSE",
    accepted:false,
    reason:"COMMERCIAL_USE_IS_NOT_FREE",
  }),
  Object.freeze({
    id:"TWELVE_DATA_EARNINGS",
    capability:"EPS_ESTIMATES",
    apiKeyRequired:true,
    freeAccess:false,
    commercialUse:"BUSINESS_PLAN_REQUIRED",
    accepted:false,
    reason:"EARNINGS_ENDPOINT_AND_COMMERCIAL_USE_REQUIRE_PAID_TIERS",
  }),
  Object.freeze({
    id:"EODHD_EARNINGS_TRENDS",
    capability:"EARNINGS_TRENDS_AND_ESTIMATES",
    apiKeyRequired:true,
    freeAccess:"PERSONAL_ONLY_LIMITED",
    commercialUse:"SEPARATE_COMMERCIAL_SOLUTION_REQUIRED",
    accepted:false,
    reason:"FREE_AND_STANDARD_PLANS_DO_NOT_SATISFY_FREE_COMMERCIAL_REQUIREMENT",
  }),
]);

export const E1_R5_S13_SEC_CANDIDATE=Object.freeze({
  id:"SEC_EDGAR_8K_GUIDANCE",
  authority:"SEC EDGAR",
  forms:Object.freeze(["8-K","8-K/A"]),
  items:Object.freeze(["2.02","7.01"]),
  apiKeyRequired:false,
  accessCost:"FREE",
  transport:"PUBLIC_EDGAR_ARCHIVES",
  commercialUse:"CANDIDATE_DERIVED_FACTS_ONLY",
  rawTextRedistribution:false,
  acceptedForProduction:false,
  reason:"PUBLIC_FILINGS_CAN_SUPPLY_GUIDANCE_FACTS_BUT_DIRECTION_EXTRACTION_AND_RIGHTS_SCOPE_REQUIRE_RUNTIME_VALIDATION",
});

function isoDay(value){
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const ms=Date.parse(`${value}T00:00:00Z`);
  if(!Number.isFinite(ms))return null;
  const roundtrip=new Date(ms).toISOString().slice(0,10);
  return roundtrip===value?value:null;
}
function dayNumber(value){const day=isoDay(value);return day?Math.floor(Date.parse(`${day}T00:00:00Z`)/DAY_MS):null;}
function splitItems(value){
  if(Array.isArray(value))return value.flatMap(splitItems);
  return clean(value).split(/[;,\s]+/).map(item=>item.trim()).filter(Boolean);
}
function hasGuidanceItem(value){
  const items=new Set(splitItems(value));
  return E1_R5_S13_SEC_CANDIDATE.items.some(item=>items.has(item));
}
function validAccession(value){return /^\d{10}-\d{2}-\d{6}$/.test(clean(value));}
function safePrimaryDocument(value){
  const text=clean(value);
  return text.length>0&&text.length<=255&&!/[\\/]/.test(text)&&/^[A-Za-z0-9_.-]+$/.test(text);
}

export function classifySecGuidanceCandidateFiling(filing,{asOf,lookbackDays=185}={}){
  const form=upper(filing?.form);
  if(!E1_R5_S13_SEC_CANDIDATE.forms.includes(form))return {status:"REJECT",reason:"FORM_NOT_8K"};
  if(!hasGuidanceItem(filing?.items))return {status:"REJECT",reason:"GUIDANCE_RELEVANT_ITEM_MISSING"};
  const filed=isoDay(clean(filing?.filingDate));
  const cutoff=dayNumber(asOf),observed=dayNumber(filed);
  if(cutoff==null||observed==null||observed>cutoff)return {status:"REJECT",reason:"INVALID_OR_FUTURE_FILING_DATE"};
  if(!Number.isInteger(lookbackDays)||lookbackDays<1||cutoff-observed>lookbackDays)return {status:"REJECT",reason:"OUTSIDE_LOOKBACK"};
  const accessionNumber=clean(filing?.accessionNumber);
  const primaryDocument=clean(filing?.primaryDocument);
  if(!validAccession(accessionNumber))return {status:"REJECT",reason:"ACCESSION_INVALID"};
  if(!safePrimaryDocument(primaryDocument))return {status:"REJECT",reason:"PRIMARY_DOCUMENT_INVALID"};
  return {
    status:"CANDIDATE",
    reason:null,
    form,
    filed,
    accessionNumber,
    primaryDocument,
    items:splitItems(filing?.items).filter(item=>E1_R5_S13_SEC_CANDIDATE.items.includes(item)),
  };
}

export function recentFilingsFromSubmission(document){
  const recent=document?.filings?.recent;
  if(!recent||typeof recent!=="object")return [];
  const keys=["accessionNumber","filingDate","form","items","primaryDocument"];
  const length=Math.max(0,...keys.map(key=>Array.isArray(recent[key])?recent[key].length:0));
  const rows=[];
  for(let index=0;index<length;index++){
    rows.push(Object.fromEntries(keys.map(key=>[key,Array.isArray(recent[key])?recent[key][index]:null])));
  }
  return rows;
}

export function summarizeSecGuidanceCandidates(submissionsByCik,{asOf,lookbackDays=185}={}){
  const entries=submissionsByCik instanceof Map?[...submissionsByCik.entries()]:Object.entries(submissionsByCik??{});
  const issuers=[];
  let documentsValid=0,totalRecent8k=0,candidateFilings=0;
  for(const [rawCik,document] of entries){
    if(!document||typeof document!=="object")continue;
    documentsValid++;
    const cik=String(rawCik??document?.cik??"").replace(/\D/g,"").padStart(10,"0");
    const rows=recentFilingsFromSubmission(document);
    const candidates=[];
    for(const row of rows){
      if(E1_R5_S13_SEC_CANDIDATE.forms.includes(upper(row?.form)))totalRecent8k++;
      const result=classifySecGuidanceCandidateFiling(row,{asOf,lookbackDays});
      if(result.status==="CANDIDATE")candidates.push(result);
    }
    if(candidates.length){
      candidateFilings+=candidates.length;
      candidates.sort((a,b)=>b.filed.localeCompare(a.filed)||b.accessionNumber.localeCompare(a.accessionNumber));
      issuers.push({cik,candidateCount:candidates.length,latest:candidates[0]});
    }
  }
  issuers.sort((a,b)=>a.cik.localeCompare(b.cik));
  return {
    status:"PASS",
    asOf,
    lookbackDays,
    documentsTotal:entries.length,
    documentsValid,
    totalRecent8k,
    issuerCandidates:issuers.length,
    candidateFilings,
    issuers,
  };
}

export function buildEarningsR5ForwardSourceAudit({submissionsByCik=new Map(),asOf,lookbackDays=185}={}){
  const s12Accepted=E1_R5_S12_SOURCE_AUDIT.filter(item=>item.accepted===true);
  const s13=summarizeSecGuidanceCandidates(submissionsByCik,{asOf,lookbackDays});
  return {
    status:"PARTIAL",
    active:false,
    researchOnly:true,
    formulaChanged:false,
    weightChanged:false,
    productionActivation:false,
    s12:{
      id:"S12",
      status:s12Accepted.length?"CANDIDATE":"BLOCKED",
      acceptedSource:s12Accepted[0]?.id??null,
      reviewed:E1_R5_S12_SOURCE_AUDIT.length,
      rejected:E1_R5_S12_SOURCE_AUDIT.filter(item=>!item.accepted).length,
      reason:s12Accepted.length?null:"NO_REVIEWED_SOURCE_MEETS_FREE_AND_COMMERCIAL_REQUIREMENT",
      candidates:E1_R5_S12_SOURCE_AUDIT,
    },
    s13:{
      id:"S13",
      status:s13.issuerCandidates>0?"CANDIDATE":"PARTIAL",
      source:E1_R5_S13_SEC_CANDIDATE,
      evidence:s13,
      reason:s13.issuerCandidates>0?"PRIMARY_DOCUMENT_DOWNLOAD_AND_DIRECTION_EXTRACTION_REQUIRED":"NO_RECENT_GUIDANCE_CANDIDATE_FILINGS_FOUND",
    },
    networkCalls:0,
    dbWrites:0,
  };
}
