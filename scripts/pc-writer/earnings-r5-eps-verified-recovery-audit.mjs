import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {latestMatureFrame,MATURE_LAG_DAYS} from "../../lib/market-score/sec-earnings-e1-r2-provider.mjs";
import {readLatestEarningsUniverse} from "./earnings-r5-offline-preflight.mjs";
import {E1_R5_OFFICIAL_SOURCE_MANIFEST} from "../../lib/market-score/earnings-e1-r5-official-sources.mjs";
import {selectCompanyFact} from "./earnings-r5-current-frame-audit.mjs";
import {loadFsdsSemanticRows,companyFactsEpsFacts} from "./earnings-r5-sec-semantic-parity-audit.mjs";

export const VERSION="E1-R5-EPS-VERIFIED-RECOVERY-AUDIT-R1";
const defaultBase=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const EPS_TAG="EarningsPerShareDiluted";
const clean=v=>String(v??"").trim();
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const eq=(a,b)=>finite(a)&&finite(b)&&Math.abs(a-b)<=Math.max(1e-9,Math.abs(a)*1e-9,Math.abs(b)*1e-9);
function parseArgs(argv=process.argv.slice(2)){const out={};for(const item of argv){const m=item.match(/^--([^=]+)=(.*)$/);if(m)out[m[1]]=m[2];}return out;}
function iso(v){const t=clean(v);if(/^\d{8}$/.test(t))return `${t.slice(0,4)}-${t.slice(4,6)}-${t.slice(6,8)}`;if(/^\d{4}-\d{2}-\d{2}$/.test(t))return t;return null;}
function day(v){const x=iso(v);if(!x)return null;const ms=Date.parse(`${x}T00:00:00Z`);return Number.isFinite(ms)?Math.floor(ms/86400000):null;}
function readJson(file){try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function resolveJson(directory,cik,nested){const name=`CIK${cik}.json`;for(const file of [path.join(directory,name),path.join(directory,nested,name),path.join(directory,path.basename(directory),name)])if(fs.existsSync(file))return file;return null;}
function padCik(v){const d=String(v??"").replace(/\D/g,"");return d?d.padStart(10,"0"):null;}
function uniqueValues(rows){const vals=[];for(const r of rows??[]){if(!vals.some(v=>eq(v,r.val)))vals.push(r.val);}return vals;}
function selectNear(rows,target){const td=day(target);const c=(rows??[]).filter(r=>r.qtrs===1&&Math.abs((day(r.ddate)??1e9)-td)<=45).sort((a,b)=>Math.abs(day(a.ddate)-td)-Math.abs(day(b.ddate)-td)||String(b.filed).localeCompare(String(a.filed))||String(b.adsh).localeCompare(String(a.adsh)));if(!c.length)return null;const dist=Math.abs(day(c[0].ddate)-td),filed=c[0].filed,peers=c.filter(r=>Math.abs(day(r.ddate)-td)===dist&&r.filed===filed);return uniqueValues(peers).length===1?c[0]:null;}
function pairCompatible(a,b){if(!a||!b||a.tag!==b.tag||a.unit!==b.unit)return false;const ae=day(a.end),be=day(b.end);if(ae==null||be==null)return false;const gap=ae-be;return gap>=320&&gap<=410;}
export function rowParity(row,companyRows){if(!row)return {ok:false,reason:"FSDS_ROW_MISSING"};const exact=(companyRows??[]).filter(c=>c.accn===row.adsh&&c.end===row.ddate);if(!exact.length)return {ok:false,reason:"NO_COMPANYFACTS_ACCN_END"};return exact.some(c=>eq(c.val,row.val))?{ok:true,reason:"EXACT_VALUE_PARITY"}:{ok:false,reason:"VALUE_MISMATCH"};}
export function classifyRecoveredIssuer({baselineReady,usdCurrent,usdPrior,companyRows=[]}={}){const usdPair=!!usdCurrent&&!!usdPrior;if(baselineReady)return {category:"BASELINE_READY",recovered:false,verified:false};if(!usdPair)return {category:"NO_USD_PAIR",recovered:false,verified:false};const current=rowParity(usdCurrent,companyRows),prior=rowParity(usdPrior,companyRows);if(current.ok&&prior.ok)return {category:"RECOVERED_VERIFIED",recovered:true,verified:true,current,prior};return {category:`RECOVERED_UNVERIFIED_${current.reason}_${prior.reason}`,recovered:true,verified:false,current,prior};}
export async function runEpsVerifiedRecoveryAudit({incoming,coreFile,asOf=new Date().toISOString().slice(0,10),lagDays=MATURE_LAG_DAYS}={}){
  const inputDir=incoming??path.join(defaultBase,"manual-input","e1-r5","incoming"),core=coreFile??path.join(defaultBase,"storage","core.sqlite");
  const universe=readLatestEarningsUniverse(core),frame=latestMatureFrame(asOf,{lagDays});if(universe.status!=="PASS"||!frame)return {status:"PARTIAL",version:VERSION,reason:universe.status!=="PASS"?"UNIVERSE_REQUIRED":"FRAME_REQUIRED"};
  const fsds=await loadFsdsSemanticRows({subFile:path.join(inputDir,"sub.txt"),numFile:path.join(inputDir,"num.txt"),universeCiks:universe.ciks,asOf});if(fsds.status!=="PASS")return {status:"PARTIAL",version:VERSION,reason:"FSDS_REQUIRED"};
  const factDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secCompanyFacts.extractedDirectory);
  const counts={issuers:universe.members.length,baselineReady:0,usdPairReady:0,recoveredAny:0,recoveredVerified:0,recoveredUnverified:0,combinedVerifiedReady:0};const reasons={};
  for(const m of universe.members){const cik=padCik(m.cik),doc=readJson(resolveJson(factDir,cik,"companyfacts")),company=companyFactsEpsFacts(doc),rows=fsds.epsByCik.get(cik)??[];
    const c=selectCompanyFact(doc,{metric:"eps",tag:EPS_TAG,frame:frame.frame,frameEnd:frame.end,asOf}),p=selectCompanyFact(doc,{metric:"eps",tag:EPS_TAG,frame:frame.priorFrame,frameEnd:frame.priorEnd,asOf});const baselineReady=!!c.fact&&!!p.fact&&pairCompatible(c.fact,p.fact);if(baselineReady)counts.baselineReady++;
    const usdCurrent=selectNear(rows,frame.end),usdPrior=selectNear(rows,frame.priorEnd);if(usdCurrent&&usdPrior)counts.usdPairReady++;
    const classification=classifyRecoveredIssuer({baselineReady,usdCurrent,usdPrior,companyRows:company});if(classification.recovered){counts.recoveredAny++;if(classification.verified)counts.recoveredVerified++;else counts.recoveredUnverified++;reasons[classification.category]=(reasons[classification.category]??0)+1;}
  }
  counts.combinedVerifiedReady=counts.baselineReady+counts.recoveredVerified;const coverage=counts.combinedVerifiedReady/counts.issuers;
  return {status:"PASS",version:VERSION,frame,counts,coverage,minCoverage:.80,gatePass:coverage>=.80,reasons,policies:{researchOnly:true,epsUsdAccepted:false,verifiedRecoveryAccepted:false,q4EpsAnnualMinusNineMonths:"FORBIDDEN",formulaChanged:false,weightChanged:false,scoringGateChanged:false,inputContractChanged:false,productionActivation:false},networkCalls:0,dbWrites:0};
}
export function formatEpsVerifiedRecoveryAuditText(r){return [`E1-R5 EPS VERIFIED RECOVERY AUDIT: ${r.status}`,`VERSION: ${r.version}`,`FRAME: ${r.frame?.frame??"-"} prior=${r.frame?.priorFrame??"-"}`,`BASELINE_READY: ${r.counts?.baselineReady??0}/${r.counts?.issuers??0}`,`USD_PAIR_READY: ${r.counts?.usdPairReady??0}/${r.counts?.issuers??0}`,`RECOVERED_ANY: ${r.counts?.recoveredAny??0}`,`RECOVERED_VERIFIED: ${r.counts?.recoveredVerified??0}`,`RECOVERED_UNVERIFIED: ${r.counts?.recoveredUnverified??0}`,`COMBINED_VERIFIED_READY: ${r.counts?.combinedVerifiedReady??0}/${r.counts?.issuers??0} coverage=${finite(r.coverage)?(100*r.coverage).toFixed(1)+"%":"-"} min=80.0% pass=${r.gatePass?"YES":"NO"}`,`UNVERIFIED_REASONS: ${Object.entries(r.reasons??{}).map(([k,v])=>`${k}=${v}`).join(" ")||"NONE"}`,`EPS_USD_ACCEPTED: NO`,`VERIFIED_RECOVERY_ACCEPTED: NO`,`Q4_EPS_ANNUAL_MINUS_9M: FORBIDDEN`,`FORMULA_CHANGED: NO`,`WEIGHT_CHANGED: NO`,`SCORING_GATE_CHANGED: NO`,`INPUT_CONTRACT_CHANGED: NO`,`NETWORK_CALLS: 0`,`DB_WRITES: 0`].join("\r\n")+"\r\n";}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const a=parseArgs(),r=await runEpsVerifiedRecoveryAudit({incoming:a.incoming?path.resolve(a.incoming):undefined,coreFile:a.core?path.resolve(a.core):undefined,asOf:a["as-of"]??undefined});console.log(formatEpsVerifiedRecoveryAuditText(r));if(r.status!=="PASS")process.exitCode=1;}catch(err){console.log(`E1-R5 EPS VERIFIED RECOVERY AUDIT: FAILED\r\nCODE: ${err?.code??"E1_R5_EPS_VERIFIED_RECOVERY_FAILED"}`);process.exitCode=1;}}
