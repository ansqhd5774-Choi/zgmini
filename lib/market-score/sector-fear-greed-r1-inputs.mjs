import {SECTOR_FEAR_GREED_R1_GICS} from "./sector-fear-greed-r1-shadow.mjs";

export const SECTOR_FEAR_GREED_R1_INPUTS_METHOD="SECTOR-FEAR-GREED-R1-STORED-INPUTS-SHADOW";

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value));

function parseCsvLine(line){
  const out=[];
  let current="",quoted=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"'){
      if(quoted&&line[i+1]==='"'){current+='"';i++;}
      else quoted=!quoted;
    }else if(ch===","&&!quoted){out.push(current);current="";}
    else current+=ch;
  }
  if(quoted)throw new Error("SECTOR_UNIVERSE_CSV_UNCLOSED_QUOTE");
  out.push(current);
  return out;
}

export function parseSectorUniverseCsv(text,{requireSp500Size=true}={}){
  const lines=String(text??"").replace(/^\uFEFF/,"").split(/\r?\n/).filter(line=>line.trim().length>0);
  if(lines.length<2)throw new Error("SECTOR_UNIVERSE_CSV_EMPTY");
  const header=parseCsvLine(lines[0]);
  const symbolIndex=header.indexOf("Symbol");
  const sectorIndex=header.indexOf("GICS Sector");
  if(symbolIndex<0)throw new Error("SECTOR_UNIVERSE_SYMBOL_COLUMN_MISSING");
  if(sectorIndex<0)throw new Error("SECTOR_UNIVERSE_GICS_COLUMN_MISSING");
  const byTicker={};
  const counts={};
  for(const line of lines.slice(1)){
    const row=parseCsvLine(line);
    const ticker=String(row[symbolIndex]??"").trim();
    const gicsSector=String(row[sectorIndex]??"").trim();
    if(!ticker)continue;
    if(Object.hasOwn(byTicker,ticker))throw new Error("SECTOR_UNIVERSE_DUPLICATE_TICKER");
    const sectorId=SECTOR_FEAR_GREED_R1_GICS[gicsSector];
    if(!sectorId)throw new Error("SECTOR_UNIVERSE_GICS_UNSUPPORTED");
    byTicker[ticker]={ticker,gicsSector,sectorId};
    counts[sectorId]=(counts[sectorId]??0)+1;
  }
  const members=Object.values(byTicker).sort((a,b)=>a.ticker.localeCompare(b.ticker));
  if(requireSp500Size&&(members.length<490||members.length>520))throw new Error("SECTOR_UNIVERSE_COUNT_OUT_OF_RANGE");
  const missingSectors=Object.values(SECTOR_FEAR_GREED_R1_GICS).filter(sectorId=>!counts[sectorId]);
  if(missingSectors.length)throw new Error("SECTOR_UNIVERSE_GICS_COVERAGE_INCOMPLETE");
  return {
    methodologyVersion:SECTOR_FEAR_GREED_R1_INPUTS_METHOD,
    mode:"SHADOW_ONLY",
    sourceFields:["Symbol","GICS Sector"],
    currentUniverseOnly:true,
    pointInTimeSectorHistoryVerified:false,
    memberCount:members.length,
    members,
    byTicker,
    counts,
  };
}

function normalizeStoredRows(rows=[]){
  const dedupe=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const tradeDate=String(row?.tradeDate??row?.trade_date??"");
    const ticker=String(row?.ticker??"").trim();
    const close=Number(row?.currentClose??row?.current_close??row?.close);
    const volume=Number(row?.currentVolume??row?.current_volume??row?.volume);
    if(!validDate(tradeDate)||!ticker||!finite(close)||close<=0||!finite(volume)||volume<0)continue;
    const key=tradeDate+"|"+ticker;
    const existing=dedupe.get(key);
    if(existing&&(existing.close!==close||existing.volume!==volume))throw new Error("SECTOR_INPUT_DUPLICATE_CONFLICT");
    dedupe.set(key,{tradeDate,ticker,close,volume});
  }
  return [...dedupe.values()].sort((a,b)=>a.tradeDate.localeCompare(b.tradeDate)||a.ticker.localeCompare(b.ticker));
}

function emptyAggregate(date,sectorId,memberCount){
  return {date,sectorId,memberCount,observed:0,directionReady:0,upVolume:0,downVolume:0,totalDirectionVolume:0,ready50:0,above50:0,ready200:0,above200:0,ready252:0,newHigh:0,newLow:0};
}

export function buildCurrentUniverseSectorInputs({rows=[],universe}={}){
  if(!universe||typeof universe.byTicker!=="object"||!universe.byTicker)throw new TypeError("SECTOR_INPUT_UNIVERSE_REQUIRED");
  const normalized=normalizeStoredRows(rows);
  const byTicker=new Map();
  for(const row of normalized){
    if(!Object.hasOwn(universe.byTicker,row.ticker))continue;
    const series=byTicker.get(row.ticker)??[];
    series.push(row);
    byTicker.set(row.ticker,series);
  }

  const aggregates=new Map();
  const getAggregate=(date,sectorId)=>{
    const key=date+"|"+sectorId;
    let aggregate=aggregates.get(key);
    if(!aggregate){
      aggregate=emptyAggregate(date,sectorId,Number(universe.counts?.[sectorId]??0));
      aggregates.set(key,aggregate);
    }
    return aggregate;
  };

  for(const [ticker,series] of byTicker){
    const sectorId=universe.byTicker[ticker]?.sectorId;
    if(!sectorId)continue;
    const prefix=[0];
    const highDeque=[],lowDeque=[];
    for(let i=0;i<series.length;i++){
      const current=series[i];
      prefix.push(prefix.at(-1)+current.close);
      const aggregate=getAggregate(current.tradeDate,sectorId);
      aggregate.observed++;

      if(i>=1){
        aggregate.directionReady++;
        aggregate.totalDirectionVolume+=current.volume;
        if(current.close>series[i-1].close)aggregate.upVolume+=current.volume;
        else if(current.close<series[i-1].close)aggregate.downVolume+=current.volume;
      }

      if(i>=49){
        aggregate.ready50++;
        const ma50=(prefix[i+1]-prefix[i-49])/50;
        if(current.close>ma50)aggregate.above50++;
      }
      if(i>=199){
        aggregate.ready200++;
        const ma200=(prefix[i+1]-prefix[i-199])/200;
        if(current.close>ma200)aggregate.above200++;
      }

      while(highDeque.length&&highDeque[0]<i-251)highDeque.shift();
      while(lowDeque.length&&lowDeque[0]<i-251)lowDeque.shift();
      while(highDeque.length&&series[highDeque.at(-1)].close<=current.close)highDeque.pop();
      while(lowDeque.length&&series[lowDeque.at(-1)].close>=current.close)lowDeque.pop();
      highDeque.push(i);lowDeque.push(i);
      if(i>=251){
        aggregate.ready252++;
        if(highDeque[0]===i)aggregate.newHigh++;
        if(lowDeque[0]===i)aggregate.newLow++;
      }
    }
  }

  const output={};
  for(const sectorId of Object.values(SECTOR_FEAR_GREED_R1_GICS))output[sectorId]=[];
  for(const aggregate of [...aggregates.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.sectorId.localeCompare(b.sectorId))){
    const memberCount=aggregate.memberCount;
    output[aggregate.sectorId].push({
      date:aggregate.date,
      b50:aggregate.ready50?aggregate.above50/aggregate.ready50:null,
      b200:aggregate.ready200?aggregate.above200/aggregate.ready200:null,
      highLowNet:aggregate.ready252?(aggregate.newHigh-aggregate.newLow)/aggregate.ready252:null,
      volumeBreadth:aggregate.totalDirectionVolume>0?(aggregate.upVolume-aggregate.downVolume)/aggregate.totalDirectionVolume:null,
      coverage:{
        memberCount,
        observed:aggregate.observed,
        observedRatio:memberCount?aggregate.observed/memberCount:null,
        directionReady:aggregate.directionReady,
        directionRatio:memberCount?aggregate.directionReady/memberCount:null,
        ma50Ready:aggregate.ready50,
        ma50Ratio:memberCount?aggregate.ready50/memberCount:null,
        ma200Ready:aggregate.ready200,
        ma200Ratio:memberCount?aggregate.ready200/memberCount:null,
        highLow52wReady:aggregate.ready252,
        highLow52wRatio:memberCount?aggregate.ready252/memberCount:null,
      },
    });
  }

  return {
    methodologyVersion:SECTOR_FEAR_GREED_R1_INPUTS_METHOD,
    mode:"SHADOW_ONLY",
    noProviderCalls:true,
    noPublish:true,
    dbSchemaChanged:false,
    currentUniverseOnly:true,
    pointInTimeSectorHistoryVerified:false,
    warning:"CURRENT_UNIVERSE_RESEARCH_ONLY_NOT_FOR_PRODUCTION_BACKTEST",
    sectors:output,
  };
}
