import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {E1_R5_SEC_CONTRACT,canDeriveQ4FromAnnualMinusNineMonths,secUnitAllowed,validateSecCompanyFactsDocument} from "../../lib/market-score/earnings-e1-r5-input-contract.mjs";
import {quarterFromCumulative} from "../../lib/market-score/earnings-e1-r5-contract.mjs";
import {latestMatureFrame,MATURE_LAG_DAYS} from "../../lib/market-score/sec-earnings-e1-r2-provider.mjs";
import {readLatestEarningsUniverse} from "./earnings-r5-offline-preflight.mjs";
import {E1_R5_OFFICIAL_SOURCE_MANIFEST} from "../../lib/market-score/earnings-e1-r5-official-sources.mjs";
import {buildIssuerRowFromDocuments,selectCompanyFact,selectCurrentQuarterFlow,sicDivision} from "./earnings-r5-current-frame-audit.mjs";

export const VERSION="E1-R5-APPROVED-Q4-ADDITIVE-RECOVERY-DIAGNOSTIC-R1";
const defaultBase=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const clean=value=>String(value??"").trim();
const day=value=>{if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;const ms=Date.parse(`${value}T00:00:00Z`);return Number.isFinite(ms)?Math.floor(ms/86400000):null;};
const duration=fact=>{const s=day(fact?.start),e=day(fact?.end);return s!=null&&e!=null&&e>=s?e-s+1:null;};
const pct=(n,d)=>d>0?`${(100*n/d).toFixed(1)}%`:"-";
function parseArgs(argv=process.argv.slice(2)){const out={};for(const item of argv){const m=item.match(/^--([^=]+)=(.*)$/);if(m)out[m[1]]=m[2];}return out;}
function readJson(file){try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function resolveJson(directory,cik,nested){const name=`CIK${cik}.json`;for(const file of [path.join(directory,name),path.join(directory,nested,name),path.join(directory,path.basename(directory),name)])if(fs.existsSync(file))return file;return null;}
function samePeriod(a,b){const ae=day(a?.end),be=day(b?.end),ad=a?.duration??duration(a),bd=b?.duration??duration(b);return ae!=null&&be!=null&&Number.isInteger(ad)&&Number.isInteger(bd)&&Math.abs(ae-be)<=45&&Math.abs(ad-bd)<=45;}
function pairCompatible(current,prior){if(!current||!prior||current.tag!==prior.tag||current.unit!==prior.unit)return false;const ce=day(current.end),pe=day(prior.end);if(ce==null||pe==null)return false;const gap=ce-pe;const cd=current.duration??duration(current),pd=prior.duration??duration(prior);return gap>=320&&gap<=410&&Number.isInteger(cd)&&Number.isInteger(pd)&&Math.abs(cd-pd)<=45;}

function additiveFacts(document,{metric,tag,asOf}){
  const concept=document?.facts?.[E1_R5_SEC_CONTRACT.taxonomy]?.[tag];
  if(!concept?.units||typeof concept.units!=="object")return [];
  const out=[];
  for(const [unit,rows] of Object.entries(concept.units)){
    if(!secUnitAllowed(metric,unit)||!Array.isArray(rows))continue;
    for(const row of rows){
      if(!row||!E1_R5_SEC_CONTRACT.forms.includes(clean(row.form))||!finite(row.val))continue;
      if(typeof row.filed!=="string"||row.filed>asOf)continue;
      const d=duration(row);if(!Number.isInteger(d)||d<55||d>400)continue;
      out.push({...row,tag,unit,duration:d});
    }
  }
  return out;
}
function latestSafe(rows){if(!rows.length)return null;const sorted=[...rows].sort((a,b)=>String(b.filed).localeCompare(String(a.filed))||String(b.accn??"").localeCompare(String(a.accn??"")));const filed=sorted[0].filed;const top=sorted.filter(x=>x.filed===filed);return new Set(top.map(x=>x.val)).size===1?top[0]:null;}

export function deriveApprovedQ4Fact(document,{metric,tag,frameEnd,asOf}={}){
  if(!canDeriveQ4FromAnnualMinusNineMonths(metric))return {fact:null,reason:metric==="eps"?"Q4_EPS_FORBIDDEN":"Q4_DERIVATION_NOT_APPROVED"};
  const target=day(frameEnd);if(target==null)return {fact:null,reason:"FRAME_END_MISSING"};
  const facts=additiveFacts(document,{metric,tag,asOf});
  const annuals=facts.filter(x=>x.duration>=300&&Math.abs(day(x.end)-target)<=45).sort((a,b)=>Math.abs(day(a.end)-target)-Math.abs(day(b.end)-target)||String(b.filed).localeCompare(String(a.filed)));
  for(const annual of annuals){
    const nine=facts.filter(x=>x.tag===annual.tag&&x.unit===annual.unit&&x.start===annual.start&&day(x.end)<day(annual.end)&&annual.duration>x.duration&&day(annual.end)-day(x.end)>=55&&day(annual.end)-day(x.end)<=125&&x.duration>=180&&x.duration<=310);
    const prior=latestSafe(nine);if(!prior)continue;
    const value=quarterFromCumulative(annual.val,prior.val);if(!finite(value))continue;
    const qDuration=annual.duration-prior.duration;
    if(!Number.isInteger(qDuration)||qDuration<55||qDuration>125)continue;
    return {fact:{...annual,val:value,duration:qDuration,derivedFromAnnual:true,annualFact:annual,priorCumulativeFact:prior},reason:null,method:"ANNUAL_MINUS_9M"};
  }
  return {fact:null,reason:annuals.length?"NO_MATCHED_9M":"NO_ANNUAL_NEAR_FRAME"};
}

export function selectQuarterWithApprovedQ4(document,{metric,tag,frame,frameEnd,asOf}={}){
  const direct=selectCompanyFact(document,{metric,tag,frame,frameEnd,asOf});
  if(direct.fact)return {fact:direct.fact,method:"DIRECT_QUARTER",reason:null};
  const q4=deriveApprovedQ4Fact(document,{metric,tag,frameEnd,asOf});
  if(q4.fact)return q4;
  return {fact:null,method:null,reason:q4.reason??direct.reason};
}
function selectAdditivePair(document,{metric,currentFrame,priorFrame,currentEnd,priorEnd,asOf}){
  for(const tag of E1_R5_SEC_CONTRACT.tags?.[metric]??[]){
    const current=selectQuarterWithApprovedQ4(document,{metric,tag,frame:currentFrame,frameEnd:currentEnd,asOf});
    const prior=selectQuarterWithApprovedQ4(document,{metric,tag,frame:priorFrame,frameEnd:priorEnd,asOf});
    if(current.fact&&prior.fact&&pairCompatible(current.fact,prior.fact))return {current:current.fact,prior:prior.fact,currentMethod:current.method,priorMethod:prior.method,tag};
  }
  return {current:null,prior:null,currentMethod:null,priorMethod:null,tag:null};
}
function selectAdditiveCurrent(document,{metric,frame,frameEnd,asOf}){for(const tag of E1_R5_SEC_CONTRACT.tags?.[metric]??[]){const selected=selectQuarterWithApprovedQ4(document,{metric,tag,frame,frameEnd,asOf});if(selected.fact)return {...selected,tag};}return {fact:null,method:null,reason:"MISSING",tag:null};}
function inc(obj,key){obj[key]=(obj[key]??0)+1;}

export function buildApprovedQ4RecoveryDiagnosticFromDocuments({members=[],factsByCik=new Map(),submissionsByCik=new Map(),frame,asOf}={}){
  const baseline={S1:0,S2:0,S3:0,S4:0,S5:0,S7:0,S8:0};
  const q4={...baseline};let nonFinancial=0,valid=0;
  const methods={revenueCurrent:{},revenuePrior:{},operatingIncomeCurrent:{},operatingIncomePrior:{},netIncomeCurrent:{},cfo:{},capex:{}};
  for(const member of members){
    const cik=String(member?.cik??"").replace(/\D/g,"").padStart(10,"0");
    const doc=factsByCik.get(cik),submission=submissionsByCik.get(cik);
    const validation=validateSecCompanyFactsDocument(doc);if(validation.status!=="PASS"||validation.cik!==cik)continue;valid++;
    const row=buildIssuerRowFromDocuments({member,companyFacts:doc,submission,frame,asOf});
    const nf=sicDivision(submission?.sic)?.financial===false;if(nf)nonFinancial++;
    const c=row.current??{},p=row.priorYear??{};
    if(finite(c.eps)&&finite(p.eps)){baseline.S1++;baseline.S7++;q4.S1++;q4.S7++;}
    if(finite(c.revenue)&&finite(p.revenue)&&p.revenue>0)baseline.S2++;
    if(nf&&finite(c.operatingIncome)&&finite(c.revenue)&&c.revenue>0)baseline.S3++;
    if(nf&&finite(c.operatingIncome)&&finite(c.revenue)&&c.revenue>0&&finite(p.operatingIncome)&&finite(p.revenue)&&p.revenue>0)baseline.S4++;
    if(nf&&finite(c.operatingCashFlow)&&finite(c.capex)&&finite(c.revenue)&&c.revenue>0)baseline.S5++;
    if(finite(c.netIncome))baseline.S8++;

    const revenue=selectAdditivePair(doc,{metric:"revenue",currentFrame:frame.frame,priorFrame:frame.priorFrame,currentEnd:frame.end,priorEnd:frame.priorEnd,asOf});
    const op=selectAdditivePair(doc,{metric:"operatingIncome",currentFrame:frame.frame,priorFrame:frame.priorFrame,currentEnd:frame.end,priorEnd:frame.priorEnd,asOf});
    const net=selectAdditiveCurrent(doc,{metric:"netIncome",frame:frame.frame,frameEnd:frame.end,asOf});
    inc(methods.revenueCurrent,revenue.currentMethod??"MISSING");inc(methods.revenuePrior,revenue.priorMethod??"MISSING");
    inc(methods.operatingIncomeCurrent,op.currentMethod??"MISSING");inc(methods.operatingIncomePrior,op.priorMethod??"MISSING");inc(methods.netIncomeCurrent,net.method??"MISSING");
    if(revenue.current&&revenue.prior&&revenue.prior.val>0)q4.S2++;
    if(nf&&revenue.current&&op.current&&revenue.current.val>0&&samePeriod(revenue.current,op.current))q4.S3++;
    if(nf&&revenue.current&&revenue.prior&&op.current&&op.prior&&revenue.current.val>0&&revenue.prior.val>0&&samePeriod(revenue.current,op.current)&&samePeriod(revenue.prior,op.prior))q4.S4++;
    if(net.fact)q4.S8++;
    if(nf&&revenue.current&&revenue.current.val>0){
      const cfo=selectCurrentQuarterFlow(doc,{metric:"operatingCashFlow",asOf,target:revenue.current});
      const capex=selectCurrentQuarterFlow(doc,{metric:"capex",asOf,target:revenue.current});
      inc(methods.cfo,cfo.method??cfo.reason??"MISSING");inc(methods.capex,capex.method??capex.reason??"MISSING");
      if(finite(cfo.value)&&finite(capex.value))q4.S5++;
    }
  }
  return {version:VERSION,status:"PASS",active:false,asOf,frame,counts:{issuers:members.length,valid,nonFinancial},baseline,q4,recovered:Object.fromEntries(Object.keys(q4).map(k=>[k,q4[k]-baseline[k]])),methods,policies:{researchOnly:true,approvedInputContractOnly:true,q4EpsAnnualMinusNineMonths:"FORBIDDEN",q4AdditiveMetrics:[...E1_R5_SEC_CONTRACT.q4DerivableAdditiveMetrics],formulaChanged:false,weightChanged:false,scoringGateChanged:false,inputContractChanged:false,productionActivation:false},networkCalls:0,dbWrites:0};
}

export function formatApprovedQ4RecoveryDiagnosticText(report){const d=report.counts?.nonFinancial??0,u=report.counts?.issuers??0;const denom=k=>["S3","S4","S5"].includes(k)?d:u;const lines=[`E1-R5 APPROVED Q4 ADDITIVE RECOVERY DIAGNOSTIC: ${report.status}`,`VERSION: ${report.version}`,`FRAME: ${report.frame?.frame??"-"} prior=${report.frame?.priorFrame??"-"} end=${report.frame?.end??"-"}`,`POLICY: RESEARCH_ONLY approvedInputContractOnly=true contractChanged=false accepted=NO`,`COUNTS: issuers=${u} valid=${report.counts?.valid??0} nonFinancial=${d}`];for(const k of ["S1","S2","S3","S4","S5","S7","S8"])lines.push(`${k}: baseline=${pct(report.baseline[k],denom(k))} ${report.baseline[k]}/${denom(k)} q4=${pct(report.q4[k],denom(k))} ${report.q4[k]}/${denom(k)} recovered=${report.recovered[k]}`);for(const [metric,counts] of Object.entries(report.methods??{}))lines.push(`METHOD_${metric}: ${Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k}=${v}`).join(" ")||"NONE"}`);lines.push(`Q4_EPS_ANNUAL_MINUS_9M: ${report.policies.q4EpsAnnualMinusNineMonths}`,`Q4_ADDITIVE_METRICS: ${report.policies.q4AdditiveMetrics.join(",")}`,`FORMULA_CHANGED: NO`,`WEIGHT_CHANGED: NO`,`SCORING_GATE_CHANGED: NO`,`INPUT_CONTRACT_CHANGED: NO`,`NETWORK_CALLS: 0`,`DB_WRITES: 0`);return lines.join("\r\n")+"\r\n";}

export function runApprovedQ4RecoveryDiagnostic({incoming,coreFile,asOf=new Date().toISOString().slice(0,10),lagDays=MATURE_LAG_DAYS}={}){const inputDir=incoming??path.join(defaultBase,"manual-input","e1-r5","incoming");const core=coreFile??path.join(defaultBase,"storage","core.sqlite");const universe=readLatestEarningsUniverse(core);const frame=latestMatureFrame(asOf,{lagDays});if(universe.status!=="PASS"||!frame)return {version:VERSION,status:"PARTIAL",active:false,reason:universe.status!=="PASS"?"UNIVERSE_REQUIRED":"FRAME_REQUIRED",networkCalls:0,dbWrites:0};const factsDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secCompanyFacts.extractedDirectory),subsDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secSubmissions.extractedDirectory);const factsByCik=new Map(),submissionsByCik=new Map();for(const member of universe.members){const cik=String(member.cik).replace(/\D/g,"").padStart(10,"0");factsByCik.set(cik,readJson(resolveJson(factsDir,cik,"companyfacts")));submissionsByCik.set(cik,readJson(resolveJson(subsDir,cik,"submissions")));}return buildApprovedQ4RecoveryDiagnosticFromDocuments({members:universe.members,factsByCik,submissionsByCik,frame,asOf});}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const cli=parseArgs();const report=runApprovedQ4RecoveryDiagnostic({incoming:cli.incoming?path.resolve(cli.incoming):undefined,coreFile:cli.core?path.resolve(cli.core):undefined,asOf:cli["as-of"]??undefined});console.log(formatApprovedQ4RecoveryDiagnosticText(report));if(report.status!=="PASS")process.exitCode=1;}catch(error){console.log(`E1-R5 APPROVED Q4 ADDITIVE RECOVERY DIAGNOSTIC: FAILED\r\nCODE: ${error?.code??"E1_R5_Q4_ADDITIVE_RECOVERY_FAILED"}`);process.exitCode=1;}}
