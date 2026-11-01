import {
  EMPLOYMENT_R6_FEATURES,
  EMPLOYMENT_R6_FORMULA_HASH,
  EMPLOYMENT_R6_FORMULA_REVISION,
} from "./employment-r6-formula.mjs";
import {
  computeFeaturePoint,
  deriveEmploymentR6FeatureHistory,
} from "./employment-r6-feature-engine.mjs";

const DAY_MS = 86400000;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const iso = t => new Date(t).toISOString().slice(0,10);
const finite = value => typeof value === "number" && Number.isFinite(value);
const frequencyDays = {WEEKLY:7,MONTHLY:31,QUARTERLY:92};
const UNITS = Object.freeze({
  U3_UNEMPLOYMENT:"%",U6_UNEMPLOYMENT:"%",LFPR:"%",EPOP:"%",
  PAYEMS_MOM:"천 명",PAYEMS_3M_AVG:"천 명",PAYEMS_ACCEL:"천 명",
  AVG_WEEKLY_HOURS:"시간",TEMP_HELP:"천 명",
  INITIAL_CLAIMS:"건",INITIAL_CLAIMS_4W:"건",CONTINUED_CLAIMS:"건",IUR:"%",
  STATE_CLAIMS_BREADTH:"%",JOLTS_OPENINGS_RATE:"%",JOLTS_HIRES_RATE:"%",
  JOLTS_QUITS_RATE:"%",JOLTS_LAYOFFS_RATE:"%",AHE_YOY:"%",ECI_12M:"%",
  INDUSTRY_DIFFUSION_3M:"%",STATE_EMP_DIFFUSION_3M:"%",MSA_EMP_DIFFUSION_3M:"%",
  BED_GROSS_GAINS_RATE:"%",BED_GROSS_LOSSES_RATE:"%",BED_NET_GROSS_RATE:"%",
  BED_SMALL_FIRM_NET:"천 명",BED_STATE_BREADTH:"%",BED_BIRTH_DEATH_NET:"%p",
});

function asOfDay(input){
  if(!datePattern.test(input??""))throw new TypeError("AS_OF_EXPECTED_YYYY_MM_DD");
  const ms=Date.parse(input+"T00:00:00Z");
  if(!Number.isFinite(ms)||iso(ms)!==input)throw new TypeError("AS_OF_INVALID_DATE");
  return ms;
}
function oneYearEarlier(ms){
  const d=new Date(ms),day=d.getUTCDate(),month=d.getUTCMonth();
  d.setUTCFullYear(d.getUTCFullYear()-1);
  if(month===1&&day===29&&d.getUTCMonth()!==1)d.setUTCDate(28);
  return iso(d.getTime());
}

function chartPoints(points,start,end,frequency){
  let previous=null;
  return points.filter(p=>p.date>=start&&p.date<=end&&finite(p.value))
    .map(p=>{
      const gap=previous===null?false:(Date.parse(p.date+"T00:00:00Z")-Date.parse(previous+"T00:00:00Z"))/DAY_MS>frequencyDays[frequency]*1.55;
      previous=p.date;
      return {date:p.date,value:p.value,...(gap?{breakBefore:true}:{})};
    });
}

/**
 * Builds public display data solely from verified stored PIT observations.
 * A raw series may be available while its ten-year percentile score is partial.
 * Do not mark old observations as recent or fill missing periods.
 */
export function buildEmploymentR6OneYearReadModel(observations,{asOfDate,sourceStoredAt=null}={}){
  const asOf=asOfDay(asOfDate);
  if(!Array.isArray(observations))throw new TypeError("STORED_OBSERVATIONS_REQUIRED");
  if(sourceStoredAt!==null&&(!Number.isSafeInteger(sourceStoredAt)||sourceStoredAt<0||sourceStoredAt>asOf+DAY_MS)){
    throw new TypeError("SOURCE_STORED_AT_INVALID");
  }
  const asOfObservations=observations.filter(row=>typeof row?.observationDate==="string"&&row.observationDate<=asOfDate);
  const start=oneYearEarlier(asOf),quarterStart=iso(asOf-92*DAY_MS);
  const indicators=EMPLOYMENT_R6_FEATURES.map(feature=>{
    const all=deriveEmploymentR6FeatureHistory(feature,asOfObservations);
    const current=all.at(-1),prior=all.at(-2),computed=computeFeaturePoint(feature,asOfObservations);
    const history=chartPoints(all,start,asOfDate,feature.freq);
    const recentCount=history.filter(p=>p.date>=quarterStart).length;
    const hasYearSource=Boolean(all[0]?.date<=start);
    const chartStatus=history.length>=2&&hasYearSource
      ? (recentCount>0?"READY":"PARTIAL")
      : "UNAVAILABLE";
    const rawStatus=!current?"UNAVAILABLE":current.date>=quarterStart?"READY":"STALE";
    return {
      id:feature.id,
      scoreStatus:computed.status,
      score:computed.status==="READY"&&finite(computed.score)?computed.score:null,
      rawStatus,
      value:current?.value??null,
      previousValue:prior?.value??null,
      observationDate:current?.date??null,
      previousObservationDate:prior?.date??null,
      unit:UNITS[feature.id]??"",
      history,
      chartStatus,
      chartPointCount:history.length,
      recentQuarterPointCount:recentCount,
      firstSourceObservation:all[0]?.date??null,
      lastSourceObservation:current?.date??null,
      firstMissingReferenceDate:computed.missingExpectedDate??null,
    };
  });
  return {
    kind:"EMPLOYMENT_R6_ONE_YEAR_STORED_DISPLAY_R1",
    formulaHash:EMPLOYMENT_R6_FORMULA_HASH,
    methodologyVersion:EMPLOYMENT_R6_FORMULA_REVISION,
    status:indicators.every(x=>x.scoreStatus==="READY")?"READY":"PARTIAL",
    asOfDate,
    sourceStoredAt,
    window:{start,end:asOfDate,recentQuarterStart:quarterStart},
    summary:{
      sourceFeatures:indicators.filter(x=>x.rawStatus!=="UNAVAILABLE").length,
      recentlyObservedFeatures:indicators.filter(x=>x.rawStatus==="READY").length,
      chartReadyFeatures:indicators.filter(x=>x.chartStatus==="READY").length,
      chartPartialFeatures:indicators.filter(x=>x.chartStatus==="PARTIAL").length,
      scoredFeatures:indicators.filter(x=>x.scoreStatus==="READY").length,
      recentlyScoredFeatures:indicators.filter(x=>x.scoreStatus==="READY"&&x.rawStatus==="READY").length,
    },
    indicators,
  };
}
