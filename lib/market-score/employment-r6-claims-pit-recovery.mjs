// Read-only Core CURRENT/HISTORY provenance audit for STATE_CLAIMS_BREADTH.
// This is NOT permission to synthesize history, backdate PIT, modify SQLite,
// promote a candidate database, change the formula, or publish to D1.
import {EMPLOYMENT_R4_CORE_STATES,EMPLOYMENT_R4_PIT_CLASSES} from "./employment-r4-shadow-contract.mjs";

const STATES=new Set(EMPLOYMENT_R4_CORE_STATES);
const PIT=new Set(Object.values(EMPLOYMENT_R4_PIT_CLASSES));
const SHA=/^[a-f0-9]{64}$/i;
const DATE=/^20\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
const g=(r,a,b)=>r?.[a]??r?.[b];
const day=d=>DATE.test(d)&&Number.isFinite(Date.parse(d+"T00:00:00Z"))
  &&new Date(d+"T00:00:00Z").toISOString().slice(0,10)===d;
const instant=s=>typeof s==="string"&&Number.isFinite(Date.parse(s))?Date.parse(s):null;
const dateKey=r=>g(r,"observationDate","observation_date");
const geo=r=>g(r,"geographyCode","geography_code");
const id=r=>g(r,"logicalSeriesId","logical_series_id");
const hash=r=>g(r,"sourceHash","source_hash");
// SQLite NULL and blank TEXT are missing observations, never numeric zero.
const value=r=>{
  const raw=r?.value;
  if(typeof raw!=="number"&&(typeof raw!=="string"||!raw.trim()))return NaN;
  const parsed=Number(raw);
  return Number.isFinite(parsed)?parsed:NaN;
};
const key=r=>dateKey(r)+"|"+geo(r);
const usableAt=(row,asOf)=>{
  const retrieved=instant(g(row,"retrievedAt","retrieved_at"));
  const available=g(row,"availableAt","available_at");
  const known=available==null?retrieved:instant(available);
  return retrieved!==null&&retrieved<=asOf&&known!==null&&known<=asOf;
};
function safeCurrent(row,asOf){
  if(id(row)!=="STATE_INITIAL_CLAIMS"||
    g(row,"geographyType","geography_type")!=="STATE"||
    !STATES.has(geo(row))||!day(dateKey(row))||!SHA.test(hash(row)??"")||
    !Number.isFinite(value(row))||value(row)<0||
    row.provider!=="DOL_ETA"||
    g(row,"providerSeriesId","provider_series_id")!=="ETA539:C3"||
    g(row,"frequency","frequency")!=="WEEKLY"||
    g(row,"qualityStatus","quality_status")!=="READY_CORE_51"||
    !PIT.has(g(row,"pitClass","pit_class"))||!usableAt(row,asOf))return false;
  const provenance=g(row,"provenanceJson","provenance_json");
  if(typeof provenance!=="string"||provenance.length>16_384)return false;
  try{
    const v=JSON.parse(provenance);
    return v!==null&&typeof v==="object"&&!Array.isArray(v);
  }catch{return false;}
}
const matches=(a,b)=>hash(a)===hash(b)&&value(a)===value(b)
  &&a.provider===b.provider
  &&g(a,"providerSeriesId","provider_series_id")===g(b,"providerSeriesId","provider_series_id");
// Equal-time HISTORY rows are not ordered by source hash or SQLite row order.
// Differing PIT/source metadata at the same instant must remain ambiguous.
const sameHistoryRevision=(a,b)=>matches(a,b)
  &&g(a,"availableAt","available_at")===g(b,"availableAt","available_at")
  &&g(a,"qualityStatus","quality_status")===g(b,"qualityStatus","quality_status")
  &&g(a,"pitClass","pit_class")===g(b,"pitClass","pit_class")
  &&g(a,"frequency","frequency")===g(b,"frequency","frequency")
  &&g(a,"provenanceJson","provenance_json")===g(b,"provenanceJson","provenance_json");
function completeWeeks(keys){
  const counts=new Map();
  for(const k of keys){
    const [d,code]=k.split("|");
    const geos=counts.get(d)??new Set();
    geos.add(code);counts.set(d,geos);
  }
  return [...counts].filter(([,s])=>s.size===STATES.size)
    .map(([d])=>d).sort();
}

/**
 * Aggregate the existing SQLite CURRENT versus append-only HISTORY only.
 * A missing key is *not* automatically eligible for a new history INSERT.
 * Metadata-eligible keys still need raw-snapshot provenance, exact B approval,
 * transaction CAS, and a newly observed availability/recording time.
 * No raw values, hashes, or individual geographic claims leave this function.
 */
export function inspectStateClaimsPitReconciliation({
  currentRows,historyRows,asOfIso,
}={}){
  if(!Array.isArray(currentRows)||!Array.isArray(historyRows)||
     currentRows.length>50_000||historyRows.length>100_000)
    throw new TypeError("R6_CLAIMS_AUDIT_ROWS_INVALID");
  const asOf=instant(asOfIso);
  if(asOf===null)throw new TypeError("R6_CLAIMS_AUDIT_AS_OF_INVALID");
  const current=new Map(),history=new Map();
  let duplicates=0;
  for(const row of currentRows){
    if(id(row)!=="STATE_INITIAL_CLAIMS")continue;
    const k=key(row);
    if(current.has(k))duplicates++;
    else current.set(k,row);
  }
  for(const row of historyRows){
    if(id(row)!=="STATE_INITIAL_CLAIMS"||!STATES.has(geo(row))||
       !day(dateKey(row))||!usableAt(row,asOf))continue;
    const k=key(row),list=history.get(k)??[];
    list.push(row);history.set(k,list);
  }
  let matched=0,missing=0,metadataEligible=0,metadataUnverified=0,revisionDisagreements=0;
  const currentKnown=new Set(),historyMatched=new Set(),missingDates=[];
  for(const [k,row] of current){
    if(!STATES.has(geo(row))||!day(dateKey(row)))continue;
    if(!usableAt(row,asOf))continue;
    currentKnown.add(k);
    const revisions=history.get(k)??[];
    if(!revisions.length){
      missing++;missingDates.push(dateKey(row));
      if(safeCurrent(row,asOf))metadataEligible++;
      else metadataUnverified++;
    }else{
      // Earlier matching revisions do not prove that CURRENT matches the
      // latest immutable PIT revision. Prefer retrieval then record time.
      const latest=revisions.reduce((best,rev)=>{
        if(!best)return rev;
        const bt=instant(g(best,"retrievedAt","retrieved_at"))??-Infinity;
        const rt=instant(g(rev,"retrievedAt","retrieved_at"))??-Infinity;
        if(rt!==bt)return rt>bt?rev:best;
        const br=instant(g(best,"recordedAt","recorded_at"))??-Infinity;
        const rr=instant(g(rev,"recordedAt","recorded_at"))??-Infinity;
        return rr>br?rev:best;
      },null);
      const latestRetrieved=instant(g(latest,"retrievedAt","retrieved_at"));
      const latestRecorded=instant(g(latest,"recordedAt","recorded_at"));
      const ambiguousLatest=revisions.some(rev=>rev!==latest
        &&instant(g(rev,"retrievedAt","retrieved_at"))===latestRetrieved
        &&instant(g(rev,"recordedAt","recorded_at"))===latestRecorded
        &&!sameHistoryRevision(rev,latest));
      if(!ambiguousLatest&&matches(row,latest)){matched++;historyMatched.add(k);}
      else revisionDisagreements++;
    }
  }
  const cw=completeWeeks(currentKnown),hw=completeWeeks(historyMatched);
  const status=duplicates||revisionDisagreements?"HOLD_REVISION_CONFLICTS":
    metadataUnverified?"HOLD_UNVERIFIED_SOURCE_METADATA":
    !currentKnown.size?"NO_CURRENT_OBSERVATIONS":
    missing?"REVIEW_MISSING_HISTORY":"CURRENT_HISTORY_MATCHED";
  return {
    kind:"R6_STATE_CLAIMS_PIT_RECONCILIATION_READONLY_V1",
    status,asOfIso,
    currentKnownKeys:currentKnown.size,historyMatchedKeys:matched,
    missingHistoryKeys:missing,metadataEligibleMissingKeys:metadataEligible,
    metadataUnverifiedMissingKeys:metadataUnverified,
    revisionDisagreements,duplicateCurrentKeys:duplicates,
    currentComplete51Weeks:cw.length,historyMatchedComplete51Weeks:hw.length,
    currentLatestCompleteWeek:cw.at(-1)??null,
    historyLatestMatchingCompleteWeek:hw.at(-1)??null,
    firstMissingWeek:missingDates.sort()[0]??null,lastMissingWeek:missingDates.at(-1)??null,
    // Eligibility is for review only. No DB mutation, no PIT promotion.
    repairAuthorized:false,promotionApproved:false,providerCalls:0,d1Writes:0,
    operationalWrites:0,
  };
}
