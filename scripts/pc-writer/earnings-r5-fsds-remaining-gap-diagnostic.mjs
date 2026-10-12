import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import {fileURLToPath} from "node:url";
import {E1_R5_SEC_CONTRACT,classifySecFact,validateSecCompanyFactsDocument} from "../../lib/market-score/earnings-e1-r5-input-contract.mjs";
import {latestMatureFrame,MATURE_LAG_DAYS} from "../../lib/market-score/sec-earnings-e1-r2-provider.mjs";
import {readLatestEarningsUniverse} from "./earnings-r5-offline-preflight.mjs";
import {E1_R5_OFFICIAL_SOURCE_MANIFEST} from "../../lib/market-score/earnings-e1-r5-official-sources.mjs";
import {selectCompanyFact,selectCurrentQuarterFlow,sicDivision} from "./earnings-r5-current-frame-audit.mjs";
import {selectQuarterWithApprovedQ4} from "./earnings-r5-approved-q4-additive-recovery-diagnostic.mjs";
import {selectFsdsDirectQuarter,selectFsdsFlowQuarter} from "./earnings-r5-fsds-fixed-frame-recovery-diagnostic.mjs";

export const VERSION="E1-R5-FSDS-REMAINING-GAP-DIAGNOSTIC-R1";
const defaultBase=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const clean=value=>String(value??"").trim();
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const pct=(n,d)=>d>0?n/d:null;
const pctText=v=>finite(v)?`${(100*v).toFixed(1)}%`:"-";
const bump=(o,k)=>{const key=clean(k)||"EMPTY";o[key]=(o[key]??0)+1;};
function parseArgs(argv=process.argv.slice(2)){const out={};for(const item of argv){const m=item.match(/^--([^=]+)=(.*)$/);if(m)out[m[1]]=m[2];}return out;}
function split(line){return String(line??"").replace(/\r$/,"").split("\t").map(clean);}
function indexes(headers){return Object.fromEntries(headers.map((v,i)=>[v.toLowerCase(),i]));}
function padCik(value){const digits=String(value??"").replace(/\D/g,"");return digits?digits.padStart(10,"0"):null;}
function normalizeSecDate(value){const t=clean(value);if(/^\d{8}$/.test(t))return `${t.slice(0,4)}-${t.slice(4,6)}-${t.slice(6,8)}`;if(/^\d{4}-\d{2}-\d{2}$/.test(t))return t;return null;}
function day(value){const iso=normalizeSecDate(value);if(!iso)return null;const ms=Date.parse(`${iso}T00:00:00Z`);return Number.isFinite(ms)?Math.floor(ms/86400000):null;}
function duration(fact){if(Number.isInteger(fact?.duration))return fact.duration;const s=day(fact?.start),e=day(fact?.end??fact?.ddate);return s!=null&&e!=null&&e>=s?e-s+1:null;}
function readJson(file){try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function resolveJson(directory,cik,nested){const name=`CIK${cik}.json`;for(const file of [path.join(directory,name),path.join(directory,nested,name),path.join(directory,path.basename(directory),name)])if(fs.existsSync(file))return file;return null;}
async function lineReader(file){return readline.createInterface({input:fs.createReadStream(file,{encoding:"utf8"}),crlfDelay:Infinity});}
function endOf(fact){return fact?.end??fact?.ddate??null;}
function samePeriod(a,b){const ae=day(endOf(a)),be=day(endOf(b));if(ae==null||be==null||Math.abs(ae-be)>45)return false;const ad=duration(a),bd=duration(b);return !Number.isInteger(ad)||!Number.isInteger(bd)||Math.abs(ad-bd)<=45;}
function pairCompatible(a,b){if(!a||!b||a.tag!==b.tag||a.unit!==b.unit)return false;const ae=day(endOf(a)),be=day(endOf(b));if(ae==null||be==null)return false;const gap=ae-be;if(gap<320||gap>410)return false;const ad=duration(a),bd=duration(b);return !Number.isInteger(ad)||!Number.isInteger(bd)||Math.abs(ad-bd)<=45;}

export async function loadFsdsFactsWithGapAudit({subFile,numFile,universeCiks,asOf}={}){
  if(!subFile||!numFile||!fs.existsSync(subFile)||!fs.existsSync(numFile))return {status:"MISSING",factsByCik:new Map()};
  const universe=universeCiks instanceof Set?universeCiks:new Set(),cutoff=normalizeSecDate(asOf);
  if(!cutoff)return {status:"FAIL",reason:"AS_OF_INVALID",factsByCik:new Map()};
  const submissions=new Map();let sh=null,si=null;
  for await(const line of await lineReader(subFile)){
    if(!sh){sh=split(line);si=indexes(sh);continue;}
    const row=split(line),adsh=row[si.adsh],cik=padCik(row[si.cik]),form=row[si.form],filed=normalizeSecDate(row[si.filed]);
    if(!adsh||!cik||!["10-Q","10-K"].includes(form)||!universe.has(cik)||!filed||filed>cutoff)continue;
    submissions.set(adsh,{cik,form,filed,period:normalizeSecDate(row[si.period])??row[si.period],fy:row[si.fy],fp:row[si.fp]});
  }
  const factsByCik=new Map(),epsAudit={joinedRows:0,finiteRows:0,qtrs:{},uom:{},coreg:{},classification:{}};
  const acceptedByMetric={eps:0,revenue:0,operatingIncome:0,netIncome:0,operatingCashFlow:0,capex:0};
  let nh=null,ni=null,accepted=0;
  for await(const line of await lineReader(numFile)){
    if(!nh){nh=split(line);ni=indexes(nh);continue;}
    const row=split(line),sub=submissions.get(row[ni.adsh]);if(!sub)continue;
    const tag=row[ni.tag],qtrs=Number(row[ni.qtrs]),uom=row[ni.uom],coreg=row[ni.coreg],value=Number(row[ni.value]);
    if(tag==="EarningsPerShareDiluted"){
      epsAudit.joinedRows++;bump(epsAudit.qtrs,String(row[ni.qtrs]));bump(epsAudit.uom,uom);bump(epsAudit.coreg,clean(coreg)?"NONEMPTY":"EMPTY");
      if(finite(value))epsAudit.finiteRows++;
      const probe=classifySecFact({tag,qtrs,uom,coreg});bump(epsAudit.classification,probe.status==="ACCEPT"?"ACCEPT":probe.reason);
    }
    if(!finite(value))continue;
    const classified=classifySecFact({tag,qtrs,uom,coreg});if(classified.status!=="ACCEPT")continue;
    const ddate=normalizeSecDate(row[ni.ddate]);if(!ddate)continue;
    if(!factsByCik.has(sub.cik))factsByCik.set(sub.cik,[]);
    factsByCik.get(sub.cik).push({metric:classified.metric,tag,unit:uom,qtrs,val:value,ddate,duration:qtrs===1?90:null,adsh:row[ni.adsh],...sub});
    acceptedByMetric[classified.metric]++;accepted++;
  }
  return {status:"PASS",factsByCik,submissionCount:submissions.size,acceptedFacts:accepted,acceptedByMetric,epsAudit};
}

function primaryOrFsdsCurrent(document,rows,{metric,frame,frameEnd,asOf}={}){
  for(const tag of E1_R5_SEC_CONTRACT.tags?.[metric]??[]){
    let primary;
    if(metric==="eps")primary=selectCompanyFact(document,{metric,tag,frame,frameEnd,asOf});
    else primary=selectQuarterWithApprovedQ4(document,{metric,tag,frame,frameEnd,asOf});
    if(primary?.fact)return {fact:primary.fact,method:metric!=="eps"&&primary.method==="ANNUAL_MINUS_9M"?"COMPANYFACTS_Q4_DERIVED":"COMPANYFACTS_DIRECT",tag};
    const secondary=selectFsdsDirectQuarter(rows,{metric,tag,frameEnd,asOf});
    if(secondary.fact)return {...secondary,tag};
  }
  return {fact:null,method:null,tag:null};
}
function primaryOrFsdsPair(document,rows,{metric,currentFrame,priorFrame,currentEnd,priorEnd,asOf}={}){
  for(const tag of E1_R5_SEC_CONTRACT.tags?.[metric]??[]){
    const c=primaryOrFsdsCurrent(document,rows,{metric,frame:currentFrame,frameEnd:currentEnd,asOf});
    const p=primaryOrFsdsCurrent(document,rows,{metric,frame:priorFrame,frameEnd:priorEnd,asOf});
    if(c.fact&&p.fact&&c.fact.tag===tag&&p.fact.tag===tag&&pairCompatible(c.fact,p.fact))return {current:c.fact,prior:p.fact,currentMethod:c.method,priorMethod:p.method,tag};
  }
  return {current:null,prior:null,currentMethod:null,priorMethod:null,tag:null};
}

export function buildRemainingGapDiagnostic({members=[],factsByCik=new Map(),submissionsByCik=new Map(),fsdsFactsByCik=new Map(),frame,asOf}={}){
  let valid=0,nonFinancial=0;const count={S1:0,S2:0,S3:0,S4:0,S5:0,S7:0,S8:0};
  const methods={s3Revenue:{},s3OperatingIncome:{},cfo:{},capex:{}};
  const s5Failures={REVENUE_MISSING:0,CFO_MISSING:0,CAPEX_MISSING:0,CFO_AND_CAPEX_MISSING:0};
  const capexGap={NO_APPROVED_CAPEX_ANY:0,APPROVED_CAPEX_NO_TARGET_END:0,TARGET_END_NOT_DERIVABLE:0};
  for(const member of members){
    const cik=String(member?.cik??"").replace(/\D/g,"").padStart(10,"0"),doc=factsByCik.get(cik),sub=submissionsByCik.get(cik),rows=fsdsFactsByCik.get(cik)??[];
    const validation=validateSecCompanyFactsDocument(doc);if(validation.status!=="PASS"||validation.cik!==cik)continue;valid++;
    const nf=sicDivision(sub?.sic)?.financial===false;if(nf)nonFinancial++;
    const eps=primaryOrFsdsPair(doc,rows,{metric:"eps",currentFrame:frame.frame,priorFrame:frame.priorFrame,currentEnd:frame.end,priorEnd:frame.priorEnd,asOf});if(eps.current&&eps.prior){count.S1++;count.S7++;}
    const revPair=primaryOrFsdsPair(doc,rows,{metric:"revenue",currentFrame:frame.frame,priorFrame:frame.priorFrame,currentEnd:frame.end,priorEnd:frame.priorEnd,asOf});if(revPair.current&&revPair.prior&&revPair.prior.val>0)count.S2++;
    const net=primaryOrFsdsCurrent(doc,rows,{metric:"netIncome",frame:frame.frame,frameEnd:frame.end,asOf});if(net.fact)count.S8++;
    if(!nf)continue;
    const revCurrent=primaryOrFsdsCurrent(doc,rows,{metric:"revenue",frame:frame.frame,frameEnd:frame.end,asOf});
    const opCurrent=primaryOrFsdsCurrent(doc,rows,{metric:"operatingIncome",frame:frame.frame,frameEnd:frame.end,asOf});
    bump(methods.s3Revenue,revCurrent.method??"MISSING");bump(methods.s3OperatingIncome,opCurrent.method??"MISSING");
    if(revCurrent.fact&&opCurrent.fact&&revCurrent.fact.val>0&&samePeriod(revCurrent.fact,opCurrent.fact))count.S3++;
    const opPair=primaryOrFsdsPair(doc,rows,{metric:"operatingIncome",currentFrame:frame.frame,priorFrame:frame.priorFrame,currentEnd:frame.end,priorEnd:frame.priorEnd,asOf});
    if(revPair.current&&revPair.prior&&opPair.current&&opPair.prior&&revPair.current.val>0&&revPair.prior.val>0&&samePeriod(revPair.current,opPair.current)&&samePeriod(revPair.prior,opPair.prior))count.S4++;
    if(!revCurrent.fact||!(revCurrent.fact.val>0)){s5Failures.REVENUE_MISSING++;continue;}
    let cfo=selectCurrentQuarterFlow(doc,{metric:"operatingCashFlow",asOf,target:revCurrent.fact});if(!finite(cfo.value))cfo=selectFsdsFlowQuarter(rows,{metric:"operatingCashFlow",targetEnd:endOf(revCurrent.fact),asOf});
    let capex=selectCurrentQuarterFlow(doc,{metric:"capex",asOf,target:revCurrent.fact});if(!finite(capex.value))capex=selectFsdsFlowQuarter(rows,{metric:"capex",targetEnd:endOf(revCurrent.fact),asOf});
    bump(methods.cfo,cfo.method??cfo.reason??"MISSING");bump(methods.capex,capex.method??capex.reason??"MISSING");
    const cfoOk=finite(cfo.value),capexOk=finite(capex.value);if(cfoOk&&capexOk){count.S5++;continue;}
    if(!cfoOk&&!capexOk)s5Failures.CFO_AND_CAPEX_MISSING++;else if(!cfoOk)s5Failures.CFO_MISSING++;else s5Failures.CAPEX_MISSING++;
    if(!capexOk){const approved=rows.filter(r=>r.metric==="capex");if(!approved.length)capexGap.NO_APPROVED_CAPEX_ANY++;else if(!approved.some(r=>Math.abs((day(r.ddate)??1e9)-(day(endOf(revCurrent.fact))??0))<=45))capexGap.APPROVED_CAPEX_NO_TARGET_END++;else capexGap.TARGET_END_NOT_DERIVABLE++;}
  }
  const denom={S1:members.length,S2:members.length,S3:nonFinancial,S4:nonFinancial,S5:nonFinancial,S7:members.length,S8:members.length};const min={S1:.8,S2:.8,S3:.8,S4:.8,S5:.7,S7:.8,S8:.8};
  const gates=Object.fromEntries(Object.keys(count).map(k=>[k,{ready:count[k],denominator:denom[k],coverage:pct(count[k],denom[k]),min:min[k],pass:pct(count[k],denom[k])>=min[k],need:Math.max(0,Math.ceil(min[k]*denom[k]-1e-12)-count[k])}]));
  return {version:VERSION,status:"PASS",counts:{issuers:members.length,valid,nonFinancial},gates,methods,s5Failures,capexGap,policies:{researchOnly:true,s3CurrentLevelIndependentOfPrior:true,q4EpsAnnualMinusNineMonths:"FORBIDDEN",formulaChanged:false,weightChanged:false,scoringGateChanged:false,inputContractChanged:false,productionActivation:false},networkCalls:0,dbWrites:0};
}

export async function runRemainingGapDiagnostic({incoming,coreFile,asOf=new Date().toISOString().slice(0,10),lagDays=MATURE_LAG_DAYS}={}){
  const inputDir=incoming??path.join(defaultBase,"manual-input","e1-r5","incoming"),core=coreFile??path.join(defaultBase,"storage","core.sqlite");const universe=readLatestEarningsUniverse(core),frame=latestMatureFrame(asOf,{lagDays});
  if(universe.status!=="PASS"||!frame)return {version:VERSION,status:"PARTIAL",reason:universe.status!=="PASS"?"UNIVERSE_REQUIRED":"FRAME_REQUIRED",networkCalls:0,dbWrites:0};
  const fsds=await loadFsdsFactsWithGapAudit({subFile:path.join(inputDir,"sub.txt"),numFile:path.join(inputDir,"num.txt"),universeCiks:universe.ciks,asOf});if(fsds.status!=="PASS")return {version:VERSION,status:"PARTIAL",reason:fsds.reason??"FSDS_REQUIRED",networkCalls:0,dbWrites:0};
  const factDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secCompanyFacts.extractedDirectory),subDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secSubmissions.extractedDirectory),factsByCik=new Map(),submissionsByCik=new Map();
  for(const m of universe.members){const cik=String(m.cik).replace(/\D/g,"").padStart(10,"0");factsByCik.set(cik,readJson(resolveJson(factDir,cik,"companyfacts")));submissionsByCik.set(cik,readJson(resolveJson(subDir,cik,"submissions")));}
  const report=buildRemainingGapDiagnostic({members:universe.members,factsByCik,submissionsByCik,fsdsFactsByCik:fsds.factsByCik,frame,asOf});return {...report,frame,fsds:{submissionCount:fsds.submissionCount,acceptedFacts:fsds.acceptedFacts,acceptedByMetric:fsds.acceptedByMetric,epsAudit:fsds.epsAudit}};
}

function mapText(o){return Object.entries(o??{}).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([k,v])=>`${k}=${v}`).join(" ")||"NONE";}
export function formatRemainingGapDiagnosticText(r){const lines=[`E1-R5 FSDS REMAINING GAP DIAGNOSTIC: ${r.status}`,`VERSION: ${r.version}`,`FRAME: ${r.frame?.frame??"-"} prior=${r.frame?.priorFrame??"-"}`,`FSDS: submissions=${r.fsds?.submissionCount??0} acceptedFacts=${r.fsds?.acceptedFacts??0}`,`EPS_FSDS_TAG_ROWS: joined=${r.fsds?.epsAudit?.joinedRows??0} finite=${r.fsds?.epsAudit?.finiteRows??0}`,`EPS_FSDS_QTRS: ${mapText(r.fsds?.epsAudit?.qtrs)}`,`EPS_FSDS_UOM: ${mapText(r.fsds?.epsAudit?.uom)}`,`EPS_FSDS_COREG: ${mapText(r.fsds?.epsAudit?.coreg)}`,`EPS_FSDS_CLASSIFICATION: ${mapText(r.fsds?.epsAudit?.classification)}`];for(const k of ["S1","S2","S3","S4","S5","S7","S8"]){const g=r.gates?.[k];lines.push(`${k}: ${pctText(g?.coverage)} ${g?.ready??0}/${g?.denominator??0} min=${pctText(g?.min)} pass=${g?.pass?"YES":"NO"} need=${g?.need??"-"}`);}lines.push(`S5_FAILURES: ${mapText(r.s5Failures)}`,`CAPEX_GAP: ${mapText(r.capexGap)}`,`S3_REVENUE_METHOD: ${mapText(r.methods?.s3Revenue)}`,`S3_OPERATING_INCOME_METHOD: ${mapText(r.methods?.s3OperatingIncome)}`,`CFO_METHOD: ${mapText(r.methods?.cfo)}`,`CAPEX_METHOD: ${mapText(r.methods?.capex)}`,`Q4_EPS_ANNUAL_MINUS_9M: ${r.policies?.q4EpsAnnualMinusNineMonths??"-"}`,`FORMULA_CHANGED: NO`,`WEIGHT_CHANGED: NO`,`SCORING_GATE_CHANGED: NO`,`INPUT_CONTRACT_CHANGED: NO`,`NETWORK_CALLS: 0`,`DB_WRITES: 0`);return lines.join("\r\n")+"\r\n";}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const cli=parseArgs();const report=await runRemainingGapDiagnostic({incoming:cli.incoming?path.resolve(cli.incoming):undefined,coreFile:cli.core?path.resolve(cli.core):undefined,asOf:cli["as-of"]??undefined});console.log(formatRemainingGapDiagnosticText(report));if(report.status!=="PASS")process.exitCode=1;}catch(error){console.log(`E1-R5 FSDS REMAINING GAP DIAGNOSTIC: FAILED\r\nCODE: ${error?.code??"E1_R5_FSDS_REMAINING_GAP_FAILED"}`);process.exitCode=1;}}
