import {inflateRawSync} from "node:zlib";

export const SEC_FUND_FLOW_XLSX_PARSER_R1="SEC_FUND_FLOW_XLSX_TABLE_3_2_R1";
const TARGET_TITLE="aggregate inflows, outflows, and net flows of index and non-index funds";
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);

function xmlDecode(value){
  return String(value??"")
    .replace(/&#x([0-9a-f]+);/gi,(_,hex)=>String.fromCodePoint(parseInt(hex,16)))
    .replace(/&#([0-9]+);/g,(_,dec)=>String.fromCodePoint(parseInt(dec,10)))
    .replaceAll("&lt;","<").replaceAll("&gt;",">").replaceAll("&quot;",'"').replaceAll("&apos;","'").replaceAll("&amp;","&");
}
function attrs(text){
  const out={};
  for(const match of String(text??"").matchAll(/([A-Za-z_:][A-Za-z0-9_.:-]*)\s*=\s*"([^"]*)"/g))out[match[1]]=xmlDecode(match[2]);
  return out;
}
function colIndex(ref){
  const m=String(ref??"").match(/^([A-Z]+)\d+$/i);
  if(!m)return null;
  let n=0;
  for(const ch of m[1].toUpperCase())n=n*26+(ch.charCodeAt(0)-64);
  return n-1;
}
function normalizeLabel(value){
  return String(value??"").replace(/[‐‑‒–—]/g,"-").replace(/\s+/g," ").trim().toLowerCase();
}
function monthStart(date){
  if(!validDate(date))throw new Error("SEC_FUND_FLOW_PERIOD_INVALID");
  return date.slice(0,7)+"-01";
}
function monthsEnding(periodEnd,count){
  const [y,m]=periodEnd.slice(0,7).split("-").map(Number);
  return Array.from({length:count},(_,i)=>{
    const offset=i-count+1;
    const d=new Date(Date.UTC(y,m-1+offset,1));
    return d.toISOString().slice(0,10);
  });
}

function zipDirectory(buffer){
  const data=Buffer.isBuffer(buffer)?buffer:Buffer.from(buffer);
  const lower=Math.max(0,data.length-65558);
  let eocd=-1;
  for(let i=data.length-22;i>=lower;i--){
    if(data.readUInt32LE(i)===0x06054b50){eocd=i;break}
  }
  if(eocd<0)throw new Error("SEC_XLSX_ZIP_EOCD_MISSING");
  const count=data.readUInt16LE(eocd+10),offset=data.readUInt32LE(eocd+16);
  if(count<1||offset>=data.length)throw new Error("SEC_XLSX_ZIP_DIRECTORY_INVALID");
  const out=new Map();
  let p=offset;
  for(let i=0;i<count;i++){
    if(data.readUInt32LE(p)!==0x02014b50)throw new Error("SEC_XLSX_ZIP_CENTRAL_INVALID");
    const method=data.readUInt16LE(p+10);
    const compressedSize=data.readUInt32LE(p+20),uncompressedSize=data.readUInt32LE(p+24);
    const nameLen=data.readUInt16LE(p+28),extraLen=data.readUInt16LE(p+30),commentLen=data.readUInt16LE(p+32);
    const localOffset=data.readUInt32LE(p+42);
    const name=data.subarray(p+46,p+46+nameLen).toString("utf8");
    out.set(name,{method,compressedSize,uncompressedSize,localOffset});
    p+=46+nameLen+extraLen+commentLen;
  }
  return {data,out};
}
function readZipEntry(index,name,{maxBytes=20_000_000}={}){
  const meta=index.out.get(name);
  if(!meta)return null;
  if(meta.uncompressedSize>maxBytes)throw new Error("SEC_XLSX_ZIP_ENTRY_TOO_LARGE");
  const {data}=index,p=meta.localOffset;
  if(data.readUInt32LE(p)!==0x04034b50)throw new Error("SEC_XLSX_ZIP_LOCAL_INVALID");
  const nameLen=data.readUInt16LE(p+26),extraLen=data.readUInt16LE(p+28);
  const start=p+30+nameLen+extraLen,end=start+meta.compressedSize;
  if(start<0||end>data.length)throw new Error("SEC_XLSX_ZIP_RANGE_INVALID");
  const compressed=data.subarray(start,end);
  let raw;
  if(meta.method===0)raw=Buffer.from(compressed);
  else if(meta.method===8)raw=inflateRawSync(compressed);
  else throw new Error("SEC_XLSX_ZIP_COMPRESSION_UNSUPPORTED");
  if(meta.uncompressedSize&&raw.length!==meta.uncompressedSize)throw new Error("SEC_XLSX_ZIP_SIZE_MISMATCH");
  return raw.toString("utf8");
}
function parseSharedStrings(xml){
  if(!xml)return [];
  const values=[];
  for(const si of xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)){
    const texts=[...si[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(m=>xmlDecode(m[1]));
    values.push(texts.join(""));
  }
  return values;
}
function parseWorksheet(xml,shared=[]){
  const rows=[];
  for(const match of String(xml??"").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)){
    const a=attrs(match[1]),ref=a.r,index=colIndex(ref);
    if(index===null)continue;
    const rowNo=Number(String(ref).match(/\d+$/)?.[0]??0);
    if(!Number.isInteger(rowNo)||rowNo<1||rowNo>5000||index>300)continue;
    const body=match[2]??"";
    let value=null;
    if(a.t==="inlineStr"){
      value=[...body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(m=>xmlDecode(m[1])).join("");
    }else{
      const v=body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1];
      if(v!==undefined){
        if(a.t==="s")value=shared[Number(v)]??null;
        else if(a.t==="str")value=xmlDecode(v);
        else if(a.t==="b")value=v==="1";
        else{
          const n=Number(v);
          value=Number.isFinite(n)?n:xmlDecode(v);
        }
      }
    }
    if(!rows[rowNo-1])rows[rowNo-1]=[];
    rows[rowNo-1][index]=value;
  }
  return rows.map(row=>row??[]);
}
function workbookSheets(index){
  const workbook=readZipEntry(index,"xl/workbook.xml",{maxBytes:2_000_000});
  const rels=readZipEntry(index,"xl/_rels/workbook.xml.rels",{maxBytes:2_000_000});
  if(!workbook||!rels)throw new Error("SEC_XLSX_WORKBOOK_METADATA_MISSING");
  const relMap=new Map();
  for(const match of rels.matchAll(/<Relationship\b([^>]*?)\/?\s*>/g)){
    const a=attrs(match[1]);
    if(a.Id&&a.Target){
      const target=a.Target.startsWith("/")?a.Target.slice(1):a.Target.startsWith("xl/")?a.Target:"xl/"+a.Target.replace(/^\.\//,"");
      relMap.set(a.Id,target);
    }
  }
  const sheets=[];
  for(const match of workbook.matchAll(/<sheet\b([^>]*?)\/?\s*>/g)){
    const a=attrs(match[1]),target=relMap.get(a["r:id"]);
    if(a.name&&target)sheets.push({name:a.name,target});
  }
  if(!sheets.length)throw new Error("SEC_XLSX_SHEETS_MISSING");
  return sheets;
}
function classifyFund(value){
  const x=normalizeLabel(value);
  if(x==="non-index"||x==="non index"||x==="nonindex")return "nonIndex";
  if(x==="index")return "index";
  if(x==="all")return "all";
  return null;
}
function classifyFlow(value){
  const x=normalizeLabel(value);
  if(x==="net")return "net";
  if(x==="outflow")return "outflow";
  return null;
}
function targetKey(fund,flow){
  if(fund==="all"&&flow==="net")return "allNetRatio";
  if(fund==="index"&&flow==="net")return "indexNetRatio";
  if(fund==="nonIndex"&&flow==="net")return "nonIndexNetRatio";
  if(fund==="all"&&flow==="outflow")return "allOutflowRatio";
  return null;
}

export function parseSecFundFlowTableMatrix(matrix,{periodEnd,sheetName=""}={}){
  if(!validDate(periodEnd))throw new Error("SEC_FUND_FLOW_PERIOD_INVALID");
  const titleRow=(Array.isArray(matrix)?matrix:[]).findIndex(row=>row.some(cell=>{
    const x=normalizeLabel(cell);
    return x.includes("table 3.2")||(x.includes(TARGET_TITLE)&&x.includes("percent of net assets"));
  }));
  const sheetLooksRight=/^(?:table\s*)?3[._ -]?2$/i.test(String(sheetName).trim())||/flow/i.test(String(sheetName));
  if(titleRow<0&&!sheetLooksRight)return null;
  const endRow=(Array.isArray(matrix)?matrix:[]).findIndex((row,i)=>i>titleRow&&row.some(cell=>normalizeLabel(cell).includes("table 3.3")));
  const start=Math.max(0,titleRow>=0?titleRow+1:0),end=endRow>=0?endRow:matrix.length;
  const found={};
  let currentFund=null;
  for(let i=start;i<end;i++){
    const row=Array.isArray(matrix[i])?matrix[i]:[];
    for(const cell of row){
      const fund=classifyFund(cell);
      if(fund)currentFund=fund;
    }
    const flow=row.map(classifyFlow).find(Boolean)??null;
    const key=targetKey(currentFund,flow);
    if(!key||found[key])continue;
    const numbers=row.filter(finite);
    if(numbers.length>=12)found[key]=numbers.slice(-12);
  }
  const required=["allNetRatio","indexNetRatio","nonIndexNetRatio","allOutflowRatio"];
  if(!required.every(key=>Array.isArray(found[key])&&found[key].length===12))return null;
  const months=monthsEnding(periodEnd,12);
  const rows=months.map((observationDate,i)=>({
    observationDate,
    value:found.allNetRatio[i],
    allNetRatio:found.allNetRatio[i],
    indexNetRatio:found.indexNetRatio[i],
    nonIndexNetRatio:found.nonIndexNetRatio[i],
    allOutflowRatio:found.allOutflowRatio[i],
  }));
  if(rows.at(-1).observationDate!==monthStart(periodEnd))throw new Error("SEC_FUND_FLOW_PERIOD_ALIGNMENT_FAILED");
  return rows;
}

export function parseSecFundFlowSupportingXlsx(buffer,{periodEnd}={}){
  const index=zipDirectory(buffer);
  const shared=parseSharedStrings(readZipEntry(index,"xl/sharedStrings.xml",{maxBytes:8_000_000}));
  const sheets=workbookSheets(index);
  const matches=[];
  for(const sheet of sheets){
    const xml=readZipEntry(index,sheet.target,{maxBytes:20_000_000});
    if(!xml)continue;
    const matrix=parseWorksheet(xml,shared);
    const rows=parseSecFundFlowTableMatrix(matrix,{periodEnd,sheetName:sheet.name});
    if(rows)matches.push({sheet:sheet.name,rows});
  }
  if(matches.length!==1)throw new Error(matches.length?"SEC_FUND_FLOW_TABLE_3_2_NOT_UNIQUE":"SEC_FUND_FLOW_TABLE_3_2_NOT_FOUND");
  return {
    status:"READY",
    parserVersion:SEC_FUND_FLOW_XLSX_PARSER_R1,
    periodEnd,
    sheetName:matches[0].sheet,
    rows:matches[0].rows,
  };
}
