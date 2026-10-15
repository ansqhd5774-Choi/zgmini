import {SECTOR_FEAR_GREED_R1_GICS} from "./sector-fear-greed-r1-shadow.mjs";

export const SECTOR_FEAR_GREED_R1_INPUTS_METHOD="SECTOR-FEAR-GREED-R1-STORED-INPUTS-SHADOW";
export const SECTOR_FEAR_GREED_R1_PIT_METHOD="SECTOR-FEAR-GREED-R1-PIT-GICS-SHADOW-V1";
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value));
const PIT_SECTOR_MAP=Object.freeze({
  energy:"energy",materials:"materials",industrials:"industrials",
  consumer_discretionary:"discretionary",consumer_staples:"staples",
  health_care:"healthcare",financials:"financials",
  information_technology:"technology",communication_services:"communication",
  utilities:"utilities",real_estate:"realEstate",
});

function parseCsvLine(line){
  const out=[];let current="",quoted=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"'){
      if(quoted&&line[i+1]==='"'){current+='"';i++;}
      else quoted=!quoted;
    }else if(ch===","&&!quoted){out.push(current);current="";}else current+=ch;
  }
  if(quoted)throw new Error("SECTOR_UNIVERSE_CSV_UNCLOSED_QUOTE");
  out.push(current);return out;
}

export function parseSectorUniverseCsv(text,{requireSp500Size=true}={}){
  const lines=String(text??"").replace(/^\uFEFF/,"").split(/\r?\n/).filter(line=>line.trim().length>0);
  if(lines.length<2)throw new Error("SECTOR_UNIVERSE_CSV_EMPTY");
  const header=parseCsvLine(lines[0]);
  const symbolIndex=header.indexOf("Symbol"),sectorIndex=header.indexOf("GICS Sector");
  if(symbolIndex<0)throw new Error("SECTOR_UNIVERSE_SYMBOL_COLUMN_MISSING");
  if(sectorIndex<0)throw new Error("SECTOR_UNIVERSE_GICS_COLUMN_MISSING");
  const byTicker={},counts={};
  for(const line of lines.slice(1)){
    const row=parseCsvLine(line),ticker=String(row[symbolIndex]??"").trim(),gicsSector=String(row[sectorIndex]??"").trim();
    if(!ticker)continue;
    if(Object.hasOwn(byTicker,ticker))throw new Error("SECTOR_UNIVERSE_DUPLICATE_TICKER");
    const sectorId=SECTOR_FEAR_GREED_R1_GICS[gicsSector];
    if(!sectorId)throw new Error("SECTOR_UNIVERSE_GICS_UNSUPPORTED");
    byTicker[ticker]={ticker,gicsSector,sectorId};counts[sectorId]=(counts[sectorId]??0)+1;
  }
  const members=Object.values(byTicker).sort((a,b)=>a.ticker.localeCompare(b.ticker));
  if(requireSp500Size&&(members.length<490||members.length>520))throw new Error("SECTOR_UNIVERSE_COUNT_OUT_OF_RANGE");
  const missingSectors=Object.values(SECTOR_FEAR_GREED_R1_GICS).filter(sectorId=>!counts[sectorId]);
  if(missingSectors.length)throw new Error("SECTOR_UNIVERSE_GICS_COVERAGE_INCOMPLETE");
  return {methodologyVersion:SECTOR_FEAR_GREED_R1_INPUTS_METHOD,mode:"SHADOW_ONLY",sourceFields:["Symbol","GICS Sector"],currentUniverseOnly:true,pointInTimeSectorHistoryVerified:false,memberCount:members.length,members,byTicker,counts};
}

function cleanPitDate(value,{optional=false}={}){
  const text=String(value??"").trim().replace(/\*+$/g,"");
  if(!text&&optional)return null;
  if(!validDate(text))throw new Error("SECTOR_PIT_DATE_INVALID");
  return text;
}

export function parsePitSectorHistoryCsv(text){
  const lines=String(text??"").replace(/^\uFEFF/,"").split(/\r?\n/).filter(line=>line.trim().length>0);
  if(lines.length<2)throw new Error("SECTOR_PIT_CSV_EMPTY");
  const header=parseCsvLine(lines[0]).map(value=>String(value).trim().toLowerCase());
  const index=name=>header.indexOf(name),symbolIndex=index("symbol"),sectorIndex=index("sector"),addedIndex=index("date_added"),removedIndex=index("date_removed");
  if(symbolIndex<0||sectorIndex<0||addedIndex<0||removedIndex<0)throw new Error("SECTOR_PIT_COLUMNS_MISSING");
  const byTicker={},entries=[];
  for(const line of lines.slice(1)){
    const row=parseCsvLine(line),ticker=String(row[symbolIndex]??"").trim();if(!ticker)continue;
    const sourceSector=String(row[sectorIndex]??"").trim().toLowerCase(),sectorId=PIT_SECTOR_MAP[sourceSector];
    if(!sectorId)throw new Error("SECTOR_PIT_GICS_UNSUPPORTED");
    const dateAdded=cleanPitDate(row[addedIndex]),dateRemoved=cleanPitDate(row[removedIndex],{optional:true});
    if(dateRemoved&&dateRemoved<=dateAdded)throw new Error("SECTOR_PIT_INTERVAL_INVALID");
    const item={ticker,sectorId,sourceSector,dateAdded,dateRemoved};entries.push(item);(byTicker[ticker]??=[]).push(item);
  }
  if(entries.length<500)throw new Error("SECTOR_PIT_HISTORY_TOO_SMALL");
  for(const list of Object.values(byTicker))list.sort((a,b)=>a.dateAdded.localeCompare(b.dateAdded)||(a.dateRemoved??"9999").localeCompare(b.dateRemoved??"9999"));
  return {methodologyVersion:SECTOR_FEAR_GREED_R1_PIT_METHOD,mode:"SHADOW_ONLY",source:"lawcal/sp500-components-history",sourceLicense:"MIT",sourceCaveat:"WIKIPEDIA_REVISION_DERIVED_BEST_EFFORT_EFFECTIVE_DATES",entries,byTicker};
}

function normalizeStoredRows(rows=[]){
  const dedupe=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const tradeDate=String(row?.tradeDate??row?.trade_date??""),ticker=String(row?.ticker??"").trim();
    const close=Number(row?.currentClose??row?.current_close??row?.close),volume=Number(row?.currentVolume??row?.current_volume??row?.volume);
    if(!validDate(tradeDate)||!ticker||!finite(close)||close<=0||!finite(volume)||volume<0)continue;
    const key=tradeDate+"|"+ticker,existing=dedupe.get(key);
    if(existing&&(existing.close!==close||existing.volume!==volume))throw new Error("SECTOR_INPUT_DUPLICATE_CONFLICT");
    dedupe.set(key,{tradeDate,ticker,close,volume});
  }
  return [...dedupe.values()].sort((a,b)=>a.tradeDate.localeCompare(b.tradeDate)||a.ticker.localeCompare(b.ticker));
}

function emptyAggregate(date,sectorId,memberCount){return {date,sectorId,memberCount,observed:0,directionReady:0,upVolume:0,downVolume:0,totalDirectionVolume:0,ready50:0,above50:0,ready200:0,above200:0,ready252:0,newHigh:0,newLow:0};}

function finalizeAggregates(aggregates){
  const output={};for(const sectorId of Object.values(SECTOR_FEAR_GREED_R1_GICS))output[sectorId]=[];
  for(const aggregate of [...aggregates.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.sectorId.localeCompare(b.sectorId))){
    const memberCount=aggregate.memberCount;
    output[aggregate.sectorId].push({date:aggregate.date,sectorId:aggregate.sectorId,b50:aggregate.ready50?aggregate.above50/aggregate.ready50:null,b200:aggregate.ready200?aggregate.above200/aggregate.ready200:null,highLowNet:aggregate.ready252?(aggregate.newHigh-aggregate.newLow)/aggregate.ready252:null,volumeBreadth:aggregate.totalDirectionVolume>0?(aggregate.upVolume-aggregate.downVolume)/aggregate.totalDirectionVolume:null,coverage:{memberCount,observed:aggregate.observed,observedRatio:memberCount?aggregate.observed/memberCount:null,directionReady:aggregate.directionReady,directionRatio:memberCount?aggregate.directionReady/memberCount:null,ma50Ready:aggregate.ready50,ma50Ratio:memberCount?aggregate.ready50/memberCount:null,ma200Ready:aggregate.ready200,ma200Ratio:memberCount?aggregate.ready200/memberCount:null,highLow52wReady:aggregate.ready252,highLow52wRatio:memberCount?aggregate.ready252/memberCount:null}});
  }
  return output;
}

function accumulateSeries({normalized,resolveSector,memberCountForDate}){
  const byTicker=new Map(),aggregates=new Map();
  for(const row of normalized){const series=byTicker.get(row.ticker)??[];series.push(row);byTicker.set(row.ticker,series);}
  const getAggregate=(date,sectorId)=>{const key=date+"|"+sectorId;let aggregate=aggregates.get(key);if(!aggregate){aggregate=emptyAggregate(date,sectorId,Number(memberCountForDate(date,sectorId)??0));aggregates.set(key,aggregate);}return aggregate;};
  for(const [ticker,series] of byTicker){
    const prefix=[0],highDeque=[],lowDeque=[];
    for(let i=0;i<series.length;i++){
      const current=series[i],sectorId=resolveSector(ticker,current.tradeDate);prefix.push(prefix.at(-1)+current.close);if(!sectorId)continue;const aggregate=getAggregate(current.tradeDate,sectorId);aggregate.observed++;
      if(i>=1){aggregate.directionReady++;aggregate.totalDirectionVolume+=current.volume;if(current.close>series[i-1].close)aggregate.upVolume+=current.volume;else if(current.close<series[i-1].close)aggregate.downVolume+=current.volume;}
      if(i>=49){aggregate.ready50++;const ma50=(prefix[i+1]-prefix[i-49])/50;if(current.close>ma50)aggregate.above50++;}
      if(i>=199){aggregate.ready200++;const ma200=(prefix[i+1]-prefix[i-199])/200;if(current.close>ma200)aggregate.above200++;}
      while(highDeque.length&&highDeque[0]<i-251)highDeque.shift();while(lowDeque.length&&lowDeque[0]<i-251)lowDeque.shift();
      while(highDeque.length&&series[highDeque.at(-1)].close<=current.close)highDeque.pop();while(lowDeque.length&&series[lowDeque.at(-1)].close>=current.close)lowDeque.pop();
      highDeque.push(i);lowDeque.push(i);
      if(i>=251){aggregate.ready252++;if(highDeque[0]===i)aggregate.newHigh++;if(lowDeque[0]===i)aggregate.newLow++;}
    }
  }
  return finalizeAggregates(aggregates);
}

export function buildCurrentUniverseSectorInputs({rows=[],universe}={}){
  if(!universe||typeof universe.byTicker!=="object"||!universe.byTicker)throw new TypeError("SECTOR_INPUT_UNIVERSE_REQUIRED");
  const normalized=normalizeStoredRows(rows),sectors=accumulateSeries({normalized,resolveSector:ticker=>universe.byTicker[ticker]?.sectorId??null,memberCountForDate:(_date,sectorId)=>universe.counts?.[sectorId]??0});
  return {methodologyVersion:SECTOR_FEAR_GREED_R1_INPUTS_METHOD,mode:"SHADOW_ONLY",noProviderCalls:true,noPublish:true,dbSchemaChanged:false,currentUniverseOnly:true,pointInTimeSectorHistoryVerified:false,warning:"CURRENT_UNIVERSE_RESEARCH_ONLY_NOT_FOR_PRODUCTION_BACKTEST",sectors};
}

function activePitEntry(list,date){
  const matches=(list??[]).filter(item=>item.dateAdded<=date&&(!item.dateRemoved||date<item.dateRemoved));
  if(matches.length>1)throw new Error("SECTOR_PIT_OVERLAP_CONFLICT");
  return matches[0]??null;
}

export function buildPointInTimeSectorInputs({rows=[],pitHistory}={}){
  if(!pitHistory||typeof pitHistory.byTicker!=="object"||!pitHistory.byTicker)throw new TypeError("SECTOR_PIT_HISTORY_REQUIRED");
  const normalized=normalizeStoredRows(rows),dates=[...new Set(normalized.map(row=>row.tradeDate))],snapshots=new Map();
  for(const date of dates){
    const byTicker={},counts={};
    for(const [ticker,list] of Object.entries(pitHistory.byTicker)){const active=activePitEntry(list,date);if(!active)continue;byTicker[ticker]=active;counts[active.sectorId]=(counts[active.sectorId]??0)+1;}
    snapshots.set(date,{byTicker,counts,memberCount:Object.keys(byTicker).length});
  }
  const sectors=accumulateSeries({normalized,resolveSector:(ticker,date)=>snapshots.get(date)?.byTicker?.[ticker]?.sectorId??null,memberCountForDate:(date,sectorId)=>snapshots.get(date)?.counts?.[sectorId]??0});
  const snapshotCounts=[...snapshots.values()].map(value=>value.memberCount),minMembers=snapshotCounts.length?Math.min(...snapshotCounts):0,maxMembers=snapshotCounts.length?Math.max(...snapshotCounts):0;
  return {methodologyVersion:SECTOR_FEAR_GREED_R1_PIT_METHOD,mode:"SHADOW_ONLY",noProviderCalls:true,noPublish:true,dbSchemaChanged:false,currentUniverseOnly:false,pointInTimeSectorHistoryVerified:true,source:pitHistory.source,sourceLicense:pitHistory.sourceLicense,sourceCaveat:pitHistory.sourceCaveat,snapshotCount:snapshots.size,minMembers,maxMembers,sectors};
}
