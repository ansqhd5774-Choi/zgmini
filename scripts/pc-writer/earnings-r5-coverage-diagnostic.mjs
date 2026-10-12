import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {
  E1_R5_SEC_CONTRACT,
  secUnitAllowed,
  validateSecCompanyFactsDocument,
} from "../../lib/market-score/earnings-e1-r5-input-contract.mjs";
import {quarterFromCumulative} from "../../lib/market-score/earnings-e1-r5-contract.mjs";
import {readLatestEarningsUniverse} from "./earnings-r5-offline-preflight.mjs";
import {E1_R5_OFFICIAL_SOURCE_MANIFEST} from "../../lib/market-score/earnings-e1-r5-official-sources.mjs";
import {sicDivision} from "./earnings-r5-current-frame-audit.mjs";

const defaultBase=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const DEFAULT_MAX_AGE_DAYS=185;
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const clean=value=>String(value??"").trim();
const day=value=>{
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const ms=Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(ms)?Math.floor(ms/86400000):null;
};
const duration=fact=>{
  const start=day(fact?.start),end=day(fact?.end);
  return start!=null&&end!=null&&end>=start?end-start+1:null;
};
const pct=(valid,total)=>Number.isInteger(valid)&&Number.isInteger(total)&&total>0?valid/total:null;
const pctText=value=>finite(value)?`${(100*value).toFixed(1)}%`:"-";

function parseArgs(argv=process.argv.slice(2)){
  const out={};
  for(const item of argv){const match=item.match(/^--([^=]+)=(.*)$/);if(match)out[match[1]]=match[2];}
  return out;
}

function frameParts(frame){
  const match=clean(frame).match(/^CY(\d{4})Q([1-4])$/);
  return match?{year:Number(match[1]),quarter:Number(match[2])}:null;
}
function priorFrame(frame){
  const parsed=frameParts(frame);
  return parsed?`CY${parsed.year-1}Q${parsed.quarter}`:null;
}
function currentFrameAge(fact,asOf){
  const end=day(fact?.end),cutoff=day(asOf);
  return end!=null&&cutoff!=null?cutoff-end:null;
}
function near(a,b,tolerance=45){
  const da=day(a),db=day(b);
  return da!=null&&db!=null&&Math.abs(da-db)<=tolerance;
}
function pairComparable(current,prior){
  if(!current||!prior)return false;
  const curEnd=day(current.end),priorEnd=day(prior.end);
  if(curEnd==null||priorEnd==null)return false;
  const gap=curEnd-priorEnd;
  if(gap<320||gap>410)return false;
  const curDuration=current.duration??duration(current),priorDuration=prior.duration??duration(prior);
  return Number.isInteger(curDuration)&&Number.isInteger(priorDuration)&&Math.abs(curDuration-priorDuration)<=45;
}
function samePeriod(a,b){
  if(!a||!b)return false;
  const da=a.duration??duration(a),db=b.duration??duration(b);
  return near(a.end,b.end,45)&&Number.isInteger(da)&&Number.isInteger(db)&&Math.abs(da-db)<=45;
}

function factsForMetric(document,metric,asOf,{quarterOnly=false,maxDuration=400}={}){
  const out=[];
  const tags=E1_R5_SEC_CONTRACT.tags?.[metric]??[];
  for(const tag of tags){
    const concept=document?.facts?.[E1_R5_SEC_CONTRACT.taxonomy]?.[tag];
    if(!concept?.units||typeof concept.units!=="object")continue;
    for(const [unit,rows] of Object.entries(concept.units)){
      if(!secUnitAllowed(metric,unit)||!Array.isArray(rows))continue;
      for(const row of rows){
        if(!row||!E1_R5_SEC_CONTRACT.forms.includes(clean(row.form))||!finite(row.val))continue;
        if(typeof row.filed==="string"&&row.filed>asOf)continue;
        const d=duration(row);if(!Number.isInteger(d)||d<55||d>maxDuration)continue;
        if(quarterOnly&&(!frameParts(row.frame)||d>120))continue;
        const end=day(row.end);if(end==null||end>day(asOf))continue;
        out.push({...row,tag,unit,duration:d});
      }
    }
  }
  return out;
}

function chooseLatestSafe(rows){
  if(!rows.length)return {fact:null,reason:"NO_FACT"};
  const sorted=[...rows].sort((a,b)=>String(b.filed??"").localeCompare(String(a.filed??""))||String(b.accn??"").localeCompare(String(a.accn??"")));
  const latestFiled=String(sorted[0].filed??"");
  const top=sorted.filter(row=>String(row.filed??"")===latestFiled);
  const values=[...new Set(top.map(row=>row.val))];
  if(values.length!==1)return {fact:null,reason:"LATEST_FILED_VALUE_CONFLICT"};
  return {fact:top[0],reason:null};
}

function factForFrame(rows,tag,frame){
  return chooseLatestSafe(rows.filter(row=>row.tag===tag&&row.frame===frame));
}

export function selectLatestComparablePair(document,{metric,asOf,maxAgeDays=DEFAULT_MAX_AGE_DAYS}={}){
  const rows=factsForMetric(document,metric,asOf,{quarterOnly:true,maxDuration:120});
  const tags=E1_R5_SEC_CONTRACT.tags?.[metric]??[];
  const frames=[...new Set(rows.map(row=>row.frame).filter(frameParts))]
    .sort((a,b)=>{
      const pa=frameParts(a),pb=frameParts(b);
      return pb.year-pa.year||pb.quarter-pa.quarter;
    });
  for(const frame of frames){
    const prior=priorFrame(frame);if(!prior)continue;
    for(const tag of tags){
      const current=factForFrame(rows,tag,frame);
      const previous=factForFrame(rows,tag,prior);
      if(current.reason==="LATEST_FILED_VALUE_CONFLICT"||previous.reason==="LATEST_FILED_VALUE_CONFLICT")continue;
      if(!current.fact||!previous.fact||!pairComparable(current.fact,previous.fact))continue;
      const age=currentFrameAge(current.fact,asOf);
      if(!Number.isInteger(age)||age<0||age>maxAgeDays)continue;
      return {current:current.fact,prior:previous.fact,frame,priorFrame:prior,tag,ageDays:age};
    }
  }
  return {current:null,prior:null,frame:null,priorFrame:null,tag:null,ageDays:null};
}

export function selectLatestCurrentQuarter(document,{metric,asOf,maxAgeDays=DEFAULT_MAX_AGE_DAYS}={}){
  const rows=factsForMetric(document,metric,asOf,{quarterOnly:true,maxDuration:120});
  const candidates=[];
  for(const frame of [...new Set(rows.map(row=>row.frame).filter(frameParts))]){
    for(const tag of E1_R5_SEC_CONTRACT.tags?.[metric]??[]){
      const selected=factForFrame(rows,tag,frame);
      if(!selected.fact)continue;
      const age=currentFrameAge(selected.fact,asOf);
      if(!Number.isInteger(age)||age<0||age>maxAgeDays)continue;
      candidates.push({fact:selected.fact,frame,tag,ageDays:age});
    }
  }
  candidates.sort((a,b)=>day(b.fact.end)-day(a.fact.end)||String(b.fact.filed??"").localeCompare(String(a.fact.filed??"")));
  return candidates[0]??{fact:null,frame:null,tag:null,ageDays:null};
}

export function selectLatestMarginPair(document,{asOf,maxAgeDays=DEFAULT_MAX_AGE_DAYS}={}){
  const revenueRows=factsForMetric(document,"revenue",asOf,{quarterOnly:true,maxDuration:120});
  const opRows=factsForMetric(document,"operatingIncome",asOf,{quarterOnly:true,maxDuration:120});
  const frames=[...new Set([...revenueRows,...opRows].map(row=>row.frame).filter(frameParts))]
    .sort((a,b)=>{const pa=frameParts(a),pb=frameParts(b);return pb.year-pa.year||pb.quarter-pa.quarter;});
  for(const frame of frames){
    const prior=priorFrame(frame);if(!prior)continue;
    for(const revenueTag of E1_R5_SEC_CONTRACT.tags.revenue){
      const revenueCurrent=factForFrame(revenueRows,revenueTag,frame);
      const revenuePrior=factForFrame(revenueRows,revenueTag,prior);
      if(!revenueCurrent.fact||!revenuePrior.fact||!pairComparable(revenueCurrent.fact,revenuePrior.fact))continue;
      const age=currentFrameAge(revenueCurrent.fact,asOf);
      if(!Number.isInteger(age)||age<0||age>maxAgeDays)continue;
      for(const opTag of E1_R5_SEC_CONTRACT.tags.operatingIncome){
        const opCurrent=factForFrame(opRows,opTag,frame);
        const opPrior=factForFrame(opRows,opTag,prior);
        if(!opCurrent.fact||!opPrior.fact||!pairComparable(opCurrent.fact,opPrior.fact))continue;
        if(!samePeriod(revenueCurrent.fact,opCurrent.fact)||!samePeriod(revenuePrior.fact,opPrior.fact))continue;
        return {
          frame,priorFrame:prior,ageDays:age,
          revenueCurrent:revenueCurrent.fact,revenuePrior:revenuePrior.fact,
          opCurrent:opCurrent.fact,opPrior:opPrior.fact,
        };
      }
    }
  }
  return {frame:null,priorFrame:null,ageDays:null,revenueCurrent:null,revenuePrior:null,opCurrent:null,opPrior:null};
}

function targetFlowCandidates(document,metric,asOf,targetEnd){
  return factsForMetric(document,metric,asOf,{quarterOnly:false,maxDuration:400})
    .filter(row=>near(row.end,targetEnd,45));
}

export function selectQuarterFlow(document,{metric,asOf,targetFrame,targetEnd}={}){
  const candidates=targetFlowCandidates(document,metric,asOf,targetEnd);
  const direct=[];
  for(const row of candidates){
    if(row.duration<55||row.duration>120)continue;
    if(frameParts(row.frame)&&row.frame!==targetFrame)continue;
    direct.push(row);
  }
  const directSelected=chooseLatestSafe(direct);
  if(directSelected.fact)return {value:directSelected.fact.val,method:"DIRECT_QUARTER",fact:directSelected.fact,priorFact:null};

  const all=factsForMetric(document,metric,asOf,{quarterOnly:false,maxDuration:400});
  const cumulative=candidates.filter(row=>row.duration>120).sort((a,b)=>String(b.filed??"").localeCompare(String(a.filed??""))||b.duration-a.duration);
  for(const current of cumulative){
    const priors=all.filter(row=>
      row.tag===current.tag&&
      row.unit===current.unit&&
      row.start===current.start&&
      day(row.end)!=null&&day(current.end)!=null&&
      day(row.end)<day(current.end)&&
      day(current.end)-day(row.end)>=55&&
      day(current.end)-day(row.end)<=125&&
      row.duration<current.duration
    );
    const prior=chooseLatestSafe(priors);
    if(!prior.fact)continue;
    const value=quarterFromCumulative(current.val,prior.fact.val);
    if(!finite(value))continue;
    return {value,method:"CUMULATIVE_DELTA",fact:current,priorFact:prior.fact};
  }
  return {value:null,method:null,fact:null,priorFact:null};
}

function companyFile(directory,cik){
  const file=path.join(directory,`CIK${cik}.json`);
  return fs.existsSync(file)?file:null;
}
function readJson(file){try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}

function bump(map,key){
  if(!key)return;
  map[key]=(map[key]??0)+1;
}

export function buildCoverageDiagnosticFromDocuments({members=[],factsByCik=new Map(),submissionsByCik=new Map(),asOf,maxAgeDays=DEFAULT_MAX_AGE_DAYS}={}){
  let validDocuments=0,eps=0,revenue=0,margin=0,netCurrent=0,netPair=0,nonFinancial=0,fcf=0;
  let cfoDirect=0,cfoReconstructed=0,capexDirect=0,capexReconstructed=0;
  const epsFrames={},revenueFrames={},fcfFrames={};
  for(const member of members){
    const cik=String(member?.cik??"").padStart(10,"0");
    const document=factsByCik.get(cik);
    const validation=validateSecCompanyFactsDocument(document);
    if(validation.status!=="PASS"||validation.cik!==cik)continue;
    validDocuments++;
    const submission=submissionsByCik.get(cik);
    const division=sicDivision(submission?.sic);
    const isNonFinancial=division?.financial===false;
    if(isNonFinancial)nonFinancial++;

    const epsPair=selectLatestComparablePair(document,{metric:"eps",asOf,maxAgeDays});
    if(epsPair.current){eps++;bump(epsFrames,epsPair.frame);}
    const revenuePair=selectLatestComparablePair(document,{metric:"revenue",asOf,maxAgeDays});
    if(revenuePair.current){revenue++;bump(revenueFrames,revenuePair.frame);}
    const marginPair=selectLatestMarginPair(document,{asOf,maxAgeDays});
    if(isNonFinancial&&marginPair.revenueCurrent)margin++;
    const net=selectLatestCurrentQuarter(document,{metric:"netIncome",asOf,maxAgeDays});
    if(net.fact)netCurrent++;
    const netComparable=selectLatestComparablePair(document,{metric:"netIncome",asOf,maxAgeDays});
    if(netComparable.current)netPair++;

    if(isNonFinancial&&revenuePair.current){
      const cfo=selectQuarterFlow(document,{metric:"operatingCashFlow",asOf,targetFrame:revenuePair.frame,targetEnd:revenuePair.current.end});
      const capex=selectQuarterFlow(document,{metric:"capex",asOf,targetFrame:revenuePair.frame,targetEnd:revenuePair.current.end});
      if(cfo.method==="DIRECT_QUARTER")cfoDirect++;
      if(cfo.method==="CUMULATIVE_DELTA")cfoReconstructed++;
      if(capex.method==="DIRECT_QUARTER")capexDirect++;
      if(capex.method==="CUMULATIVE_DELTA")capexReconstructed++;
      if(finite(cfo.value)&&finite(capex.value)){
        fcf++;
        bump(fcfFrames,revenuePair.frame);
      }
    }
  }
  const issuerCount=members.length;
  return {
    status:"PASS",
    active:false,
    policy:{
      researchOnly:true,
      formulaChanged:false,
      latestComparableMaxAgeDays:maxAgeDays,
      q4EpsAnnualMinusNineMonths:"FORBIDDEN",
      additiveFlowReconstruction:"MATCHED_TAG_UNIT_START_PERIOD_ONLY",
    },
    counts:{issuerCount,validDocuments,nonFinancial},
    coverage:{
      latestComparableEps:{eligible:eps,total:issuerCount,coverage:pct(eps,issuerCount)},
      latestComparableRevenue:{eligible:revenue,total:issuerCount,coverage:pct(revenue,issuerCount)},
      latestComparableMargin:{eligible:margin,total:nonFinancial,coverage:pct(margin,nonFinancial)},
      latestCurrentNetIncome:{eligible:netCurrent,total:issuerCount,coverage:pct(netCurrent,issuerCount)},
      latestComparableNetIncome:{eligible:netPair,total:issuerCount,coverage:pct(netPair,issuerCount)},
      alignedFcfMarginInput:{eligible:fcf,total:nonFinancial,coverage:pct(fcf,nonFinancial)},
    },
    flowMethods:{cfoDirect,cfoReconstructed,capexDirect,capexReconstructed},
    frameDistribution:{eps:epsFrames,revenue:revenueFrames,fcf:fcfFrames},
  };
}

export async function runEarningsR5CoverageDiagnostic({incoming,coreFile,asOf=new Date().toISOString().slice(0,10),maxAgeDays=DEFAULT_MAX_AGE_DAYS}={}){
  const inputDir=incoming??path.join(defaultBase,"manual-input","e1-r5","incoming");
  const core=coreFile??path.join(defaultBase,"storage","core.sqlite");
  const universe=readLatestEarningsUniverse(core);
  if(universe.status!=="PASS")return {status:"PARTIAL",reason:"UNIVERSE_REQUIRED",active:false,networkCalls:0,dbReads:universe.status==="MISSING"?0:1,dbWrites:0};
  const factsDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secCompanyFacts.extractedDirectory);
  const submissionsDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secSubmissions.extractedDirectory);
  const factsByCik=new Map(),submissionsByCik=new Map();
  let factsFiles=0,submissionFiles=0;
  for(const member of universe.members){
    const cik=String(member.cik).padStart(10,"0");
    const factsFile=companyFile(factsDir,cik),submissionFile=companyFile(submissionsDir,cik);
    if(factsFile){factsFiles++;factsByCik.set(cik,readJson(factsFile));}
    if(submissionFile){submissionFiles++;submissionsByCik.set(cik,readJson(submissionFile));}
  }
  const diagnostic=buildCoverageDiagnosticFromDocuments({members:universe.members,factsByCik,submissionsByCik,asOf,maxAgeDays});
  return {
    version:1,
    methodologyVersion:"E1-R5-SHADOW-R1",
    at:new Date().toISOString(),
    asOf,
    active:false,
    networkCalls:0,
    dbReads:1,
    dbWrites:0,
    files:{companyFacts:factsFiles,submissions:submissionFiles},
    ...diagnostic,
  };
}

function frameText(map){
  const entries=Object.entries(map??{}).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
  return entries.length?entries.map(([frame,count])=>`${frame}:${count}`).join(" "):"NONE";
}
export function formatEarningsR5CoverageDiagnosticText(report){
  const c=report?.coverage??{},f=report?.flowMethods??{};
  return [
    `E1-R5 COVERAGE DIAGNOSTIC: ${report?.status??"UNKNOWN"}`,
    `AT: ${report?.at??"-"}`,
    `AS_OF: ${report?.asOf??"-"}`,
    `POLICY: RESEARCH_ONLY formulaChanged=${report?.policy?.formulaChanged===true?"true":"false"} maxAgeDays=${report?.policy?.latestComparableMaxAgeDays??"-"}`,
    `FILES: companyFacts=${report?.files?.companyFacts??0} submissions=${report?.files?.submissions??0}`,
    `LATEST_EPS_PAIR_COVERAGE: ${pctText(c.latestComparableEps?.coverage)} (${c.latestComparableEps?.eligible??0}/${c.latestComparableEps?.total??0})`,
    `LATEST_REVENUE_PAIR_COVERAGE: ${pctText(c.latestComparableRevenue?.coverage)} (${c.latestComparableRevenue?.eligible??0}/${c.latestComparableRevenue?.total??0})`,
    `LATEST_MARGIN_PAIR_COVERAGE: ${pctText(c.latestComparableMargin?.coverage)} (${c.latestComparableMargin?.eligible??0}/${c.latestComparableMargin?.total??0})`,
    `LATEST_NET_CURRENT_COVERAGE: ${pctText(c.latestCurrentNetIncome?.coverage)} (${c.latestCurrentNetIncome?.eligible??0}/${c.latestCurrentNetIncome?.total??0})`,
    `LATEST_NET_PAIR_COVERAGE: ${pctText(c.latestComparableNetIncome?.coverage)} (${c.latestComparableNetIncome?.eligible??0}/${c.latestComparableNetIncome?.total??0})`,
    `ALIGNED_FCF_INPUT_COVERAGE: ${pctText(c.alignedFcfMarginInput?.coverage)} (${c.alignedFcfMarginInput?.eligible??0}/${c.alignedFcfMarginInput?.total??0})`,
    `CFO_METHODS: direct=${f.cfoDirect??0} reconstructed=${f.cfoReconstructed??0}`,
    `CAPEX_METHODS: direct=${f.capexDirect??0} reconstructed=${f.capexReconstructed??0}`,
    `EPS_FRAME_DISTRIBUTION: ${frameText(report?.frameDistribution?.eps)}`,
    `REVENUE_FRAME_DISTRIBUTION: ${frameText(report?.frameDistribution?.revenue)}`,
    `FCF_FRAME_DISTRIBUTION: ${frameText(report?.frameDistribution?.fcf)}`,
    `Q4_EPS_ANNUAL_MINUS_9M: ${report?.policy?.q4EpsAnnualMinusNineMonths??"-"}`,
    `NETWORK_CALLS: ${report?.networkCalls??0}`,
    `DB_WRITES: ${report?.dbWrites??0}`,
  ].join("\r\n")+"\r\n";
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const cli=parseArgs();
    const report=await runEarningsR5CoverageDiagnostic({
      incoming:cli.incoming?path.resolve(cli.incoming):undefined,
      coreFile:cli.core?path.resolve(cli.core):undefined,
      asOf:cli["as-of"]??undefined,
      maxAgeDays:cli["max-age-days"]?Number(cli["max-age-days"]):undefined,
    });
    const reportsDir=cli["reports-dir"]?path.resolve(cli["reports-dir"]):path.join(defaultBase,"manual-input","e1-r5","reports");
    fs.mkdirSync(reportsDir,{recursive:true});
    const jsonFile=path.join(reportsDir,"e1-r5-coverage-diagnostic-last.json");
    const textFile=path.join(reportsDir,"e1-r5-coverage-diagnostic-last.txt");
    fs.writeFileSync(jsonFile,JSON.stringify(report,null,2));
    fs.writeFileSync(textFile,formatEarningsR5CoverageDiagnosticText(report));
    console.log(JSON.stringify({status:report.status,textReport:textFile,jsonReport:jsonFile,networkCalls:0,dbWrites:0}));
  }catch(error){
    console.log(JSON.stringify({status:"FAILED",code:error?.code??"E1_R5_COVERAGE_DIAGNOSTIC_FAILED"}));
    process.exitCode=1;
  }
}

export {DEFAULT_MAX_AGE_DAYS};
