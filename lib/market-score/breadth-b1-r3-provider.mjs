import {
  B1_R3_UNIVERSE_URL,
  B1_R3_BARS_BASE,
  IEX_ATTRIBUTION,
  B1_R3_MIN_COVERAGE,
} from "./breadth-b1-r3-contract.mjs";

const validDate=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s);
const finite=n=>typeof n==="number"&&Number.isFinite(n);
const toDate=ms=>{
  const n=Number(ms);
  if(!Number.isFinite(n))return null;
  const d=new Date(n);
  if(Number.isNaN(d.valueOf()))return null;
  return d.toISOString().slice(0,10);
};
function parseCsvLine(line){
  const out=[];let cur="",quoted=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"'){
      if(quoted&&line[i+1]==='"'){cur+='"';i++;}else quoted=!quoted;
    }else if(ch===","&&!quoted){out.push(cur);cur="";}else cur+=ch;
  }
  out.push(cur);
  return out;
}
export function parseSp500Csv(text){
  const lines=String(text??"").replace(/^\uFEFF/,"").split(/\r?\n/).filter(Boolean);
  if(lines.length<2)throw new Error("SP500_CSV_EMPTY");
  const header=parseCsvLine(lines[0]);
  const symbolIndex=header.indexOf("Symbol");
  if(symbolIndex<0)throw new Error("SP500_SYMBOL_COLUMN_MISSING");
  const symbols=[];
  for(const line of lines.slice(1)){
    const row=parseCsvLine(line);
    const symbol=String(row[symbolIndex]??"").trim();
    if(symbol)symbols.push(symbol);
  }
  const unique=[...new Set(symbols)];
  if(unique.length!==symbols.length)throw new Error("SP500_DUPLICATE_SYMBOL");
  if(unique.length<490||unique.length>520)throw new Error("SP500_COUNT_OUT_OF_RANGE");
  return unique.sort();
}
export function selectTradeDateFromCatalogue(symbols,catalogue,{minCoverage=B1_R3_MIN_COVERAGE}={}){
  const map=catalogue?.symbols;
  if(!map||typeof map!=="object")throw new Error("BARS_CATALOGUE_INVALID");
  const latest=[];
  for(const symbol of symbols){
    const date=toDate(map[symbol]?.to);
    if(date)latest.push({symbol,date});
  }
  const required=Math.ceil(symbols.length*minCoverage);
  if(latest.length<required)return {tradeDate:null,required,eligible:[],coverage:latest.length/symbols.length};
  const dates=latest.map(x=>x.date).sort((a,b)=>b.localeCompare(a));
  const tradeDate=dates[required-1]??null;
  const eligible=latest.filter(x=>x.date>=tradeDate).map(x=>x.symbol).sort();
  return {tradeDate,required,eligible,coverage:eligible.length/symbols.length};
}
async function jsonResponse(response,label){
  if(!response||response.status!==200)throw new Error(`${label}_HTTP_${response?.status??0}`);
  try{return await response.json();}catch{throw new Error(`${label}_JSON_INVALID`);}
}
export async function fetchSp500Universe({fetchImpl=globalThis.fetch,url=B1_R3_UNIVERSE_URL}={}){
  if(typeof fetchImpl!=="function")throw new TypeError("FETCH_REQUIRED");
  const response=await fetchImpl(url,{headers:{Accept:"text/csv,text/plain;q=0.9,*/*;q=0.1"}});
  if(response.status!==200)throw new Error(`SP500_HTTP_${response.status??0}`);
  const body=await response.text();
  return {symbols:parseSp500Csv(body),sourceUrl:url};
}
export async function fetchBarsCatalogue({fetchImpl=globalThis.fetch,baseUrl=B1_R3_BARS_BASE}={}){
  if(typeof fetchImpl!=="function")throw new TypeError("FETCH_REQUIRED");
  const body=await jsonResponse(await fetchImpl(`${baseUrl}/1d/index.json`,{headers:{Accept:"application/json"}}),"BARS_INDEX");
  if(body?.timeframe!=="1d"||body?.source!=="iex"||!body?.symbols)throw new Error("BARS_CATALOGUE_CONTRACT_MISMATCH");
  return body;
}
export async function fetchTickerPair({ticker,tradeDate,fetchImpl=globalThis.fetch,baseUrl=B1_R3_BARS_BASE}={}){
  if(!ticker||!validDate(tradeDate))throw new TypeError("PAIR_INPUT_INVALID");
  const body=await jsonResponse(
    await fetchImpl(`${baseUrl}/1d/${encodeURIComponent(ticker)}.json`,{headers:{Accept:"application/json"}}),
    "BARS_SYMBOL",
  );
  if(body?.timeframe!=="1d"||body?.source!=="iex"||body?.feed!=="TOPS1.6"||!Array.isArray(body?.bars)){
    throw new Error("BARS_SYMBOL_CONTRACT_MISMATCH");
  }
  if(String(body?.attribution??"")!==IEX_ATTRIBUTION)throw new Error("IEX_ATTRIBUTION_MISMATCH");
  const bars=body.bars
    .map(x=>({...x,date:toDate(x?.time)}))
    .filter(x=>validDate(x.date))
    .sort((a,b)=>a.date.localeCompare(b.date));
  const currentIndex=bars.findIndex(x=>x.date===tradeDate);
  if(currentIndex<=0)throw new Error("BARS_TRADE_DATE_MISSING");
  const current=bars[currentIndex],previous=bars[currentIndex-1];
  const previousClose=Number(previous?.close),currentClose=Number(current?.close),currentVolume=Number(current?.volume);
  if(!finite(previousClose)||!finite(currentClose)||!finite(currentVolume)||previousClose<=0||currentClose<=0||currentVolume<0){
    throw new Error("BARS_PAIR_VALUE_INVALID");
  }
  return {
    ticker:String(ticker),
    previousDate:previous.date,
    currentDate:tradeDate,
    previousClose,currentClose,currentVolume,
    source:"IEX HIST",feed:"TOPS1.6",attribution:IEX_ATTRIBUTION,
  };
}
