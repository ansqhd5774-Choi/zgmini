import {
  SECTOR_FEAR_GREED_R3_REFERENCE_OBSERVATIONS,
  legacyFiveRawFromAxes,
} from './sector-fear-greed-r3-five-axis-complete.mjs';

export const SECTOR_FEAR_GREED_R3_ROLLING_SOURCE_STATUS='SECTOR_FEAR_GREED_R3_ROLLING_252_READY';
export const SECTOR_FEAR_GREED_R3_ROLLING_SOURCE_VERSION='SECTOR-FEAR-GREED-R3-ROLLING-252-V1';
export const SECTOR_FEAR_GREED_R3_ROLLING_WINDOW=252;
export const SECTOR_FEAR_GREED_R3_ETFS=Object.freeze({
  technology:'XLK',
  communication:'XLC',
  discretionary:'XLY',
  staples:'XLP',
  financials:'XLF',
  healthcare:'XLV',
  industrials:'XLI',
  energy:'XLE',
  materials:'XLB',
  realEstate:'XLRE',
  utilities:'XLU',
});
export const SECTOR_FEAR_GREED_R3_BENCHMARKS=Object.freeze(['SPY',...Object.values(SECTOR_FEAR_GREED_R3_ETFS)]);

const PIT_SECTOR_MAP=Object.freeze({
  energy:'energy',materials:'materials',industrials:'industrials',
  consumer_discretionary:'discretionary',consumer_staples:'staples',
  health_care:'healthcare',financials:'financials',
  information_technology:'technology',communication_services:'communication',
  utilities:'utilities',real_estate:'realEstate',
});
const AXIS_SPECS=Object.freeze({
  trend:{metrics:[{key:'m125',weight:.50},{key:'r60',weight:.30},{key:'r20',weight:.20}]},
  breadth:{metrics:[{key:'b50',weight:.35},{key:'b200',weight:.35},{key:'highLowNet',weight:.30}]},
  demand:{metrics:[{key:'vb5',weight:.60},{key:'vb20',weight:.40}]},
  relativeStrength:{metrics:[{key:'rs20',weight:.25},{key:'rs60',weight:.45},{key:'rs125',weight:.30}]},
  volatility:{metrics:[{key:'rv20',weight:.40,invert:true},{key:'dsv20',weight:.35,invert:true},{key:'dd63',weight:.25}]},
});
const AXES=Object.freeze(Object.keys(AXIS_SPECS));
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(`${x}T00:00:00Z`));
const mean=x=>x.length?x.reduce((a,b)=>a+b,0)/x.length:null;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

function parseCsvLine(line){
  const out=[];let current='',quoted=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"'){
      if(quoted&&line[i+1]==='"'){current+='"';i++;}
      else quoted=!quoted;
    }else if(ch===','&&!quoted){out.push(current);current='';}
    else current+=ch;
  }
  if(quoted)throw Error('SECTOR_FEAR_GREED_R3_PIT_UNCLOSED_QUOTE');
  out.push(current);return out;
}
function cleanPitDate(value,{optional=false}={}){
  const text=String(value??'').trim().replace(/\*+$/g,'');
  if(!text&&optional)return null;
  if(!validDate(text))throw Error('SECTOR_FEAR_GREED_R3_PIT_DATE_INVALID');
  return text;
}
export function parseSectorFearGreedR3PitCsv(text){
  const lines=String(text??'').replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.trim());
  if(lines.length<2)throw Error('SECTOR_FEAR_GREED_R3_PIT_EMPTY');
  const header=parseCsvLine(lines[0]).map(x=>String(x).trim().toLowerCase());
  const idx=name=>header.indexOf(name),si=idx('symbol'),gi=idx('sector'),ai=idx('date_added'),ri=idx('date_removed');
  if([si,gi,ai,ri].some(i=>i<0))throw Error('SECTOR_FEAR_GREED_R3_PIT_COLUMNS_MISSING');
  const byTicker={},entries=[];
  for(const line of lines.slice(1)){
    const row=parseCsvLine(line),ticker=String(row[si]??'').trim();
    if(!ticker)continue;
    const sourceSector=String(row[gi]??'').trim().toLowerCase(),sectorId=PIT_SECTOR_MAP[sourceSector];
    if(!sectorId)throw Error('SECTOR_FEAR_GREED_R3_PIT_GICS_UNSUPPORTED');
    const dateAdded=cleanPitDate(row[ai]),dateRemoved=cleanPitDate(row[ri],{optional:true});
    if(dateRemoved&&dateRemoved<=dateAdded)throw Error('SECTOR_FEAR_GREED_R3_PIT_INTERVAL_INVALID');
    const item={ticker,sectorId,dateAdded,dateRemoved};entries.push(item);(byTicker[ticker]??=[]).push(item);
  }
  if(entries.length<500)throw Error('SECTOR_FEAR_GREED_R3_PIT_HISTORY_TOO_SMALL');
  for(const list of Object.values(byTicker))list.sort((a,b)=>a.dateAdded.localeCompare(b.dateAdded)||(a.dateRemoved??'9999').localeCompare(b.dateRemoved??'9999'));
  return {entries,byTicker};
}
function activePitEntry(list,date){
  const matches=(list??[]).filter(x=>x.dateAdded<=date&&(!x.dateRemoved||date<x.dateRemoved));
  if(matches.length>1)throw Error('SECTOR_FEAR_GREED_R3_PIT_OVERLAP_CONFLICT');
  return matches[0]??null;
}

export function mergeSectorFearGreedR3StockRows(rowSets=[],{cutoffDate=null,allowProviderRevisions=false}={}){
  const byKey=new Map();
  for(const rows of rowSets){const inBatch=new Set();for(const row of Array.isArray(rows)?rows:[]){
    const ticker=String(row?.ticker??'').trim();
    const tradeDate=String(row?.tradeDate??row?.trade_date??row?.date??'').slice(0,10);
    const currentClose=Number(row?.currentClose??row?.current_close??row?.close);
    const currentVolume=Number(row?.currentVolume??row?.current_volume??row?.volume);
    if(!ticker||!validDate(tradeDate)||(cutoffDate&&tradeDate>cutoffDate)||!finite(currentClose)||currentClose<=0||!finite(currentVolume)||currentVolume<0)continue;
    const key=`${ticker}|${tradeDate}`,old=byKey.get(key);
    const revised=old&&(old.currentClose!==currentClose||old.currentVolume!==currentVolume);
    const officialRevision=allowProviderRevisions&&!inBatch.has(key)&&row.source==='ALPACA'&&row.feed==='iex'&&row.adjustmentStatus==='split';
    if(revised&&!officialRevision)throw Error(`SECTOR_FEAR_GREED_R3_STOCK_CONFLICT:${ticker}:${tradeDate}`);
    if(!old||revised)byKey.set(key,{ticker,tradeDate,currentClose,currentVolume});
    inBatch.add(key);
  }}
  return [...byKey.values()].sort((a,b)=>a.tradeDate.localeCompare(b.tradeDate)||a.ticker.localeCompare(b.ticker));
}

function emptyAggregate(date,sectorId,memberCount){
  return {date,sectorId,memberCount,observed:0,directionReady:0,upVolume:0,downVolume:0,totalDirectionVolume:0,ready50:0,above50:0,ready200:0,above200:0,ready252:0,newHigh:0,newLow:0};
}
export function buildSectorFearGreedR3PitInputs({rows=[],pitHistory}={}){
  if(!pitHistory?.byTicker)throw Error('SECTOR_FEAR_GREED_R3_PIT_REQUIRED');
  const byTicker=new Map();
  for(const row of rows){const list=byTicker.get(row.ticker)??[];list.push(row);byTicker.set(row.ticker,list);}
  const dates=[...new Set(rows.map(x=>x.tradeDate))],snapshots=new Map();
  for(const date of dates){
    const tickerMap={},counts={};
    for(const [ticker,list] of Object.entries(pitHistory.byTicker)){
      const active=activePitEntry(list,date);if(!active)continue;
      tickerMap[ticker]=active;counts[active.sectorId]=(counts[active.sectorId]??0)+1;
    }
    snapshots.set(date,{tickerMap,counts});
  }
  const aggregates=new Map();
  const getAggregate=(date,sectorId)=>{
    const key=`${date}|${sectorId}`;let a=aggregates.get(key);
    if(!a){a=emptyAggregate(date,sectorId,snapshots.get(date)?.counts?.[sectorId]??0);aggregates.set(key,a);}
    return a;
  };
  for(const [ticker,series] of byTicker){
    series.sort((a,b)=>a.tradeDate.localeCompare(b.tradeDate));
    const prefix=[0],highDeque=[],lowDeque=[];
    for(let i=0;i<series.length;i++){
      const current=series[i],sectorId=snapshots.get(current.tradeDate)?.tickerMap?.[ticker]?.sectorId;
      prefix.push(prefix.at(-1)+current.currentClose);
      if(!sectorId)continue;
      const a=getAggregate(current.tradeDate,sectorId);a.observed++;
      if(i>=1){
        a.directionReady++;a.totalDirectionVolume+=current.currentVolume;
        if(current.currentClose>series[i-1].currentClose)a.upVolume+=current.currentVolume;
        else if(current.currentClose<series[i-1].currentClose)a.downVolume+=current.currentVolume;
      }
      if(i>=49){a.ready50++;const ma=(prefix[i+1]-prefix[i-49])/50;if(current.currentClose>ma)a.above50++;}
      if(i>=199){a.ready200++;const ma=(prefix[i+1]-prefix[i-199])/200;if(current.currentClose>ma)a.above200++;}
      while(highDeque.length&&highDeque[0]<i-251)highDeque.shift();
      while(lowDeque.length&&lowDeque[0]<i-251)lowDeque.shift();
      while(highDeque.length&&series[highDeque.at(-1)].currentClose<=current.currentClose)highDeque.pop();
      while(lowDeque.length&&series[lowDeque.at(-1)].currentClose>=current.currentClose)lowDeque.pop();
      highDeque.push(i);lowDeque.push(i);
      if(i>=251){a.ready252++;if(highDeque[0]===i)a.newHigh++;if(lowDeque[0]===i)a.newLow++;}
    }
  }
  const out=Object.fromEntries(Object.keys(SECTOR_FEAR_GREED_R3_ETFS).map(id=>[id,[]]));
  for(const a of [...aggregates.values()].sort((x,y)=>x.date.localeCompare(y.date)||x.sectorId.localeCompare(y.sectorId))){
    out[a.sectorId].push({
      date:a.date,
      b50:a.ready50?a.above50/a.ready50:null,
      b200:a.ready200?a.above200/a.ready200:null,
      highLowNet:a.ready252?(a.newHigh-a.newLow)/a.ready252:null,
      volumeBreadth:a.totalDirectionVolume>0?(a.upVolume-a.downVolume)/a.totalDirectionVolume:null,
    });
  }
  return out;
}

export function mergeSectorFearGreedR3PriceRows(...rowSets){
  const map=new Map();
  for(const rows of rowSets)for(const row of Array.isArray(rows)?rows:[]){
    const date=String(row?.date??row?.tradeDate??row?.trade_date??row?.t??'').slice(0,10);
    const close=Number(row?.close??row?.currentClose??row?.current_close??row?.c);
    const volume=Number(row?.volume??row?.currentVolume??row?.current_volume??row?.v??0);
    if(!validDate(date)||!finite(close)||close<=0||!finite(volume)||volume<0)continue;
    const old=map.get(date);
    if(old&&Math.abs(old.close/close-1)>1e-10)throw Error(`SECTOR_FEAR_GREED_R3_PRICE_CONFLICT:${date}`);
    if(!old)map.set(date,{date,close,volume});
  }
  return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
function normalizePriceRows(rows=[]){
  return mergeSectorFearGreedR3PriceRows(rows).map(({date,close})=>({date,close}));
}
function stdPopulation(values){const m=mean(values);return Math.sqrt(mean(values.map(x=>(x-m)**2)));}
export function deriveSectorFearGreedR3RawAxes({etfRows=[],spyRows=[],breadthRows=[],demandRows=[]}={}){
  const prices=normalizePriceRows(etfRows),trend=[];
  for(let i=124;i<prices.length;i++){
    const current=prices[i].close,ma125=mean(prices.slice(i-124,i+1).map(x=>x.close));
    trend.push({date:prices[i].date,m125:current/ma125-1,r60:current/prices[i-60].close-1,r20:current/prices[i-20].close-1});
  }
  const breadth=(breadthRows??[]).map(row=>({date:String(row?.date??'').slice(0,10),b50:Number(row?.b50),b200:Number(row?.b200),highLowNet:Number(row?.highLowNet)}))
    .filter(x=>validDate(x.date)&&[x.b50,x.b200,x.highLowNet].every(finite)).sort((a,b)=>a.date.localeCompare(b.date));
  const demandBase=(demandRows??[]).map(row=>({date:String(row?.date??'').slice(0,10),value:Number(row?.volumeBreadth??row?.value)}))
    .filter(x=>validDate(x.date)&&finite(x.value)).sort((a,b)=>a.date.localeCompare(b.date)),demand=[];
  for(let i=19;i<demandBase.length;i++)demand.push({date:demandBase[i].date,vb5:mean(demandBase.slice(i-4,i+1).map(x=>x.value)),vb20:mean(demandBase.slice(i-19,i+1).map(x=>x.value))});
  const spy=normalizePriceRows(spyRows),spyMap=new Map(spy.map(x=>[x.date,x.close]));
  const aligned=prices.filter(x=>spyMap.has(x.date)).map(x=>({date:x.date,left:x.close,right:spyMap.get(x.date)})),relativeStrength=[];
  for(let i=125;i<aligned.length;i++){
    const rel=n=>(aligned[i].left/aligned[i-n].left-1)-(aligned[i].right/aligned[i-n].right-1);
    relativeStrength.push({date:aligned[i].date,rs20:rel(20),rs60:rel(60),rs125:rel(125)});
  }
  const volatility=[];
  for(let i=62;i<prices.length;i++){
    const returns=[];for(let j=i-19;j<=i;j++)returns.push(prices[j].close/prices[j-1].close-1);
    const high=Math.max(...prices.slice(i-62,i+1).map(x=>x.close));
    volatility.push({date:prices[i].date,rv20:stdPopulation(returns)*Math.sqrt(252),dsv20:Math.sqrt(252*mean(returns.map(x=>Math.min(x,0)**2))),dd63:prices[i].close/high-1});
  }
  return {trend,breadth,demand,relativeStrength,volatility};
}
function percentileWindow(values,current,window){
  const clean=values.filter(finite);if(!finite(current)||clean.length<window)return null;
  const sample=clean.slice(-window);let below=0,equal=0;
  for(const x of sample){if(x<current)below++;else if(x===current)equal++;}
  return clamp(100*(below+.5*equal)/sample.length,0,100);
}
export function scoreSectorFearGreedR3RawAxis(rows,spec,window=SECTOR_FEAR_GREED_R3_ROLLING_WINDOW){
  const source=(rows??[]).filter(x=>x&&validDate(x.date)),metrics=spec.metrics,histories=Object.fromEntries(metrics.map(x=>[x.key,[]])),out=[];
  for(const row of source){
    const now=metrics.map(m=>Number(row[m.key]));if(now.some(x=>!finite(x)))continue;
    metrics.forEach((m,i)=>histories[m.key].push(now[i]));
    if(metrics.some(m=>histories[m.key].length<window))continue;
    let score=0;
    for(const m of metrics){
      const values=histories[m.key],pct=percentileWindow(values,values.at(-1),window);
      if(!finite(pct)){score=null;break;}
      score+=m.weight*(m.invert?100-pct:pct);
    }
    if(finite(score))out.push({date:row.date,score:clamp(score,0,100)});
  }
  return out;
}

export function buildSectorFearGreedR3RollingSource({stockRows=[],pitCsv='',series={},generatedAt=new Date().toISOString(),cutoffDate=null}={}){
  const pit=parseSectorFearGreedR3PitCsv(pitCsv);
  const filteredStock=cutoffDate?stockRows.filter(x=>String(x.tradeDate??'').slice(0,10)<=cutoffDate):stockRows;
  const pitInputs=buildSectorFearGreedR3PitInputs({rows:filteredStock,pitHistory:pit});
  const spyRows=(series.SPY??[]).filter(x=>!cutoffDate||x.date<=cutoffDate),sectors={};
  for(const [sectorId,ticker] of Object.entries(SECTOR_FEAR_GREED_R3_ETFS)){
    const etfRows=(series[ticker]??[]).filter(x=>!cutoffDate||x.date<=cutoffDate);
    const pitRows=pitInputs[sectorId]??[];
    const raw=deriveSectorFearGreedR3RawAxes({
      etfRows,spyRows,
      breadthRows:pitRows.filter(x=>[x.b50,x.b200,x.highLowNet].every(finite)),
      demandRows:pitRows.filter(x=>finite(x.volumeBreadth)),
    });
    const scored=Object.fromEntries(AXES.map(axis=>[axis,scoreSectorFearGreedR3RawAxis(raw[axis],AXIS_SPECS[axis])]));
    const maps=Object.fromEntries(AXES.map(axis=>[axis,new Map(scored[axis].map(x=>[x.date,x.score]))]));
    const dates=[...maps.trend.keys()].filter(date=>AXES.every(axis=>maps[axis].has(date))).sort();
    const legacy=dates.map(date=>{
      const axes=Object.fromEntries(AXES.map(axis=>[axis,maps[axis].get(date)]));
      return {date,score:legacyFiveRawFromAxes(axes)};
    });
    const fiveRaw=legacy.slice(-SECTOR_FEAR_GREED_R3_ROLLING_WINDOW);
    if(fiveRaw.length!==SECTOR_FEAR_GREED_R3_ROLLING_WINDOW)throw Error(`SECTOR_FEAR_GREED_R3_ROLLING_NOT_252:${sectorId}:${fiveRaw.length}`);
    sectors[sectorId]={
      ticker,firstAlignedDate:fiveRaw[0].date,lastAlignedDate:fiveRaw.at(-1).date,alignedDates:fiveRaw.length,fiveRaw,
      axisRawCounts:Object.fromEntries(AXES.map(axis=>[axis,raw[axis].length])),
      axisScoredCounts:Object.fromEntries(AXES.map(axis=>[axis,scored[axis].length])),
    };
  }
  const windows=Object.values(sectors),last=windows[0]?.lastAlignedDate;
  if(windows.some(x=>x.lastAlignedDate!==last))throw Error('SECTOR_FEAR_GREED_R3_ROLLING_DATE_MISMATCH');
  return {
    version:SECTOR_FEAR_GREED_R3_ROLLING_SOURCE_VERSION,
    generatedAt,
    status:SECTOR_FEAR_GREED_R3_ROLLING_SOURCE_STATUS,
    mode:'LOCAL_STORED_ROLLING_252',
    providerCalls:0,
    networkCalls:0,
    publicMutation:false,
    d1Mutation:false,
    dbSchemaChanged:false,
    productionFormulaChanged:false,
    referenceRequirementChanged:false,
    approvedR1ReferenceRequirement:SECTOR_FEAR_GREED_R3_REFERENCE_OBSERVATIONS,
    normalizationChanged:false,
    weightsChanged:false,
    summary:{sectors:windows.length,allReady252:windows.length===11&&windows.every(x=>x.alignedDates===252),alignedMin:Math.min(...windows.map(x=>x.alignedDates)),alignedMax:Math.max(...windows.map(x=>x.alignedDates))},
    sectors,
  };
}
