import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {validateSecCompanyFactsDocument} from "../../lib/market-score/earnings-e1-r5-input-contract.mjs";
import {E1_R5_OFFICIAL_SOURCE_MANIFEST} from "../../lib/market-score/earnings-e1-r5-official-sources.mjs";
import {latestMatureFrame,MATURE_LAG_DAYS} from "../../lib/market-score/sec-earnings-e1-r2-provider.mjs";
import {readLatestEarningsUniverse} from "./earnings-r5-offline-preflight.mjs";
import {sicDivision} from "./earnings-r5-current-frame-audit.mjs";
import {buildFixedCyDirectCoverage} from "./earnings-r5-fiscal-quarter-shadow-audit.mjs";
import {
  VERSION as SELECTOR_VERSION,
  selectFiscalComparablePairR2,
  selectFiscalCurrentQuarterR2,
  selectFiscalMarginPairR2,
  selectFiscalQuarterFlowR2,
} from "./earnings-r5-fiscal-period-selector-r2.mjs";

export const VERSION="E1-R5-FISCAL-QUARTER-SHADOW-AUDIT-A2";
export const DEFAULT_AGE_CAPS=[185,210,240,270,285];
const defaultBase=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const DAY_MS=86400000;
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const clean=value=>String(value??"").trim();
const pct=(n,d)=>d>0?n/d:null;
const pctText=value=>finite(value)?`${(100*value).toFixed(1)}%`:"-";

function parseArgs(argv=process.argv.slice(2)){
  const out={};
  for(const item of argv){const match=item.match(/^--([^=]+)=(.*)$/);if(match)out[match[1]]=match[2];}
  return out;
}
function day(value){
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const ms=Date.parse(`${value}T00:00:00Z`);return Number.isFinite(ms)?Math.floor(ms/DAY_MS):null;
}
function duration(fact){
  const s=day(fact?.start),e=day(fact?.end);return s!=null&&e!=null&&e>=s?e-s+1:null;
}
function ageDays(fact,asOf){
  const e=day(fact?.end),a=day(asOf);return e!=null&&a!=null?a-e:null;
}
function sameAnchor(fact,target,{endTolerance=15,durationTolerance=15}={}){
  if(!fact||!target)return false;
  const a=day(fact.end),b=day(target.end);if(a==null||b==null||Math.abs(a-b)>endTolerance)return false;
  const ad=fact.duration??duration(fact),bd=target.duration??duration(target);
  return Number.isInteger(ad)&&Number.isInteger(bd)&&Math.abs(ad-bd)<=durationTolerance;
}
function quantile(values,q){
  const rows=values.filter(Number.isFinite).sort((a,b)=>a-b);if(!rows.length)return null;
  const pos=(rows.length-1)*q,lo=Math.floor(pos),hi=Math.ceil(pos);if(lo===hi)return rows[lo];
  return rows[lo]+(rows[hi]-rows[lo])*(pos-lo);
}
function stats(values){
  const rows=values.filter(Number.isFinite);return {n:rows.length,min:rows.length?Math.min(...rows):null,median:quantile(rows,.5),p75:quantile(rows,.75),p90:quantile(rows,.9),max:rows.length?Math.max(...rows):null};
}
function inc(obj,key,n=1){obj[key]=(obj[key]??0)+n;}
function ensureComponentMap(){return {S1:0,S2:0,S3:0,S4:0,S5:0,S7:0,S8:0};}
function gatesFromCounts(counts,{issuers,nonFinancial}){
  const denominator={S1:issuers,S2:issuers,S3:nonFinancial,S4:nonFinancial,S5:nonFinancial,S7:issuers,S8:issuers};
  const minimum={S1:.80,S2:.80,S3:.80,S4:.80,S5:.70,S7:.80,S8:.80};
  return Object.fromEntries(Object.keys(counts).map(key=>{
    const coverage=pct(counts[key],denominator[key]);
    return [key,{ready:counts[key],denominator:denominator[key],coverage,min:minimum[key],pass:finite(coverage)&&coverage>=minimum[key],need:Math.max(0,Math.ceil(minimum[key]*denominator[key]-1e-12)-counts[key])}];
  }));
}
function resolveSecJson(directory,cik,nested){
  const name=`CIK${cik}.json`;
  return [path.join(directory,name),path.join(directory,nested,name),path.join(directory,path.basename(directory),name)].find(file=>fs.existsSync(file)&&fs.statSync(file).isFile())??null;
}
function readJson(file){try{return file?JSON.parse(fs.readFileSync(file,"utf8")):null;}catch{return null;}}
function monthOf(value){return typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)?value.slice(5,7):"UNKNOWN";}
function fpOf(fact){return clean(fact?.fp).toUpperCase()||"MISSING";}
function makeIndustry(){return {issuers:0,nonFinancial:0,independent:ensureComponentMap(),anchored:ensureComponentMap()};}
function addIndustry(map,key,{nonFinancial,independent,anchored}){
  if(!map[key])map[key]=makeIndustry();const row=map[key];row.issuers++;if(nonFinancial)row.nonFinancial++;
  for(const metric of Object.keys(row.independent)){if(independent[metric])row.independent[metric]++;if(anchored[metric])row.anchored[metric]++;}
}

export function evaluateFiscalWindowA2({members=[],factsByCik=new Map(),submissionsByCik=new Map(),asOf,maxAgeDays}={}){
  const independent=ensureComponentMap(),anchored=ensureComponentMap();let valid=0,nonFinancial=0;
  const ages=[],pairGaps=[],endMonths={},fpDistribution={},failures={},industry={};let epsConflicts=0,revenueConflicts=0;
  for(const member of members){
    const cik=String(member?.cik??"").replace(/\D/g,"").padStart(10,"0"),doc=factsByCik.get(cik),sub=submissionsByCik.get(cik);
    const validation=validateSecCompanyFactsDocument(doc);if(validation.status!=="PASS"||validation.cik!==cik)continue;valid++;
    const div=sicDivision(sub?.sic),nf=div?.financial===false;if(nf)nonFinancial++;
    const eps=selectFiscalComparablePairR2(doc,{metric:"eps",asOf,maxAgeDays});
    const revenue=selectFiscalComparablePairR2(doc,{metric:"revenue",asOf,maxAgeDays});
    const margin=nf?selectFiscalMarginPairR2(doc,{asOf,maxAgeDays}):{opCurrent:null,opPrior:null,reason:"FINANCIAL_EXCLUDED"};
    const netCurrent=selectFiscalCurrentQuarterR2(doc,{metric:"netIncome",asOf,maxAgeDays});
    epsConflicts+=eps.conflicts??0;revenueConflicts+=revenue.conflicts??0;
    let cfo={value:null,reason:"REVENUE_PAIR_MISSING"},capex={value:null,reason:"REVENUE_PAIR_MISSING"};
    if(nf&&revenue.current){
      cfo=selectFiscalQuarterFlowR2(doc,{metric:"operatingCashFlow",asOf,target:revenue.current});
      capex=selectFiscalQuarterFlowR2(doc,{metric:"capex",asOf,target:revenue.current});
    }
    const independentReady={
      S1:Boolean(eps.current&&eps.prior),
      S2:Boolean(revenue.current&&revenue.prior&&revenue.prior.val>0),
      S3:Boolean(nf&&margin.revenueCurrent&&margin.opCurrent&&margin.revenueCurrent.val>0),
      S4:Boolean(nf&&margin.revenueCurrent&&margin.revenuePrior&&margin.opCurrent&&margin.opPrior&&margin.revenueCurrent.val>0&&margin.revenuePrior.val>0),
      S5:Boolean(nf&&revenue.current&&revenue.current.val>0&&finite(cfo.value)&&finite(capex.value)),
      S7:Boolean(eps.current&&eps.prior),
      S8:Boolean(netCurrent.fact),
    };
    const hasAnchor=Boolean(revenue.current&&revenue.prior&&revenue.prior.val>0);
    const epsAligned=hasAnchor&&eps.current&&eps.prior&&sameAnchor(eps.current,revenue.current)&&sameAnchor(eps.prior,revenue.prior);
    const netAligned=hasAnchor&&netCurrent.fact&&sameAnchor(netCurrent.fact,revenue.current);
    const anchoredReady={
      S1:Boolean(epsAligned),S2:hasAnchor,
      S3:independentReady.S3,S4:independentReady.S4,S5:independentReady.S5,
      S7:Boolean(epsAligned),S8:Boolean(netAligned),
    };
    for(const [key,value] of Object.entries(independentReady))if(value)independent[key]++;
    for(const [key,value] of Object.entries(anchoredReady))if(value)anchored[key]++;
    if(revenue.current){
      const age=ageDays(revenue.current,asOf);if(Number.isFinite(age))ages.push(age);
      const gap=day(revenue.current.end)-day(revenue.prior?.end);if(Number.isFinite(gap))pairGaps.push(gap);
      inc(endMonths,monthOf(revenue.current.end));inc(fpDistribution,fpOf(revenue.current));
    }else inc(failures,`REVENUE_${revenue.reason??"MISSING"}`);
    if(!eps.current)inc(failures,`EPS_${eps.reason??"MISSING"}`);
    if(nf&&!margin.opCurrent)inc(failures,`MARGIN_${margin.reason??"MISSING"}`);
    if(nf&&revenue.current&&(!finite(cfo.value)||!finite(capex.value)))inc(failures,!finite(cfo.value)?`FCF_${cfo.reason??"CFO_MISSING"}`:`FCF_${capex.reason??"CAPEX_MISSING"}`);
    addIndustry(industry,div?.id??"UNKNOWN",{nonFinancial:nf,independent:independentReady,anchored:anchoredReady});
  }
  const denominators={issuers:members.length,nonFinancial};
  return {
    maxAgeDays,valid,nonFinancial,independent,anchored,
    independentGates:gatesFromCounts(independent,denominators),anchoredGates:gatesFromCounts(anchored,denominators),
    ageStats:stats(ages),pairGapStats:stats(pairGaps),endMonths,fpDistribution,failures,industry,
    conflicts:{eps:epsConflicts,revenue:revenueConflicts},
  };
}

export function buildFiscalQuarterShadowAuditA2FromDocuments({members=[],factsByCik=new Map(),submissionsByCik=new Map(),asOf,frame,ageCaps=DEFAULT_AGE_CAPS}={}){
  const fixed=buildFixedCyDirectCoverage({members,factsByCik,submissionsByCik,frame,asOf});
  const windows=ageCaps.map(maxAgeDays=>evaluateFiscalWindowA2({members,factsByCik,submissionsByCik,asOf,maxAgeDays}));
  return {
    status:"PASS",version:VERSION,selectorVersion:SELECTOR_VERSION,asOf,frame,fixed,windows,
    policy:{researchOnly:true,fiscalPolicyAccepted:false,fyFpBinding:false,fyFpDiagnosticOnly:true,commonAnchor:"REVENUE",s8AnchorPolicy:"CURRENT_NET_TO_CURRENT_REVENUE_ONLY",formulaChanged:false,weightChanged:false,scoringGateChanged:false,inputContractChanged:false,q4EpsAnnualMinusNineMonths:"FORBIDDEN",productionActivation:false},
    networkCalls:0,dbWrites:0,
  };
}

export function formatFiscalQuarterShadowAuditA2(report){
  const lines=[
    `E1-R5 FISCAL QUARTER SHADOW AUDIT A2: ${report?.status??"UNKNOWN"}`,
    `VERSION: ${report?.version??"-"}`,
    `SELECTOR_VERSION: ${report?.selectorVersion??"-"}`,
    `AS_OF: ${report?.asOf??"-"}`,
    `FIXED_FRAME: ${report?.frame?.frame??"-"} prior=${report?.frame?.priorFrame??"-"} end=${report?.frame?.end??"-"}`,
    `POLICY: RESEARCH_ONLY fiscalPolicyAccepted=NO commonAnchor=REVENUE FY_FP=DIAGNOSTIC_ONLY S8=currentNetToCurrentRevenue epsAnchorToleranceDays=15 q4EpsAnnualMinus9M=FORBIDDEN`,
  ];
  const fixed=report?.fixed?.gates??{};
  lines.push(`FIXED_CY_DIRECT: ${["S1","S2","S3","S4","S5","S7","S8"].map(k=>`${k}=${fixed[k]?.ready??0}/${fixed[k]?.denominator??0}(${pctText(fixed[k]?.coverage)})`).join(" ")}`);
  for(const row of report?.windows??[]){
    const i=row.independentGates??{},a=row.anchoredGates??{};
    lines.push(`FISCAL_INDEPENDENT age=${row.maxAgeDays}: ${["S1","S2","S3","S4","S5","S7","S8"].map(k=>`${k}=${i[k]?.ready??0}/${i[k]?.denominator??0}(${pctText(i[k]?.coverage)})${i[k]?.pass?"P":"F"}`).join(" ")}`);
    lines.push(`FISCAL_COMMON_ANCHOR age=${row.maxAgeDays}: ${["S1","S2","S3","S4","S5","S7","S8"].map(k=>`${k}=${a[k]?.ready??0}/${a[k]?.denominator??0}(${pctText(a[k]?.coverage)})${a[k]?.pass?"P":"F"}`).join(" ")}`);
    const s=row.ageStats??{},g=row.pairGapStats??{};
    lines.push(`AGE_STATS age=${row.maxAgeDays}: n=${s.n??0} min=${s.min??"-"} median=${finite(s.median)?s.median.toFixed(1):"-"} p75=${finite(s.p75)?s.p75.toFixed(1):"-"} p90=${finite(s.p90)?s.p90.toFixed(1):"-"} max=${s.max??"-"}`);
    lines.push(`PAIR_GAP_STATS age=${row.maxAgeDays}: n=${g.n??0} min=${g.min??"-"} median=${finite(g.median)?g.median.toFixed(1):"-"} p90=${finite(g.p90)?g.p90.toFixed(1):"-"} max=${g.max??"-"}`);
    lines.push(`FISCAL_DISTRIBUTION age=${row.maxAgeDays}: fp=${Object.entries(row.fpDistribution??{}).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k}:${v}`).join(",")||"-"} endMonth=${Object.entries(row.endMonths??{}).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k}:${v}`).join(",")||"-"}`);
    lines.push(`CONFLICTS age=${row.maxAgeDays}: eps=${row.conflicts?.eps??0} revenue=${row.conflicts?.revenue??0}`);
    lines.push(`FAILURES age=${row.maxAgeDays}: ${Object.entries(row.failures??{}).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,12).map(([k,v])=>`${k}:${v}`).join(" ")||"-"}`);
    if([240,285].includes(row.maxAgeDays))for(const [div,x] of Object.entries(row.industry??{}).sort((a,b)=>a[0].localeCompare(b[0]))){
      const denAll=x.issuers||0,denNf=x.nonFinancial||0;
      lines.push(`INDUSTRY age=${row.maxAgeDays} div=${div} n=${denAll} nf=${denNf} anchorS1=${pctText(pct(x.anchored.S1,denAll))} S2=${pctText(pct(x.anchored.S2,denAll))} S3=${pctText(pct(x.anchored.S3,denNf))} S4=${pctText(pct(x.anchored.S4,denNf))} S5=${pctText(pct(x.anchored.S5,denNf))} S8=${pctText(pct(x.anchored.S8,denAll))}`);
    }
  }
  lines.push(
    `FY_FP_BINDING: NO`,`FY_FP_DIAGNOSTIC_ONLY: YES`,`S8_COMMON_ANCHOR_PRIOR_NET_REQUIRED: NO`,
    `FISCAL_POLICY_ACCEPTED: NO`,
    `Q4_EPS_ANNUAL_MINUS_9M: ${report?.policy?.q4EpsAnnualMinusNineMonths??"FORBIDDEN"}`,
    `FORMULA_CHANGED: NO`,`WEIGHT_CHANGED: NO`,`SCORING_GATE_CHANGED: NO`,`INPUT_CONTRACT_CHANGED: NO`,
    `PRODUCTION_ACTIVATION: NO`,`NETWORK_CALLS: 0`,`DB_WRITES: 0`,
  );
  return lines.join("\r\n")+"\r\n";
}

export async function runFiscalQuarterShadowAuditA2({incoming,coreFile,asOf=new Date().toISOString().slice(0,10),lagDays=MATURE_LAG_DAYS,ageCaps=DEFAULT_AGE_CAPS}={}){
  const inputDir=incoming??path.join(defaultBase,"manual-input","e1-r5","incoming"),core=coreFile??path.join(defaultBase,"storage","core.sqlite");
  const universe=readLatestEarningsUniverse(core),frame=latestMatureFrame(asOf,{lagDays});
  if(universe.status!=="PASS"||!frame)return {status:"PARTIAL",version:VERSION,reason:universe.status!=="PASS"?"UNIVERSE_REQUIRED":"FRAME_REQUIRED",networkCalls:0,dbWrites:0};
  const factsDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secCompanyFacts.extractedDirectory),subDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secSubmissions.extractedDirectory);
  const factsByCik=new Map(),submissionsByCik=new Map();let factFiles=0,submissionFiles=0;
  for(const member of universe.members){
    const cik=String(member.cik).replace(/\D/g,"").padStart(10,"0"),ff=resolveSecJson(factsDir,cik,"companyfacts"),sf=resolveSecJson(subDir,cik,"submissions");
    if(ff){factFiles++;factsByCik.set(cik,readJson(ff));}if(sf){submissionFiles++;submissionsByCik.set(cik,readJson(sf));}
  }
  const report=buildFiscalQuarterShadowAuditA2FromDocuments({members:universe.members,factsByCik,submissionsByCik,asOf,frame,ageCaps});
  return {...report,files:{companyFacts:factFiles,submissions:submissionFiles},universe:{memberCount:universe.memberCount,periodEnd:universe.periodEnd},dbReads:1};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const cli=parseArgs(),ageCaps=cli["age-caps"]?String(cli["age-caps"]).split(",").map(Number).filter(Number.isFinite):DEFAULT_AGE_CAPS;
    const report=await runFiscalQuarterShadowAuditA2({incoming:cli.incoming?path.resolve(cli.incoming):undefined,coreFile:cli.core?path.resolve(cli.core):undefined,asOf:cli["as-of"]??undefined,ageCaps});
    console.log(formatFiscalQuarterShadowAuditA2(report));if(report.status!=="PASS")process.exitCode=1;
  }catch(error){console.log(`E1-R5 FISCAL QUARTER SHADOW AUDIT A2: FAILED\r\nCODE: ${error?.code??"E1_R5_FISCAL_QUARTER_SHADOW_AUDIT_A2_FAILED"}`);process.exitCode=1;}
}
