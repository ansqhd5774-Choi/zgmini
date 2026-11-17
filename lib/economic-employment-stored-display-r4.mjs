// W06 R4 #50 — display-only provenance for the currently approved R54
// four scored employment factors. The separate R6 29 raw observations remain
// independent and do not become this headline or a manufactured chart point.
import {EMPLOYMENT_R54_METHOD,EMPLOYMENT_R54_WEIGHTS,EMPLOYMENT_R54_INDICATORS} from './market-score/employment-r54-candidate.mjs';
const validScore=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100;
const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&
 Number.isFinite(Date.parse(d+'T00:00:00Z'))&&
 new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
const weights=[EMPLOYMENT_R54_WEIGHTS.unemployment,EMPLOYMENT_R54_WEIGHTS.payrollMomentum,
 EMPLOYMENT_R54_WEIGHTS.claims4w,EMPLOYMENT_R54_WEIGHTS.claimsBreadth];
export function verifiedEconomicEmploymentScore(domain,asOfDate){
 // CM-R1's older composite publisher carries the R54 factor list and
 // interpretation but omits employment.methodologyVersion. Accept that exact
 // existing form only with its distinctive R54 explanation and four audited
 // factors below; a DIFFERENT explicit version is always rejected.
 const provenVersion=domain?.methodologyVersion===EMPLOYMENT_R54_METHOD||
  (domain?.methodologyVersion==null&&
   typeof domain?.interpretation==='string'&&
   domain.interpretation.startsWith('Employment R54 candidate: 실업률 30% + 비농업고용 3M 평균 증감 30% + 신규 실업수당 4W 평균 20% + 주 실업수당 개선 비율 20%.'));
 if(domain?.id!=='employment'||domain.status!=='READY'||!provenVersion||
  !validScore(domain.score)||!validDate(asOfDate)||
  (domain.asOfDate!==undefined&&domain.asOfDate!==null&&domain.asOfDate!==asOfDate)||
  !Array.isArray(domain.indicators)||domain.indicators.length!==4||
  (Array.isArray(domain.missingFactors)&&domain.missingFactors.length!==0))return null;
 let expected=0;
 for(let i=0;i<4;i++){
  const factor=domain.indicators[i];
  if(factor?.id!==EMPLOYMENT_R54_INDICATORS[i].id||factor.status!=='READY'||
   !validScore(factor.score)||!validDate(factor.observationDate)||
   factor.observationDate>asOfDate)return null;
  expected+=weights[i]*factor.score;
 }
 return Math.abs(expected-domain.score)<=1e-6?domain.score:null;
}
export function verifiedEconomicEmploymentChart(domain,asOfDate,headlineScore){
 if(!validScore(headlineScore)||verifiedEconomicEmploymentScore(domain,asOfDate)!==headlineScore)return [];
 const values=new Map(),conflicts=new Set();
 const start=new Date(asOfDate+'T00:00:00Z');start.setUTCFullYear(start.getUTCFullYear()-1);
 const from=start.toISOString().slice(0,10);
 for(const item of Array.isArray(domain.trend)?domain.trend:[]){
  const date=item?.label??item?.date,value=item?.score===null?null:(item?.score??item?.value);
  if(!validDate(date)||date<from||date>asOfDate||!validScore(value))continue;
  if(values.has(date)&&Math.abs(values.get(date)-value)>1e-6){conflicts.add(date);continue;}
  values.set(date,value);
 }
 // Do not hide or silently overwrite contradictory stored history.
 if(conflicts.size)return [];
 const points=[...values].sort(([a],[b])=>a.localeCompare(b)).map(([date,score])=>({date,score}));
 // An explicit current-day point must equal the published R54 score. Older
 // genuine monthly scores may display as HISTORY, never as the current score.
 if(points.at(-1)?.date===asOfDate&&Math.abs(points.at(-1).score-headlineScore)>1e-6)return [];
 return points;
}
export function isEconomicEmploymentChartCurrent(points,asOfDate,score){
 const last=Array.isArray(points)?points.at(-1):null;
 return validDate(asOfDate)&&validScore(score)&&last?.date===asOfDate&&
  validScore(last.score)&&Math.abs(last.score-score)<=1e-6;
}
