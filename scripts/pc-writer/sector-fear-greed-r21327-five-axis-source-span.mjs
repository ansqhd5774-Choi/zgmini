import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {DatabaseSync} from "node:sqlite";
import {fileURLToPath} from "node:url";

const BASE=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const OUT="local-sector-fear-greed-r21327-five-axis-source-span";
const valid=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x);
const json=f=>{try{return JSON.parse(fs.readFileSync(f,"utf8"));}catch{return null;}};
const dates=rows=>[...new Set((rows??[]).map(r=>String(r?.date??r?.tradeDate??r?.trade_date??"").slice(0,10)).filter(valid))].sort();
const span=rows=>{const d=dates(rows);return {dates:d.length,first:d[0]??null,last:d.at(-1)??null,maxScoredAfter252:Math.max(0,d.length-251)};};
function dbSpan(file){if(!fs.existsSync(file))return {dates:0,first:null,last:null,maxScoredAfter252:0};const db=new DatabaseSync(file,{readOnly:true});db.exec("PRAGMA query_only=ON");try{const ok=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='market_score_breadth_b1_r3_current_v1'").get();if(!ok)return {dates:0,first:null,last:null,maxScoredAfter252:0};const rows=db.prepare("SELECT DISTINCT trade_date AS date FROM market_score_breadth_b1_r3_current_v1 ORDER BY trade_date").all();return span(rows);}finally{db.close();}}
export function runR21327(base=BASE,{now=new Date()}={}){
  const iex=json(path.join(base,"local-sector-fear-greed-r1-iex-price-history.json"))??{},r7=json(path.join(base,"local-breadth-r7-pit-price-history.json"))??{},r6=json(path.join(base,"local-breadth-r6-shadow-history.json"))??{},r21326=json(path.join(base,"local-sector-fear-greed-r21326-tail-balance-historical-smoothed-validation.json"))??{};
  const benchmark={};for(const [ticker,rows] of Object.entries(iex.series??{}))benchmark[ticker]=span(rows);
  const sources={r7:span(r7.rows??[]),r6:span(r6.rows??[]),db:dbSpan(path.join(base,"storage","core.sqlite"))};
  const aligned=Object.fromEntries(Object.entries(r21326.sectors??{}).map(([id,s])=>[id,{alignedDates:s.alignedDates??null,firstAlignedDate:s.firstAlignedDate??null,lastAlignedDate:s.lastAlignedDate??null}]));
  const report={version:"R2.13.27-FIVE-AXIS-SOURCE-SPAN",generatedAt:(now instanceof Date?now:new Date(now)).toISOString(),status:"SHADOW_R21327_FIVE_AXIS_SOURCE_SPAN_COMPLETE",providerCalls:0,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,normalizationChanged:false,weightsChanged:false,diagnosticOnly:true,benchmark,sources,aligned,next:"IDENTIFY_FIVE_AXIS_HISTORY_LIMITER_FROM_SOURCE_SPANS"};
  const lines=["ZGMINI SECTOR FEAR & GREED R2.13.27 FIVE-AXIS SOURCE SPAN",`generatedAt=${report.generatedAt}`,`status=${report.status}`,"providerCalls=0 publicMutation=false d1Mutation=false productionFormulaChanged=false referenceRequirementChanged=false","approvedR1ReferenceRequirement=756 (UNCHANGED)","","SOURCE | DATES | FIRST | LAST | MAX_SCORE_DATES_AFTER_252",`R7 | ${sources.r7.dates} | ${sources.r7.first??"NA"} | ${sources.r7.last??"NA"} | ${sources.r7.maxScoredAfter252}`,`R6 | ${sources.r6.dates} | ${sources.r6.first??"NA"} | ${sources.r6.last??"NA"} | ${sources.r6.maxScoredAfter252}`,`DB | ${sources.db.dates} | ${sources.db.first??"NA"} | ${sources.db.last??"NA"} | ${sources.db.maxScoredAfter252}`,"","BENCHMARK | DATES | FIRST | LAST | MAX_SCORE_DATES_AFTER_252"];
  for(const [ticker,s] of Object.entries(benchmark))lines.push(`${ticker} | ${s.dates} | ${s.first??"NA"} | ${s.last??"NA"} | ${s.maxScoredAfter252}`);
  lines.push("","R21326 ALIGNMENT","SECTOR | ALIGNED | FIRST | LAST");for(const [id,s] of Object.entries(aligned))lines.push(`${id} | ${s.alignedDates??"NA"} | ${s.firstAlignedDate??"NA"} | ${s.lastAlignedDate??"NA"}`);
  const jf=path.join(base,`${OUT}.json`),tf=path.join(base,`${OUT}.txt`);fs.writeFileSync(jf,JSON.stringify(report,null,2)+"\n");fs.writeFileSync(tf,lines.join("\n")+"\n");return {...report,jsonFile:jf,txtFile:tf};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const r=runR21327();console.log(JSON.stringify({status:r.status,jsonFile:r.jsonFile,txtFile:r.txtFile,providerCalls:r.providerCalls,sources:r.sources,next:r.next},null,2));}catch(e){console.error(e?.stack??e?.message??String(e));process.exitCode=1;}}
