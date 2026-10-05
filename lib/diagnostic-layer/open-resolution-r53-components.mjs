const finite = value => typeof value === 'number' && Number.isFinite(value);
const clamp100 = value => Math.max(0, Math.min(100, value));

function normalizeRows(rows = []) {
  const map = new Map();
  for (const row of rows ?? []) {
    const observationDate = row?.observationDate ?? row?.date;
    const value = Number(row?.value);
    if (typeof observationDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(observationDate) || !finite(value)) continue;
    map.set(observationDate, {observationDate, value});
  }
  return [...map.values()].sort((a, b) => a.observationDate.localeCompare(b.observationDate));
}

function percentile(values, current) {
  if (!values.length || !finite(current)) return null;
  let below = 0;
  let equal = 0;
  for (const value of values) {
    if (value < current) below++;
    else if (value === current) equal++;
  }
  return 100 * (below + 0.5 * equal) / values.length;
}

function expandingPercentile(rows, {minValid = 1, inverse = false} = {}) {
  const seen = [];
  return rows.map(row => {
    seen.push(row.value);
    const score = seen.length >= minValid ? percentile(seen, row.value) : null;
    return {observationDate: row.observationDate, value: finite(score) ? (inverse ? 100 - score : score) : null};
  });
}

function changeRows(rows, lag, transform) {
  const out = [];
  for (let i = lag; i < rows.length; i++) {
    const value = transform(rows[i].value, rows[i - lag].value);
    if (finite(value)) out.push({observationDate: rows[i].observationDate, value});
  }
  return out;
}

function pctChangeRows(rows, lag) {
  return changeRows(rows, lag, (current, previous) =>
    previous > 0 ? ((current / previous) - 1) * 100 : NaN);
}

function rollingVolatility(rows, window = 20) {
  const returns = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i - 1].value <= 0) continue;
    const value = ((rows[i].value / rows[i - 1].value) - 1) * 100;
    if (finite(value)) returns.push({observationDate: rows[i].observationDate, value});
  }
  const out = [];
  for (let i = window - 1; i < returns.length; i++) {
    const sample = returns.slice(i - window + 1, i + 1).map(row => row.value);
    const mean = sample.reduce((a, b) => a + b, 0) / sample.length;
    const variance = sample.reduce((a, b) => a + ((b - mean) ** 2), 0) / sample.length;
    out.push({observationDate: returns[i].observationDate, value: Math.sqrt(variance)});
  }
  return out;
}

const byDate = rows => new Map(rows.map(row => [row.observationDate, row]));

function latestAtOrBefore(rows, asOfDate) {
  let latest = null;
  for (const row of rows ?? []) {
    if (row.observationDate > asOfDate) break;
    latest = row;
  }
  return latest;
}

function stressPersistence(rows, asOfDate, {field='stress', lookback=5, minHits=3, threshold=80} = {}) {
  const recent=(rows??[]).filter(row=>row.observationDate<=asOfDate).slice(-lookback);
  if(recent.length<lookback)return false;
  return recent.filter(row=>finite(row[field])&&row[field]>=threshold).length>=minHits;
}

export function applyRateContextGuardR53({baseRateScore,recessionScore,creditScore,persistent=false}={}) {
  if (![baseRateScore,recessionScore,creditScore].every(finite)) {
    return {status:'PARTIAL',score:null,cap:null,crisisContext:null,persistent:Boolean(persistent)};
  }
  const crisisContext=recessionScore<45||creditScore<45;
  const cap=crisisContext?(persistent?50:60):100;
  return {status:'READY',score:Math.min(clamp100(baseRateScore),cap),cap,crisisContext,persistent:Boolean(persistent)};
}

export function buildRateR53({tenYearRows=[],asOfDate,recessionScore,creditScore,minValid=252}={}) {
  const rows=normalizeRows(tenYearRows);
  if(!asOfDate||!rows.length)return {status:'PARTIAL',score:null,reason:'MISSING_RATE_HISTORY'};
  const p5=expandingPercentile(changeRows(rows,5,(c,p)=>-(c-p)),{minValid});
  const p20=expandingPercentile(changeRows(rows,20,(c,p)=>-(c-p)),{minValid});
  const m5=byDate(p5),m20=byDate(p20);
  const stressRows=rows.map(row=>{
    const s5=m5.get(row.observationDate)?.value??null;
    const s20=m20.get(row.observationDate)?.value??null;
    return {observationDate:row.observationDate,shock5:s5,shock20:s20,stress:finite(s5)&&finite(s20)?Math.max(s5,s20):null};
  });
  const latestYield=latestAtOrBefore(rows,asOfDate);
  const latestStress=latestAtOrBefore(stressRows.filter(r=>finite(r.stress)),asOfDate);
  if(!latestYield||!latestStress)return {status:'PARTIAL',score:null,reason:'RATE_WARMUP'};
  const baseRateScore=clamp100(72-((latestYield.value-3.5)*28));
  const persistent=stressPersistence(stressRows,asOfDate);
  return {
    ...applyRateContextGuardR53({baseRateScore,recessionScore,creditScore,persistent}),
    observationDate:latestYield.observationDate,yield10y:latestYield.value,baseRateScore,
    shock5:latestStress.shock5,shock20:latestStress.shock20,shockStress:latestStress.stress,
    historyMode:'CURRENT_VINTAGE_ONLY',lookAheadSafe:false
  };
}

export function buildFundFlowR53(rows=[],{asOfDate='9999-12-31',minValid=12}={}) {
  const normalized=normalizeRows(rows);
  if(!normalized.length)return {status:'PARTIAL',score:null,reason:'MISSING_REGISTERED_FUND_FLOW_ROWS',rows:[]};
  const level=expandingPercentile(normalized,{minValid});
  const adverse=changeRows(normalized,1,(c,p)=>-(c-p));
  const shock=expandingPercentile(adverse,{minValid});
  const lm=byDate(level),sm=byDate(shock);
  const output=normalized.map(row=>({
    observationDate:row.observationDate,netFlowRatio:row.value,
    score:lm.get(row.observationDate)?.value??null,
    shock:sm.get(row.observationDate)?.value??null
  }));
  const latest=latestAtOrBefore(output.filter(r=>finite(r.score)&&finite(r.shock)),asOfDate);
  if(!latest)return {status:'PARTIAL',score:null,reason:'FUND_FLOW_WARMUP',rows:output};
  const persistent=stressPersistence(output.map(r=>({...r,stress:r.shock})),asOfDate,{lookback:3,minHits:2});
  return {status:'READY',observationDate:latest.observationDate,score:latest.score,shock:latest.shock,stress:latest.shock,persistent,rows:output,historyMode:'CURRENT_VINTAGE_ONLY',lookAheadSafe:false};
}

export const FUND_FLOW_R54_WEIGHTS=Object.freeze({
  allNet:0.40,momentum:0.25,participation:0.20,redemption:0.15,
});
function normalizeFundFlowR54Rows(rows=[]){
  const map=new Map();
  for(const row of rows??[]){
    const observationDate=row?.observationDate??row?.date;
    const allNetRatio=finite(row?.allNetRatio)?row.allNetRatio:(finite(row?.value)?row.value:NaN);
    const indexNetRatio=finite(row?.indexNetRatio)?row.indexNetRatio:NaN;
    const nonIndexNetRatio=finite(row?.nonIndexNetRatio)?row.nonIndexNetRatio:NaN;
    const allOutflowRatio=finite(row?.allOutflowRatio)?row.allOutflowRatio:NaN;
    if(typeof observationDate!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(observationDate))continue;
    if(![allNetRatio,indexNetRatio,nonIndexNetRatio,allOutflowRatio].every(finite))continue;
    map.set(observationDate,{observationDate,allNetRatio,indexNetRatio,nonIndexNetRatio,allOutflowRatio});
  }
  return [...map.values()].sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
}
export function buildFundFlowR54(rows=[],{asOfDate='9999-12-31',minValid=12}={}){
  const normalized=normalizeFundFlowR54Rows(rows);
  if(!normalized.length)return {status:'PARTIAL',score:null,reason:'FUND_FLOW_R54_REQUIRED_SERIES_MISSING',rows:[],methodologyVersion:'FUND_FLOW_R54_1'};
  const allNetRows=normalized.map(r=>({observationDate:r.observationDate,value:r.allNetRatio}));
  const indexRows=normalized.map(r=>({observationDate:r.observationDate,value:r.indexNetRatio}));
  const nonIndexRows=normalized.map(r=>({observationDate:r.observationDate,value:r.nonIndexNetRatio}));
  const momentumRows=changeRows(allNetRows,1,(c,p)=>c-p);
  const pressureRows=normalized.map(r=>({observationDate:r.observationDate,value:Math.abs(r.allOutflowRatio)}));
  const allNetScores=byDate(expandingPercentile(allNetRows,{minValid}));
  const momentumScores=byDate(expandingPercentile(momentumRows,{minValid}));
  const indexScores=byDate(expandingPercentile(indexRows,{minValid}));
  const nonIndexScores=byDate(expandingPercentile(nonIndexRows,{minValid}));
  const pressureScores=byDate(expandingPercentile(pressureRows,{minValid}));
  const momentumRaw=byDate(momentumRows);
  const output=normalized.map(row=>{
    const allNetScore=allNetScores.get(row.observationDate)?.value??null;
    const momentumScore=momentumScores.get(row.observationDate)?.value??null;
    const indexScore=indexScores.get(row.observationDate)?.value??null;
    const nonIndexScore=nonIndexScores.get(row.observationDate)?.value??null;
    const participationScore=finite(indexScore)&&finite(nonIndexScore)?0.5*indexScore+0.5*nonIndexScore:null;
    const pressurePercentile=pressureScores.get(row.observationDate)?.value??null;
    const redemptionScore=finite(pressurePercentile)?100-pressurePercentile:null;
    const scores=[allNetScore,momentumScore,participationScore,redemptionScore];
    const score=scores.every(finite)?clamp100(
      FUND_FLOW_R54_WEIGHTS.allNet*allNetScore+
      FUND_FLOW_R54_WEIGHTS.momentum*momentumScore+
      FUND_FLOW_R54_WEIGHTS.participation*participationScore+
      FUND_FLOW_R54_WEIGHTS.redemption*redemptionScore):null;
    const shock=finite(momentumScore)?100-momentumScore:null;
    return {observationDate:row.observationDate,allNetRatio:row.allNetRatio,
      netFlowMomentum:momentumRaw.get(row.observationDate)?.value??null,
      indexNetRatio:row.indexNetRatio,nonIndexNetRatio:row.nonIndexNetRatio,
      allOutflowRatio:row.allOutflowRatio,outflowPressure:Math.abs(row.allOutflowRatio),
      allNetScore,momentumScore,participationScore,redemptionScore,score,shock};
  });
  const latest=latestAtOrBefore(output.filter(r=>finite(r.score)&&finite(r.shock)),asOfDate);
  if(!latest)return {status:'PARTIAL',score:null,reason:'FUND_FLOW_R54_WARMUP',rows:output,methodologyVersion:'FUND_FLOW_R54_1'};
  const persistent=stressPersistence(output.map(r=>({...r,stress:r.shock})),asOfDate,{lookback:3,minHits:2});
  return {status:'READY',observationDate:latest.observationDate,score:latest.score,shock:latest.shock,stress:latest.shock,persistent,rows:output,methodologyVersion:'FUND_FLOW_R54_1',historyMode:'CURRENT_VINTAGE_ONLY',lookAheadSafe:false};
}

export function buildDollarFxR53(rows=[],{asOfDate='9999-12-31',minValid=252}={}) {
  const normalized=normalizeRows(rows);
  if(!normalized.length)return {status:'PARTIAL',score:null,reason:'MISSING_BROAD_DOLLAR_ROWS',rows:[]};
  const series=[
    expandingPercentile(pctChangeRows(normalized,5),{minValid}),
    expandingPercentile(pctChangeRows(normalized,20),{minValid}),
    expandingPercentile(pctChangeRows(normalized,60),{minValid}),
    expandingPercentile(rollingVolatility(normalized,20),{minValid})
  ];
  const maps=series.map(byDate);
  const output=normalized.map(row=>{
    const s5=maps[0].get(row.observationDate)?.value??null;
    const s20=maps[1].get(row.observationDate)?.value??null;
    const s60=maps[2].get(row.observationDate)?.value??null;
    const vol=maps[3].get(row.observationDate)?.value??null;
    if(![s5,s20,s60,vol].every(finite))return {observationDate:row.observationDate,score:null,stress:null};
    const strengthStress=.25*s5+.45*s20+.30*s60;
    const stress=.70*strengthStress+.30*vol;
    return {observationDate:row.observationDate,score:100-stress,stress,strengthStress,volStress:vol,shock5:s5,shock20:s20,shock60:s60};
  });
  const latest=latestAtOrBefore(output.filter(r=>finite(r.score)),asOfDate);
  if(!latest)return {status:'PARTIAL',score:null,reason:'DOLLAR_FX_WARMUP',rows:output};
  return {status:'READY',...latest,persistent:stressPersistence(output,asOfDate),rows:output,historyMode:'CURRENT_VINTAGE_ONLY',lookAheadSafe:false};
}

export function coverageBoundaryR53({activeSourceExistsAtEvent,approvedBridgeCoversEvent,event,domain}={}) {
  if(activeSourceExistsAtEvent||approvedBridgeCoversEvent)return {status:'VALIDATABLE',event:event??null,domain:domain??null};
  return {status:'COVERAGE_BOUNDARY_CLOSED',event:event??null,domain:domain??null,reason:'HISTORICAL_SOURCE_UNAVAILABLE',proxySubstitutionAllowed:false,reweightAllowed:false};
}

export function buildStressPulseR53(entries=[]) {
  const normalized=entries.filter(e=>e&&typeof e.id==='string').map(e=>({id:e.id,stress:finite(e.stress)?e.stress:null,persistent:e.persistent===true}));
  const confirmed=normalized.filter(e=>finite(e.stress)&&e.stress>=80&&e.persistent);
  const count=confirmed.length;
  const state=count>=4?'SYSTEMIC_STRESS':count===3?'STRESS':count===2?'WATCH':'NORMAL';
  return {status:normalized.length>=6?'READY':'PARTIAL',state,confirmedCount:count,confirmedDomains:confirmed.map(e=>e.id),coveredDomains:normalized.filter(e=>finite(e.stress)).length,expectedDomains:6,overallPenaltyApplied:false};
}
