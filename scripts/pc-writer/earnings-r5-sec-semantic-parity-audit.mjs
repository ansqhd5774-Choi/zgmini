import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import {fileURLToPath} from "node:url";
import {latestMatureFrame,MATURE_LAG_DAYS} from "../../lib/market-score/sec-earnings-e1-r2-provider.mjs";
import {readLatestEarningsUniverse} from "./earnings-r5-offline-preflight.mjs";
import {E1_R5_OFFICIAL_SOURCE_MANIFEST} from "../../lib/market-score/earnings-e1-r5-official-sources.mjs";

export const VERSION="E1-R5-SEC-SEMANTIC-PARITY-AUDIT-R1";
const defaultBase=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const EPS_TAG="EarningsPerShareDiluted";
const CAPEX_APPROVED=new Set(["PaymentsToAcquirePropertyPlantAndEquipment","PaymentsForAdditionsToPropertyPlantAndEquipment"]);
const CAPEX_CANDIDATE="PaymentsToAcquireProductiveAssets";
const clean=v=>String(v??"").trim();
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const eq=(a,b)=>finite(a)&&finite(b)&&Math.abs(a-b)<=Math.max(1e-9,Math.abs(a)*1e-9,Math.abs(b)*1e-9);
function parseArgs(argv=process.argv.slice(2)){const out={};for(const item of argv){const m=item.match(/^--([^=]+)=(.*)$/);if(m)out[m[1]]=m[2];}return out;}
function split(line){return String(line??"").replace(/\r$/,"").split("\t").map(clean);}
function indexes(h){return Object.fromEntries(h.map((v,i)=>[v.toLowerCase(),i]));}
function padCik(v){const d=String(v??"").replace(/\D/g,"");return d?d.padStart(10,"0"):null;}
function iso(v){const t=clean(v);if(/^\d{8}$/.test(t))return `${t.slice(0,4)}-${t.slice(4,6)}-${t.slice(6,8)}`;if(/^\d{4}-\d{2}-\d{2}$/.test(t))return t;return null;}
function day(v){const x=iso(v);if(!x)return null;const ms=Date.parse(`${x}T00:00:00Z`);return Number.isFinite(ms)?Math.floor(ms/86400000):null;}
function readJson(file){try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function resolveJson(directory,cik,nested){const name=`CIK${cik}.json`;for(const file of [path.join(directory,name),path.join(directory,nested,name),path.join(directory,path.basename(directory),name)])if(fs.existsSync(file))return file;return null;}
async function reader(file){return readline.createInterface({input:fs.createReadStream(file,{encoding:"utf8"}),crlfDelay:Infinity});}
function bump(o,k,n=1){o[k]=(o[k]??0)+n;}
function uniqueValues(rows){const vals=[];for(const r of rows??[]){if(!vals.some(v=>eq(v,r.val)))vals.push(r.val);}return vals;}

export function companyFactsEpsFacts(document){
  const units=document?.facts?.["us-gaap"]?.[EPS_TAG]?.units??{};const out=[];
  for(const [unit,rows] of Object.entries(units)){
    if(!["USD/shares","USD-per-shares"].includes(unit))continue;
    for(const r of rows??[]){if(!finite(r?.val))continue;out.push({unit,val:r.val,accn:clean(r.accn),end:iso(r.end),filed:iso(r.filed),form:clean(r.form),frame:clean(r.frame)});}
  }
  return out;
}

export function compareEpsFsdsToCompanyfacts(fsdsRows,companyRows){
  const result={rows:0,exactAccnEndMatch:0,valueEqual:0,valueMismatch:0,noCompanyfactsMatch:0};
  for(const f of fsdsRows??[]){result.rows++;const matches=(companyRows??[]).filter(c=>c.accn===f.adsh&&c.end===f.ddate);if(!matches.length){result.noCompanyfactsMatch++;continue;}result.exactAccnEndMatch++;if(matches.some(c=>eq(c.val,f.val)))result.valueEqual++;else result.valueMismatch++;}
  return result;
}

export function summarizeCapexCoexistence(records){
  const out={periods:0,comparableUnique:0,equal:0,candidateGreater:0,candidateLess:0,ambiguous:0};
  for(const r of records??[]){out.periods++;const a=uniqueValues(r.approved),c=uniqueValues(r.candidate);if(a.length!==1||c.length!==1){out.ambiguous++;continue;}out.comparableUnique++;if(eq(c[0],a[0]))out.equal++;else if(c[0]>a[0])out.candidateGreater++;else out.candidateLess++;}
  return out;
}

function selectNear(rows,target){const td=day(target);const c=(rows??[]).filter(r=>r.qtrs===1&&Math.abs((day(r.ddate)??1e9)-td)<=45).sort((a,b)=>Math.abs(day(a.ddate)-td)-Math.abs(day(b.ddate)-td)||String(b.filed).localeCompare(String(a.filed)));if(!c.length)return null;const bestDist=Math.abs(day(c[0].ddate)-td),bestFiled=c[0].filed;const peers=c.filter(r=>Math.abs(day(r.ddate)-td)===bestDist&&r.filed===bestFiled);return uniqueValues(peers).length===1?c[0]:null;}

export async function loadFsdsSemanticRows({subFile,numFile,universeCiks,asOf}={}){
  const cutoff=iso(asOf);if(!cutoff||!fs.existsSync(subFile)||!fs.existsSync(numFile))return {status:"MISSING"};
  const subs=new Map();let h=null,ix=null;
  for await(const line of await reader(subFile)){
    if(!h){h=split(line);ix=indexes(h);continue;}const row=split(line),cik=padCik(row[ix.cik]),filed=iso(row[ix.filed]),form=row[ix.form],adsh=row[ix.adsh];
    if(!adsh||!cik||!universeCiks.has(cik)||!["10-Q","10-K"].includes(form)||!filed||filed>cutoff)continue;subs.set(adsh,{cik,filed,form});
  }
  const epsByCik=new Map(),capexByPeriod=new Map();let nh=null,ni=null;const counts={epsUsdQ1:0,capexCandidate:0,capexApproved:0};
  for await(const line of await reader(numFile)){
    if(!nh){nh=split(line);ni=indexes(nh);continue;}const row=split(line),sub=subs.get(row[ni.adsh]);if(!sub)continue;const tag=row[ni.tag],qtrs=Number(row[ni.qtrs]),uom=row[ni.uom],coreg=clean(row[ni.coreg]),val=Number(row[ni.value]),ddate=iso(row[ni.ddate]);if(!finite(val)||!ddate||coreg)continue;
    if(tag===EPS_TAG&&qtrs===1&&uom==="USD") {if(!epsByCik.has(sub.cik))epsByCik.set(sub.cik,[]);epsByCik.get(sub.cik).push({tag,qtrs,uom,val,ddate,adsh:row[ni.adsh],filed:sub.filed});counts.epsUsdQ1++;}
    if(tag===CAPEX_CANDIDATE||CAPEX_APPROVED.has(tag)){const key=`${row[ni.adsh]}|${ddate}|${qtrs}`;if(!capexByPeriod.has(key))capexByPeriod.set(key,{approved:[],candidate:[]});const fact={tag,qtrs,uom,val,ddate,adsh:row[ni.adsh],filed:sub.filed,cik:sub.cik};if(tag===CAPEX_CANDIDATE){capexByPeriod.get(key).candidate.push(fact);counts.capexCandidate++;}else{capexByPeriod.get(key).approved.push(fact);counts.capexApproved++;}}
  }
  return {status:"PASS",epsByCik,capexByPeriod,counts,submissionCount:subs.size};
}

export async function runSemanticParityAudit({incoming,coreFile,asOf=new Date().toISOString().slice(0,10),lagDays=MATURE_LAG_DAYS}={}){
  const inputDir=incoming??path.join(defaultBase,"manual-input","e1-r5","incoming"),core=coreFile??path.join(defaultBase,"storage","core.sqlite");const universe=readLatestEarningsUniverse(core),frame=latestMatureFrame(asOf,{lagDays});if(universe.status!=="PASS"||!frame)return {status:"PARTIAL",version:VERSION,reason:universe.status!=="PASS"?"UNIVERSE_REQUIRED":"FRAME_REQUIRED"};
  const fsds=await loadFsdsSemanticRows({subFile:path.join(inputDir,"sub.txt"),numFile:path.join(inputDir,"num.txt"),universeCiks:universe.ciks,asOf});if(fsds.status!=="PASS")return {status:"PARTIAL",version:VERSION,reason:"FSDS_REQUIRED"};
  const factDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secCompanyFacts.extractedDirectory);const epsParity={rows:0,exactAccnEndMatch:0,valueEqual:0,valueMismatch:0,noCompanyfactsMatch:0};let fsdsPairs=0,verifiedPairs=0;
  for(const m of universe.members){const cik=padCik(m.cik),doc=readJson(resolveJson(factDir,cik,"companyfacts")),company=companyFactsEpsFacts(doc),rows=fsds.epsByCik.get(cik)??[],cmp=compareEpsFsdsToCompanyfacts(rows,company);for(const [k,v] of Object.entries(cmp))epsParity[k]+=v;const cur=selectNear(rows,frame.end),prior=selectNear(rows,frame.priorEnd);if(cur&&prior){fsdsPairs++;const curOk=company.some(c=>c.accn===cur.adsh&&c.end===cur.ddate&&eq(c.val,cur.val)),priorOk=company.some(c=>c.accn===prior.adsh&&c.end===prior.ddate&&eq(c.val,prior.val));if(curOk&&priorOk)verifiedPairs++;}}
  const coexisting=[...fsds.capexByPeriod.values()].filter(r=>r.approved.length&&r.candidate.length),capexParity=summarizeCapexCoexistence(coexisting);
  return {status:"PASS",version:VERSION,frame,counts:{issuers:universe.members.length,fsdsSubmissions:fsds.submissionCount,...fsds.counts},epsParity,epsPairs:{fsdsPairs,verifiedPairs},capexParity,policies:{researchOnly:true,epsUsdAccepted:false,productiveAssetsAccepted:false,q4EpsAnnualMinusNineMonths:"FORBIDDEN",formulaChanged:false,weightChanged:false,scoringGateChanged:false,inputContractChanged:false,productionActivation:false},networkCalls:0,dbWrites:0};
}

export function formatSemanticParityAuditText(r){const e=r.epsParity??{},p=r.epsPairs??{},c=r.capexParity??{};return [`E1-R5 SEC SEMANTIC PARITY AUDIT: ${r.status}`,`VERSION: ${r.version}`,`FRAME: ${r.frame?.frame??"-"} prior=${r.frame?.priorFrame??"-"}`,`EPS_FSDS_USD_Q1_ROWS: ${r.counts?.epsUsdQ1??0}`,`EPS_EXACT_ACCN_END_MATCH: ${e.exactAccnEndMatch??0}/${e.rows??0}`,`EPS_VALUE_EQUAL: ${e.valueEqual??0} mismatch=${e.valueMismatch??0} noCompanyfactsMatch=${e.noCompanyfactsMatch??0}`,`EPS_PAIR_PARITY: verified=${p.verifiedPairs??0}/${p.fsdsPairs??0}`,`CAPEX_COOCCURRENCE: periods=${c.periods??0} comparableUnique=${c.comparableUnique??0} equal=${c.equal??0} candidateGreater=${c.candidateGreater??0} candidateLess=${c.candidateLess??0} ambiguous=${c.ambiguous??0}`,`EPS_USD_ACCEPTED: NO`,`PRODUCTIVE_ASSETS_ACCEPTED: NO`,`Q4_EPS_ANNUAL_MINUS_9M: FORBIDDEN`,`FORMULA_CHANGED: NO`,`WEIGHT_CHANGED: NO`,`SCORING_GATE_CHANGED: NO`,`INPUT_CONTRACT_CHANGED: NO`,`NETWORK_CALLS: 0`,`DB_WRITES: 0`].join("\r\n")+"\r\n";}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const a=parseArgs(),r=await runSemanticParityAudit({incoming:a.incoming?path.resolve(a.incoming):undefined,coreFile:a.core?path.resolve(a.core):undefined,asOf:a["as-of"]??undefined});console.log(formatSemanticParityAuditText(r));if(r.status!=="PASS")process.exitCode=1;}catch(err){console.log(`E1-R5 SEC SEMANTIC PARITY AUDIT: FAILED\r\nCODE: ${err?.code??"E1_R5_SEMANTIC_PARITY_FAILED"}`);process.exitCode=1;}}
