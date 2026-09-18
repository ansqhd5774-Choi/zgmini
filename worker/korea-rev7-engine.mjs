export const REV7_VERSION = 'kr-fg-cnn-r7-1.0.0';
export const REV7_INDEX_ID = 'ZGMINI_KR_FG_CNN_R7';
export const REV7_SCORE_WINDOW = 504;
export const REV7_STRENGTH_PRIOR_OBSERVATIONS = 251;
export const REV7_FACTORS = Object.freeze([
  'momentum','strength','breadth','putCall','volatility','safeHaven','junkBond',
]);
export const REV7_DIRECTIONS = Object.freeze({
  momentum: 1,
  strength: 1,
  breadth: 1,
  putCall: -1,
  volatility: -1,
  safeHaven: 1,
  junkBond: -1,
});

const finite = value => typeof value === 'number' && Number.isFinite(value);
const validDate = value => typeof value === 'string' && /^\d{8}$/.test(value);
const mean = values => values.length ? values.reduce((sum,value)=>sum+value,0)/values.length : null;
const sampleStd = values => {
  if (values.length < 2) return null;
  const m = mean(values);
  return Math.sqrt(values.reduce((sum,value)=>sum+(value-m)**2,0)/(values.length-1));
};
const normalCdf = value => {
  const sign=value<0?-1:1;
  const z=Math.abs(value)/Math.sqrt(2);
  const t=1/(1+0.3275911*z);
  const erf=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-z*z);
  return .5*(1+sign*erf);
};
const sma = (values,index,window) => {
  if (index < window-1) return null;
  const slice=values.slice(index-window+1,index+1);
  return slice.every(finite) ? mean(slice) : null;
};
const observedScore = (values,index,direction) => {
  if (!finite(values[index])) return null;
  const observations=[];
  for (let i=index;i>=0&&observations.length<REV7_SCORE_WINDOW;i--)
    if (finite(values[i])) observations.push(values[i]);
  if (observations.length < REV7_SCORE_WINDOW) return null;
  observations.reverse();
  const std=sampleStd(observations);
  const greed = !finite(std) || std===0
    ? 50
    : 100*normalCdf((values[index]-mean(observations))/std);
  return direction===1 ? greed : 100-greed;
};
const rollingReturn = (values,index,horizon) => {
  if (index<horizon || !finite(values[index]) || !finite(values[index-horizon]) || values[index-horizon]===0) return null;
  return values[index]/values[index-horizon]-1;
};
const max = values => values.reduce((result,value)=>value>result?value:result,-Infinity);
const min = values => values.reduce((result,value)=>value<result?value:result,Infinity);

function normalizeMarketRows(rows=[]) {
  return rows.filter(row =>
    validDate(row?.date) &&
    typeof row?.securityId === 'string' && row.securityId &&
    finite(row?.close) && finite(row?.high) && finite(row?.low)
  ).sort((a,b)=>a.date.localeCompare(b.date)||a.securityId.localeCompare(b.securityId));
}
function normalizeSeries(rows=[]) {
  const map=new Map();
  for (const row of rows ?? []) if (validDate(row?.date)) {
    if (map.has(row.date)) throw Error('DUPLICATE_DAILY_SERIES_DATE');
    map.set(row.date,{...row});
  }
  return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
function strengthRawByDate(rows) {
  const history=new Map(), result=new Map();
  const byDate=new Map();
  for (const row of rows) {
    if (!byDate.has(row.date)) byDate.set(row.date,[]);
    byDate.get(row.date).push(row);
  }
  for (const [date,dateRows] of [...byDate].sort(([a],[b])=>a.localeCompare(b))) {
    let highs=0,lows=0,eligible=0;
    for (const row of dateRows) {
      let h=history.get(row.securityId);
      if (!h) { h={high:[],low:[]}; history.set(row.securityId,h); }
      if (h.high.length >= REV7_STRENGTH_PRIOR_OBSERVATIONS) {
        eligible++;
        if (row.high >= max(h.high)) highs++;
        if (row.low <= min(h.low)) lows++;
      }
      h.high.push(row.high); h.low.push(row.low);
      if (h.high.length > REV7_STRENGTH_PRIOR_OBSERVATIONS) {
        h.high.shift(); h.low.shift();
      }
    }
    result.set(date,eligible?{value:highs-lows,highs,lows,eligible}:null);
  }
  return result;
}
function breadthRawByDate(rows,dates) {
  const byDate=new Map();
  for (const row of rows) {
    if (!byDate.has(row.date)) byDate.set(row.date,[]);
    byDate.get(row.date).push(row);
  }
  const net=[];
  for (const date of dates) {
    let advance=0,decline=0,valid=0;
    for (const row of byDate.get(date) ?? []) {
      if (!finite(row.changeAmount) || !finite(row.shareVolume) || row.shareVolume<0) continue;
      valid++;
      if (row.changeAmount>0) advance+=row.shareVolume;
      else if (row.changeAmount<0) decline+=row.shareVolume;
    }
    net.push(valid ? advance-decline : null);
  }
  let ema19=null,ema39=null,summation=0;
  return net.map((value,index)=>{
    if (index===18) {
      const seed=net.slice(0,19);
      if (seed.every(finite)) ema19=mean(seed);
    } else if (index>18 && finite(value) && finite(ema19)) {
      ema19=(2/20)*value+(18/20)*ema19;
    }
    if (index===38) {
      const seed=net.slice(0,39);
      if (seed.every(finite)) ema39=mean(seed);
    } else if (index>38 && finite(value) && finite(ema39)) {
      ema39=(2/40)*value+(38/40)*ema39;
    }
    if (index>=38 && finite(ema19) && finite(ema39)) {
      const oscillator=ema19-ema39;
      summation+=oscillator;
      return {value:summation,oscillator,netVolume:value};
    }
    return null;
  });
}

/**
 * Revision 7 pure calculation.
 * Input is already persisted/validated KOSPI issue history + one daily market-series row per KRX trading date.
 * No network calls and no missing-factor reweighting.
 */
export function calculateRev7({marketRows=[],dailySeries=[]}={}) {
  const rows=normalizeMarketRows(marketRows);
  const series=normalizeSeries(dailySeries);
  const dates=series.map(row=>row.date);
  const strengthMap=strengthRawByDate(rows);
  const breadth=breadthRawByDate(rows,dates);

  const kospi=series.map(row=>finite(row.kospiClose)?row.kospiClose:null);
  const vkospi=series.map(row=>finite(row.vkospi200Close)?row.vkospi200Close:null);
  const ktb=series.map(row=>finite(row.ktbTotalReturn)?row.ktbTotalReturn:null);
  const putCallDaily=series.map(row=>finite(row.putCallRatio)?row.putCallRatio:null);

  const raw={
    momentum:[],
    strength:[],
    breadth:[],
    putCall:[],
    volatility:[],
    safeHaven:[],
    junkBond:[],
  };

  for (let index=0; index<series.length; index++) {
    const ma125=sma(kospi,index,125);
    raw.momentum.push(finite(ma125)&&ma125!==0 ? kospi[index]/ma125-1 : null);
    raw.strength.push(strengthMap.get(dates[index])?.value ?? null);
    raw.breadth.push(breadth[index]?.value ?? null);
    raw.putCall.push(sma(putCallDaily,index,5));
    const ma50=sma(vkospi,index,50);
    raw.volatility.push(finite(ma50)&&ma50!==0 ? vkospi[index]/ma50-1 : null);
    const stockReturn=rollingReturn(kospi,index,20), bondReturn=rollingReturn(ktb,index,20);
    raw.safeHaven.push(finite(stockReturn)&&finite(bondReturn)?stockReturn-bondReturn:null);
    raw.junkBond.push(finite(series[index].junkSpread)?series[index].junkSpread:null);
  }

  const history=series.map((row,index)=>{
    const factors={};
    for (const id of REV7_FACTORS) {
      const rawValue=raw[id][index];
      factors[id]={
        id,
        raw:finite(rawValue)?rawValue:null,
        score:observedScore(raw[id],index,REV7_DIRECTIONS[id]),
      };
    }
    const scores=REV7_FACTORS.map(id=>factors[id].score);
    const ready=scores.every(finite);
    return {
      date:row.date,
      factors,
      composite:ready ? mean(scores) : null,
      status:ready ? 'READY' : 'WARMUP',
    };
  });
  const usable=history.filter(point=>finite(point.composite));
  const current=usable.at(-1) ?? null;
  const previous=usable.at(-2) ?? null;
  return {
    id:REV7_INDEX_ID,
    methodologyVersion:REV7_VERSION,
    researchOnly:true,
    productionEligible:false,
    historyMode:'RECONSTRUCTED_CURRENT_VINTAGE',
    pointInTimeVerified:false,
    weights:Object.fromEntries(REV7_FACTORS.map(id=>[id,1/7])),
    status:current?'READY':'WARMUP',
    score:current?.composite ?? null,
    observationDate:current?.date ?? null,
    previousObservationDate:previous?.date ?? null,
    changePoints:current&&previous ? current.composite-previous.composite : null,
    history,
  };
}
