import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {DatabaseSync} from "node:sqlite";
import {fileURLToPath} from "node:url";
import {parsePitSectorHistoryCsv,buildPointInTimeSectorInputs} from "../../lib/market-score/sector-fear-greed-r1-inputs.mjs";
import {SECTOR_FEAR_GREED_R1_ETFS,SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";
import {scoreRawAxis,buildCompositeSeries} from "../../lib/market-score/sector-fear-greed-r28-reference-window.mjs";
import {deriveR28RawAxes} from "./sector-fear-greed-r28-reference-window-diagnostic.mjs";
import {mergeCanonicalRowsR2135} from "./sector-fear-greed-r2135-r24-source-sensitivity.mjs";

const BASE=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const OUT="local-sector-fear-greed-r21328-five-axis-axis-span";
const WINDOW=252;
const R6="local-breadth-r6-shadow-history.json";
const R7="local-breadth-r7-pit-price-history.json";
const PIT="local-sector-fear-greed-r1-pit-gics.csv";
const IEX="local-sector-fear-greed-r1-iex-price-history.json";
const finite=x=>typeof x==="number"&&Number.isFinite(x);
const valid=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x);
const json=f=>{try{return JSON.parse(fs.readFileSync(f,"utf8"));}catch{return null;}};
const span=rows=>{const a=(Array.isArray(rows)?rows:[]).filter(r=>valid(String(r?.date??"").slice(0,10))).sort((x,y)=>String(x.date).localeCompare(String(y.date)));return {n:a.length,first:a[0]?.date??null,last:a.at(-1)?.date??null};};
const AXIS_WEIGHTS=Object.freeze({trend:.20,breadth:.20,demand:.15,relativeStrength:.15,volatility:.15});
const AXIS_SPECS=Object.freeze({trend:{metrics:[{key:"m125",weight:.50},{key:"r60",weight:.30},{key:"r20",weight:.20}]},breadth:{metrics:[{key:"b50",weight:.35},{key:"b200",weight:.35},{key:"highLowNet",weight:.30}]},demand:{metrics:[{key:"vb5",weight:.60},{key:"vb20",weight:.40}]},relativeStrength:{metrics:[{key:"rs20",weight:.25},{key:"rs60",weight:.45},{key:"rs125",weight:.30}]},volatility:{metrics:[{key:"rv20",weight:.40,invert:true},{key:"dsv20",weight:.35,invert:true},{key:"dd63",weight:.25}]}});
const AXES=Object.keys(AXIS_WEIGHTS);
function tableExists(db,name){return Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1").get(name));}
function readCanonical(base){const sets=[];for(const [name,source] of [[R7,"BREADTH_R7_LOCAL"],[R6,"BREADTH_R6_LOCAL"]])sets.push({source,rows:json(path.join(base,name))?.rows??[]});const dbRows=[],dbFile=path.join(base,"storage","core.sqlite");if(fs.existsSync(dbFile)){const db=new DatabaseSync(dbFile,{readOnly:true});db.exec("PRAGMA query_only=ON");try{if(tableExists(db,"market_score_breadth_b1_r3_current_v1"))for(const row of db.prepare("SELECT trade_date,ticker,current_close,current_volume FROM market_score_breadth_b1_r3_current_v1 ORDER BY trade_date,ticker").all())dbRows.push(row);}finally{db.close();}}return mergeCanonicalRowsR2135(sets,dbRows);}
function priceRows(rows=[]){const m=new Map();for(const r of rows){const date=String(r?.date??"").slice(0,10),close=Number(r?.close);if(valid(date)&&finite(close)&&close>0)m.set(date,{date,close});}return [...m.values()].sort((a,b)=>a.date.localeCompare(b.date));}
export function runR21328(base=BASE,{now=new Date()}={}){
  if(SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS!==756)throw new Error("R21328_REFERENCE_MISMATCH");
  for(const name of [PIT,IEX])if(!fs.existsSync(path.join(base,name)))throw new Error(`R21328_INPUT_MISSING:${name}`);
  const pit=parsePitSectorHistoryCsv(fs.readFileSync(path.join(base,PIT),"utf8")),canonical=readCanonical(base),derived=buildPointInTimeSectorInputs({rows:canonical.rows,pitHistory:pit}),price=json(path.join(base,IEX))??{},spy=priceRows(price.series?.SPY??[]),sectors={};
  for(const [sectorId,ticker] of Object.entries(SECTOR_FEAR_GREED_R1_ETFS)){
    const etf=priceRows(price.series?.[ticker]??[]),pitRows=derived.sectors[sectorId]??[],breadthRows=pitRows.filter(r=>[r?.b50,r?.b200,r?.highLowNet].every(finite)),demandRows=pitRows.filter(r=>finite(r?.volumeBreadth)),raw=deriveR28RawAxes({etfRows:etf,spyRows:spy,breadthRows,demandRows}),scored={},axis={};
    for(const name of AXES){scored[name]=scoreRawAxis(raw[name],AXIS_SPECS[name],WINDOW);axis[name]={raw:span(raw[name]),scored:span(scored[name])};}
    const composite=buildCompositeSeries(scored,AXIS_WEIGHTS),minScored=Math.min(...AXES.map(a=>axis[a].scored.n)),limiters=AXES.filter(a=>axis[a].scored.n===minScored);
    sectors[sectorId]={ticker,pitRows:pitRows.length,breadthReadyRows:breadthRows.length,demandReadyRows:demandRows.length,axis,composite:span(composite),limiters};
  }
  const limiterCounts=Object.fromEntries(AXES.map(a=>[a,Object.values(sectors).filter(s=>s.limiters.includes(a)).length]));
  const report={version:"R2.13.28-FIVE-AXIS-AXIS-SPAN",generatedAt:(now instanceof Date?now:new Date(now)).toISOString(),status:"SHADOW_R21328_FIVE_AXIS_AXIS_SPAN_COMPLETE",providerCalls:0,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,normalizationChanged:false,weightsChanged:false,diagnosticOnly:true,canonicalRows:canonical.rows.length,canonicalConflicts:canonical.diagnostics?.conflicts??0,limiterCounts,sectors,next:"DECIDE_MINIMUM_FIVE_AXIS_HISTORY_EXTENSION"};
  const lines=["ZGMINI SECTOR FEAR & GREED R2.13.28 FIVE-AXIS AXIS SPAN",`generatedAt=${report.generatedAt}`,`status=${report.status}`,"providerCalls=0 publicMutation=false d1Mutation=false productionFormulaChanged=false referenceRequirementChanged=false","approvedR1ReferenceRequirement=756 (UNCHANGED)",`canonicalRows=${report.canonicalRows} conflicts=${report.canonicalConflicts}`,`limiterCounts=${JSON.stringify(limiterCounts)}`,"","SECTOR | ETF | PIT | BREADTH_READY | DEMAND_READY | TREND_RAW/SCORED | BREADTH_RAW/SCORED | DEMAND_RAW/SCORED | RS_RAW/SCORED | VOL_RAW/SCORED | COMPOSITE | LIMITERS"];
  for(const [id,s] of Object.entries(sectors))lines.push(`${id} | ${s.ticker} | ${s.pitRows} | ${s.breadthReadyRows} | ${s.demandReadyRows} | ${s.axis.trend.raw.n}/${s.axis.trend.scored.n} | ${s.axis.breadth.raw.n}/${s.axis.breadth.scored.n} | ${s.axis.demand.raw.n}/${s.axis.demand.scored.n} | ${s.axis.relativeStrength.raw.n}/${s.axis.relativeStrength.scored.n} | ${s.axis.volatility.raw.n}/${s.axis.volatility.scored.n} | ${s.composite.n} | ${s.limiters.join(",")}`);
  lines.push("","AXIS FIRST/LAST SCORED");for(const [id,s] of Object.entries(sectors)){for(const a of AXES)lines.push(`${id} | ${a} | ${s.axis[a].scored.n} | ${s.axis[a].scored.first??"NA"} | ${s.axis[a].scored.last??"NA"}`);}
  const jf=path.join(base,`${OUT}.json`),tf=path.join(base,`${OUT}.txt`);fs.writeFileSync(jf,JSON.stringify(report,null,2)+"\n");fs.writeFileSync(tf,lines.join("\n")+"\n");return {...report,jsonFile:jf,txtFile:tf};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const r=runR21328();console.log(JSON.stringify({status:r.status,jsonFile:r.jsonFile,txtFile:r.txtFile,providerCalls:r.providerCalls,limiterCounts:r.limiterCounts,next:r.next},null,2));}catch(e){console.error(e?.stack??e?.message??String(e));process.exitCode=1;}}
