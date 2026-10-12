import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {E1_R5_SEC_CONTRACT,secUnitAllowed,validateSecCompanyFactsDocument} from "../../lib/market-score/earnings-e1-r5-input-contract.mjs";
import {quarterFromCumulative} from "../../lib/market-score/earnings-e1-r5-contract.mjs";
import {buildEarningsR5RawComponentsWithS13R33} from "../../lib/market-score/earnings-e1-r5-s13-r33-shadow.mjs";
import {latestMatureFrame,MATURE_LAG_DAYS} from "../../lib/market-score/sec-earnings-e1-r2-provider.mjs";
import {readLatestEarningsUniverse,inspectBlsPrFile} from "./earnings-r5-offline-preflight.mjs";
import {E1_R5_OFFICIAL_SOURCE_MANIFEST} from "../../lib/market-score/earnings-e1-r5-official-sources.mjs";
import {loadEarningsR5CurrentFrameOfficialInputs} from "./earnings-r5-current-frame-official-inputs.mjs";

const defaultBase=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const clean=value=>String(value??"").trim();
const dateDay=value=>{
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const ms=Date.parse(`${value}T00:00:00Z`);return Number.isFinite(ms)?Math.floor(ms/86400000):null;
};
const pct=value=>finite(value)?`${(value*100).toFixed(1)}%`:"-";
const nearlyEqual=(a,b,tolerance=1e-9)=>finite(a)&&finite(b)&&Math.abs(a-b)<=tolerance;

function parseArgs(argv=process.argv.slice(2)){
  const out={};
  for(const item of argv){const match=item.match(/^--([^=]+)=(.*)$/);if(match)out[match[1]]=match[2];}
  return out;
}

export function sicDivision(sic){
  const value=Number(String(sic??"").replace(/\D/g,""));
  if(!Number.isInteger(value)||value<=0)return null;
  if(value>=100&&value<=999)return {id:"A",label:"AGRICULTURE_FORESTRY_FISHING",financial:false};
  if(value>=1000&&value<=1499)return {id:"B",label:"MINING",financial:false};
  if(value>=1500&&value<=1799)return {id:"C",label:"CONSTRUCTION",financial:false};
  if(value>=2000&&value<=3999)return {id:"D",label:"MANUFACTURING",financial:false};
  if(value>=4000&&value<=4999)return {id:"E",label:"TRANSPORT_COMMUNICATION_UTILITIES",financial:false};
  if(value>=5000&&value<=5199)return {id:"F",label:"WHOLESALE_TRADE",financial:false};
  if(value>=5200&&value<=5999)return {id:"G",label:"RETAIL_TRADE",financial:false};
  if(value>=6000&&value<=6799)return {id:"H",label:"FINANCE_INSURANCE_REAL_ESTATE",financial:true};
  if(value>=7000&&value<=8999)return {id:"I",label:"SERVICES",financial:false};
  if(value>=9100&&value<=9999)return {id:"J",label:"PUBLIC_ADMINISTRATION",financial:false};
  return null;
}

function durationDays(fact){
  const start=dateDay(fact?.start),end=dateDay(fact?.end);
  return start!=null&&end!=null&&end>=start?end-start+1:null;
}

function endNearFrame(fact,frameEnd){
  const end=dateDay(fact?.end),target=dateDay(frameEnd);
  return end!=null&&target!=null&&Math.abs(end-target)<=45;
}

function eligibleFact(fact,{metric,frameEnd,asOf,maxDuration=120}){
  if(!fact||!E1_R5_SEC_CONTRACT.forms.includes(clean(fact.form))||!finite(fact.val))return false;
  if(typeof fact.filed==="string"&&fact.filed>asOf)return false;
  if(!endNearFrame(fact,frameEnd))return false;
  const duration=durationDays(fact);
  if(duration==null||duration<55||duration>maxDuration)return false;
  return true;
}

function frameDistance(fact,frameEnd){
  const end=dateDay(fact?.end),target=dateDay(frameEnd);
  return end!=null&&target!=null?Math.abs(end-target):Number.POSITIVE_INFINITY;
}

function factCandidates(document,{metric,tag,frame,frameEnd,asOf}){
  const concept=document?.facts?.[E1_R5_SEC_CONTRACT.taxonomy]?.[tag];
  if(!concept?.units||typeof concept.units!=="object")return [];
  const out=[];
  for(const [unit,rows] of Object.entries(concept.units)){
    if(!secUnitAllowed(metric,unit)||!Array.isArray(rows))continue;
    for(const fact of rows){
      if(!eligibleFact(fact,{metric,frameEnd,asOf}))continue;
      out.push({...fact,tag,unit,duration:durationDays(fact),explicitFrame:fact.frame===frame,frameDistance:frameDistance(fact,frameEnd)});
    }
  }
  out.sort((a,b)=>
    Number(b.explicitFrame)-Number(a.explicitFrame)||
    a.frameDistance-b.frameDistance||
    String(b.filed??"").localeCompare(String(a.filed??""))||
    String(b.accn??"").localeCompare(String(a.accn??""))
  );
  return out;
}

function chooseLatest(candidates){
  if(!candidates.length)return {fact:null,reason:"NO_EXPLICIT_FRAME_FACT"};
  const bestExplicit=Boolean(candidates[0].explicitFrame);
  const bestDistance=candidates[0].frameDistance;
  const nearest=candidates.filter(row=>Boolean(row.explicitFrame)===bestExplicit&&row.frameDistance===bestDistance);
  const latestFiled=String(nearest[0].filed??"");
  const top=nearest.filter(row=>String(row.filed??"")===latestFiled);
  const values=[...new Set(top.map(row=>row.val))];
  if(values.length>1)return {fact:null,reason:"LATEST_FILED_VALUE_CONFLICT",candidateCount:candidates.length,latestFiled};
  return {fact:top[0],reason:null,candidateCount:candidates.length,latestFiled};
}

export function selectCompanyFact(document,{metric,frame,frameEnd,asOf,tag=null}={}){
  const tags=tag?[tag]:(E1_R5_SEC_CONTRACT.tags?.[metric]??[]);
  for(const candidateTag of tags){
    const chosen=chooseLatest(factCandidates(document,{metric,tag:candidateTag,frame,frameEnd,asOf}));
    if(chosen.fact)return {...chosen,tag:candidateTag};
    if(chosen.reason==="LATEST_FILED_VALUE_CONFLICT")return {...chosen,tag:candidateTag};
  }
  return {fact:null,reason:"NO_EXPLICIT_FRAME_FACT",tag:null,candidateCount:0};
}

function pairComparable(current,prior){
  if(!current||!prior||current.tag!==prior.tag||current.unit!==prior.unit)return false;
  const currentEnd=dateDay(current.end),priorEnd=dateDay(prior.end);
  if(currentEnd==null||priorEnd==null)return false;
  const gap=currentEnd-priorEnd;if(gap<320||gap>410)return false;
  if(!Number.isInteger(current.duration)||!Number.isInteger(prior.duration)||Math.abs(current.duration-prior.duration)>45)return false;
  return true;
}

function samePeriod(...facts){
  const rows=facts.filter(Boolean);if(rows.length!==facts.length||!rows.length)return false;
  const ends=rows.map(row=>dateDay(row.end));if(ends.some(value=>value==null))return false;
  const durations=rows.map(row=>row.duration);if(durations.some(value=>!Number.isInteger(value)))return false;
  return Math.max(...ends)-Math.min(...ends)<=45&&Math.max(...durations)-Math.min(...durations)<=45;
}

function selectComparablePair(document,{metric,currentFrame,priorFrame,currentEnd,priorEnd,asOf}){
  const tags=E1_R5_SEC_CONTRACT.tags?.[metric]??[];
  for(const tag of tags){
    const current=selectCompanyFact(document,{metric,frame:currentFrame,frameEnd:currentEnd,asOf,tag});
    const prior=selectCompanyFact(document,{metric,frame:priorFrame,frameEnd:priorEnd,asOf,tag});
    if(current.reason==="LATEST_FILED_VALUE_CONFLICT"||prior.reason==="LATEST_FILED_VALUE_CONFLICT")return {current:null,prior:null,tag,reason:"FACT_CONFLICT"};
    if(current.fact&&prior.fact&&pairComparable(current.fact,prior.fact))return {current:current.fact,prior:prior.fact,tag,reason:null};
  }
  return {current:null,prior:null,tag:null,reason:"NO_COMPARABLE_PAIR"};
}

function flowRows(document,{metric,asOf}){
  const out=[];
  const cutoff=dateDay(asOf);
  for(const tag of E1_R5_SEC_CONTRACT.tags?.[metric]??[]){
    const concept=document?.facts?.[E1_R5_SEC_CONTRACT.taxonomy]?.[tag];
    if(!concept?.units||typeof concept.units!=="object")continue;
    for(const [unit,rows] of Object.entries(concept.units)){
      if(!secUnitAllowed(metric,unit)||!Array.isArray(rows))continue;
      for(const fact of rows){
        if(!fact||!E1_R5_SEC_CONTRACT.forms.includes(clean(fact.form))||!finite(fact.val))continue;
        if(typeof fact.filed==="string"&&fact.filed>asOf)continue;
        const duration=durationDays(fact),end=dateDay(fact.end);
        if(!Number.isInteger(duration)||duration<55||duration>400||end==null||end>cutoff)continue;
        out.push({...fact,tag,unit,duration});
      }
    }
  }
  return out;
}

function periodKey(row){return `${row.tag}|${row.unit}|${row.start}|${row.end}`;}

function uniqueFlowFacts(document,{metric,asOf}){
  const grouped=new Map();
  for(const row of flowRows(document,{metric,asOf})){
    const key=periodKey(row);if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(row);
  }
  const facts=[];
  for(const rows of grouped.values()){
    rows.sort((a,b)=>String(b.filed??"").localeCompare(String(a.filed??""))||String(b.accn??"").localeCompare(String(a.accn??"")));
    const latestFiled=String(rows[0].filed??"");
    const top=rows.filter(row=>String(row.filed??"")===latestFiled);
    if(new Set(top.map(row=>row.val)).size===1)facts.push(top[0]);
  }
  return facts;
}

function sameTargetQuarter(fact,target){
  if(!fact||!target||fact.end!==target.end)return false;
  const a=fact.duration??durationDays(fact),b=target.duration??durationDays(target);
  return Number.isInteger(a)&&Number.isInteger(b)&&Math.abs(a-b)<=15;
}

export function selectCurrentQuarterFlow(document,{metric,asOf,target}={}){
  if(!target?.end)return {value:null,method:null,reason:"TARGET_PERIOD_MISSING"};
  const facts=uniqueFlowFacts(document,{metric,asOf});
  const direct=facts.filter(fact=>fact.duration<=120&&sameTargetQuarter(fact,target))
    .sort((a,b)=>String(b.filed??"").localeCompare(String(a.filed??"")));
  if(direct.length)return {value:direct[0].val,method:"DIRECT_QUARTER",fact:direct[0],priorFact:null,reason:null};
  const cumulative=facts.filter(fact=>fact.duration>120&&fact.end===target.end)
    .sort((a,b)=>String(b.filed??"").localeCompare(String(a.filed??""))||b.duration-a.duration);
  for(const current of cumulative){
    const priors=facts.filter(prior=>
      prior.tag===current.tag&&prior.unit===current.unit&&prior.start===current.start&&
      dateDay(prior.end)<dateDay(current.end)&&
      dateDay(current.end)-dateDay(prior.end)>=55&&dateDay(current.end)-dateDay(prior.end)<=125&&
      prior.duration<current.duration
    ).sort((a,b)=>Math.abs((dateDay(current.end)-dateDay(a.end))-90)-Math.abs((dateDay(current.end)-dateDay(b.end))-90)||dateDay(b.end)-dateDay(a.end));
    if(!priors.length)continue;
    const value=quarterFromCumulative(current.val,priors[0].val);
    if(finite(value))return {value,method:"CUMULATIVE_DELTA",fact:current,priorFact:priors[0],reason:null};
  }
  return {value:null,method:null,fact:null,priorFact:null,reason:facts.length?"NO_ALIGNED_QUARTER_FLOW":"NO_FLOW_FACT"};
}

function companyFile(directory,cik){
  const file=path.join(directory,`CIK${cik}.json`);return fs.existsSync(file)?file:null;
}

function readJson(file){try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}

export function classifyCurrentFrameS13({auditFileExists=false,auditParsed=false,binding}={}){
  if(!auditFileExists)return {status:"MISSING",reason:"R33_AUDIT_FILE_MISSING",source:"SEC_R33",sourceVersion:null};
  if(!auditParsed)return {status:"REJECTED",reason:"R33_AUDIT_JSON_INVALID",source:"SEC_R33",sourceVersion:null};
  if(binding?.status==="READY")return {status:"READY",reason:null,source:binding.source??"SEC_R33",sourceVersion:binding.sourceVersion??null};
  return {status:"REJECTED",reason:binding?.reason??"R33_AUDIT_REJECTED",source:binding?.source??"SEC_R33",sourceVersion:binding?.sourceVersion??null};
}

export function buildCurrentFrameRawComponents({issuerRows=[],beaCorporateProfits=null,producerIndustries=[],unitLaborCostYoY=null,guidanceR33Audit=null}={}){
  return buildEarningsR5RawComponentsWithS13R33({issuerRows,beaCorporateProfits,producerIndustries,unitLaborCostYoY,guidanceR33Audit});
}

export function buildIssuerRowFromDocuments({member,companyFacts,submission,frame,asOf}){
  const cik=String(member?.cik??"").padStart(10,"0");
  const validation=validateSecCompanyFactsDocument(companyFacts);
  if(validation.status!=="PASS"||validation.cik!==cik)return {cik,ticker:member?.ticker??null,name:member?.name??null,current:{},priorYear:{},isFinancial:null,sectorId:null,audit:{status:"INVALID_COMPANYFACTS"}};

  const sic=Number(String(submission?.sic??"").replace(/\D/g,""));
  const division=sicDivision(sic);
  const eps=selectComparablePair(companyFacts,{metric:"eps",currentFrame:frame.frame,priorFrame:frame.priorFrame,currentEnd:frame.end,priorEnd:frame.priorEnd,asOf});
  const revenue=selectComparablePair(companyFacts,{metric:"revenue",currentFrame:frame.frame,priorFrame:frame.priorFrame,currentEnd:frame.end,priorEnd:frame.priorEnd,asOf});
  const op=selectComparablePair(companyFacts,{metric:"operatingIncome",currentFrame:frame.frame,priorFrame:frame.priorFrame,currentEnd:frame.end,priorEnd:frame.priorEnd,asOf});
  const net=selectComparablePair(companyFacts,{metric:"netIncome",currentFrame:frame.frame,priorFrame:frame.priorFrame,currentEnd:frame.end,priorEnd:frame.priorEnd,asOf});

  const currentRevenue=revenue.current;
  const priorRevenue=revenue.prior;
  const currentOp=op.current;
  const priorOp=op.prior;
  const cfo=selectCurrentQuarterFlow(companyFacts,{metric:"operatingCashFlow",asOf,target:currentRevenue});
  const capex=selectCurrentQuarterFlow(companyFacts,{metric:"capex",asOf,target:currentRevenue});
  const current={
    eps:eps.current?.val??null,
    revenue:currentRevenue?.val??null,
    operatingIncome:currentOp&&currentRevenue&&samePeriod(currentOp,currentRevenue)?currentOp.val:null,
    netIncome:net.current?.val??null,
    operatingCashFlow:finite(cfo.value)?cfo.value:null,
    capex:finite(capex.value)?capex.value:null,
  };
  const priorYear={
    eps:eps.prior?.val??null,
    revenue:priorRevenue?.val??null,
    operatingIncome:priorOp&&priorRevenue&&samePeriod(priorOp,priorRevenue)?priorOp.val:null,
    netIncome:net.prior?.val??null,
  };
  return {
    cik,ticker:member?.ticker??null,name:member?.name??null,
    isFinancial:division?division.financial:null,
    sectorId:division?.id??null,
    sic:Number.isInteger(sic)&&sic>0?sic:null,
    sicDivision:division?.label??null,
    current,priorYear,
    audit:{
      status:"PASS",
      epsTag:eps.tag??null,
      revenueTag:revenue.tag??null,
      sicKnown:!!division,
      directQuarterOnly:true,
      cfoMethod:cfo.method,
      capexMethod:capex.method,
      additiveFlowReconstruction:"MATCHED_TAG_UNIT_START_PERIOD_ONLY",
      q4EpsAnnualMinusNineMonths:"FORBIDDEN",
    },
  };
}

function rawCoverageGate(raw){
  const c=raw?.components??{};
  const checks={
    S1_EPS:{coverage:c.epsGrowthStrength?.coverage??null,min:0.80},
    S2_REVENUE:{coverage:c.revenueGrowth?.coverage??null,min:0.80},
    S3_MARGIN_LEVEL:{coverage:c.operatingMarginLevel?.coverage??null,min:0.80},
    S4_MARGIN_CHANGE:{coverage:c.operatingMarginChange?.coverage??null,min:0.80},
    S5_FCF_MARGIN:{coverage:c.freeCashFlowMargin?.coverage??null,min:0.70},
    S7_EPS_BREADTH:{coverage:c.epsImprovementBreadth?.coverage??null,min:0.80},
    S8_PROFITABLE_BREADTH:{coverage:c.profitableCompanyBreadth?.coverage??null,min:0.80},
  };
  for(const value of Object.values(checks))value.pass=finite(value.coverage)&&value.coverage>=value.min;
  return checks;
}

function formatRaw(value){return finite(value)?String(Math.round(value*1e6)/1e6):"null";}

export async function runEarningsR5CurrentFrameAudit({incoming,coreFile,r33AuditFile,mappingFile,asOf=new Date().toISOString().slice(0,10),lagDays=MATURE_LAG_DAYS}={}){
  const inputDir=incoming??path.join(defaultBase,"manual-input","e1-r5","incoming");
  const core=coreFile??path.join(defaultBase,"storage","core.sqlite");
  const r33File=r33AuditFile??path.join(defaultBase,"manual-input","e1-r5","reports","e1-r5-r33-guidance-candidate-audit-last.json");
  const r33AuditFileExists=fs.existsSync(r33File);
  const r33Audit=r33AuditFileExists?readJson(r33File):null;
  const r33AuditParsed=!!r33Audit&&typeof r33Audit==="object";
  const universe=readLatestEarningsUniverse(core);
  const frame=latestMatureFrame(asOf,{lagDays});
  if(universe.status!=="PASS"||!frame)return {status:"PARTIAL",reason:universe.status!=="PASS"?"UNIVERSE_REQUIRED":"MATURE_FRAME_REQUIRED",active:false,dbWrites:0,networkCalls:0};
  const factsDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secCompanyFacts.extractedDirectory);
  const submissionsDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secSubmissions.extractedDirectory);
  const rows=[];let factFiles=0,submissionFiles=0,invalidFacts=0;
  for(const member of universe.members){
    const factFile=companyFile(factsDir,member.cik),submissionFile=companyFile(submissionsDir,member.cik);
    if(factFile)factFiles++;if(submissionFile)submissionFiles++;
    const facts=factFile?readJson(factFile):null,submission=submissionFile?readJson(submissionFile):null;
    const row=buildIssuerRowFromDocuments({member,companyFacts:facts,submission,frame,asOf});
    if(row.audit?.status!=="PASS")invalidFacts++;
    rows.push(row);
  }

  const laborFile=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.blsUnitLaborCost.localName);
  const labor=await inspectBlsPrFile(laborFile,{seriesId:E1_R5_OFFICIAL_SOURCE_MANIFEST.blsUnitLaborCost.seriesId});
  const latestLabor=labor.latest&&labor.latest.year===frame.year&&labor.latest.quarter===frame.quarter?labor.latest.value:null;
  const official=loadEarningsR5CurrentFrameOfficialInputs({inputDir,issuerRows:rows,frame,asOf,mappingFile});
  const raw=buildCurrentFrameRawComponents({
    issuerRows:rows,
    beaCorporateProfits:official.beaCorporateProfits,
    producerIndustries:official.producerIndustries,
    unitLaborCostYoY:latestLabor,
    guidanceR33Audit:r33Audit,
  });
  const rawS10=raw.components?.producerCostPressure;
  const s10Recomputed=official.s10?.status==="READY"&&nearlyEqual(rawS10?.raw,official.s10.raw)&&nearlyEqual(rawS10?.coverage,official.s10.revenueCoverage,1e-9);
  if(official.s10?.status==="READY"&&!s10Recomputed){
    raw.components.producerCostPressure={...(rawS10??{}),raw:null,coverage:null,bindingReason:"S10_CURRENT_FRAME_RECOMPUTE_MISMATCH"};
    raw.missing=[...new Set([...(raw.missing??[]),"S10"])];
    raw.status="PARTIAL";
  }
  const s13=classifyCurrentFrameS13({auditFileExists:r33AuditFileExists,auditParsed:r33AuditParsed,binding:raw.s13Binding});
  const gates=rawCoverageGate(raw);
  const divisions=[...new Set(rows.map(row=>row.sectorId).filter(Boolean))].sort();
  const sectorEligible=raw.components?.improvingSectorBreadth?.eligibleCount??0;

  return {
    version:3,
    methodologyVersion:"E1-R5-SHADOW-R1",
    at:new Date().toISOString(),
    asOf,
    active:false,
    status:Object.values(gates).every(value=>value.pass)?"PASS":"PARTIAL",
    networkCalls:0,
    dbReads:1,
    dbWrites:0,
    frame:{...frame},
    universe:{periodEnd:universe.periodEnd,memberCount:universe.memberCount},
    sourceCoverage:{companyFactsFiles:factFiles,submissionFiles,invalidCompanyFacts:invalidFacts,sicKnown:rows.filter(row=>row.sic!=null).length,nonFinancial:rows.filter(row=>row.isFinancial===false).length,financial:rows.filter(row=>row.isFinancial===true).length,unknownFinancial:rows.filter(row=>row.isFinancial==null).length,sicDivisions:divisions,guidanceR33AuditFile:r33AuditFileExists},
    s6:official.s6,
    s10:{...official.s10,recomputed:s10Recomputed},
    s13,
    gates,
    rawStatus:raw.status,
    rawMissing:raw.missing,
    rawComponents:raw.components,
    quality:{...raw.quality,sectorEligibleCount:sectorEligible,sicDivisionMapping:"RESEARCH_ONLY_SEC_SIC_DIVISIONS"},
    policies:{directQuarterOnly:true,frameSafeGeometryFallback:true,additiveFlowReconstruction:"MATCHED_TAG_UNIT_START_PERIOD_ONLY",q4EpsAnnualMinusNineMonths:"FORBIDDEN",noRenormalization:true,productionActivation:false,formulaChanged:false,weightChanged:false,scoringGateChanged:false},
  };
}

export function formatEarningsR5CurrentFrameAuditText(report){
  const c=report?.rawComponents??{},g=report?.gates??{};
  const lines=[
    `E1-R5 CURRENT FRAME AUDIT: ${report?.status??"UNKNOWN"}`,
    `AT: ${report?.at??"-"}`,
    `AS_OF: ${report?.asOf??"-"}`,
    `FRAME: ${report?.frame?.frame??"-"} prior=${report?.frame?.priorFrame??"-"} end=${report?.frame?.end??"-"}`,
    `UNIVERSE: ${report?.universe?.memberCount??0} period=${report?.universe?.periodEnd??"-"}`,
    `FILES: companyFacts=${report?.sourceCoverage?.companyFactsFiles??0} submissions=${report?.sourceCoverage?.submissionFiles??0} invalidFacts=${report?.sourceCoverage?.invalidCompanyFacts??0}`,
    `SIC: known=${report?.sourceCoverage?.sicKnown??0} nonFinancial=${report?.sourceCoverage?.nonFinancial??0} financial=${report?.sourceCoverage?.financial??0} unknown=${report?.sourceCoverage?.unknownFinancial??0} divisions=${(report?.sourceCoverage?.sicDivisions??[]).join(",")||"-"}`,
  ];
  for(const [key,value] of Object.entries(g))lines.push(`${key}_COVERAGE: ${pct(value.coverage)} min=${pct(value.min)} ${value.pass?"PASS":"FAIL"}`);
  lines.push(
    `S1_EPS_RAW: ${formatRaw(c.epsGrowthStrength?.raw)}`,
    `S2_REVENUE_RAW: ${formatRaw(c.revenueGrowth?.raw)}`,
    `S3_MARGIN_LEVEL_RAW: ${formatRaw(c.operatingMarginLevel?.raw)}`,
    `S4_MARGIN_CHANGE_RAW: ${formatRaw(c.operatingMarginChange?.raw)}`,
    `S5_FCF_MARGIN_RAW: ${formatRaw(c.freeCashFlowMargin?.raw)}`,
    `S6_BEA_CORPORATE_PROFIT_RAW: ${formatRaw(c.beaCorporateProfitGrowth?.raw)}`,
    `S6_STATUS: ${report?.s6?.status??"MISSING"} source=${report?.s6?.source??"-"}`,
    `S7_EPS_IMPROVEMENT_BREADTH_RAW: ${formatRaw(c.epsImprovementBreadth?.raw)}`,
    `S8_PROFITABLE_BREADTH_RAW: ${formatRaw(c.profitableCompanyBreadth?.raw)}`,
    `S9_IMPROVING_SIC_DIVISION_BREADTH_RAW: ${formatRaw(c.improvingSectorBreadth?.raw)} eligible=${c.improvingSectorBreadth?.eligibleCount??0}`,
    `S10_PRODUCER_COST_PRESSURE_RAW: ${formatRaw(c.producerCostPressure?.raw)} coverage=${pct(c.producerCostPressure?.coverage)}`,
    `S10_STATUS: ${report?.s10?.status??"MISSING"} recomputed=${report?.s10?.recomputed===true?"YES":"NO"} mapping=${report?.s10?.mappingStatus??"-"}`,
    `S11_UNIT_LABOR_COST_RAW: ${formatRaw(c.unitLaborCostPressure?.raw)}`,
    `S13_GUIDANCE_BREADTH_RAW: ${formatRaw(c.guidanceBreadth?.raw)}`,
    `S13_STATUS: ${report?.s13?.status??"MISSING"}`,
    `S13_REASON: ${report?.s13?.reason??"NONE"}`,
    `S13_SOURCE: ${report?.s13?.source??"SEC_R33"}`,
    `S13_SOURCE_VERSION: ${report?.s13?.sourceVersion??"-"}`,
    `RAW_MISSING: ${(report?.rawMissing??[]).join(",")||"NONE"}`,
    `Q4_EPS_ANNUAL_MINUS_9M: ${report?.policies?.q4EpsAnnualMinusNineMonths??"-"}`,
    `FORMULA_CHANGED: ${report?.policies?.formulaChanged===true?"YES":"NO"}`,
    `WEIGHT_CHANGED: ${report?.policies?.weightChanged===true?"YES":"NO"}`,
    `SCORING_GATE_CHANGED: ${report?.policies?.scoringGateChanged===true?"YES":"NO"}`,
    `NETWORK_CALLS: ${report?.networkCalls??0}`,
    `DB_WRITES: ${report?.dbWrites??0}`,
  );
  return lines.join("\r\n")+"\r\n";
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const cli=parseArgs();
    const report=await runEarningsR5CurrentFrameAudit({
      incoming:cli.incoming?path.resolve(cli.incoming):undefined,
      coreFile:cli.core?path.resolve(cli.core):undefined,
      r33AuditFile:cli["r33-audit"]?path.resolve(cli["r33-audit"]):undefined,
      mappingFile:cli.mapping?path.resolve(cli.mapping):undefined,
      asOf:cli["as-of"]??undefined,
    });
    const reportsDir=cli["reports-dir"]?path.resolve(cli["reports-dir"]):path.join(defaultBase,"manual-input","e1-r5","reports");
    fs.mkdirSync(reportsDir,{recursive:true});
    const jsonFile=path.join(reportsDir,"e1-r5-current-frame-audit-last.json"),textFile=path.join(reportsDir,"e1-r5-current-frame-audit-last.txt");
    fs.writeFileSync(jsonFile,JSON.stringify(report,null,2));fs.writeFileSync(textFile,formatEarningsR5CurrentFrameAuditText(report));
    console.log(JSON.stringify({status:report.status,textReport:textFile,jsonReport:jsonFile,networkCalls:0,dbWrites:0}));
  }catch(error){console.log(JSON.stringify({status:"FAILED",code:error?.code??"E1_R5_CURRENT_FRAME_AUDIT_FAILED"}));process.exitCode=1;}
}
