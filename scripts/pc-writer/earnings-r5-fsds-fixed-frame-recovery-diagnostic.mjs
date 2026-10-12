import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import {fileURLToPath} from "node:url";
import {E1_R5_SEC_CONTRACT,secMetricForTag,secUnitAllowed,validateSecCompanyFactsDocument} from "../../lib/market-score/earnings-e1-r5-input-contract.mjs";
import {latestMatureFrame,MATURE_LAG_DAYS} from "../../lib/market-score/sec-earnings-e1-r2-provider.mjs";
import {readLatestEarningsUniverse} from "./earnings-r5-offline-preflight.mjs";
import {E1_R5_OFFICIAL_SOURCE_MANIFEST} from "../../lib/market-score/earnings-e1-r5-official-sources.mjs";
import {selectCompanyFact,selectCurrentQuarterFlow,sicDivision} from "./earnings-r5-current-frame-audit.mjs";
import {selectQuarterWithApprovedQ4} from "./earnings-r5-approved-q4-additive-recovery-diagnostic.mjs";

export const VERSION="E1-R5-FSDS-FIXED-FRAME-RECOVERY-DIAGNOSTIC-R1";
const defaultBase=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const clean=value=>String(value??"").trim();
const day=value=>{if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;const ms=Date.parse(`${value}T00:00:00Z`);return Number.isFinite(ms)?Math.floor(ms/86400000):null;};
const pct=(n,d)=>d>0?n/d:null;
const pctText=v=>finite(v)?`${(100*v).toFixed(1)}%`:"-";
function parseArgs(argv=process.argv.slice(2)){const out={};for(const item of argv){const m=item.match(/^--([^=]+)=(.*)$/);if(m)out[m[1]]=m[2];}return out;}
function readJson(file){try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function resolveJson(directory,cik,nested){const name=`CIK${cik}.json`;for(const file of [path.join(directory,name),path.join(directory,nested,name),path.join(directory,path.basename(directory),name)])if(fs.existsSync(file))return file;return null;}
function split(line){return String(line??"").replace(/\r$/,"").split("\t").map(clean);}
function indexes(headers){return Object.fromEntries(headers.map((v,i)=>[v.toLowerCase(),i]));}
async function lines(file){return readline.createInterface({input:fs.createReadStream(file,{encoding:"utf8"}),crlfDelay:Infinity});}
function padCik(value){const x=String(value??"").replace(/\D/g,"");return x?x.padStart(10,"0"):null;}
function nearDate(value,target,tolerance=45){const a=day(value),b=day(target);return a!=null&&b!=null&&Math.abs(a-b)<=tolerance;}
function samePeriod(a,b){const ae=day(a?.end),be=day(b?.end);return ae!=null&&be!=null&&Math.abs(ae-be)<=45;}
function pairCompatible(a,b){if(!a||!b||a.tag!==b.tag||a.unit!==b.unit)return false;const ae=day(a.end),be=day(b.end);if(ae==null||be==null)return false;const gap=ae-be;return gap>=320&&gap<=410;}
function topUnique(rows,score){if(!rows.length)return null;const sorted=[...rows].sort(score);const best=score(sorted[0],sorted[1]??sorted[0]);const first=sorted[0];const peers=sorted.filter(row=>Math.abs(day(row.ddate)-day(first.ddate))===Math.abs(day(first.ddate)-day(first.ddate))&&row.filed===first.filed&&row.tag===first.tag&&row.unit===first.unit);if(new Set(peers.map(x=>x.val)).size>1)return null;return first;}

export function selectFsdsDirectQuarter(rows,{metric,tag=null,frameEnd,asOf}={}){
  const candidates=(rows??[]).filter(row=>row.metric===metric&&(!tag||row.tag===tag)&&row.qtrs===1&&row.filed<=asOf&&nearDate(row.ddate,frameEnd,45));
  candidates.sort((a,b)=>Math.abs(day(a.ddate)-day(frameEnd))-Math.abs(day(b.ddate)-day(frameEnd))||String(b.filed).localeCompare(String(a.filed))||String(b.adsh).localeCompare(String(a.adsh)));
  if(!candidates.length)return {fact:null,reason:"FSDS_DIRECT_MISSING"};
  const bestDistance=Math.abs(day(candidates[0].ddate)-day(frameEnd)),bestFiled=candidates[0].filed;
  const peers=candidates.filter(x=>Math.abs(day(x.ddate)-day(frameEnd))===bestDistance&&x.filed===bestFiled&&x.tag===candidates[0].tag&&x.unit===candidates[0].unit);
  if(new Set(peers.map(x=>x.val)).size>1)return {fact:null,reason:"FSDS_DIRECT_CONFLICT"};
  const r=candidates[0];
  return {fact:{val:r.val,tag:r.tag,unit:r.unit,end:r.ddate,duration:90,filed:r.filed,adsh:r.adsh,form:r.form,source:"SEC_FSDS",qtrs:1},reason:null,method:"FSDS_DIRECT_Q1"};
}

export function selectFsdsFlowQuarter(rows,{metric,targetEnd,asOf}={}){
  const usable=(rows??[]).filter(r=>r.metric===metric&&r.filed<=asOf&&r.ddate===targetEnd&&r.qtrs>=1&&r.qtrs<=4);
  const direct=usable.filter(r=>r.qtrs===1).sort((a,b)=>String(b.filed).localeCompare(String(a.filed))||String(b.adsh).localeCompare(String(a.adsh)));
  if(direct.length)return {value:direct[0].val,method:"FSDS_DIRECT_Q1",fact:direct[0],reason:null};
  const cumulative=usable.filter(r=>r.qtrs>=2).sort((a,b)=>b.qtrs-a.qtrs||String(b.filed).localeCompare(String(a.filed)));
  for(const current of cumulative){
    const priors=(rows??[]).filter(p=>p.metric===metric&&p.tag===current.tag&&p.unit===current.unit&&p.qtrs===current.qtrs-1&&p.filed<=asOf&&day(p.ddate)<day(current.ddate)&&day(current.ddate)-day(p.ddate)>=55&&day(current.ddate)-day(p.ddate)<=125).sort((a,b)=>Math.abs((day(current.ddate)-day(a.ddate))-90)-Math.abs((day(current.ddate)-day(b.ddate))-90)||String(b.filed).localeCompare(String(a.filed)));
    if(!priors.length)continue;
    const value=current.val-priors[0].val;if(!finite(value))continue;
    return {value,method:"FSDS_CUMULATIVE_DELTA",fact:current,priorFact:priors[0],reason:null};
  }
  return {value:null,method:null,reason:usable.length?"FSDS_NO_ALIGNED_FLOW":"FSDS_NO_FLOW_FACT"};
}

export async function loadFsdsFacts({subFile,numFile,universeCiks,asOf}={}){
  if(!fs.existsSync(subFile)||!fs.existsSync(numFile))return {status:"MISSING",factsByCik:new Map(),submissionCount:0};
  const submissions=new Map();let sh=null,si=null;
  for await(const line of await lines(subFile)){
    if(!sh){sh=split(line);si=indexes(sh);continue;}
    const row=split(line),form=row[si.form],filed=row[si.filed],cik=padCik(row[si.cik]),adsh=row[si.adsh];
    if(!adsh||!cik||!["10-Q","10-K"].includes(form)||filed>asOf||!universeCiks.has(cik))continue;
    submissions.set(adsh,{cik,form,filed,period:row[si.period],fy:row[si.fy],fp:row[si.fp]});
  }
  const factsByCik=new Map();let nh=null,ni=null,accepted=0;
  for await(const line of await lines(numFile)){
    if(!nh){nh=split(line);ni=indexes(nh);continue;}
    const row=split(line),sub=submissions.get(row[ni.adsh]);if(!sub)continue;
    const tag=row[ni.tag],metric=secMetricForTag(tag),unit=row[ni.uom],qtrs=Number(row[ni.qtrs]),val=Number(row[ni.value]);
    if(!metric||!Number.isInteger(qtrs)||!finite(val)||!secUnitAllowed(metric,unit)||clean(row[ni.coreg]))continue;
    if(!E1_R5_SEC_CONTRACT.fsdsDurationPolicy?.[metric]?.includes(qtrs))continue;
    const ddate=row[ni.ddate];if(day(ddate)==null)continue;
    if(!factsByCik.has(sub.cik))factsByCik.set(sub.cik,[]);
    factsByCik.get(sub.cik).push({metric,tag,unit,qtrs,val,ddate,adsh:row[ni.adsh],...sub});accepted++;
  }
  return {status:"PASS",factsByCik,submissionCount:submissions.size,acceptedFacts:accepted};
}

function selectPrimaryOrFsds(document,fsdsRows,{metric,tag,frame,frameEnd,asOf}={}){
  if(metric==="eps"){
    const primary=selectCompanyFact(document,{metric,tag,frame,frameEnd,asOf});
    if(primary.fact)return {fact:primary.fact,method:"COMPANYFACTS_DIRECT"};
  }else{
    const primary=selectQuarterWithApprovedQ4(document,{metric,tag,frame,frameEnd,asOf});
    if(primary.fact)return {fact:primary.fact,method:primary.method==="ANNUAL_MINUS_9M"?"COMPANYFACTS_Q4_DERIVED":"COMPANYFACTS_DIRECT"};
  }
  return selectFsdsDirectQuarter(fsdsRows,{metric,tag,frameEnd,asOf});
}
function selectPair(document,fsdsRows,{metric,currentFrame,priorFrame,currentEnd,priorEnd,asOf}={}){
  for(const tag of E1_R5_SEC_CONTRACT.tags?.[metric]??[]){
    const c=selectPrimaryOrFsds(document,fsdsRows,{metric,tag,frame:currentFrame,frameEnd:currentEnd,asOf});
    const p=selectPrimaryOrFsds(document,fsdsRows,{metric,tag,frame:priorFrame,frameEnd:priorEnd,asOf});
    if(c.fact&&p.fact&&pairCompatible(c.fact,p.fact))return {current:c.fact,prior:p.fact,currentMethod:c.method,priorMethod:p.method,tag};
  }
  return {current:null,prior:null,currentMethod:null,priorMethod:null,tag:null};
}
function selectCurrent(document,fsdsRows,{metric,frame,frameEnd,asOf}={}){for(const tag of E1_R5_SEC_CONTRACT.tags?.[metric]??[]){const r=selectPrimaryOrFsds(document,fsdsRows,{metric,tag,frame,frameEnd,asOf});if(r.fact)return {...r,tag};}return {fact:null,method:null};}
function inc(obj,key){obj[key]=(obj[key]??0)+1;}

export function buildFsdsRecoveryDiagnosticFromDocuments({members=[],factsByCik=new Map(),submissionsByCik=new Map(),fsdsFactsByCik=new Map(),frame,asOf}={}){
  const combined={S1:0,S2:0,S3:0,S4:0,S5:0,S7:0,S8:0};let valid=0,nonFinancial=0;
  const methods={epsCurrent:{},epsPrior:{},revenueCurrent:{},revenuePrior:{},operatingIncomeCurrent:{},operatingIncomePrior:{},netIncomeCurrent:{},cfo:{},capex:{}};
  for(const member of members){
    const cik=String(member.cik??"").replace(/\D/g,"").padStart(10,"0"),doc=factsByCik.get(cik),sub=submissionsByCik.get(cik),fsds=fsdsFactsByCik.get(cik)??[];
    const validation=validateSecCompanyFactsDocument(doc);if(validation.status!=="PASS"||validation.cik!==cik)continue;valid++;
    const nf=sicDivision(sub?.sic)?.financial===false;if(nf)nonFinancial++;
    const eps=selectPair(doc,fsds,{metric:"eps",currentFrame:frame.frame,priorFrame:frame.priorFrame,currentEnd:frame.end,priorEnd:frame.priorEnd,asOf});
    inc(methods.epsCurrent,eps.currentMethod??"MISSING");inc(methods.epsPrior,eps.priorMethod??"MISSING");
    if(eps.current&&eps.prior){combined.S1++;combined.S7++;}
    const rev=selectPair(doc,fsds,{metric:"revenue",currentFrame:frame.frame,priorFrame:frame.priorFrame,currentEnd:frame.end,priorEnd:frame.priorEnd,asOf});
    inc(methods.revenueCurrent,rev.currentMethod??"MISSING");inc(methods.revenuePrior,rev.priorMethod??"MISSING");
    if(rev.current&&rev.prior&&rev.prior.val>0)combined.S2++;
    const op=selectPair(doc,fsds,{metric:"operatingIncome",currentFrame:frame.frame,priorFrame:frame.priorFrame,currentEnd:frame.end,priorEnd:frame.priorEnd,asOf});
    inc(methods.operatingIncomeCurrent,op.currentMethod??"MISSING");inc(methods.operatingIncomePrior,op.priorMethod??"MISSING");
    if(nf&&rev.current&&op.current&&rev.current.val>0&&samePeriod(rev.current,op.current))combined.S3++;
    if(nf&&rev.current&&rev.prior&&op.current&&op.prior&&rev.current.val>0&&rev.prior.val>0&&samePeriod(rev.current,op.current)&&samePeriod(rev.prior,op.prior))combined.S4++;
    const net=selectCurrent(doc,fsds,{metric:"netIncome",frame:frame.frame,frameEnd:frame.end,asOf});inc(methods.netIncomeCurrent,net.method??"MISSING");if(net.fact)combined.S8++;
    if(nf&&rev.current&&rev.current.val>0){
      let cfo=selectCurrentQuarterFlow(doc,{metric:"operatingCashFlow",asOf,target:rev.current});if(!finite(cfo.value))cfo=selectFsdsFlowQuarter(fsds,{metric:"operatingCashFlow",targetEnd:rev.current.end,asOf});
      let capex=selectCurrentQuarterFlow(doc,{metric:"capex",asOf,target:rev.current});if(!finite(capex.value))capex=selectFsdsFlowQuarter(fsds,{metric:"capex",targetEnd:rev.current.end,asOf});
      inc(methods.cfo,cfo.method??cfo.reason??"MISSING");inc(methods.capex,capex.method??capex.reason??"MISSING");if(finite(cfo.value)&&finite(capex.value))combined.S5++;
    }
  }
  const denominator={S1:members.length,S2:members.length,S3:nonFinancial,S4:nonFinancial,S5:nonFinancial,S7:members.length,S8:members.length};
  const min={S1:.80,S2:.80,S3:.80,S4:.80,S5:.70,S7:.80,S8:.80};
  const gates=Object.fromEntries(Object.keys(combined).map(k=>[k,{ready:combined[k],denominator:denominator[k],coverage:pct(combined[k],denominator[k]),min:min[k],pass:pct(combined[k],denominator[k])>=min[k],need:Math.max(0,Math.ceil(min[k]*denominator[k]-1e-12)-combined[k])}]));
  return {version:VERSION,status:"PASS",active:false,asOf,frame,counts:{issuers:members.length,valid,nonFinancial},combined,gates,methods,policies:{researchOnly:true,companyFactsPreferred:true,fsdsSecondary:true,approvedQ4Additive:true,q4EpsAnnualMinusNineMonths:"FORBIDDEN",formulaChanged:false,weightChanged:false,scoringGateChanged:false,inputContractChanged:false,productionActivation:false},networkCalls:0,dbWrites:0};
}

export async function runFsdsRecoveryDiagnostic({incoming,coreFile,asOf=new Date().toISOString().slice(0,10),lagDays=MATURE_LAG_DAYS}={}){
  const inputDir=incoming??path.join(defaultBase,"manual-input","e1-r5","incoming"),core=coreFile??path.join(defaultBase,"storage","core.sqlite");
  const universe=readLatestEarningsUniverse(core),frame=latestMatureFrame(asOf,{lagDays});if(universe.status!=="PASS"||!frame)return {version:VERSION,status:"PARTIAL",reason:universe.status!=="PASS"?"UNIVERSE_REQUIRED":"FRAME_REQUIRED",networkCalls:0,dbWrites:0};
  const fsds=await loadFsdsFacts({subFile:path.join(inputDir,"sub.txt"),numFile:path.join(inputDir,"num.txt"),universeCiks:universe.ciks,asOf});if(fsds.status!=="PASS")return {version:VERSION,status:"PARTIAL",reason:"FSDS_REQUIRED",networkCalls:0,dbWrites:0};
  const factDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secCompanyFacts.extractedDirectory),subDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secSubmissions.extractedDirectory),factsByCik=new Map(),submissionsByCik=new Map();
  for(const m of universe.members){const cik=String(m.cik).replace(/\D/g,"").padStart(10,"0");factsByCik.set(cik,readJson(resolveJson(factDir,cik,"companyfacts")));submissionsByCik.set(cik,readJson(resolveJson(subDir,cik,"submissions")));}
  return {...buildFsdsRecoveryDiagnosticFromDocuments({members:universe.members,factsByCik,submissionsByCik,fsdsFactsByCik:fsds.factsByCik,frame,asOf}),fsds:{submissionCount:fsds.submissionCount,acceptedFacts:fsds.acceptedFacts}};
}

export function formatFsdsRecoveryDiagnosticText(r){const lines=[`E1-R5 FSDS FIXED FRAME RECOVERY DIAGNOSTIC: ${r.status}`,`VERSION: ${r.version}`,`FRAME: ${r.frame?.frame??"-"} prior=${r.frame?.priorFrame??"-"} end=${r.frame?.end??"-"}`,`FSDS: submissions=${r.fsds?.submissionCount??0} acceptedFacts=${r.fsds?.acceptedFacts??0}`,`POLICY: RESEARCH_ONLY companyFactsPreferred=true fsdsSecondary=true approvedQ4Additive=true accepted=NO`];for(const k of ["S1","S2","S3","S4","S5","S7","S8"]){const g=r.gates?.[k];lines.push(`${k}: ${pctText(g?.coverage)} ${g?.ready??0}/${g?.denominator??0} min=${pctText(g?.min)} pass=${g?.pass?"YES":"NO"} need=${g?.need??"-"}`);}for(const [k,v] of Object.entries(r.methods??{}))lines.push(`METHOD_${k}: ${Object.entries(v).sort((a,b)=>b[1]-a[1]).map(([x,n])=>`${x}=${n}`).join(" ")||"NONE"}`);lines.push(`Q4_EPS_ANNUAL_MINUS_9M: ${r.policies?.q4EpsAnnualMinusNineMonths??"-"}`,`FORMULA_CHANGED: NO`,`WEIGHT_CHANGED: NO`,`SCORING_GATE_CHANGED: NO`,`INPUT_CONTRACT_CHANGED: NO`,`NETWORK_CALLS: 0`,`DB_WRITES: 0`);return lines.join("\r\n")+"\r\n";}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const cli=parseArgs();const r=await runFsdsRecoveryDiagnostic({incoming:cli.incoming?path.resolve(cli.incoming):undefined,coreFile:cli.core?path.resolve(cli.core):undefined,asOf:cli["as-of"]??undefined});console.log(formatFsdsRecoveryDiagnosticText(r));if(r.status!=="PASS")process.exitCode=1;}catch(error){console.log(`E1-R5 FSDS FIXED FRAME RECOVERY DIAGNOSTIC: FAILED\r\nCODE: ${error?.code??"E1_R5_FSDS_RECOVERY_FAILED"}`);process.exitCode=1;}}
