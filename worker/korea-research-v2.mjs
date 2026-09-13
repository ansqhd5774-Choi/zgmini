import {percentileScore} from './phase2-methodology.mjs';

export const RESEARCH_V2_VERSION = 'kr-research-v2-1.0.0';
export const RESEARCH_V2_WEIGHTS = Object.freeze({breadth:.25,momentum:.20,strength:.15,credit:.15,liquidation:.15,volatility:.10});
export const RESEARCH_V2_REQUIRED_HISTORY = Object.freeze({momentum:311,strength:252,volatility:271});
const finite = value => typeof value === 'number' && Number.isFinite(value);
const validScore = value => finite(value) && value >= 0 && value <= 100;
const dateKey = value => typeof value === 'string' && /^\d{8}$/.test(value);
const clamp = value => Math.max(0, Math.min(100, value));

function uniqueDates(rows) {
  return [...new Set(rows.map(row => row.date).filter(dateKey))].sort();
}
function bySecurity(rows) {
  const result = new Map();
  for (const row of rows) if (dateKey(row.date) && row.securityId) {
    if (!result.has(row.securityId)) result.set(row.securityId, []);
    result.get(row.securityId).push(row);
  }
  for (const history of result.values()) history.sort((a,b) => a.date.localeCompare(b.date));
  return result;
}
function weightedAverage(items) {
  let numerator = 0, denominator = 0;
  for (const item of items) if (finite(item.value) && finite(item.weight) && item.weight > 0) {
    numerator += item.value * item.weight; denominator += item.weight;
  }
  return denominator > 0 ? numerator / denominator : null;
}
function rollingPercentile(points, window=252, inverse=false) {
  return points.map((point, index) => {
    if (!finite(point.value) || index < window - 1) return {date:point.date,value:null};
    const values = points.slice(index - window + 1, index + 1).map(item => item.value);
    if (values.some(value => !finite(value))) return {date:point.date,value:null};
    const score = percentileScore(values, point.value);
    return {date:point.date,value:finite(score) ? (inverse ? 100-score : score) : null};
  });
}
function marketReturns(rows, horizon) {
  const histories = bySecurity(rows), dates = uniqueDates(rows), result = [];
  for (const history of histories.values()) history.indexByDate = new Map(history.map((row, index) => [row.date, index]));
  for (const date of dates) {
    const items = [];
    for (const history of histories.values()) {
      const index = history.indexByDate.get(date) ?? -1;
      if (index < horizon) continue;
      const current = history[index], previous = history[index-horizon];
      if (!finite(current.close) || !finite(previous.close) || previous.close <= 0 || !finite(previous.marketCap) || previous.marketCap <= 0) continue;
      items.push({value:current.close / previous.close - 1, weight:previous.marketCap});
    }
    result.push({date,value:weightedAverage(items)});
  }
  return result;
}
function standardDeviation(values) {
  if (!values.length) return null;
  const mean = values.reduce((sum,value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum,value) => sum + (value-mean) ** 2, 0) / values.length);
}
function rollingExtrema(history, window, pick) {
  const deque=[], out=Array(history.length).fill(null);
  for(let i=0;i<history.length;i++) {
    const value=history[i].close;
    while(deque.length && deque[0] < i-window+1) deque.shift();
    if(finite(value)) { while(deque.length && pick(history[deque.at(-1)].close,value)) deque.pop(); deque.push(i); }
    if(deque.length && i>=window-1) out[i]=history[deque[0]].close;
  }
  return out;
}

export function calculateMomentum(rows) {
  const ret20 = rollingPercentile(marketReturns(rows,20),252);
  const ret60 = rollingPercentile(marketReturns(rows,60),252);
  const right = new Map(ret60.map(point => [point.date, point.value]));
  return ret20.map(point => ({date:point.date,value:validScore(point.value) && validScore(right.get(point.date)) ? .6*point.value+.4*right.get(point.date) : null}));
}

export function calculateStrength(rows) {
  const histories = bySecurity(rows), dates = uniqueDates(rows), values = [];
  for (const history of histories.values()) {
    history.indexByDate = new Map(history.map((row, index) => [row.date, index]));
    const prefix=[0], ma125=[], high252=[], low252=[];
    for (const row of history) prefix.push(prefix.at(-1)+(finite(row.close)?row.close:0));
    for (let i=0;i<history.length;i++) ma125[i]=i>=124?(prefix[i+1]-prefix[i-124])/125:null;
    high252.splice(0,high252.length,...rollingExtrema(history,252,(a,b)=>a<=b));
    low252.splice(0,low252.length,...rollingExtrema(history,252,(a,b)=>a>=b));
    history.stats={ma125,high252,low252};
  }
  for (const date of dates) {
    const components = [];
    for (const history of histories.values()) {
      const index = history.indexByDate.get(date) ?? -1;
      if (index < 251) continue;
      const current = history[index], prior = history.slice(0,index+1).map(row => row.close).filter(finite);
      if (!finite(current.close) || prior.length < 125) continue;
      const {ma125,high252,low252}=history.stats, ma=ma125[index], high=high252[index], low=low252[index];
      if (!finite(ma) || !finite(high) || !finite(low)) continue;
      components.push({above:current.close >= ma ? 100 : 0, balance:high === low ? 50 : 100*(current.close-low)/(high-low)});
    }
    values.push({date,value:components.length ? clamp(components.reduce((sum,item) => sum+(item.above+item.balance)/2,0)/components.length) : null});
  }
  return values;
}

export function calculateVolatility(rows) {
  const returns = marketReturns(rows,1), values = [];
  for (let index=0; index<returns.length; index++) {
    if (index < 19) { values.push({date:returns[index].date,value:null}); continue; }
    const window = returns.slice(index-19,index+1).map(point => point.value);
    values.push({date:returns[index].date,value:window.every(finite) ? {rv:standardDeviation(window),crash:window.filter(value => value <= -.05).length/window.length} : null});
  }
  const rv = rollingPercentile(values.map(point => ({date:point.date,value:point.value?.rv??null})),252,true);
  const crash = rollingPercentile(values.map(point => ({date:point.date,value:point.value?.crash??null})),252,true);
  const crashMap = new Map(crash.map(point => [point.date,point.value]));
  return rv.map(point => ({date:point.date,value:validScore(point.value) && validScore(crashMap.get(point.date)) ? (point.value+crashMap.get(point.date))/2 : null}));
}

function normalizeHistory(history) {
  const map = new Map();
  for (const point of history ?? []) if (dateKey(point.date)) {
    const value = validScore(point.value ?? point.score) ? (point.value ?? point.score) : null;
    if (map.has(point.date) && map.get(point.date) !== value) map.set(point.date,null); else map.set(point.date,value);
  }
  return map;
}

/** Adapt the existing public component histories without changing their API or orientation. */
export function researchHistoriesFromPublicIndicators(indicators = []) {
  const byId = new Map(indicators.map(indicator => [indicator?.id, indicator]));
  const history = id => (byId.get(id)?.history ?? []).map(point => ({
    date: point?.date,
    value: point?.score ?? point?.value ?? null,
  }));
  return {credit: history('LEV_BLEND20_60'), liquidation: history('L3_PRESSURE_P252')};
}

export function buildResearchComposite({breadth=[],momentum=[],strength=[],credit=[],liquidation=[],volatility=[]}={}) {
  const series = {breadth,momentum,strength,credit,liquidation,volatility};
  const maps = Object.fromEntries(Object.entries(series).map(([name,history]) => [name,normalizeHistory(history)]));
  const dates = [...new Set(Object.values(maps).flatMap(map => [...map.keys()]))].sort();
  const history = dates.map(date => {
    const components = Object.fromEntries(Object.entries(maps).map(([name,map]) => [name,map.get(date) ?? null]));
    const ready = Object.values(components).every(validScore);
    return {date,value:ready ? Object.entries(RESEARCH_V2_WEIGHTS).reduce((sum,[name,weight]) => sum+components[name]*weight,0) : null,components};
  });
  const usable = history.filter(point => validScore(point.value)), current = usable.at(-1), previous = usable.at(-2);
  return {id:'ZGMINI_KR_FG_RESEARCH_V2',methodologyVersion:RESEARCH_V2_VERSION,weights:RESEARCH_V2_WEIGHTS,
    status:current ? 'READY' : 'UNAVAILABLE',score:current?.value ?? null,observationDate:current?.date ?? null,
    previousObservationDate:previous?.date ?? null,changePoints:current&&previous ? current.value-previous.value : null,history};
}

export function researchReadiness({breadth=[],momentum=[],strength=[],credit=[],liquidation=[],volatility=[]}={}) {
  const histories = {breadth,momentum,strength,credit,liquidation,volatility};
  const required = {breadth:1,momentum:RESEARCH_V2_REQUIRED_HISTORY.momentum,
    strength:RESEARCH_V2_REQUIRED_HISTORY.strength,credit:1,liquidation:1,
    volatility:RESEARCH_V2_REQUIRED_HISTORY.volatility};
  return Object.fromEntries(Object.entries(histories).map(([name,history]) => {
    const available = history.filter(point => validScore(point.value ?? point.score)).length;
    return [name,{available,required:required[name],ready:available >= required[name]}];
  }));
}

/** Research-only calculation over persisted market rows and already validated component histories. */
export function calculateResearchFactors({marketRows=[],breadth=[],momentum=[],strength=[],credit=[],liquidation=[],volatility=[],componentIndicators=[]}={}) {
  if ((!credit.length || !liquidation.length) && componentIndicators.length) {
    const adapted = researchHistoriesFromPublicIndicators(componentIndicators);
    credit = credit.length ? credit : adapted.credit;
    liquidation = liquidation.length ? liquidation : adapted.liquidation;
  }
  momentum = momentum.length ? momentum : (marketRows.length ? calculateMomentum(marketRows) : []);
  strength = strength.length ? strength : (marketRows.length ? calculateStrength(marketRows) : []);
  volatility = volatility.length ? volatility : (marketRows.length ? calculateVolatility(marketRows) : []);
  const histories = {breadth,momentum,strength,credit,liquidation,volatility};
  return {researchOnly:true,productionEligible:false,methodologyVersion:RESEARCH_V2_VERSION,
    factors:histories,readiness:researchReadiness(histories),composite:buildResearchComposite(histories)};
}
