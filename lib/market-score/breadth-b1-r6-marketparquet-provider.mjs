import {parquetReadObjects} from "hyparquet";
import {
  B1_R3_MARKETPARQUET_BASE,
  B1_R3_MARKETPARQUET_PROVIDER,
  B1_R3_MARKETPARQUET_SOURCE,
  B1_R3_MARKETPARQUET_FEED,
  B1_R3_MARKETPARQUET_SOURCE_CONTRACT,
  IEX_ATTRIBUTION,
} from "./breadth-b1-r3-contract.mjs";
import {isMarketSession} from "./breadth-b1-r3-calendar.mjs";

export const B1_R6_MARKETPARQUET_PROVIDER="B1-R6-MARKETPARQUET-PROVIDER-R1";
const MAX_PARQUET_BYTES=2_000_000;
const DATE_RE=/^\d{4}-\d{2}-\d{2}$/;
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const validDate=value=>typeof value==="string"&&DATE_RE.test(value);
function previousCalendarDate(date){
  const [y,m,d]=date.split("-").map(Number);
  return new Date(Date.UTC(y,m-1,d)-86400000).toISOString().slice(0,10);
}
export function previousMarketSession(date){
  if(!validDate(date))return null;
  let cursor=previousCalendarDate(date);
  for(let guard=0;guard<10;guard++){
    if(isMarketSession(cursor))return cursor;
    cursor=previousCalendarDate(cursor);
  }
  return null;
}
export function marketParquetTickerCandidates(ticker){
  const value=String(ticker??"").trim();
  if(!value)return [];
  return [...new Set([value,value.replaceAll(".","-"),value.replaceAll(".","")])];
}
function normalizeDate(value){
  if(value instanceof Date&&!Number.isNaN(value.valueOf()))return value.toISOString().slice(0,10);
  const text=String(value??"");
  return /^\d{4}-\d{2}-\d{2}/.test(text)?text.slice(0,10):null;
}
async function fetchParquet(url,{fetchImpl=globalThis.fetch}={}){
  if(typeof fetchImpl!=="function")throw new TypeError("FETCH_REQUIRED");
  const response=await fetchImpl(url,{redirect:"follow",headers:{Accept:"application/vnd.apache.parquet,application/octet-stream"}});
  if(!response||response.status!==200)throw new Error("MARKETPARQUET_HTTP_"+String(response?.status??0));
  const hinted=Number(response.headers?.get?.("content-length")??0);
  if(Number.isFinite(hinted)&&hinted>MAX_PARQUET_BYTES)throw new Error("MARKETPARQUET_BODY_LIMIT");
  const file=await response.arrayBuffer();
  if(file.byteLength<8||file.byteLength>MAX_PARQUET_BYTES)throw new Error("MARKETPARQUET_BODY_INVALID");
  const magic=String.fromCharCode(...new Uint8Array(file.slice(0,4)));
  if(magic!=="PAR1")throw new Error("MARKETPARQUET_MAGIC_INVALID");
  return {file,responseUrl:String(response.url??url)};
}
async function parseRows(file){
  let rows;
  try{
    rows=await parquetReadObjects({file,columns:["date","symbol","asset_type","close","volume"]});
  }catch{
    throw new Error("MARKETPARQUET_PARSE_FAILED");
  }
  if(!Array.isArray(rows)||rows.length<1000)throw new Error("MARKETPARQUET_ROWS_INVALID");
  return rows.filter(row=>String(row?.asset_type??"").toLowerCase()==="stock");
}
function rowsBySymbol(rows,date){
  const map=new Map();
  for(const row of rows){
    if(normalizeDate(row?.date)!==date)continue;
    const symbol=String(row?.symbol??"").trim();
    if(!symbol||map.has(symbol))continue;
    const close=Number(row?.close),volume=Number(row?.volume);
    if(!finite(close)||close<=0||!finite(volume)||volume<0)continue;
    map.set(symbol,{close,volume});
  }
  return map;
}
export function buildMarketParquetPairs({symbols,currentRows,previousRows,tradeDate,previousDate}={}){
  if(!Array.isArray(symbols)||!validDate(tradeDate)||!validDate(previousDate)||previousDate>=tradeDate){
    throw new TypeError("MARKETPARQUET_PAIR_INPUT_INVALID");
  }
  const current=rowsBySymbol(currentRows??[],tradeDate);
  const previous=rowsBySymbol(previousRows??[],previousDate);
  const pairs=[],missing=[];
  for(const ticker of symbols){
    const candidates=marketParquetTickerCandidates(ticker);
    const currentSymbol=candidates.find(x=>current.has(x));
    const previousSymbol=candidates.find(x=>previous.has(x));
    if(!currentSymbol||!previousSymbol){missing.push(String(ticker));continue;}
    const c=current.get(currentSymbol),p=previous.get(previousSymbol);
    pairs.push({
      ticker:String(ticker),previousDate,currentDate:tradeDate,
      previousClose:p.close,currentClose:c.close,currentVolume:c.volume,
      source:B1_R3_MARKETPARQUET_SOURCE,feed:B1_R3_MARKETPARQUET_FEED,
      attribution:IEX_ATTRIBUTION,
      provenance:{
        provider:B1_R3_MARKETPARQUET_PROVIDER,
        sourceContractRevision:B1_R3_MARKETPARQUET_SOURCE_CONTRACT,
        currentResolvedSymbol:currentSymbol,previousResolvedSymbol:previousSymbol,
        currentResolution:currentSymbol===ticker?"exact":"class_variant",
        previousResolution:previousSymbol===ticker?"exact":"class_variant",
        splitAdjusted:true,dividendAdjusted:false,
        attribution:IEX_ATTRIBUTION,
      },
    });
  }
  return {pairs,missing,coverage:symbols.length?pairs.length/symbols.length:0};
}

export async function fetchMarketParquetLatestPairs({
  symbols,asOfDate,fetchImpl=globalThis.fetch,baseUrl=B1_R3_MARKETPARQUET_BASE,
}={}){
  if(!Array.isArray(symbols)||symbols.length<490||!validDate(asOfDate))throw new TypeError("MARKETPARQUET_INPUT_INVALID");
  const latest=await fetchParquet(baseUrl+"/latest.parquet",{fetchImpl});
  const currentRows=await parseRows(latest.file);
  const urlDate=latest.responseUrl.match(/(\d{4}-\d{2}-\d{2})\.parquet(?:\?|$)/)?.[1]??null;
  const rowDate=normalizeDate(currentRows[0]?.date);
  const tradeDate=validDate(urlDate)?urlDate:rowDate;
  if(!validDate(tradeDate)||tradeDate>asOfDate)throw new Error("MARKETPARQUET_TRADE_DATE_INVALID");
  const previousDate=previousMarketSession(tradeDate);
  if(!previousDate)throw new Error("MARKETPARQUET_PREVIOUS_DATE_MISSING");
  const previous=await fetchParquet(baseUrl+"/"+previousDate+".parquet",{fetchImpl});
  const previousRows=await parseRows(previous.file);
  const built=buildMarketParquetPairs({symbols,currentRows,previousRows,tradeDate,previousDate});
  return {
    ...built,tradeDate,previousDate,providerRequests:2,
    provider:B1_R3_MARKETPARQUET_PROVIDER,
    currentSourceUrl:baseUrl+"/"+tradeDate+".parquet",
    previousSourceUrl:baseUrl+"/"+previousDate+".parquet",
  };
}
