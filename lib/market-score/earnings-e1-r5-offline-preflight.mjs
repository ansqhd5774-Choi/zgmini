import {inflateRawSync} from "node:zlib";
import {createHash} from "node:crypto";
import {classifySecFact,validateSecFsdsHeaders} from "./earnings-e1-r5-input-contract.mjs";

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const clean=value=>String(value??"").trim();

export function sha256(value){
  const buffer=Buffer.isBuffer(value)?value:Buffer.from(String(value??""),"utf8");
  return createHash("sha256").update(buffer).digest("hex");
}

export function splitDelimitedLine(line,delimiter="\t"){
  return String(line??"").replace(/\r$/,"").split(delimiter).map(clean);
}

export function inspectSecFsdsTexts({subText="",numText=""}={}){
  const subLines=String(subText).split(/\n/).filter(Boolean);
  const numLines=String(numText).split(/\n/).filter(Boolean);
  if(!subLines.length||!numLines.length)return {status:"FAIL",reason:"SEC_FSDS_EMPTY"};
  const subHeaders=splitDelimitedLine(subLines[0]);
  const numHeaders=splitDelimitedLine(numLines[0]);
  const headerValidation=validateSecFsdsHeaders({submissionHeaders:subHeaders,numberHeaders:numHeaders});
  if(headerValidation.status!=="PASS")return {status:"FAIL",reason:"SEC_FSDS_HEADER_MISMATCH",headerValidation};
  const subIndex=Object.fromEntries(subHeaders.map((value,index)=>[value.toLowerCase(),index]));
  const numIndex=Object.fromEntries(numHeaders.map((value,index)=>[value.toLowerCase(),index]));
  const submissions=new Map();
  const forms={"10-Q":0,"10-K":0};
  for(const line of subLines.slice(1)){
    const row=splitDelimitedLine(line);
    const form=row[subIndex.form];
    if(!["10-Q","10-K"].includes(form))continue;
    const adsh=row[subIndex.adsh],cik=row[subIndex.cik];
    if(!adsh||!cik)continue;
    submissions.set(adsh,{cik,form,period:row[subIndex.period],filed:row[subIndex.filed],sic:row[subIndex.sic]});
    forms[form]++;
  }
  const accepted=Object.fromEntries(["eps","revenue","operatingIncome","netIncome","operatingCashFlow","capex"].map(key=>[key,0]));
  const uniqueCiks=Object.fromEntries(Object.keys(accepted).map(key=>[key,new Set()]));
  const rejected={UNMAPPED_TAG:0,COREGISTRANT_FACT:0,INVALID_DURATION:0,INVALID_UNIT:0};
  let matchedSubmissionFacts=0;
  for(const line of numLines.slice(1)){
    const row=splitDelimitedLine(line);
    const submission=submissions.get(row[numIndex.adsh]);
    if(!submission)continue;
    matchedSubmissionFacts++;
    const value=Number(row[numIndex.value]);
    if(!finite(value))continue;
    const result=classifySecFact({
      tag:row[numIndex.tag],
      qtrs:Number(row[numIndex.qtrs]),
      uom:row[numIndex.uom],
      coreg:row[numIndex.coreg],
    });
    if(result.status!=="ACCEPT"){
      if(Object.hasOwn(rejected,result.reason))rejected[result.reason]++;
      continue;
    }
    accepted[result.metric]++;
    uniqueCiks[result.metric].add(submission.cik);
  }
  return {
    status:"PASS",
    headerValidation,
    submissionCount:submissions.size,
    forms,
    matchedSubmissionFacts,
    acceptedFacts:accepted,
    uniqueCiks:Object.fromEntries(Object.entries(uniqueCiks).map(([key,set])=>[key,set.size])),
    rejected,
  };
}

export function inspectBlsPrText(text,{seriesId="PRS85006111"}={}){
  const lines=String(text??"").split(/\n/).filter(Boolean);
  if(!lines.length)return {status:"FAIL",reason:"BLS_PR_EMPTY",seriesId};
  const headers=splitDelimitedLine(lines[0]);
  const index=Object.fromEntries(headers.map((value,i)=>[value.toLowerCase(),i]));
  for(const required of ["series_id","year","period","value"]){
    if(index[required]==null)return {status:"FAIL",reason:"BLS_PR_HEADER_MISMATCH",seriesId,missing:required};
  }
  const rows=[];const seen=new Map();let annualAverageRows=0;
  for(const line of lines.slice(1)){
    const row=splitDelimitedLine(line);
    if(row[index.series_id]!==seriesId)continue;
    const period=row[index.period];
    if(period==="Q05"){annualAverageRows++;continue;}
    if(!/^Q0[1-4]$/.test(period))continue;
    const year=Number(row[index.year]),value=Number(row[index.value]);
    if(!Number.isInteger(year)||!finite(value))continue;
    const key=`${year}-${period}`;
    const old=seen.get(key);
    if(old!=null&&old!==value)return {status:"FAIL",reason:"BLS_PR_DUPLICATE_CONFLICT",seriesId,key,old,value};
    seen.set(key,value);
    rows.push({year,quarter:Number(period.slice(-1)),period,value,revised:clean(row[index.footnote_codes]).includes("R")});
  }
  rows.sort((a,b)=>a.year-b.year||a.quarter-b.quarter);
  return {
    status:rows.length?"PASS":"FAIL",
    reason:rows.length?null:"BLS_PR_SERIES_MISSING",
    seriesId,
    rows,
    observationCount:rows.length,
    annualAverageRowsSkipped:annualAverageRows,
    first:rows[0]??null,
    latest:rows.at(-1)??null,
  };
}

export function inspectBeaText(text,{seriesCode="A051RC"}={}){
  const source=String(text??"");
  if(!source.trim())return {status:"FAIL",reason:"BEA_EMPTY",seriesCode};
  const lines=source.split(/\r?\n/);
  const codeMatches=lines.filter(line=>line.includes(seriesCode));
  const labelMatches=lines.filter(line=>/corporate profits/i.test(line)&&/inventory valuation|capital consumption|IVA|CCAdj/i.test(line));
  return {
    status:codeMatches.length||labelMatches.length?"PASS":"PARTIAL",
    reason:codeMatches.length||labelMatches.length?null:"BEA_SERIES_MARKER_NOT_FOUND",
    seriesCode,
    codeMatchCount:codeMatches.length,
    labelMatchCount:labelMatches.length,
  };
}

function findEocd(buffer){
  for(let offset=buffer.length-22;offset>=Math.max(0,buffer.length-65557);offset--){
    if(buffer.readUInt32LE(offset)===0x06054b50)return offset;
  }
  return -1;
}

export function listZipEntries(buffer){
  if(!Buffer.isBuffer(buffer)||buffer.length<22)return [];
  const eocd=findEocd(buffer);if(eocd<0)return [];
  const entries=buffer.readUInt16LE(eocd+10),centralOffset=buffer.readUInt32LE(eocd+16);
  const out=[];let offset=centralOffset;
  for(let i=0;i<entries;i++){
    if(offset+46>buffer.length||buffer.readUInt32LE(offset)!==0x02014b50)return [];
    const method=buffer.readUInt16LE(offset+10),compressedSize=buffer.readUInt32LE(offset+20),uncompressedSize=buffer.readUInt32LE(offset+24);
    const nameLength=buffer.readUInt16LE(offset+28),extraLength=buffer.readUInt16LE(offset+30),commentLength=buffer.readUInt16LE(offset+32),localOffset=buffer.readUInt32LE(offset+42);
    const name=buffer.subarray(offset+46,offset+46+nameLength).toString("utf8");
    out.push({name,method,compressedSize,uncompressedSize,localOffset});
    offset+=46+nameLength+extraLength+commentLength;
  }
  return out;
}

export function readZipEntry(buffer,entry){
  if(!Buffer.isBuffer(buffer)||!entry||buffer.readUInt32LE(entry.localOffset)!==0x04034b50)return null;
  const nameLength=buffer.readUInt16LE(entry.localOffset+26),extraLength=buffer.readUInt16LE(entry.localOffset+28);
  const start=entry.localOffset+30+nameLength+extraLength,end=start+entry.compressedSize;
  if(start<0||end>buffer.length)return null;
  const compressed=buffer.subarray(start,end);
  if(entry.method===0)return Buffer.from(compressed);
  if(entry.method===8)return inflateRawSync(compressed);
  return null;
}

function xmlUnescape(value){
  return String(value??"").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)));
}

export function inspectXlsxArchive(buffer){
  const entries=listZipEntries(buffer);
  if(!entries.length)return {status:"FAIL",reason:"XLSX_ZIP_INVALID",entries:[]};
  const names=new Set(entries.map(entry=>entry.name));
  const required=["[Content_Types].xml","xl/workbook.xml"];
  const missing=required.filter(name=>!names.has(name));
  if(missing.length)return {status:"FAIL",reason:"XLSX_CORE_ENTRY_MISSING",missing,entries:entries.map(x=>x.name)};
  const workbookEntry=entries.find(entry=>entry.name==="xl/workbook.xml");
  const workbook=readZipEntry(buffer,workbookEntry)?.toString("utf8")??"";
  const sheets=[];
  for(const match of workbook.matchAll(/<sheet\b[^>]*\bname="([^"]+)"[^>]*>/g))sheets.push(xmlUnescape(match[1]));
  const worksheetEntries=entries.filter(entry=>/^xl\/worksheets\/sheet\d+\.xml$/i.test(entry.name));
  return {
    status:sheets.length&&worksheetEntries.length?"PASS":"PARTIAL",
    reason:sheets.length&&worksheetEntries.length?null:"XLSX_SHEET_METADATA_INCOMPLETE",
    entryCount:entries.length,
    sheets,
    worksheetEntryCount:worksheetEntries.length,
    hasSharedStrings:names.has("xl/sharedStrings.xml"),
  };
}
