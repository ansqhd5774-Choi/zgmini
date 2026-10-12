import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {listZipEntries,readZipEntry} from "../../lib/market-score/earnings-e1-r5-offline-preflight.mjs";
import {parseBlsSatelliteInputWorkbook} from "../../lib/market-score/earnings-e1-r5-source-parsers.mjs";
import {E1_R5_OFFICIAL_SOURCE_MANIFEST} from "../../lib/market-score/earnings-e1-r5-official-sources.mjs";

const base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const file=path.join(base,"manual-input","e1-r5","incoming",E1_R5_OFFICIAL_SOURCE_MANIFEST.blsProducerInput.localName);
const clean=value=>String(value??"").trim();

function unescapeXml(value){return String(value??"").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)));}
function textFromXml(fragment){return [...String(fragment??"").matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(match=>unescapeXml(match[1])).join("");}
function sharedStrings(xml){return [...String(xml??"").matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map(match=>textFromXml(match[1]));}
function colIndex(ref){const letters=String(ref??"").match(/^[A-Z]+/i)?.[0]?.toUpperCase();if(!letters)return -1;let n=0;for(const ch of letters)n=n*26+ch.charCodeAt(0)-64;return n-1;}
function decodeCell(attrs,body,shared){
  const ref=attrs.match(/\br="([A-Z]+\d+)"/i)?.[1]??"";
  const type=attrs.match(/\bt="([^"]+)"/)?.[1]??"n";
  const style=attrs.match(/\bs="(\d+)"/)?.[1]??null;
  const raw=body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1]??null;
  let value=null;
  if(type==="s"&&raw!=null)value=shared[Number(raw)]??null;
  else if(type==="inlineStr")value=textFromXml(body);
  else if(raw!=null){const n=Number(raw);value=Number.isFinite(n)?n:unescapeXml(raw);}
  return {ref,column:colIndex(ref),type,style,value};
}
function decodeRows(xml,shared){
  const rows=[];
  for(const match of String(xml??"").matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)){
    const row=Number(match[1].match(/\br="(\d+)"/)?.[1]??rows.length+1);
    const cells=[];
    for(const cellMatch of match[2].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)){
      const cell=decodeCell(cellMatch[1],cellMatch[2],shared);
      if(cell.ref)cells.push(cell);
    }
    rows.push({row,cells});
  }
  return rows;
}
function workbookMap(workbook,rels){
  const relMap=new Map();
  for(const match of String(rels??"").matchAll(/<Relationship\b([^>]*)\/?>(?:<\/Relationship>)?/g)){
    const attrs=match[1],id=attrs.match(/\bId="([^"]+)"/)?.[1],target=attrs.match(/\bTarget="([^"]+)"/)?.[1];
    if(id&&target)relMap.set(id,target.replace(/^\//,""));
  }
  const out=[];
  for(const match of String(workbook??"").matchAll(/<sheet\b([^>]*)\/?>(?:<\/sheet>)?/g)){
    const attrs=match[1],name=unescapeXml(attrs.match(/\bname="([^"]+)"/)?.[1]??""),rid=attrs.match(/\br:id="([^"]+)"/)?.[1];
    let target=rid?relMap.get(rid):null;if(target&&!target.startsWith("xl/"))target=`xl/${target.replace(/^\.\//,"")}`;
    out.push({name,target});
  }
  return out;
}
function dateish(value){
  if(typeof value==="number")return (value>=2018&&value<=2027)||(value>=43000&&value<=48000);
  const text=clean(value);return /(?:2018|2019|2020|2021|2022|2023|2024|2025|2026|2027|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(text);
}
function showCell(cell){let value=cell.value;if(typeof value==="string"&&value.length>80)value=value.slice(0,77)+"...";return `${cell.ref}=${JSON.stringify(value)}${cell.style!=null?`(s${cell.style})`:""}`;}
function tail(list,n=12){return list.slice(Math.max(0,list.length-n));}
function sha256(buffer){return createHash("sha256").update(buffer).digest("hex");}

if(!fs.existsSync(file)){
  console.log("E1-R5 R12 BLS LAYOUT DIAGNOSTIC: FAIL");
  console.log("REASON: BLS_INPUT_FILE_MISSING");
  console.log("NETWORK_CALLS: 0");
  console.log("DB_WRITES: 0");
  process.exitCode=2;
}else{
  const buffer=fs.readFileSync(file),stat=fs.statSync(file),entries=listZipEntries(buffer),map=new Map(entries.map(entry=>[entry.name,entry]));
  const workbook=readZipEntry(buffer,map.get("xl/workbook.xml"))?.toString("utf8")??"";
  const rels=readZipEntry(buffer,map.get("xl/_rels/workbook.xml.rels"))?.toString("utf8")??"";
  const shared=sharedStrings(readZipEntry(buffer,map.get("xl/sharedStrings.xml"))?.toString("utf8")??"");
  const sheets=workbookMap(workbook,rels);
  const parsed=parseBlsSatelliteInputWorkbook(buffer,{asOf:"2026-10-11"});
  console.log("E1-R5 R12 BLS LAYOUT DIAGNOSTIC: PASS");
  console.log(`FILE_BYTES: ${stat.size}`);
  console.log(`FILE_SHA256: ${sha256(buffer)}`);
  console.log(`FILE_MTIME: ${stat.mtime.toISOString()}`);
  console.log(`ZIP_ENTRIES: ${entries.length}`);
  console.log(`SHEETS: ${sheets.length}`);
  console.log(`CURRENT_PARSER: status=${parsed.status} rootSeries=${parsed.rootSeriesCount??0} ready3m=${parsed.annualized3mReadyCount??0} latestMonths=${JSON.stringify(parsed.latestMonthDistribution??{})}`);
  let sheetIndex=0;
  for(const sheet of sheets){
    sheetIndex++;
    const entry=sheet.target?map.get(sheet.target):null;if(!entry)continue;
    const xml=readZipEntry(buffer,entry)?.toString("utf8")??"";
    const rows=decodeRows(xml,shared);
    const dimension=xml.match(/<dimension\b[^>]*ref="([^"]+)"/)?.[1]??"-";
    const merges=[...xml.matchAll(/<mergeCell\b[^>]*ref="([^"]+)"/g)].map(m=>m[1]);
    let maxCol=-1,maxRef="-";for(const row of rows)for(const cell of row.cells){if(cell.column>maxCol){maxCol=cell.column;maxRef=cell.ref;}}
    const roots=[];
    for(const row of rows){for(const cell of row.cells){if(/^IN\d{3}$/.test(clean(cell.value))){roots.push({row,cell,code:clean(cell.value)});break;}}}
    if(!roots.length)continue;
    const dateCells=[];for(const row of rows)for(const cell of row.cells){if(dateish(cell.value))dateCells.push({row:row.row,...cell});}
    console.log(`SHEET_${sheetIndex}: name=${JSON.stringify(sheet.name)} entry=${sheet.target} dimension=${dimension} rows=${rows.length} maxRef=${maxRef} mergeCount=${merges.length} rootRows=${roots.length}`);
    console.log(`SHEET_${sheetIndex}_ROOT_CODES: ${roots.slice(0,12).map(x=>`${x.code}@${x.cell.ref}`).join(" ")}`);
    console.log(`SHEET_${sheetIndex}_DATEISH_TAIL: ${tail(dateCells,24).map(x=>showCell(x)).join(" | ")||"-"}`);
    const firstRoot=roots[0];
    const prior=rows.filter(row=>row.row<firstRoot.row.row&&row.row>=firstRoot.row.row-8);
    for(const row of prior){const nonempty=row.cells.filter(cell=>cell.value!=null&&clean(cell.value)!=="");if(nonempty.length)console.log(`SHEET_${sheetIndex}_HEADER_ROW_${row.row}: ${tail(nonempty,30).map(showCell).join(" | ")}`);}
    for(const root of roots.slice(0,3)){
      const nonempty=root.row.cells.filter(cell=>cell.value!=null&&clean(cell.value)!=="");
      const numeric=nonempty.filter(cell=>typeof cell.value==="number"&&Number.isFinite(cell.value));
      console.log(`SHEET_${sheetIndex}_${root.code}_ROW: row=${root.row.row} nonempty=${nonempty.length} numeric=${numeric.length} first=${nonempty.slice(0,10).map(showCell).join(" | ")}`);
      console.log(`SHEET_${sheetIndex}_${root.code}_TAIL: ${tail(nonempty,20).map(showCell).join(" | ")}`);
    }
  }
  console.log("INTERPRETATION_HINT: If 2025/2026 header or tail cells exist while CURRENT_PARSER remains 2018-12, the issue is header/layout decoding, not stale source data.");
  console.log("NETWORK_CALLS: 0");
  console.log("DB_WRITES: 0");
}
