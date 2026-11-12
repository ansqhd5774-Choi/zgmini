import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";
import {fetchTickerHistory} from "../../lib/market-score/breadth-b1-r3-provider.mjs";
import {SECTOR_FEAR_GREED_R1_ETFS} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";

export const SECTOR_FEAR_GREED_R1_IEX_DIAGNOSTIC_VERSION="SECTOR-FEAR-GREED-R1-IEX-HISTORY-DIAGNOSTIC-V1";
const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const OUTPUT_JSON="local-sector-fear-greed-r1-iex-history-diagnostic.json";
const OUTPUT_TXT="local-sector-fear-greed-r1-iex-history-diagnostic.txt";
const REQUIRED_RAW_SESSIONS=1007;
const ETF_TARGETS=Object.freeze(["SPY",...Object.values(SECTOR_FEAR_GREED_R1_ETFS)]);
const STOCK_SAMPLES=Object.freeze(["AAPL","META","AMZN","PG","XOM","JPM","UNH","CAT","LIN","PLD","NEE"]);
const TARGETS=Object.freeze([...ETF_TARGETS,...STOCK_SAMPLES]);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function safeCode(error){const message=String(error?.message??"");return /^[A-Z0-9_:-]+$/.test(message)?message:String(error?.code??"IEX_HISTORY_DIAGNOSTIC_FAILED").replace(/[^A-Z0-9_:-]/gi,"_").slice(0,80);}
function atomicText(file,text){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=file+`.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,text);fs.renameSync(tmp,file);}

export async function runSectorFearGreedR1IexHistoryDiagnostic(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{fetchImpl=globalThis.fetch,delayMs=150}={}){
  if(typeof fetchImpl!=="function")throw new TypeError("FETCH_REQUIRED");
  const results=[];let providerCalls=0;
  for(const ticker of TARGETS){
    providerCalls++;
    try{
      const response=await fetchTickerHistory({ticker,fetchImpl});
      const bars=response.bars??[];
      results.push({ticker,status:"READY",rows:bars.length,first:bars[0]?.date??null,last:bars.at(-1)?.date??null,meets1007:bars.length>=REQUIRED_RAW_SESSIONS,source:response.source,feed:response.feed});
    }catch(error){
      results.push({ticker,status:"FAILED",rows:0,first:null,last:null,meets1007:false,error:safeCode(error)});
    }
    if(delayMs>0)await sleep(delayMs);
  }
  const byTicker=Object.fromEntries(results.map(item=>[item.ticker,item]));
  const etfs=ETF_TARGETS.map(ticker=>byTicker[ticker]),stocks=STOCK_SAMPLES.map(ticker=>byTicker[ticker]);
  const report={version:1,methodologyVersion:SECTOR_FEAR_GREED_R1_IEX_DIAGNOSTIC_VERSION,status:etfs.every(item=>item.status==="READY"&&item.meets1007)?"ETF_LONG_HISTORY_READY":"PARTIAL",mode:"SHADOW_DIAGNOSTIC_ONLY",generatedAt:new Date().toISOString(),requiredRawSessions:REQUIRED_RAW_SESSIONS,providerCalls,publicMutation:false,dbSchemaChanged:false,productionFormulaChanged:false,rawHistoryStored:false,targets:{etfs,stockSamples:stocks},summary:{etfTargets:etfs.length,etfReady:etfs.filter(x=>x.status==="READY").length,etfMeets1007:etfs.filter(x=>x.meets1007).length,stockSamples:stocks.length,stockReady:stocks.filter(x=>x.status==="READY").length,stockMeets1007:stocks.filter(x=>x.meets1007).length}};
  const lines=["ZGMINI SECTOR FEAR & GREED R1 FREE IEX HISTORY DIAGNOSTIC",`generatedAt=${report.generatedAt}`,`status=${report.status}`,`requiredRawSessions=${REQUIRED_RAW_SESSIONS}`,`providerCalls=${providerCalls}`,`publicMutation=false dbSchemaChanged=false productionFormulaChanged=false rawHistoryStored=false`,"","TYPE | TICKER | STATUS | ROWS | FIRST | LAST | MEETS_1007"];
  for(const item of etfs)lines.push(`ETF | ${item.ticker} | ${item.status} | ${item.rows} | ${item.first??"-"} | ${item.last??"-"} | ${item.meets1007}`);
  for(const item of stocks)lines.push(`STOCK_SAMPLE | ${item.ticker} | ${item.status} | ${item.rows} | ${item.first??"-"} | ${item.last??"-"} | ${item.meets1007}`);
  for(const item of results.filter(x=>x.error))lines.push(`error=${item.ticker}:${item.error}`);
  const jsonFile=path.join(base,OUTPUT_JSON),txtFile=path.join(base,OUTPUT_TXT);atomicText(jsonFile,JSON.stringify(report,null,2)+"\n");atomicText(txtFile,lines.join("\n")+"\n");return {...report,jsonFile,txtFile};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  runSectorFearGreedR1IexHistoryDiagnostic().then(result=>console.log(JSON.stringify({status:result.status,summary:result.summary,providerCalls:result.providerCalls,jsonFile:result.jsonFile,txtFile:result.txtFile,publicMutation:false,dbSchemaChanged:false},null,2))).catch(error=>{console.log(JSON.stringify({status:"FAILED",code:safeCode(error),providerCalls:null,publicMutation:false,dbSchemaChanged:false}));process.exitCode=1;});
}
