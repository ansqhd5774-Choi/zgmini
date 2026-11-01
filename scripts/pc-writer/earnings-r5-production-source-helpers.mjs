import {inflateRawSync} from "node:zlib";
import {DatabaseSync} from "node:sqlite";

const finite=v=>typeof v==="number"&&Number.isFinite(v);
const clean=v=>String(v??"").trim();
const padCik=v=>{const d=String(v??"").replace(/\D/g,"");return d?d.padStart(10,"0"):null;};
const DAY=86400000;
const day=v=>{if(typeof v!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(v))return null;const ms=Date.parse(`${v}T00:00:00Z`);return Number.isFinite(ms)?Math.floor(ms/DAY):null;};
const ann3=(a,b)=>finite(a)&&finite(b)&&a>0&&b>0?400*Math.log(a/b):null;

export function readLatestEarningsUniverse(coreFile){
 let db;try{
  db=new DatabaseSync(coreFile,{readOnly:true,timeout:30000});
  const table=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='market_score_earnings_e1_r3_universe_v1'").get();
  if(!table)return {status:"PARTIAL",reason:"EARNINGS_UNIVERSE_TABLE_MISSING",members:[]};
  const row=db.prepare(`SELECT period_end,body_json,security_count,issuer_count,wikipedia_revision_id,retrieved_at FROM market_score_earnings_e1_r3_universe_v1 ORDER BY period_end DESC LIMIT 1`).get();
  if(!row)return {status:"PARTIAL",reason:"EARNINGS_UNIVERSE_EMPTY",members:[]};
  let body={};try{body=JSON.parse(String(row.body_json??"{}"))}catch{return {status:"FAIL",reason:"EARNINGS_UNIVERSE_JSON_INVALID",members:[]}}
  const seen=new Set(),members=[];for(const item of Array.isArray(body?.members)?body.members:[]){const cik=padCik(item?.cik);if(!cik||cik==="0000000000"||seen.has(cik))continue;seen.add(cik);members.push({cik,ticker:clean(item?.ticker),name:clean(item?.name)});}
  return {status:members.length?"PASS":"PARTIAL",reason:members.length?null:"EARNINGS_UNIVERSE_MEMBERS_EMPTY",periodEnd:String(row.period_end??""),memberCount:members.length,retrievedAt:row.retrieved_at??null,members};
 }catch(e){return {status:"FAIL",reason:"EARNINGS_UNIVERSE_READ_FAILED",code:e?.code??null,members:[]}}finally{try{db?.close()}catch{}}
}

function findEocd(buffer){for(let o=buffer.length-22;o>=Math.max(0,buffer.length-65557);o--)if(buffer.readUInt32LE(o)===0x06054b50)return o;return -1;}
function listZipEntries(buffer){
 if(!Buffer.isBuffer(buffer)||buffer.length<22)return [];const e=findEocd(buffer);if(e<0)return [];
 const count=buffer.readUInt16LE(e+10),central=buffer.readUInt32LE(e+16),out=[];let o=central;
 for(let i=0;i<count;i++){if(o+46>buffer.length||buffer.readUInt32LE(o)!==0x02014b50)return [];
  const method=buffer.readUInt16LE(o+10),compressedSize=buffer.readUInt32LE(o+20),uncompressedSize=buffer.readUInt32LE(o+24),nameLength=buffer.readUInt16LE(o+28),extraLength=buffer.readUInt16LE(o+30),commentLength=buffer.readUInt16LE(o+32),localOffset=buffer.readUInt32LE(o+42);
  const name=buffer.subarray(o+46,o+46+nameLength).toString("utf8");out.push({name,method,compressedSize,uncompressedSize,localOffset});o+=46+nameLength+extraLength+commentLength;
 }return out;
}
function readZipEntry(buffer,entry){if(!entry||buffer.readUInt32LE(entry.localOffset)!==0x04034b50)return null;const nl=buffer.readUInt16LE(entry.localOffset+26),el=buffer.readUInt16LE(entry.localOffset+28),s=entry.localOffset+30+nl+el,e=s+entry.compressedSize;if(e>buffer.length)return null;const c=buffer.subarray(s,e);if(entry.method===0)return Buffer.from(c);if(entry.method===8)return inflateRawSync(c);return null;}
function xmlUnescape(v){return String(v??"").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)));}
function xmlText(f){return [...String(f??"").matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(m=>xmlUnescape(m[1])).join("");}
function sharedStrings(xml){return [...String(xml??"").matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map(m=>xmlText(m[1]));}
function columnIndex(ref){const l=String(ref??"").match(/^[A-Z]+/i)?.[0]?.toUpperCase();if(!l)return null;let v=0;for(const ch of l)v=v*26+(ch.charCodeAt(0)-64);return v-1;}
function worksheetRows(xml,shared,{maxRows=500,maxCols=512}={}){
 const out=[];for(const rm of String(xml??"").matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)){if(out.length>=maxRows)break;const attrs=rm[1],body=rm[2],rowNumber=Number(attrs.match(/\br="(\d+)"/)?.[1]??out.length+1),cells=[];
  for(const cm of body.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)){const ca=cm[1],cb=cm[2],ref=ca.match(/\br="([A-Z]+\d+)"/i)?.[1]??"",col=columnIndex(ref);if(col==null||col>=maxCols)continue;const type=ca.match(/\bt="([^"]+)"/)?.[1]??"n",raw=cb.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1]??null;let value=null;if(type==="s"&&raw!=null)value=shared[Number(raw)]??null;else if(type==="inlineStr")value=xmlText(cb);else if(raw!=null){const n=Number(raw);value=Number.isFinite(n)?n:xmlUnescape(raw)}if(value!=null)cells[col]=value;}
  out.push({row:rowNumber,cells:Array.from({length:Math.min(maxCols,cells.length)},(_,i)=>cells[i]??null)});
 }return out;
}
function workbookSheetMap(workbook,relsXml){const rels=new Map();for(const m of String(relsXml??"").matchAll(/<Relationship\b([^>]*)\/?>(?:<\/Relationship>)?/g)){const a=m[1],id=a.match(/\bId="([^"]+)"/)?.[1],target=a.match(/\bTarget="([^"]+)"/)?.[1];if(id&&target)rels.set(id,target.replace(/^\//,""));}const sheets=[];for(const m of String(workbook??"").matchAll(/<sheet\b([^>]*)\/?>(?:<\/sheet>)?/g)){const a=m[1],name=xmlUnescape(a.match(/\bname="([^"]+)"/)?.[1]??""),rid=a.match(/\br:id="([^"]+)"/)?.[1]??null;let target=rid?rels.get(rid)??null:null;if(target&&!target.startsWith("xl/"))target="xl/"+target.replace(/^\.\//,"");sheets.push({name,target})}return sheets;}
function xlsxSamples(buffer,{maxRows=500,maxCols=512}={}){
 const entries=listZipEntries(buffer),map=new Map(entries.map(e=>[e.name,e]));if(!entries.length)return [];
 const workbook=readZipEntry(buffer,map.get("xl/workbook.xml"))?.toString("utf8")??"",rels=readZipEntry(buffer,map.get("xl/_rels/workbook.xml.rels"))?.toString("utf8")??"",shared=sharedStrings(readZipEntry(buffer,map.get("xl/sharedStrings.xml"))?.toString("utf8")??"");
 let sheets=workbookSheetMap(workbook,rels);const ws=entries.filter(e=>/^xl\/worksheets\/sheet\d+\.xml$/i.test(e.name)).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));
 if(!sheets.length)sheets=ws.map((e,i)=>({name:`Sheet${i+1}`,target:e.name}));
 return sheets.map((s,i)=>{const target=s.target&&map.has(s.target)?s.target:ws[i]?.name??null,xml=target?readZipEntry(buffer,map.get(target))?.toString("utf8")??"":"";return {name:s.name||`Sheet${i+1}`,sampledRows:worksheetRows(xml,shared,{maxRows,maxCols})}});
}
const rowCell=(r,c)=>r?.cells?.[c]??null;
const maxCols=rows=>Math.max(0,...rows.map(r=>r?.cells?.length??0));
function parseQuarterToken(v){const t=clean(v).toUpperCase().replace(/\s+/g,"");let m=t.match(/^(19\d{2}|20\d{2})[-:/]?Q([1-4])$/);if(m)return {year:+m[1],quarter:+m[2]};m=t.match(/^Q([1-4])[-:/]?(19\d{2}|20\d{2})$/);if(m)return {year:+m[2],quarter:+m[1]};return null;}
function parseYear(value){if(finite(value)&&Number.isInteger(value)&&value>=1900&&value<=2200)return value;const text=clean(value),m=text.match(/(?:^|\D)(19\d{2}|20\d{2})(?:\D|$)/);return m?Number(m[1]):null;}
function quarterEnd(y,q){const d=new Date(Date.UTC(y,q*3,0));return d.toISOString().slice(0,10);}
function resolveQuarterColumns(rows){const out=new Map();let carried=null;for(let c=0;c<maxCols(rows);c++){let direct=null,y=null,q=null;for(const r of rows){const v=rowCell(r,c),p=parseQuarterToken(v);if(p)direct=p;const yy=parseYear(v);if(yy)y=yy;const mm=clean(v).match(/^Q([1-4])$/i);if(mm)q=+mm[1];}if(y)carried=y;const x=direct??(q&&carried?{year:carried,quarter:q}:null);if(x)out.set(c,x);}return out;}
export function parseBeaA051rcQuarterlyWorkbook(buffer,{seriesCode="A051RC",tableName="T11200-Q",asOf="9999-12-31"}={}){
 const samples=xlsxSamples(buffer,{maxRows:180,maxCols:512}).filter(s=>clean(s.name).toUpperCase()===tableName.toUpperCase()),obs=[];
 for(const sample of samples){const rows=sample.sampledRows;for(let i=0;i<rows.length;i++){const texts=rows[i].cells.map(clean);if(!texts.includes(seriesCode))continue;const cols=resolveQuarterColumns(rows.slice(0,i));for(const [c,{year,quarter}] of cols){const value=rowCell(rows[i],c),end=quarterEnd(year,quarter);if(finite(value)&&day(end)!=null&&day(end)<=day(asOf))obs.push({period:`${year}Q${quarter}`,year,quarter,end,value});}}}
 const by=new Map();for(const r of obs)by.set(r.period,r);const rows=[...by.values()].sort((a,b)=>a.year-b.year||a.quarter-b.quarter);return {status:rows.length?"PASS":"FAIL",observations:rows};
}
function monthStart(y,m){return `${y}-${String(m).padStart(2,"0")}-01`;}
function shiftMonth(v,d){const [y,m]=String(v).split("-").map(Number),dt=new Date(Date.UTC(y,m-1+d,1));return monthStart(dt.getUTCFullYear(),dt.getUTCMonth()+1);}
function excelSerialToMonth(value){if(!finite(value)||value<20000||value>90000)return null;const ms=Date.UTC(1899,11,30)+Math.round(value)*86400000,date=new Date(ms);return monthStart(date.getUTCFullYear(),date.getUTCMonth()+1);}
function expandTwoDigitYear(value){const year=Number(value);if(!Number.isInteger(year)||year<0||year>99)return null;return year>=70?1900+year:2000+year;}
function parseMonthToken(value){
 if(finite(value))return excelSerialToMonth(value);const text=clean(value);if(!text)return null;
 let m=text.match(/^(19\d{2}|20\d{2})[-/.](0?[1-9]|1[0-2])(?:[-/.](?:0?[1-9]|[12]\d|3[01]))?$/);if(m)return monthStart(Number(m[1]),Number(m[2]));
 m=text.match(/^(0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01])[-/.](19\d{2}|20\d{2})$/);if(m)return monthStart(Number(m[2]),Number(m[1]));
 const months={JAN:1,JANUARY:1,FEB:2,FEBRUARY:2,MAR:3,MARCH:3,APR:4,APRIL:4,MAY:5,JUN:6,JUNE:6,JUL:7,JULY:7,AUG:8,AUGUST:8,SEP:9,SEPT:9,SEPTEMBER:9,OCT:10,OCTOBER:10,NOV:11,NOVEMBER:11,DEC:12,DECEMBER:12};const normalized=text.toUpperCase().replace(/,/g,"").trim();
 m=normalized.match(/^([A-Z]{3,9})\s+(19\d{2}|20\d{2})$/);if(m&&months[m[1]])return monthStart(Number(m[2]),months[m[1]]);m=normalized.match(/^(19\d{2}|20\d{2})\s+([A-Z]{3,9})$/);if(m&&months[m[2]])return monthStart(Number(m[1]),months[m[2]]);m=normalized.match(/^([A-Z]{3,9})[-/.](\d{2})$/);if(m&&months[m[1]]){const y=expandTwoDigitYear(m[2]);return y==null?null:monthStart(y,months[m[1]]);}m=normalized.match(/^(\d{2})[-/.]([A-Z]{3,9})$/);if(m&&months[m[2]]){const y=expandTwoDigitYear(m[1]);return y==null?null:monthStart(y,months[m[2]]);}return null;
}
function parseMonthOnly(value){const text=clean(value).toUpperCase().replace(/\./g,"").replace(/\s+/g,"");if(!text)return null;const months={JAN:1,JANUARY:1,FEB:2,FEBRUARY:2,MAR:3,MARCH:3,APR:4,APRIL:4,MAY:5,JUN:6,JUNE:6,JUL:7,JULY:7,AUG:8,AUGUST:8,SEP:9,SEPT:9,SEPTEMBER:9,OCT:10,OCTOBER:10,NOV:11,NOVEMBER:11,DEC:12,DECEMBER:12};if(months[text])return months[text];let m=text.match(/^M(0[1-9]|1[0-2])$/);if(m)return Number(m[1]);m=text.match(/^(0?[1-9]|1[0-2])$/);if(m)return Number(m[1]);return null;}
function resolveMonthColumns(rows){const out=new Map();let carried=null;for(let c=0;c<maxCols(rows);c++){let direct=null,y=null,m=null;for(const r of rows){const v=rowCell(r,c),p=parseMonthToken(v);if(p)direct=p;const yy=parseYear(v);if(yy)y=yy;const mm=parseMonthOnly(v);if(mm)m=mm;}if(y)carried=y;const x=direct??(m&&carried?monthStart(carried,m):null);if(x)out.set(c,x);}return out;}
export function parseBlsSatelliteInputWorkbook(buffer,{asOf="9999-12-31"}={}){
 const series=[];for(const sample of xlsxSamples(buffer,{maxRows:450,maxCols:512})){const rows=sample.sampledRows;for(let i=0;i<rows.length;i++){let code=null;for(let c=0;c<rows[i].cells.length;c++){const t=clean(rowCell(rows[i],c)).toUpperCase();if(/^IN\d{3}$/.test(t)){code=t;break}}if(!code)continue;const months=resolveMonthColumns(rows.slice(0,i)),vals=[];for(const [c,month] of months){const value=rowCell(rows[i],c);if(finite(value)&&day(month)<=day(asOf))vals.push({month,value});}vals.sort((a,b)=>a.month.localeCompare(b.month));const latest=vals.at(-1)??null,lag=latest?vals.find(x=>x.month===shiftMonth(latest.month,-3))??null:null;series.push({code,naics:code.slice(2),observations:vals,latest,lag3m:lag,annualized3m:latest&&lag?ann3(latest.value,lag.value):null});}}
 const by=new Map();for(const r of series){const old=by.get(r.code);if(!old||r.observations.length>old.observations.length)by.set(r.code,r)}const rows=[...by.values()];return {status:rows.length?"PASS":"PARTIAL",series:rows,rootSeriesCount:rows.length,annualized3mReadyCount:rows.filter(r=>finite(r.annualized3m)).length};
}
function parseTsv(text){const lines=String(text??"").split(/\r?\n/).filter(Boolean),headers=(lines[0]??"").split("\t").map(clean),index=Object.fromEntries(headers.map((h,i)=>[h.toLowerCase(),i]));return {index,rows:lines.slice(1).map(l=>l.split("\t").map(clean))};}
export function parseBlsNetOutputSeries(text){const t=parseTsv(text),i=t.index,rows=[];for(const r of t.rows){const sid=r[i.series_id],ind=r[i.industry_code],prod=r[i.product_code],season=r[i.seasonal];if(!/^PCU/.test(sid)||season!=="U"||ind!==prod)continue;const m=ind?.match(/^(\d{3})---$/);if(m)rows.push({seriesId:sid,naics3:m[1]});}return {status:rows.length?"PASS":"PARTIAL",series:rows,naics3Count:rows.length};}
export function parseBlsPpiOutputData(text,{series,asOfMonth="9999-12-01"}={}){const sel=new Map((series??[]).map(x=>[x.seriesId,x])),t=parseTsv(text),i=t.index,by=new Map([...sel.keys()].map(k=>[k,[]]));for(const r of t.rows){const sid=r[i.series_id];if(!by.has(sid))continue;const y=+r[i.year],p=r[i.period],v=+r[i.value];if(!Number.isInteger(y)||!/^M(0[1-9]|1[0-2])$/.test(p)||!finite(v)||v<=0)continue;const month=monthStart(y,+p.slice(1));if(month<=asOfMonth)by.get(sid).push({month,value:v});}const out=[];for(const [sid,obs] of by){obs.sort((a,b)=>a.month.localeCompare(b.month));const latest=obs.at(-1)??null,lag=latest?obs.find(x=>x.month===shiftMonth(latest.month,-3))??null:null;out.push({...sel.get(sid),observations:obs,latest,lag3m:lag,annualized3m:latest&&lag?ann3(latest.value,lag.value):null});}return {status:out.some(x=>finite(x.annualized3m))?"PASS":"PARTIAL",series:out};}
function lookup(text,ch,th,code){const t=parseTsv(text),i=t.index,row=t.rows.find(r=>r[i[ch]]===code);return row?row[i[th]]:null;}
export function validateBlsUnitLaborCostSource({seriesText,measureText,durationText,dataText,seriesId="PRS85006111"}={}){const t=parseTsv(seriesText),i=t.index,meta=t.rows.find(r=>r[i.series_id]===seriesId);if(!meta)return {status:"FAIL",reason:"SERIES_MISSING",observations:[]};const mc=meta[i.measure_code],dc=meta[i.duration_code],measure=lookup(measureText,"measure_code","measure_text",mc),duration=lookup(durationText,"duration_code","duration_text",dc);if(!(mc==="11"&&dc==="1"&&/unit labor costs/i.test(measure??"")&&/% change same quarter 1 year ago/i.test(duration??"")))return {status:"FAIL",reason:"SEMANTIC_MISMATCH",observations:[]};const d=parseTsv(dataText),di=d.index,obs=[];for(const r of d.rows){if(r[di.series_id]!==seriesId||!/^Q0[1-4]$/.test(r[di.period]))continue;const y=+r[di.year],v=+r[di.value];if(Number.isInteger(y)&&finite(v))obs.push({year:y,quarter:+r[di.period].slice(-1),value:v,end:quarterEnd(y,+r[di.period].slice(-1))});}obs.sort((a,b)=>a.year-b.year||a.quarter-b.quarter);return {status:obs.length?"PASS":"FAIL",observations:obs,latest:obs.at(-1)??null};}
const sic4=v=>{const d=String(v??"").replace(/\D/g,"");return d&&d.length<=4?d.padStart(4,"0"):null;};
export function validateApprovedSicNaics3Mapping(doc){if(doc?.status!=="APPROVED"||!Array.isArray(doc.rows))return {status:"PARTIAL",reason:"MAPPING_REQUIRED",mapping:new Map(),ambiguousSics:new Set(),noNaicsSics:new Set()};const mapping=new Map(),ambiguousSics=new Set((doc.ambiguous??[]).map(r=>sic4(r?.sic)).filter(Boolean)),noNaicsSics=new Set((doc.noNaics??[]).map(r=>sic4(r?.sic)).filter(Boolean));for(const r of doc.rows){const sic=sic4(r?.sic),n=String(r?.naics3??"").replace(/\D/g,"");if(sic&&/^\d{3}$/.test(n)&&r?.approved===true)mapping.set(sic,n);}return {status:mapping.size?"PASS":"PARTIAL",mapping,ambiguousSics,noNaicsSics};}
export function buildS10CostPressureCoverage({issuerRows=[],approvedMapping,inputSeries=[],outputSeries=[]}={}){const input=new Map((inputSeries??[]).map(r=>[String(r.naics),r])),output=new Map((outputSeries??[]).map(r=>[String(r.naics3),r])),map=approvedMapping.mapping??new Map(),amb=approvedMapping.ambiguousSics??new Set(),none=approvedMapping.noNaicsSics??new Set();let eligibleRevenue=0,mappedRevenue=0,weighted=0;for(const issuer of issuerRows){const rev=Number(issuer?.priorYear?.revenue);if(!finite(rev)||rev<=0)continue;eligibleRevenue+=rev;const sic=sic4(issuer?.sic);if(!sic||amb.has(sic)||none.has(sic))continue;const n=map.get(sic),inp=input.get(n),out=output.get(n);if(!n||!finite(inp?.annualized3m)||!finite(out?.annualized3m))continue;mappedRevenue+=rev;weighted+=rev*(inp.annualized3m-out.annualized3m);}return {status:mappedRevenue>0?"PASS":"PARTIAL",raw:mappedRevenue>0?weighted/mappedRevenue:null,revenueCoverage:eligibleRevenue>0?mappedRevenue/eligibleRevenue:null};}
