// Research-only ZGMINI rate sentiment. Never use this as a FedWatch probability.
export const RATE_SENTIMENT_R1_RESEARCH=Object.freeze({
  version:'RATE_SENTIMENT_R1_RESEARCH',
  weights:Object.freeze({policyProxy:0.50,twoYearRsi:0.20,tenYearRsi:0.20,stability:0.10}),
  rsiSessions:14,spreadChangeSessions:5,volatilitySessions:20,referenceSessions:756,
  interpretation:'0=negative rate sentiment; 100=positive rate sentiment',
  fedWatchEquivalent:false,productionApproved:false,
});
const finite=Number.isFinite;
const isDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'));
const bounded=x=>Math.max(0,Math.min(100,x));
function normalize(rows){
  const map=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const date=String(row?.observationDate??row?.date??'');
    const raw=row?.value;
    if(!isDate(date)||raw===null||raw===undefined||typeof raw==='boolean'||typeof raw==='string'&&!raw.trim())continue;
    const value=Number(raw);
    if(!finite(value))continue;
    if(map.has(date)&&map.get(date)!==value)throw Error('RATE_SENTIMENT_DUPLICATE_CONFLICT');
    map.set(date,value);
  }
  return map;
}
// Wilder smoothing: initial average of 14 daily changes, then recursively updated.
export function wilderRsiSeries(values,period=14){
  const out=Array(values.length).fill(null);
  if(values.length<=period)return out;
  let gain=0,loss=0;
  for(let i=1;i<=period;i++){
    const d=values[i]-values[i-1];gain+=Math.max(d,0);loss+=Math.max(-d,0);
  }
  gain/=period;loss/=period;
  const toRsi=()=>gain===0&&loss===0?50:loss===0?100:gain===0?0:100-100/(1+gain/loss);
  out[period]=toRsi();
  for(let i=period+1;i<values.length;i++){
    const d=values[i]-values[i-1];
    gain=(gain*(period-1)+Math.max(d,0))/period;
    loss=(loss*(period-1)+Math.max(-d,0))/period;
    out[i]=toRsi();
  }
  return out;
}
function volatilityOfLastChanges(values,index,window){
  if(index<window)return null;
  const ds=[];
  for(let j=index-window+1;j<=index;j++)ds.push(values[j]-values[j-1]);
  const m=ds.reduce((a,b)=>a+b,0)/window;
  return Math.sqrt(ds.reduce((s,x)=>s+(x-m)**2,0)/window);
}
function percentileAgainstPrior(values,index,lookback){
  const prior=[];
  for(let j=index-1;j>=0&&prior.length<lookback;j--)if(finite(values[j]))prior.push(values[j]);
  if(prior.length<lookback||!finite(values[index]))return null;
  let lower=0,equal=0;
  for(const x of prior){if(x<values[index])lower++;else if(x===values[index])equal++;}
  return bounded(100*(lower+0.5*equal)/prior.length);
}
function weekdaysBetween(from,to){
  if(!isDate(from)||!isDate(to)||from>=to)return 0;
  const d=new Date(from+'T00:00:00Z'),end=Date.parse(to+'T00:00:00Z');
  let n=0;
  while(d.getTime()<end){d.setUTCDate(d.getUTCDate()+1);if(d.getUTCDay()!==0&&d.getUTCDay()!==6)n++;}
  return n;
}
export function buildRateSentimentR1({dgs2Rows=[],dgs3moRows=[],dgs10Rows=[],asOfDate}={}){
  if(!isDate(asOfDate))throw Error('RATE_SENTIMENT_ASOF_INVALID');
  const input={DGS2:normalize(dgs2Rows),DGS3MO:normalize(dgs3moRows),DGS10:normalize(dgs10Rows)};
  const inputLastDates=Object.fromEntries(Object.entries(input).map(([k,v])=>[k,[...v.keys()].filter(d=>d<=asOfDate).sort().at(-1)??null]));
  const dates=[...input.DGS2.keys()].filter(d=>d<=asOfDate&&input.DGS3MO.has(d)&&input.DGS10.has(d)).sort();
  const rows=dates.map(date=>({date,d2:input.DGS2.get(date),d3:input.DGS3MO.get(date),d10:input.DGS10.get(date)}));
  const rates2=rows.map(x=>x.d2),rates10=rows.map(x=>x.d10),spreads=rows.map(x=>x.d2-x.d3);
  const rsi2=wilderRsiSeries(rates2),rsi10=wilderRsiSeries(rates10);
  const easing=rows.map((_,i)=>i<5?null:-(spreads[i]-spreads[i-5]));
  const volatility=rows.map((_,i)=>volatilityOfLastChanges(rates10,i,RATE_SENTIMENT_R1_RESEARCH.volatilitySessions));
  const history=[];
  for(let i=0;i<rows.length;i++){
    const policyProxy=percentileAgainstPrior(easing,i,756);
    const volRank=percentileAgainstPrior(volatility,i,756);
    const c={policyProxy,twoYearRsi:finite(rsi2[i])?100-rsi2[i]:null,tenYearRsi:finite(rsi10[i])?100-rsi10[i]:null,stability:finite(volRank)?100-volRank:null};
    if(!Object.values(c).every(finite))continue;
    const w=RATE_SENTIMENT_R1_RESEARCH.weights;
    const score=bounded(w.policyProxy*c.policyProxy+w.twoYearRsi*c.twoYearRsi+w.tenYearRsi*c.tenYearRsi+w.stability*c.stability);
    history.push({date:rows[i].date,score,components:c,raw:{DGS2:rows[i].d2,DGS3MO:rows[i].d3,DGS10:rows[i].d10,spreadChange5:easing[i],volatility20:volatility[i]}});
  }
  const latest=history.at(-1)??null;
  const lag=latest?weekdaysBetween(latest.date,asOfDate):null;
  const status=!latest?'NOT_READY':lag>2?'STALE':'READY';
  return {
    version:RATE_SENTIMENT_R1_RESEARCH.version,status,score:status==='READY'?latest.score:null,
    observationDate:latest?.date??null,asOfDate,inputLastDates,
    weights:RATE_SENTIMENT_R1_RESEARCH.weights,components:status==='READY'?latest.components:null,
    history,week:history.slice(-5),oneMonth:history.slice(-22),
    coverage:{alignedSessions:rows.length,scoredSessions:history.length,weekdayLag:lag},
    reason:status==='NOT_READY'?'RATE_SENTIMENT_INSUFFICIENT_3Y_HISTORY':status==='STALE'?'RATE_SENTIMENT_INPUT_STALE':null,
    mode:'RESEARCH_ONLY',providerCalls:0,publicMutation:false,productionFormulaChanged:false,
    fedWatchEquivalent:false,historyMode:'CURRENT_VINTAGE_ONLY',lookAheadSafe:false,
  };
}
