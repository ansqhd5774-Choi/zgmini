import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {DatabaseSync} from "node:sqlite";
import {fileURLToPath} from "node:url";
import {
  E1_R5_FISCAL_POLICY,
  E1_R5_INPUT_CONTRACT_VERSION,
} from "../../lib/market-score/earnings-e1-r5-input-contract.mjs";
import {
  sameFiscalAnchor,
  selectFiscalComparablePair,
} from "../../lib/market-score/earnings-e1-r5-fiscal-inputs.mjs";
import {median,symmetricChange} from "../../lib/market-score/earnings-e1-r5-forward-r2.mjs";
import {
  buildCfoSurveyPITRecord,
  compareCfoSurveyReleases,
} from "../../lib/market-score/earnings-e1-r5-cfo-survey-r1.mjs";

export const E1_R5_G4_PIT_R1_VERSION="E1-R5-G4-PIT-R1";
export const E1_R5_G4_PIT_R1_CONTRACT=Object.freeze({
  researchOnly:true,
  productionActivation:false,
  networkCalls:0,
  dbWrites:0,
  formulaChanged:false,
  weightChanged:false,
  normalizationChanged:false,
  productionBaseline:"E1-R4",
  appendOnly:true,
  retroactiveBackfill:false,
  path:"manual-input/e1-r5/g4-pit-r1/snapshots.json",
  components:Object.freeze(["S1","S2","S6","Growth","S12B"]),
  missingPolicy:"NULL_WITH_REASON_NO_SYNTHETIC_FILL",
});

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const clean=value=>String(value??"").trim();
const sha256=bytes=>createHash("sha256").update(bytes).digest("hex");
const safeIso=value=>{const ms=Date.parse(clean(value));return Number.isFinite(ms)?new Date(ms).toISOString():null;};
const filingIso=value=>/^\d{4}-\d{2}-\d{2}$/.test(clean(value))?`${clean(value)}T23:59:59.000Z`:safeIso(value);
const latestIso=values=>{
  const rows=(values??[]).map(filingIso).filter(Boolean).sort((a,b)=>Date.parse(a)-Date.parse(b));
  return rows.at(-1)??null;
};
const stableJson=value=>Array.isArray(value)
  ?`[${value.map(stableJson).join(",")}]`
  :value&&typeof value==="object"
    ?`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`
    :JSON.stringify(value);
const percentChange=(current,prior)=>finite(current)&&finite(prior)&&prior>0?100*(current/prior-1):null;
const quarterOrdinal=row=>Number(row?.surveyYear)*4+(Number(row?.surveyQuarter)-1);

function atomicWriteJson(file,value){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const part=`${file}.${process.pid}.part`;
  fs.writeFileSync(part,JSON.stringify(value,null,2)+"\n","utf8");
  fs.renameSync(part,file);
}
function componentRecord({value=null,status="MISSING",reason=null,source,sourceAsOf=null,sourceStoredAt=null,sourceHash=null,...extra}={}){
  return {value:finite(value)?value:null,status:finite(value)?"READY":status,reason:finite(value)?null:reason??"VALUE_MISSING",source:source??null,sourceAsOf:safeIso(sourceAsOf),sourceStoredAt:safeIso(sourceStoredAt),sourceHash:/^[a-f0-9]{64}$/i.test(clean(sourceHash))?clean(sourceHash).toLowerCase():null,...extra};
}

export function buildSecS1S2FromDocuments(documents,{asOf}={}){
  const asOfIso=safeIso(asOf);
  const asOfDate=asOfIso?.slice(0,10)??null;
  if(!asOfDate)return {s1:null,s2:null,eligibleS1:0,eligibleS2:0,totalDocuments:0,reason:"AS_OF_INVALID"};
  const s1=[],s2=[],s1Availability=[],s2Availability=[];let revenuePairs=0,epsPairs=0;
  for(const item of Array.isArray(documents)?documents:[]){
    const document=item?.document??item;
    const revenue=selectFiscalComparablePair(document,{metric:"revenue",asOf:asOfDate,maxAgeDays:E1_R5_FISCAL_POLICY.maxCurrentAgeDays});
    if(!revenue.current||!revenue.prior)continue;
    revenuePairs++;
    const revenueRaw=percentChange(revenue.current.val,revenue.prior.val);
    if(finite(revenueRaw)){
      s2.push(revenueRaw);
      const available=latestIso([revenue.current.filed,revenue.prior.filed]);
      if(available)s2Availability.push(available);
    }
    const eps=selectFiscalComparablePair(document,{metric:"eps",asOf:asOfDate,maxAgeDays:E1_R5_FISCAL_POLICY.maxCurrentAgeDays});
    const aligned=eps.current&&eps.prior&&sameFiscalAnchor(eps.current,revenue.current)&&sameFiscalAnchor(eps.prior,revenue.prior);
    if(!aligned)continue;
    epsPairs++;
    const epsRaw=symmetricChange(eps.current.val,eps.prior.val);
    if(finite(epsRaw)){
      s1.push(epsRaw);
      const available=latestIso([revenue.current.filed,revenue.prior.filed,eps.current.filed,eps.prior.filed]);
      if(available)s1Availability.push(available);
    }
  }
  return {
    s1:median(s1),
    s2:median(s2),
    s1SourceAsOf:latestIso(s1Availability),
    s2SourceAsOf:latestIso(s2Availability),
    eligibleS1:s1.length,
    eligibleS2:s2.length,
    revenuePairCount:revenuePairs,
    epsAlignedPairCount:epsPairs,
    totalDocuments:Array.isArray(documents)?documents.length:0,
    asOf:asOfIso,
    policyVersion:E1_R5_INPUT_CONTRACT_VERSION,
    maxCurrentAgeDays:E1_R5_FISCAL_POLICY.maxCurrentAgeDays,
  };
}

function readCompanyFacts(base,recordedAt){
  const dir=path.join(base,"manual-input","e1-r5","incoming","companyfacts");
  if(!fs.existsSync(dir)){
    return {
      S1:componentRecord({source:"SEC_COMPANYFACTS",reason:"COMPANYFACTS_DIRECTORY_MISSING",policyVersion:E1_R5_INPUT_CONTRACT_VERSION}),
      S2:componentRecord({source:"SEC_COMPANYFACTS",reason:"COMPANYFACTS_DIRECTORY_MISSING",policyVersion:E1_R5_INPUT_CONTRACT_VERSION}),
    };
  }
  const files=fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.isFile()&&/\.json$/i.test(e.name)).map(e=>e.name).sort();
  const documents=[];const aggregate=createHash("sha256");let maxMtime=0,parseErrors=0;
  for(const name of files){
    const file=path.join(dir,name),bytes=fs.readFileSync(file),st=fs.statSync(file);
    aggregate.update(name);aggregate.update("\0");aggregate.update(sha256(bytes));aggregate.update("\n");
    maxMtime=Math.max(maxMtime,st.mtimeMs);
    try{documents.push({name,document:JSON.parse(bytes.toString("utf8"))});}catch{parseErrors++;}
  }
  const sec=buildSecS1S2FromDocuments(documents,{asOf:recordedAt});
  const common={source:"SEC_COMPANYFACTS",sourceStoredAt:maxMtime?new Date(maxMtime).toISOString():null,sourceHash:files.length?aggregate.digest("hex"):null,policyVersion:E1_R5_INPUT_CONTRACT_VERSION,maxCurrentAgeDays:E1_R5_FISCAL_POLICY.maxCurrentAgeDays,totalFiles:files.length,parsedFiles:documents.length,parseErrors};
  return {
    S1:componentRecord({...common,sourceAsOf:sec.s1SourceAsOf,value:sec.s1,reason:"NO_ALIGNED_EPS_PAIRS",eligibleCount:sec.eligibleS1,revenuePairCount:sec.revenuePairCount,semantic:"MEDIAN_SYMMETRIC_CHANGE_CURRENT_VS_PRIOR_YEAR_DILUTED_EPS"}),
    S2:componentRecord({...common,sourceAsOf:sec.s2SourceAsOf,value:sec.s2,reason:"NO_REVENUE_PAIRS",eligibleCount:sec.eligibleS2,revenuePairCount:sec.revenuePairCount,semantic:"MEDIAN_PERCENT_CHANGE_CURRENT_VS_PRIOR_YEAR_REVENUE"}),
  };
}

function decodeXml(value){return String(value??"").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&apos;/g,"'");}
function colIndex(ref){const m=String(ref).match(/^([A-Z]+)/i);if(!m)return null;let n=0;for(const c of m[1].toUpperCase())n=n*26+c.charCodeAt(0)-64;return n-1;}
function parseSharedStrings(xml){const out=[];for(const si of xml.match(/<si\b[\s\S]*?<\/si>/g)??[])out.push([...si.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(m=>decodeXml(m[1])).join(""));return out;}
function parseSheetRows(xml,shared){
  const rows=[];
  for(const rm of xml.matchAll(/<row\b[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)){
    const cells=[];
    for(const cm of rm[2].matchAll(/<c\b([^>]*)r="([A-Z]+\d+)"([^>]*)>([\s\S]*?)<\/c>/g)){
      const attrs=(cm[1]??"")+(cm[3]??""),index=colIndex(cm[2]);if(index==null)continue;
      const type=attrs.match(/\bt="([^"]+)"/)?.[1]??"";let value=null;
      if(type==="inlineStr"){const m=cm[4].match(/<t\b[^>]*>([\s\S]*?)<\/t>/);value=m?decodeXml(m[1]):null;}
      else{const m=cm[4].match(/<v>([\s\S]*?)<\/v>/);if(m){const raw=decodeXml(m[1]);if(type==="s")value=shared[Number(raw)]??null;else if(type==="str")value=raw;else{const n=Number(raw);value=Number.isFinite(n)?n:raw;}}}
      cells[index]=value;
    }
    rows.push({row:Number(rm[1]),cells});
  }
  return rows;
}
function parseQuarterToken(value){const t=clean(value).toUpperCase().replace(/\s+/g,"");let m=t.match(/^(19\d{2}|20\d{2})[-:/]?Q([1-4])$/);if(m)return{year:Number(m[1]),quarter:Number(m[2])};m=t.match(/^Q([1-4])[-:/]?(19\d{2}|20\d{2})$/);return m?{year:Number(m[2]),quarter:Number(m[1])}:null;}
function parseYear(value){const m=clean(value).match(/(?:^|\D)(19\d{2}|20\d{2})(?:\D|$)/);return m?Number(m[1]):null;}
function parseQuarter(value){const t=clean(value).toUpperCase().replace(/\s+/g,"");const m=t.match(/^Q([1-4])$/)||t.match(/^([1-4])Q$/);return m?Number(m[1]):null;}
function resolveQuarterColumns(headers){const max=headers.reduce((m,r)=>Math.max(m,r.cells.length),0),out=new Map();let carriedYear=null;for(let c=0;c<max;c++){let direct=null,year=null,quarter=null;for(const r of headers){const v=r.cells[c],d=parseQuarterToken(v);if(d)direct=d;const y=parseYear(v);if(y!=null)year=y;const q=parseQuarter(v);if(q!=null)quarter=q;}if(year!=null)carriedYear=year;const z=direct??(quarter!=null&&carriedYear!=null?{year:carriedYear,quarter}:null);if(z)out.set(c,z);}return out;}
function quarterEnd(year,quarter){return new Date(Date.UTC(year,[3,6,9,12][quarter-1],0)).toISOString().slice(0,10);}

function readBeaS6(base,recordedAt){
  const file=path.join(base,"manual-input","e1-r5","incoming","bea-section1-all.xlsx");
  if(!fs.existsSync(file))return componentRecord({source:"BEA_A051RC",reason:"BEA_FILE_MISSING",seriesCode:"A051RC",tableName:"T11200-Q"});
  const bytes=fs.readFileSync(file),st=fs.statSync(file),sourceHash=sha256(bytes),asOfDate=safeIso(recordedAt)?.slice(0,10);
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-g4-bea-"));
  try{
    execFileSync("tar",["-xf",file,"-C",root],{windowsHide:true,stdio:"pipe"});
    const wb=fs.readFileSync(path.join(root,"xl","workbook.xml"),"utf8");
    const rel=fs.readFileSync(path.join(root,"xl","_rels","workbook.xml.rels"),"utf8");
    const ssFile=path.join(root,"xl","sharedStrings.xml");
    const shared=fs.existsSync(ssFile)?parseSharedStrings(fs.readFileSync(ssFile,"utf8")):[];
    const relMap=new Map([...rel.matchAll(/<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/?\s*>/g)].map(m=>[m[1],m[2]]));
    const sheet=[...wb.matchAll(/<sheet\b[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"[^>]*\/?\s*>/g)].map(m=>({name:decodeXml(m[1]),target:relMap.get(m[2])})).find(s=>s.name.toUpperCase()==="T11200-Q");
    if(!sheet?.target)return componentRecord({source:"BEA_A051RC",reason:"BEA_T11200_Q_MISSING",sourceStoredAt:st.mtime.toISOString(),sourceHash,seriesCode:"A051RC",tableName:"T11200-Q"});
    const sheetFile=path.resolve(root,"xl",sheet.target.replace(/^\//,""));
    if(!sheetFile.startsWith(path.resolve(root,"xl")+path.sep)||!fs.existsSync(sheetFile))return componentRecord({source:"BEA_A051RC",reason:"BEA_SHEET_PATH_INVALID",sourceStoredAt:st.mtime.toISOString(),sourceHash,seriesCode:"A051RC",tableName:"T11200-Q"});
    const rows=parseSheetRows(fs.readFileSync(sheetFile,"utf8"),shared),matches=[];
    for(let i=0;i<rows.length;i++){
      if(!rows[i].cells.map(v=>clean(v)).includes("A051RC"))continue;
      const qcols=resolveQuarterColumns(rows.slice(0,i)),byPeriod=new Map();
      for(const [c,{year,quarter}] of qcols){const value=rows[i].cells[c];if(!finite(value))continue;const end=quarterEnd(year,quarter);if(asOfDate&&end>asOfDate)continue;byPeriod.set(`${year}Q${quarter}`,{period:`${year}Q${quarter}`,year,quarter,end,value});}
      const obs=[...byPeriod.values()].sort((a,b)=>a.year-b.year||a.quarter-b.quarter),latest=obs.at(-1)??null,prior=latest?byPeriod.get(`${latest.year-1}Q${latest.quarter}`)??null:null;
      if(latest&&prior)matches.push({row:rows[i].row,latest,prior,raw:symmetricChange(latest.value,prior.value)});
    }
    const ready=matches.filter(m=>finite(m.raw));
    if(!ready.length)return componentRecord({source:"BEA_A051RC",reason:"A051RC_YOY_PAIR_MISSING",sourceStoredAt:st.mtime.toISOString(),sourceHash,seriesCode:"A051RC",tableName:"T11200-Q"});
    const variants=new Set(ready.map(m=>`${m.latest.value}|${m.prior.value}|${m.raw}`));
    if(variants.size!==1)return componentRecord({source:"BEA_A051RC",reason:"A051RC_DUPLICATE_ROW_CONFLICT",sourceStoredAt:st.mtime.toISOString(),sourceHash,seriesCode:"A051RC",tableName:"T11200-Q",matchedRowCount:ready.length});
    const selected=ready[0];
    return componentRecord({value:selected.raw,source:"BEA_A051RC",sourceAsOf:`${selected.latest.end}T23:59:59Z`,sourceStoredAt:st.mtime.toISOString(),sourceHash,seriesCode:"A051RC",tableName:"T11200-Q",latest:selected.latest,priorYear:selected.prior,matchedRowCount:ready.length,currentVintageOnly:true,lookAheadSafeHistorical:false});
  }catch(error){
    return componentRecord({source:"BEA_A051RC",reason:`BEA_PARSE_${clean(error?.code??error?.message??"FAILED")}`,sourceStoredAt:st.mtime.toISOString(),sourceHash,seriesCode:"A051RC",tableName:"T11200-Q"});
  }finally{fs.rmSync(root,{recursive:true,force:true});}
}

function readGrowth(base,recordedAt){
  const dbFile=path.join(base,"storage","core.sqlite");
  if(!fs.existsSync(dbFile))return componentRecord({source:"ZGMINI_STORED_GROWTH",reason:"CORE_SQLITE_MISSING"});
  const cutoff=Date.parse(recordedAt);if(!Number.isFinite(cutoff))return componentRecord({source:"ZGMINI_STORED_GROWTH",reason:"RECORDED_AT_INVALID"});
  const db=new DatabaseSync(dbFile,{readOnly:true,timeout:30000});
  try{
    const exists=db.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name='market_public_snapshots_v1' LIMIT 1").get();
    if(!exists)return componentRecord({source:"ZGMINI_STORED_GROWTH",reason:"MARKET_PUBLIC_SNAPSHOTS_TABLE_MISSING"});
    const rows=db.prepare("SELECT snapshot_key,body,stored_at FROM market_public_snapshots_v1 WHERE stored_at<=? ORDER BY stored_at DESC LIMIT 200").all(cutoff);
    for(const row of rows){
      let body;try{body=JSON.parse(String(row.body));}catch{continue;}
      const domain=(Array.isArray(body?.domains)?body.domains:[]).find(d=>String(d?.id??"").toLowerCase()==="growth"||String(d?.name??"").includes("경기"));
      if(!finite(domain?.score))continue;
      const storedMs=Number(row.stored_at),storedAt=Number.isFinite(storedMs)?new Date(storedMs).toISOString():null;
      const sourceAsOf=safeIso(body?.asOf??body?.updatedAt??body?.at??storedAt)??storedAt;
      return componentRecord({value:domain.score,source:"ZGMINI_STORED_GROWTH",sourceAsOf,sourceStoredAt:storedAt,sourceHash:sha256(Buffer.from(String(row.body),"utf8")),snapshotKey:row.snapshot_key});
    }
    return componentRecord({source:"ZGMINI_STORED_GROWTH",reason:"GROWTH_SCORE_MISSING"});
  }finally{db.close();}
}

function readS12B(base,recordedAt){
  const file=path.join(base,"manual-input","e1-r5","cfo-survey-r1","releases.json");
  if(!fs.existsSync(file))return componentRecord({source:"RICHMOND_FED_CFO_SURVEY",reason:"CFO_RELEASES_MISSING"});
  const bytes=fs.readFileSync(file),document=JSON.parse(bytes.toString("utf8")),rows=(Array.isArray(document)?document:(document.releases??[])).map(buildCfoSurveyPITRecord).filter(row=>row.status==="READY");
  const cutoff=Date.parse(recordedAt),byPeriod=new Map();
  for(const row of rows){const release=Date.parse(row.releaseAt),stored=Date.parse(row.storedAt);if(!Number.isFinite(cutoff)||release>cutoff||stored>cutoff)continue;const key=`${row.surveyYear}Q${row.surveyQuarter}`,prior=byPeriod.get(key);if(!prior||release>Date.parse(prior.releaseAt)||(release===Date.parse(prior.releaseAt)&&stored>Date.parse(prior.storedAt)))byPeriod.set(key,row);}
  const periods=[...byPeriod.values()].sort((a,b)=>quarterOrdinal(a)-quarterOrdinal(b));
  for(let i=periods.length-1;i>0;i--){const comparison=compareCfoSurveyReleases(periods[i],periods[i-1]);if(comparison.status!=="READY")continue;const current=periods[i],previous=periods[i-1];return componentRecord({value:comparison.raw,source:"RICHMOND_FED_CFO_SURVEY",sourceAsOf:current.releaseAt,sourceStoredAt:new Date(Math.max(Date.parse(current.storedAt),Date.parse(previous.storedAt))).toISOString(),sourceHash:sha256(Buffer.from(`${current.sourceHash}|${current.revisionId}|${previous.sourceHash}|${previous.revisionId}`,"utf8")),from:`${previous.surveyYear}Q${previous.surveyQuarter}`,to:`${current.surveyYear}Q${current.surveyQuarter}`,currentLevel:comparison.currentLevel,previousLevel:comparison.previousLevel,currentReleaseAt:current.releaseAt,previousReleaseAt:previous.releaseAt,currentSourceHash:current.sourceHash,previousSourceHash:previous.sourceHash});}
  return componentRecord({source:"RICHMOND_FED_CFO_SURVEY",reason:"CONSECUTIVE_CFO_REVISION_MISSING",sourceStoredAt:fs.statSync(file).mtime.toISOString(),sourceHash:sha256(bytes)});
}

export function buildG4PitSnapshot({recordedAt=new Date().toISOString(),components}={}){
  const recordedIso=safeIso(recordedAt);if(!recordedIso)throw Object.assign(new Error("RECORDED_AT_INVALID"),{code:"RECORDED_AT_INVALID"});
  const state={S1:components?.S1??componentRecord({source:"SEC_COMPANYFACTS",reason:"S1_MISSING"}),S2:components?.S2??componentRecord({source:"SEC_COMPANYFACTS",reason:"S2_MISSING"}),S6:components?.S6??componentRecord({source:"BEA_A051RC",reason:"S6_MISSING"}),Growth:components?.Growth??componentRecord({source:"ZGMINI_STORED_GROWTH",reason:"GROWTH_MISSING"}),S12B:components?.S12B??componentRecord({source:"RICHMOND_FED_CFO_SURVEY",reason:"S12B_MISSING"})};
  const missing=Object.entries(state).filter(([,v])=>!finite(v?.value)).map(([k])=>k);
  const snapshotDate=recordedIso.slice(0,10),checkpoint=sha256(Buffer.from(stableJson({snapshotDate,state}),"utf8"));
  return {snapshotId:`${recordedIso.replace(/[:.]/g,"-")}-${checkpoint.slice(0,12)}`,snapshotDate,recordedAt:recordedIso,checkpoint,version:E1_R5_G4_PIT_R1_VERSION,status:missing.length?"PARTIAL":"READY",missing,productionBaseline:"E1-R4",productionActivation:false,state};
}

export function appendG4PitSnapshot({ledger,snapshot}={}){
  const base=ledger??{version:E1_R5_G4_PIT_R1_VERSION,createdAt:snapshot.recordedAt,updatedAt:snapshot.recordedAt,snapshots:[]};
  if(base.version!==E1_R5_G4_PIT_R1_VERSION)throw Object.assign(new Error("G4_PIT_LEDGER_VERSION_MISMATCH"),{code:"G4_PIT_LEDGER_VERSION_MISMATCH"});
  const rows=Array.isArray(base.snapshots)?base.snapshots:[];
  const latest=[...rows].filter(r=>safeIso(r?.recordedAt)).sort((a,b)=>Date.parse(a.recordedAt)-Date.parse(b.recordedAt)).at(-1)??null;
  if(latest&&Date.parse(snapshot.recordedAt)<Date.parse(latest.recordedAt))throw Object.assign(new Error("G4_PIT_RETROACTIVE_WRITE_FORBIDDEN"),{code:"G4_PIT_RETROACTIVE_WRITE_FORBIDDEN"});
  const duplicate=rows.find(r=>r?.checkpoint===snapshot.checkpoint);if(duplicate)return {status:"NOOP",ledger:{...base,snapshots:rows},snapshot:duplicate};
  const next={...base,updatedAt:snapshot.recordedAt,snapshots:[...rows,snapshot]};return {status:"STORED",ledger:next,snapshot};
}

export function runG4PitLedgerR1({base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer"),recordedAt=new Date().toISOString(),ledgerFile,readers={}}={}){
  const sec=readers.sec?readers.sec(base,recordedAt):readCompanyFacts(base,recordedAt);
  const s6=readers.s6?readers.s6(base,recordedAt):readBeaS6(base,recordedAt);
  const growth=readers.growth?readers.growth(base,recordedAt):readGrowth(base,recordedAt);
  const s12b=readers.s12b?readers.s12b(base,recordedAt):readS12B(base,recordedAt);
  const snapshot=buildG4PitSnapshot({recordedAt,components:{S1:sec.S1,S2:sec.S2,S6:s6,Growth:growth,S12B:s12b}});
  const outFile=ledgerFile??path.join(base,...E1_R5_G4_PIT_R1_CONTRACT.path.split("/"));
  const ledger=fs.existsSync(outFile)?JSON.parse(fs.readFileSync(outFile,"utf8")):null;
  const result=appendG4PitSnapshot({ledger,snapshot});
  if(result.status==="STORED")atomicWriteJson(outFile,result.ledger);
  return {status:result.status,snapshot:result.snapshot,snapshotCount:result.ledger.snapshots.length,ledgerFile:outFile,networkCalls:0,dbWrites:0,productionActivation:false,formulaChanged:false,weightChanged:false,normalizationChanged:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  // CLI intentionally exposes no historical --recorded-at option; manual execution records current time only.
  try{const result=runG4PitLedgerR1();console.log(JSON.stringify({status:result.status,snapshotId:result.snapshot.snapshotId,snapshotDate:result.snapshot.snapshotDate,snapshotStatus:result.snapshot.status,missing:result.snapshot.missing,snapshotCount:result.snapshotCount,ledgerFile:result.ledgerFile,networkCalls:0,dbWrites:0,productionActivation:false}));}
  catch(error){console.log(JSON.stringify({status:"FAILED",code:clean(error?.code??error?.message??"G4_PIT_FAILED"),networkCalls:0,dbWrites:0,productionActivation:false}));process.exitCode=1;}
}
