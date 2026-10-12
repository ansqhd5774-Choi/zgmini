import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import {fileURLToPath} from "node:url";
import {E1_R5_SEC_CONTRACT,validateSecCompanyFactsDocument} from "../../lib/market-score/earnings-e1-r5-input-contract.mjs";
import {latestMatureFrame,MATURE_LAG_DAYS} from "../../lib/market-score/sec-earnings-e1-r2-provider.mjs";
import {readLatestEarningsUniverse} from "./earnings-r5-offline-preflight.mjs";
import {E1_R5_OFFICIAL_SOURCE_MANIFEST} from "../../lib/market-score/earnings-e1-r5-official-sources.mjs";
import {selectCompanyFact,selectCurrentQuarterFlow,sicDivision} from "./earnings-r5-current-frame-audit.mjs";
import {selectQuarterWithApprovedQ4} from "./earnings-r5-approved-q4-additive-recovery-diagnostic.mjs";
import {selectFsdsDirectQuarter,selectFsdsFlowQuarter} from "./earnings-r5-fsds-fixed-frame-recovery-diagnostic.mjs";
import {loadFsdsFactsR3} from "./earnings-r5-fsds-fixed-frame-recovery-diagnostic-r3.mjs";

export const VERSION="E1-R5-INPUT-CONTRACT-CANDIDATE-AUDIT-R1";
export const CAPEX_CANDIDATES=Object.freeze([
  "PaymentsToAcquireOtherPropertyPlantAndEquipment",
  "PaymentsToAcquireOtherProductiveAssets",
  "PaymentsToAcquireProductiveAssets",
  "PropertyPlantAndEquipmentAdditions",
  "CapitalExpendituresIncurredButNotYetPaid",
]);
const defaultBase=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const clean=v=>String(v??"").trim();
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const pct=(n,d)=>d>0?n/d:null;
const pctText=v=>finite(v)?`${(100*v).toFixed(1)}%`:"-";
function parseArgs(argv=process.argv.slice(2)){const out={};for(const item of argv){const m=item.match(/^--([^=]+)=(.*)$/);if(m)out[m[1]]=m[2];}return out;}
function split(line){return String(line??"").replace(/\r$/,"").split("\t").map(clean);}
function indexes(headers){return Object.fromEntries(headers.map((v,i)=>[v.toLowerCase(),i]));}
function normalizeSecDate(value){const t=clean(value);if(/^\d{8}$/.test(t))return `${t.slice(0,4)}-${t.slice(4,6)}-${t.slice(6,8)}`;if(/^\d{4}-\d{2}-\d{2}$/.test(t))return t;return null;}
function day(value){const iso=normalizeSecDate(value);if(!iso)return null;const ms=Date.parse(`${iso}T00:00:00Z`);return Number.isFinite(ms)?Math.floor(ms/86400000):null;}
function near(value,target,tolerance=45){const a=day(value),b=day(target);return a!=null&&b!=null&&Math.abs(a-b)<=tolerance;}
function padCik(value){const digits=String(value??"").replace(/\D/g,"");return digits?digits.padStart(10,"0"):null;}
function readJson(file){try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function resolveJson(directory,cik,nested){const name=`CIK${cik}.json`;for(const file of [path.join(directory,name),path.join(directory,nested,name),path.join(directory,path.basename(directory),name)])if(fs.existsSync(file))return file;return null;}
async function lineReader(file){return readline.createInterface({input:fs.createReadStream(file,{encoding:"utf8"}),crlfDelay:Infinity});}
function endOf(fact){return fact?.end??fact?.ddate??null;}
function duration(fact){if(Number.isInteger(fact?.duration))return fact.duration;return fact?.qtrs===1?90:null;}
function pairCompatible(a,b){if(!a||!b||a.tag!==b.tag||a.unit!==b.unit)return false;const ae=day(endOf(a)),be=day(endOf(b));if(ae==null||be==null)return false;const gap=ae-be;if(gap<320||gap>410)return false;const ad=duration(a),bd=duration(b);return !Number.isInteger(ad)||!Number.isInteger(bd)||Math.abs(ad-bd)<=45;}

export function selectAsFiledEpsUsd(rows,{frameEnd,asOf}={}){
  const candidates=(rows??[]).filter(r=>r.tag==="EarningsPerShareDiluted"&&r.unit==="USD"&&r.qtrs===1&&r.filed<=asOf&&near(r.ddate,frameEnd,45));
  candidates.sort((a,b)=>Math.abs(day(a.ddate)-day(frameEnd))-Math.abs(day(b.ddate)-day(frameEnd))||String(b.filed).localeCompare(String(a.filed))||String(b.adsh).localeCompare(String(a.adsh)));
  if(!candidates.length)return null;
  const best=candidates[0],distance=Math.abs(day(best.ddate)-day(frameEnd));
  const peers=candidates.filter(x=>Math.abs(day(x.ddate)-day(frameEnd))===distance&&x.filed===best.filed);
  if(new Set(peers.map(x=>x.val)).size>1)return null;
  return {...best,end:best.ddate,duration:90};
}

function selectCurrent(document,fsdsRows,{metric,frame,frameEnd,asOf}={}){
  for(const tag of E1_R5_SEC_CONTRACT.tags?.[metric]??[]){
    const primary=selectQuarterWithApprovedQ4(document,{metric,tag,frame,frameEnd,asOf});
    if(primary?.fact)return primary.fact;
    const secondary=selectFsdsDirectQuarter(fsdsRows,{metric,tag,frameEnd,asOf});
    if(secondary.fact)return secondary.fact;
  }
  return null;
}
function selectEpsPair(document,{frame,asOf}={}){
  for(const tag of E1_R5_SEC_CONTRACT.tags.eps){
    const c=selectCompanyFact(document,{metric:"eps",tag,frame:frame.frame,frameEnd:frame.end,asOf}).fact;
    const p=selectCompanyFact(document,{metric:"eps",tag,frame:frame.priorFrame,frameEnd:frame.priorEnd,asOf}).fact;
    if(c&&p&&pairCompatible(c,p))return {current:c,prior:p};
  }
  return null;
}

async function scanCandidateRows({subFile,numFile,universeCiks,asOf,frame}){
  const submissions=new Map();let sh=null,si=null;
  for await(const line of await lineReader(subFile)){
    if(!sh){sh=split(line);si=indexes(sh);continue;}
    const row=split(line),adsh=row[si.adsh],cik=padCik(row[si.cik]),form=row[si.form],filed=normalizeSecDate(row[si.filed]);
    if(!adsh||!cik||!["10-Q","10-K"].includes(form)||!universeCiks.has(cik)||!filed||filed>asOf)continue;
    submissions.set(adsh,{cik,form,filed});
  }
  const epsUsdByCik=new Map();
  const capexByTag=Object.fromEntries(CAPEX_CANDIDATES.map(tag=>[tag,new Map()]));
  const operatingTags=new Map();
  let nh=null,ni=null;
  for await(const line of await lineReader(numFile)){
    if(!nh){nh=split(line);ni=indexes(nh);continue;}
    const row=split(line),sub=submissions.get(row[ni.adsh]);if(!sub)continue;
    const tag=row[ni.tag],qtrs=Number(row[ni.qtrs]),unit=row[ni.uom],coreg=clean(row[ni.coreg]),val=Number(row[ni.value]),ddate=normalizeSecDate(row[ni.ddate]);
    if(!finite(val)||!ddate||coreg)continue;
    if(tag==="EarningsPerShareDiluted"&&unit==="USD"&&qtrs===1){if(!epsUsdByCik.has(sub.cik))epsUsdByCik.set(sub.cik,[]);epsUsdByCik.get(sub.cik).push({tag,unit,qtrs,val,ddate,adsh:row[ni.adsh],...sub});}
    if(CAPEX_CANDIDATES.includes(tag)&&unit==="USD"&&Number.isInteger(qtrs)&&qtrs>=1&&qtrs<=4){const map=capexByTag[tag];if(!map.has(sub.cik))map.set(sub.cik,[]);map.get(sub.cik).push({metric:"capex",tag,unit,qtrs,val,ddate,adsh:row[ni.adsh],...sub});}
    if(tag!=="OperatingIncomeLoss"&&unit==="USD"&&qtrs===1&&/operating/i.test(tag)&&/(income|profit|earnings)/i.test(tag)&&(near(ddate,frame.end,45)||near(ddate,frame.priorEnd,45))){if(!operatingTags.has(tag))operatingTags.set(tag,{current:new Set(),prior:new Set()});const item=operatingTags.get(tag);if(near(ddate,frame.end,45))item.current.add(sub.cik);if(near(ddate,frame.priorEnd,45))item.prior.add(sub.cik);}
  }
  return {epsUsdByCik,capexByTag,operatingTags};
}

export async function runCandidateAudit({incoming,coreFile,asOf=new Date().toISOString().slice(0,10),lagDays=MATURE_LAG_DAYS}={}){
  const inputDir=incoming??path.join(defaultBase,"manual-input","e1-r5","incoming"),core=coreFile??path.join(defaultBase,"storage","core.sqlite");
  const universe=readLatestEarningsUniverse(core),frame=latestMatureFrame(asOf,{lagDays});
  if(universe.status!=="PASS"||!frame)return {status:"PARTIAL",reason:universe.status!=="PASS"?"UNIVERSE_REQUIRED":"FRAME_REQUIRED"};
  const subFile=path.join(inputDir,"sub.txt"),numFile=path.join(inputDir,"num.txt");
  const fsds=await loadFsdsFactsR3({subFile,numFile,universeCiks:universe.ciks,asOf});if(fsds.status!=="PASS")return {status:"PARTIAL",reason:"FSDS_REQUIRED"};
  const scan=await scanCandidateRows({subFile,numFile,universeCiks:universe.ciks,asOf,frame});
  const factDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secCompanyFacts.extractedDirectory),subDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secSubmissions.extractedDirectory);
  let valid=0,nonFinancial=0,epsBaseline=0,epsUsdPair=0,epsRecovered=0,s5Baseline=0;
  const capex=Object.fromEntries(CAPEX_CANDIDATES.map(tag=>[tag,{currentIssuerCount:0,recoveredS5:0,combinedS5:0}]));
  for(const member of universe.members){
    const cik=String(member.cik).replace(/\D/g,"").padStart(10,"0"),doc=readJson(resolveJson(factDir,cik,"companyfacts")),submission=readJson(resolveJson(subDir,cik,"submissions")),rows=fsds.factsByCik.get(cik)??[];
    const validation=validateSecCompanyFactsDocument(doc);if(validation.status!=="PASS"||validation.cik!==cik)continue;valid++;
    const baselineEps=selectEpsPair(doc,{frame,asOf});if(baselineEps)epsBaseline++;
    const usdRows=scan.epsUsdByCik.get(cik)??[],usdCurrent=selectAsFiledEpsUsd(usdRows,{frameEnd:frame.end,asOf}),usdPrior=selectAsFiledEpsUsd(usdRows,{frameEnd:frame.priorEnd,asOf});
    if(usdCurrent&&usdPrior&&pairCompatible(usdCurrent,usdPrior)){epsUsdPair++;if(!baselineEps)epsRecovered++;}
    const nf=sicDivision(submission?.sic)?.financial===false;if(!nf)continue;nonFinancial++;
    const revenue=selectCurrent(doc,rows,{metric:"revenue",frame:frame.frame,frameEnd:frame.end,asOf});if(!revenue||!(revenue.val>0))continue;
    let cfo=selectCurrentQuarterFlow(doc,{metric:"operatingCashFlow",asOf,target:revenue});if(!finite(cfo.value))cfo=selectFsdsFlowQuarter(rows,{metric:"operatingCashFlow",targetEnd:endOf(revenue),asOf});
    let approvedCapex=selectCurrentQuarterFlow(doc,{metric:"capex",asOf,target:revenue});if(!finite(approvedCapex.value))approvedCapex=selectFsdsFlowQuarter(rows,{metric:"capex",targetEnd:endOf(revenue),asOf});
    const baselineOk=finite(cfo.value)&&finite(approvedCapex.value);if(baselineOk)s5Baseline++;
    for(const tag of CAPEX_CANDIDATES){const candidateRows=scan.capexByTag[tag].get(cik)??[];if(candidateRows.some(r=>near(r.ddate,endOf(revenue),45)))capex[tag].currentIssuerCount++;if(baselineOk){capex[tag].combinedS5++;continue;}if(!finite(cfo.value))continue;const candidate=selectFsdsFlowQuarter(candidateRows,{metric:"capex",targetEnd:endOf(revenue),asOf});if(finite(candidate.value)){capex[tag].recoveredS5++;capex[tag].combinedS5++;}}
  }
  const operating=[...scan.operatingTags.entries()].map(([tag,v])=>({tag,current:v.current.size,prior:v.prior.size,both:[...v.current].filter(cik=>v.prior.has(cik)).length})).sort((a,b)=>b.both-a.both||b.current-a.current||a.tag.localeCompare(b.tag)).slice(0,20);
  return {version:VERSION,status:"PASS",frame,counts:{issuers:universe.members.length,valid,nonFinancial},eps:{baseline:epsBaseline,usdPair:epsUsdPair,recovered:epsRecovered,combined:epsBaseline+epsRecovered,coverage:pct(epsBaseline+epsRecovered,universe.members.length)},s5:{baseline:s5Baseline,denominator:nonFinancial,candidates:capex},operatingTagCandidates:operating,policies:{researchOnly:true,epsUsdAccepted:false,capexCandidatesAccepted:false,customOperatingTagsAccepted:false,q4EpsAnnualMinusNineMonths:"FORBIDDEN",formulaChanged:false,weightChanged:false,scoringGateChanged:false,inputContractChanged:false,productionActivation:false},networkCalls:0,dbWrites:0};
}

export function formatCandidateAuditText(r){const lines=[`E1-R5 INPUT CONTRACT CANDIDATE AUDIT: ${r.status}`,`VERSION: ${r.version}`,`FRAME: ${r.frame?.frame??"-"} prior=${r.frame?.priorFrame??"-"}`,`COUNTS: issuers=${r.counts?.issuers??0} valid=${r.counts?.valid??0} nonFinancial=${r.counts?.nonFinancial??0}`,`EPS_USD_COUNTERFACTUAL: baseline=${r.eps?.baseline??0} usdPair=${r.eps?.usdPair??0} recovered=${r.eps?.recovered??0} combined=${r.eps?.combined??0} coverage=${pctText(r.eps?.coverage)} accepted=NO`];for(const [tag,v] of Object.entries(r.s5?.candidates??{}))lines.push(`CAPEX_CANDIDATE: ${tag} currentIssuers=${v.currentIssuerCount} recoveredS5=${v.recoveredS5} combinedS5=${v.combinedS5}/${r.s5?.denominator??0} coverage=${pctText(pct(v.combinedS5,r.s5?.denominator??0))} accepted=NO`);for(const item of r.operatingTagCandidates??[])lines.push(`OPERATING_TAG_CANDIDATE: ${item.tag} current=${item.current} prior=${item.prior} both=${item.both} accepted=NO`);lines.push(`Q4_EPS_ANNUAL_MINUS_9M: FORBIDDEN`,`FORMULA_CHANGED: NO`,`WEIGHT_CHANGED: NO`,`SCORING_GATE_CHANGED: NO`,`INPUT_CONTRACT_CHANGED: NO`,`NETWORK_CALLS: 0`,`DB_WRITES: 0`);return lines.join("\r\n")+"\r\n";}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const cli=parseArgs();const report=await runCandidateAudit({incoming:cli.incoming?path.resolve(cli.incoming):undefined,coreFile:cli.core?path.resolve(cli.core):undefined,asOf:cli["as-of"]??undefined});console.log(formatCandidateAuditText(report));if(report.status!=="PASS")process.exitCode=1;}catch(error){console.log(`E1-R5 INPUT CONTRACT CANDIDATE AUDIT: FAILED\r\nCODE: ${error?.code??"E1_R5_INPUT_CONTRACT_CANDIDATE_AUDIT_FAILED"}`);process.exitCode=1;}}
