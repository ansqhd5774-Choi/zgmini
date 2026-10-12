import {SECTOR_FEAR_GREED_R1_GICS} from "./sector-fear-greed-r1-shadow.mjs";

export const SECTOR_FEAR_GREED_R1_INPUTS_METHOD="SECTOR-FEAR-GREED-R1-STORED-INPUTS-SHADOW";

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value));
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;

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
  const memberTickersBySector=new Map();
  for(const member of universe.members??Object.values(universe.byTicker)){
    const list=memberTickersBySector.get(member.sectorId)??[];
    list.push(member.ticker);
    memberTickersBySector.set(member.sectorId,list);
  }
  const dates=[...new Set(normalized.map(row=>row.tradeDate))].sort();
  const output={};
  for(const sectorId of Object.values(SECTOR_FEAR_GREED_R1_GICS))output[sectorId]=[];

  for(const date of dates){
    for(const [sectorId,members] of memberTickersBySector){
      let observed=0,ready50=0,above50=0,ready200=0,above200=0,ready252=0,newHigh=0,newLow=0;
      let directionReady=0,upVolume=0,downVolume=0,totalDirectionVolume=0;
      for(const ticker of members){
        const all=byTicker.get(ticker)??[];
        const index=all.findIndex(row=>row.tradeDate===date);
        if(index<0)continue;
        const current=all[index];
        observed++;
        if(index>=1){
          const previous=all[index-1];
          directionReady++;
          totalDirectionVolume+=current.volume;
          if(current.close>previous.close)upVolume+=current.volume;
          else if(current.close<previous.close)downVolume+=current.volume;
        }
        if(index>=49){
          ready50++;
          const sample=all.slice(index-49,index+1).map(row=>row.close);
          if(current.close>mean(sample))above50++;
        }
        if(index>=199){
          ready200++;
          const sample=all.slice(index-199,index+1).map(row=>row.close);
          if(current.close>mean(sample))above200++;
        }
        if(index>=251){
          ready252++;
          const sample=all.slice(index-251,index+1).map(row=>row.close);
          const high=Math.max(...sample),low=Math.min(...sample);
          if(current.close>=high)newHigh++;
          if(current.close<=low)newLow++;
        }
      }
      const memberCount=members.length;
      output[sectorId].push({
        date,
        b50:ready50?above50/ready50:null,
        b200:ready200?above200/ready200:null,
        highLowNet:ready252?(newHigh-newLow)/ready252:null,
        volumeBreadth:totalDirectionVolume>0?(upVolume-downVolume)/totalDirectionVolume:null,
        coverage:{
          memberCount,
          observed,
          observedRatio:memberCount?observed/memberCount:null,
          directionReady,
          directionRatio:memberCount?directionReady/memberCount:null,
          ma50Ready:ready50,
          ma50Ratio:memberCount?ready50/memberCount:null,
          ma200Ready:ready200,
          ma200Ratio:memberCount?ready200/memberCount:null,
          highLow52wReady:ready252,
          highLow52wRatio:memberCount?ready252/memberCount:null,
        },
      });
    }
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
