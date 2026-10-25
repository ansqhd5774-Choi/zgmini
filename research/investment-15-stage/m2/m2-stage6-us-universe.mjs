// US equity-universe discovery, upstream of company and financial analysis.
// Nasdaq Trader is a machine-readable exchange symbol directory, NOT a
// licensed financial screener. Never infer industry leadership from a name.
import https from 'node:https';

export const US_UNIVERSE_SOURCES=Object.freeze({
 nasdaq:'https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt',
 other:'https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt',
});
const cap=2*1024*1024;

export function downloadUsListingFeed(kind,{timeoutMs=12000}={}){
 const url=US_UNIVERSE_SOURCES[kind];
 if(!url)throw new Error('UNKNOWN_LISTING_SOURCE');
 return new Promise((resolve,reject)=>{
  const req=https.get(url,{timeout:timeoutMs,headers:{accept:'text/plain',
   'user-agent':'ZGMINI-Investment-M2-Private-ReadOnly/1.0'}},res=>{
   if(res.statusCode!==200){res.resume();reject(new Error(`LISTING_HTTP_${res.statusCode}`));return;}
   const chunks=[];let bytes=0;
   res.on('data',chunk=>{bytes+=chunk.length;if(bytes>cap)req.destroy(new Error('LISTING_TOO_LARGE'));else chunks.push(chunk);});
   res.on('end',()=>resolve(Buffer.concat(chunks).toString('utf8')));
   res.on('error',reject);
  });
  req.on('timeout',()=>req.destroy(new Error('LISTING_TIMEOUT')));
  req.on('error',reject);
 });
}

// Only security *candidates*: exchange file flags do not establish common-share
// status, issuer nationality, theme/industry relevance, valuation or liquidity.
export function parseUsListingFeed(kind,body){
 if(!Object.hasOwn(US_UNIVERSE_SOURCES,kind)||typeof body!=='string')throw Error('LISTING_INVALID_SOURCE');
 const lines=body.replace(/\r/g,'').trim().split('\n');
 const expected=kind==='nasdaq'
  ?['Symbol','Security Name','Test Issue','ETF']
  :['ACT Symbol','Security Name','Exchange','Test Issue','ETF'];
 const headers=lines[0]?.split('|')||[];
 if(expected.some(x=>!headers.includes(x)))throw Error('LISTING_HEADER_CHANGED');
 const ix=k=>headers.indexOf(k);
 const rows=[];
 let footer=false;
 const unique=new Set();
 for(const line of lines.slice(1)){
  if(line.startsWith('File Creation Time:')){footer=true;continue;}
  if(!line.trim())continue;
  const cols=line.split('|');
  if(cols.length!==headers.length)throw Error('LISTING_ROW_COLUMNS_INVALID');
  const ticker=cols[ix(kind==='nasdaq'?'Symbol':'ACT Symbol')].trim();
  const name=cols[ix('Security Name')].trim();
  if(!ticker||!name||unique.has(ticker))throw Error('LISTING_TICKER_MISSING_OR_DUPLICATE');
  unique.add(ticker);
  const market=kind==='nasdaq'?'NASDAQ':({'N':'NYSE','A':'NYSE_AMERICAN'}[cols[ix('Exchange')]]||null);
  if(!market||cols[ix('ETF')]!=='N'||cols[ix('Test Issue')]!=='N')continue;
  // Exclude clearly non-equity instruments. The remaining population is a
  // universe for issuer identity checks, not proof of investible common equity.
  if(/\b(?:warrants?|rights?|units?|preferred|notes?|bonds?|debentures?)\b/i.test(name))continue;
  rows.push({ticker,name,market,source:US_UNIVERSE_SOURCES[kind]});
 }
 if(!footer||rows.length===0)throw Error('LISTING_FOOTER_OR_EQUITIES_MISSING');
 return rows;
}

export function buildUsMarketUniverse(downloads,retrievedAt){
 const errors=[];const collections=[];
 for(const k of ['nasdaq','other']){
  try{
   if(downloads[k]?.error)throw Error(downloads[k].error);
   collections.push(parseUsListingFeed(k,downloads[k]));
  }
  catch(e){errors.push(`${k.toUpperCase()}_${String(e.message||'INVALID')}`);}
 }
 if(errors.length)return {status:'BLOCKED',reason:errors.join('|'),source:'NASDAQ_TRADER_LISTING_DIRECTORY',
  totalRows:null,marketCounts:null,screeningStatus:'NOT_RUN',companyCandidates:[],listings:[]};
 const all=collections.flat();
 const marketCounts=Object.fromEntries(['NASDAQ','NYSE','NYSE_AMERICAN'].map(x=>[x,all.filter(r=>r.market===x).length]));
 return {status:'READY',source:'NASDAQ_TRADER_LISTING_DIRECTORY',retrievedAt,
  marketCounts,totalRows:all.length,distinctTickers:new Set(all.map(x=>x.ticker)).size,
  listings:all,
  identityCaveat:'상장심볼 디렉터리의 잠재 보통주·ADR 후보. 현재 유효한 재무/산업 스크리닝 결과 또는 전체 미 증시 투자적격 보통주 개수 아님.',
  screeningStatus:'BLOCKED_NO_CONFIGURED_AUTHORIZED_SCREENER',
  screenerTools:[{name:'FINVIZ',url:'https://finviz.com/screener.ashx',
   automation:'OFFICIAL_API_REQUIRES_ELITE'},
   {name:'TradingView',url:'https://www.tradingview.com/screener/',
    automation:'AUTOMATED_EXTRACTION_PROHIBITED'},
   {name:'BusinessQuant',url:'https://businessquant.com/docs/api/screener',
    automation:'FREE_KEY_REQUIRED_INTERNAL_RESEARCH_ONLY_NOT_CONNECTED'}],
  companyCandidates:[],rankedCompanies:[],manualSelectionRequired:false,
  koreaStatus:'DEFERRED_CONFIG_ONLY',tradeDecision:'NO_TRADE'};
}
