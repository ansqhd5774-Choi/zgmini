import zlib from "node:zlib";
function findEOCD(buf){for(let i=buf.length-22;i>=Math.max(0,buf.length-65557);i--)if(buf.readUInt32LE(i)===0x06054b50)return i;throw new Error("ZIP_EOCD_NOT_FOUND")}
function zipEntries(buf){const e=findEOCD(buf),n=buf.readUInt16LE(e+10),off=buf.readUInt32LE(e+16),out=[];let p=off;for(let i=0;i<n;i++){if(buf.readUInt32LE(p)!==0x02014b50)throw new Error("ZIP_CENTRAL_BAD_SIG");const method=buf.readUInt16LE(p+10),comp=buf.readUInt32LE(p+20),uncomp=buf.readUInt32LE(p+24),nl=buf.readUInt16LE(p+28),xl=buf.readUInt16LE(p+30),cl=buf.readUInt16LE(p+32),lo=buf.readUInt32LE(p+42),name=buf.subarray(p+46,p+46+nl).toString("utf8");if(buf.readUInt32LE(lo)!==0x04034b50)throw new Error("ZIP_LOCAL_BAD_SIG");const lnl=buf.readUInt16LE(lo+26),lxl=buf.readUInt16LE(lo+28),start=lo+30+lnl+lxl;out.push({name,method,comp,uncomp,start});p+=46+nl+xl+cl}return out}
function zipRead(buf,name){const e=zipEntries(buf).find(x=>x.name===name);if(!e)throw new Error(`ZIP_ENTRY_MISSING:${name}`);const d=buf.subarray(e.start,e.start+e.comp);const b=e.method===0?Buffer.from(d):e.method===8?zlib.inflateRawSync(d):(()=>{throw new Error(`ZIP_METHOD:${e.method}`)})();if(e.uncomp&&b.length!==e.uncomp)throw new Error(`ZIP_SIZE:${name}`);return b}
function xmlDecode(s){return String(s).replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,"&")}
function colIndex(ref){const m=String(ref).match(/^([A-Z]+)/i);if(!m)return -1;let n=0;for(const c of m[1].toUpperCase())n=n*26+(c.charCodeAt(0)-64);return n-1}
function excelDate(n){if(!Number.isFinite(n))return null;const d=new Date(Date.UTC(1899,11,30)+Math.round(n*86400000));return Number.isNaN(+d)?null:d}
function quarterKey(v){if(v instanceof Date&&!Number.isNaN(+v))return `${v.getUTCFullYear()}-Q${Math.floor(v.getUTCMonth()/3)+1}`;if(typeof v==="number"&&v>20000&&v<80000){const d=excelDate(v);if(d)return `${d.getUTCFullYear()}-Q${Math.floor(d.getUTCMonth()/3)+1}`;}const s=String(v??"").trim();let m=s.match(/(?:19|20)?(\d{2})\s*[:\- ]?Q([1-4])/i);if(m){let y=Number(m[1]);if(y<100)y+=y<50?2000:1900;return `${y}-Q${m[2]}`;}m=s.match(/((?:19|20)\d{2})[-\/]?(\d{1,2})[-\/]?(\d{1,2})/);if(m){return `${m[1]}-Q${Math.floor((Number(m[2])-1)/3)+1}`;}return null}
function normHeader(v){return String(v??"").normalize("NFKC").replace(/\u00a0/g," ").replace(/[‐‑‒–—―−﹘﹣－]/g,"-").replace(/\s+/g," ").trim().toLowerCase()}
function headerMatch(v,want){const a=normHeader(v),b=normHeader(want);if(a===b)return true;if(b==="to 30-60 days late")return /^(?:to )?30\s*-\s*60\s*days?\s*late$/.test(a);return false}
function page15StructuralFallback(rows,quarter){const q=[];for(let r=0;r<rows.length;r++){const row=rows[r]||[];for(let c=0;c<row.length;c++)if(quarterKey(row[c])===quarter)q.push({r,c});}const hits=[];for(const qc of q){const row=rows[qc.r]||[];const nums=[];for(let c=qc.c+1;c<row.length;c++){const n=Number(row[c]);if(Number.isFinite(n))nums.push({c,n});}if(nums.length>=2)hits.push({n:nums[0].n,orientation:"VERTICAL_QUARTERS_STRUCTURAL",period:qc,valueCol:nums[0].c,numericCols:nums.slice(0,4)});}const uniq=[];for(const h of hits)if(!uniq.some(x=>Math.abs(x.n-h.n)<=1e-12))uniq.push(h);if(uniq.length===1)return uniq[0];return null}
function totalStructuralCandidates(rows,quarter){
 const hits=[],totalCols=[];
 for(let r=0;r<rows.length;r++){
  const row=rows[r]||[];
  for(let c=0;c<row.length;c++)if(headerMatch(row[c],"TOTAL"))totalCols.push({r,c});
 }
 for(let r=0;r<rows.length;r++){
  const row=rows[r]||[];
  const qcells=[];for(let c=0;c<row.length;c++)if(quarterKey(row[c])===quarter)qcells.push(c);
  if(qcells.length!==1)continue;
  for(const th of totalCols){
   if(th.r>=r)continue;
   const n=Number(row[th.c]);
   if(Number.isFinite(n)){
    hits.push({n,r,c:th.c,orientation:"QUARTER_ROW_TOTAL_HEADER_COLUMN",totalHeader:th});
    continue;
   }
   const next=rows[r+1]||[];
   if(next.some(x=>quarterKey(x)!==null))continue;
   const numericCount=next.reduce((a,x)=>a+(Number.isFinite(Number(x))?1:0),0);
   const n2=Number(next[th.c]);
   if(numericCount>=2&&Number.isFinite(n2))hits.push({n:n2,r:r+1,c:th.c,orientation:"QUARTER_LABEL_ROW_THEN_TOTAL_HEADER_COLUMN",numericCount,quarterRow:r,totalHeader:th});
  }
 }
 return hits;
}
function totalAtQuarter(rows,quarter){
 let direct=null,directErr=null;
 try{direct=valueAtQuarter(rows,quarter,"TOTAL")}catch(e){directErr=e}
 const structural=totalStructuralCandidates(rows,quarter),uniq=[];
 for(const h of structural)if(!uniq.some(x=>Math.abs(x.n-h.n)<=1e-12))uniq.push(h);
 if(uniq.length>1)throw new Error(`TOTAL_STRUCTURAL_AMBIGUOUS:${quarter}:${uniq.map(x=>x.n).join("|")}`);
 const sv=uniq.length===1?uniq[0].n:null;
 if(Number.isFinite(direct)&&Number.isFinite(sv)&&Math.abs(direct-sv)>1e-9)throw new Error(`TOTAL_METHOD_DISAGREE:${quarter}:${direct}|${sv}`);
 if(Number.isFinite(direct))return direct;
 if(Number.isFinite(sv))return sv;
 throw directErr||new Error(`TOTAL_STRUCTURAL_MISSING:${quarter}`);
}
function totalDiag(rows,quarter){
 const qs=[];for(let r=0;r<rows.length;r++){const row=rows[r]||[];for(let c=0;c<row.length;c++)if(quarterKey(row[c])===quarter)qs.push({r,c,row:row.slice(0,Math.min(row.length,20))});}
 const totals=[];for(let r=0;r<rows.length;r++){const row=rows[r]||[];for(let c=0;c<row.length;c++)if(headerMatch(row[c],"TOTAL"))totals.push({r,c,value:row[c]});}
 return {quarter,quarterCells:qs.slice(0,30),totalHeaderCells:totals.slice(0,50),structuralCandidates:totalStructuralCandidates(rows,quarter)};
}
function parserDiag(rows,quarter){const strings=[];for(let r=0;r<rows.length;r++){const row=rows[r]||[];for(let c=0;c<row.length;c++){const v=row[c];if(typeof v==="string"&&/(late|mortgage|transition|30|60|90)/i.test(v))strings.push({r,c,value:v,norm:normHeader(v)});}}const qrows=[];for(let r=0;r<rows.length;r++){const row=rows[r]||[];for(let c=0;c<row.length;c++)if(quarterKey(row[c])===quarter)qrows.push({r,c,row:row.slice(Math.max(0,c-1),Math.min(row.length,c+5))});}return {quarter,stringCells:strings.slice(0,80),quarterRows:qrows.slice(0,20)}}
function parseXlsx(buf){if(buf.length<4||buf.readUInt32LE(0)!==0x04034b50)throw new Error("XLSX_NOT_ZIP");const wb=zipRead(buf,"xl/workbook.xml").toString("utf8"), rel=zipRead(buf,"xl/_rels/workbook.xml.rels").toString("utf8");const rels={};for(const m of rel.matchAll(/<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bTarget="([^"]+)"[^>]*\/?>(?:<\/Relationship>)?/g))rels[m[1]]=m[2];for(const m of rel.matchAll(/<Relationship\b[^>]*\bTarget="([^"]+)"[^>]*\bId="([^"]+)"[^>]*\/?>(?:<\/Relationship>)?/g))rels[m[2]]=m[1];let shared=[];try{const sx=zipRead(buf,"xl/sharedStrings.xml").toString("utf8");for(const si of sx.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)){let t="";for(const tm of si[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g))t+=xmlDecode(tm[1]);shared.push(t)}}catch{}
 const sheets={};for(const sm of wb.matchAll(/<sheet\b[^>]*\bname="([^"]+)"[^>]*\br:id="([^"]+)"[^>]*\/?>(?:<\/sheet>)?/g)){const name=xmlDecode(sm[1]),id=sm[2],target=rels[id];if(!target)continue;const zp=target.startsWith("/")?target.slice(1):target.startsWith("xl/")?target:`xl/${target.replace(/^\.\//,"")}`;const sx=zipRead(buf,zp).toString("utf8"),rows=[];for(const rm of sx.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)){const row=[];for(const cm of rm[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)){const attrs=cm[1],body=cm[2]??"",refm=attrs.match(/\br="([A-Z]+\d+)"/i),idx=refm?colIndex(refm[1]):row.length,tm=attrs.match(/\bt="([^"]+)"/),type=tm?tm[1]:"";let val=null;if(body&&type==="inlineStr"){const ts=[...body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(x=>xmlDecode(x[1]));val=ts.join("");}else if(body){const vm=body.match(/<v>([\s\S]*?)<\/v>/);if(vm){const raw=xmlDecode(vm[1]);if(type==="s")val=shared[Number(raw)]??raw;else if(type==="str")val=raw;else {const n=Number(raw);val=Number.isFinite(n)?n:raw}}}row[idx]=val;}if(row.some(v=>v!==undefined&&v!==null&&v!==""))rows.push(row)}sheets[name]=rows;}return sheets}
function getSheet(sheets,want){const direct=sheets[want];if(direct)return direct;const key=normHeader(want);const k=Object.keys(sheets).find(x=>normHeader(x)===key);if(k)return sheets[k];throw new Error(`SHEET_MISSING:${want}`)}
function findHeader(rows,headers){for(let r=0;r<Math.min(rows.length,40);r++){const norms=(rows[r]||[]).map(normHeader);const found={};let ok=true;for(const h of headers){const idx=norms.indexOf(normHeader(h));if(idx<0){ok=false;break}found[h]=idx}if(ok)return {row:r,cols:found};}throw new Error(`HEADER_MISSING:${headers.join("|")}`)}
function valueAtQuarter(rows,quarter,header){
 const metricCells=[],quarterCells=[];
 for(let r=0;r<rows.length;r++){const row=rows[r]||[];for(let c=0;c<row.length;c++){const v=row[c];if(headerMatch(v,header))metricCells.push({r,c});if(quarterKey(v)===quarter)quarterCells.push({r,c});}}
 if(!metricCells.length&&normHeader(header)==="to 30-60 days late"){const fb=page15StructuralFallback(rows,quarter);if(fb)return fb.n;}
 if(!metricCells.length)throw new Error(`HEADER_MISSING:${header}`);
 if(!quarterCells.length)throw new Error(`QUARTER_MISSING:${header}:${quarter}`);
 const hits=[];
 for(const m of metricCells)for(const q of quarterCells){
   if(q.r<m.r&&q.c!==m.c){const v=rows[m.r]?.[q.c],n=Number(v);if(Number.isFinite(n))hits.push({n,orientation:"HORIZONTAL_QUARTERS",metric:m,period:q});}
   if(m.r<q.r&&q.c!==m.c){
     const v=rows[q.r]?.[m.c],n=Number(v);
     if(Number.isFinite(n))hits.push({n,orientation:"VERTICAL_QUARTERS",metric:m,period:q});
     else {
       const nextRow=rows[q.r+1]||[];
       const nextQuarter=nextRow.some(x=>quarterKey(x)!==null);
       const numericCount=nextRow.reduce((a,x)=>a+(Number.isFinite(Number(x))?1:0),0);
       const n2=Number(nextRow[m.c]);
       if(!nextQuarter&&numericCount>=2&&Number.isFinite(n2)){
         hits.push({n:n2,orientation:"QUARTER_LABEL_ROW_THEN_VALUE_ROW",metric:m,period:q,valueRow:q.r+1});
       }
     }
   }
 }
 if(!hits.length)throw new Error(`VALUE_INTERSECTION_MISSING:${header}:${quarter}`);
 const uniq=[];for(const h of hits)if(!uniq.some(x=>Math.abs(x.n-h.n)<=1e-12))uniq.push(h);
 if(uniq.length===1)return uniq[0].n;
 const horizontal=hits.filter(x=>x.orientation==="HORIZONTAL_QUARTERS");
 if(horizontal.length===hits.length&&horizontal.length>1){
   const m0=horizontal[0].metric,p0=horizontal[0].period;
   const sameMetric=horizontal.every(x=>x.metric.r===m0.r&&x.metric.c===m0.c);
   const samePeriodRow=horizontal.every(x=>x.period.r===p0.r);
   if(sameMetric&&samePeriodRow){
     horizontal.sort((a,b)=>a.period.c-b.period.c);
     return horizontal.at(-1).n;
   }
 }
 throw new Error(`VALUE_INTERSECTION_AMBIGUOUS:${header}:${quarter}:${uniq.map(x=>x.n).join("|")}`);
}

const STABLE9_SPEC=[
 ["C1R2_085","Page 3 Data","Credit Card",x=>x],
 ["C1R2_086","Page 3 Data","Auto Loan",x=>x],
 ["C1R2_087","Page 3 Data","HE Revolving",x=>x],
 ["C1R2_088","Page 10 Data","Credit Card Limit",x=>x],
 ["C1R2_089","Page 8 Data","TOTAL",x=>x],
 ["C1R2_090","Page 6 Data","TOTAL",x=>x],
 ["C1R2_091","Page 3 Data","Total",x=>x],
 ["C1R2_101","Page 11 Data","Current",x=>100-x],
 ["C1R2_106","Page 15 Data","To 30-60 days late",x=>x]
];
const SEMANTIC4=[
 {id:"C1R2_102",sheet:"Page 13 Data",label:"CC",role:"Credit card delinquency flow/current-semantics"},
 {id:"C1R2_104",sheet:"Page 13 Data",label:"AUTO",role:"Auto delinquency flow/current-semantics"},
 {id:"C1R2_105",sheet:"Page 14 Data",label:"AUTO",role:"Auto serious-delinquency flow/current-semantics"},
 {id:"C1R2_107",sheet:"Page 13 Data",label:"HELOC",role:"HELOC delinquency flow/current-semantics"}
];
function extractStable9(buf,quarter){
 const s=parseXlsx(buf),out={};
 for(const [id,sn,h,fn] of STABLE9_SPEC){
  let raw;
  try{
   const rows=getSheet(s,sn);
   raw=(id==="C1R2_089"||id==="C1R2_090")?totalAtQuarter(rows,quarter):valueAtQuarter(rows,quarter,h);
  }catch(e){throw new Error(`${id}:${sn}:${String(e?.message||e)}`)}
  out[id]={value:fn(raw),raw,sheet:sn,column:h,transform:id==="C1R2_101"?"100-CURRENT":"IDENTITY"};
 }
 return out;
}
function firstTextInRow(row){for(const v of (row||[]))if(typeof v==="string"&&v.trim())return v.trim();return null}
function sheetSemantic(sheets,sn){
 const rows=getSheet(sheets,sn);
 return {sheet:sn,title:firstTextInRow(rows[0]),unit:firstTextInRow(rows[1]),row0:(rows[0]||[]).slice(0,12),row1:(rows[1]||[]).slice(0,12)};
}
function semanticMeta(buf){const s=parseXlsx(buf);return {page13:sheetSemantic(s,"Page 13 Data"),page14:sheetSemantic(s,"Page 14 Data")}}
function semanticBreak(oldMeta,newMeta){
 const old13=normHeader(oldMeta.page13.unit),old14=normHeader(oldMeta.page14.unit),new13=normHeader(newMeta.page13.unit),new14=normHeader(newMeta.page14.unit);
 const p13=/billion/.test(old13)&&/percent/.test(new13);
 const p14=/billion/.test(old14)&&/percent/.test(new14);
 return {pass:p13&&p14,page13UnitBreak:p13,page14UnitBreak:p14,old:oldMeta,new:newMeta};
}
function compare(a,b,tol=1e-9){const diffs=[];for(const id of Object.keys(a)){const x=a[id]?.value,y=b[id]?.value;if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x-y)>tol)diffs.push({id,a:x,b:y,absDiff:Number.isFinite(x)&&Number.isFinite(y)?Math.abs(x-y):null})}return {pass:diffs.length===0,diffs}}

function sheetText(rows){
 const out=[];for(let r=0;r<rows.length;r++)for(const v of (rows[r]||[]))if(typeof v==='string'&&v.trim())out.push(v.trim());
 return normHeader(out.join(' | '));
}
function normalizedSheetName(name){
 return String(name??'').replace(/_/g,' ').replace(/\s+/g,' ').trim().toLowerCase();
}
function findSheetByTitle(sheets,patterns,fallbackNames=[]){
 const hits=[];
 for(const [name,rows] of Object.entries(sheets)){
  const normalizedName=normalizedSheetName(name);
  if(!/^page \d+ data(?: old)?$/i.test(normalizedName))continue;
  const t=sheetText(rows);
  if(patterns.some(re=>re.test(t)))hits.push({name,rows,title:t,matchedBy:'TITLE'});
 }
 if(hits.length===1)return hits[0];
 if(hits.length>1)throw new Error(`SHEET_TITLE_AMBIGUOUS:${patterns.map(x=>x.source).join('|')}:${hits.map(x=>x.name).join('|')}`);
 for(const base of fallbackNames){
  const target=normalizedSheetName(base);
  const exact=Object.keys(sheets).find(name=>normalizedSheetName(name)===target);
  if(exact)return {name:exact,rows:sheets[exact],title:sheetText(sheets[exact]),matchedBy:'LEGACY_PAGE_FALLBACK'};
  const old=Object.keys(sheets).find(name=>normalizedSheetName(name)===`${target} old`);
  if(old)return {name:old,rows:sheets[old],title:sheetText(sheets[old]),matchedBy:'LEGACY_OLD_PAGE_FALLBACK'};
 }
 throw new Error(`SHEET_TITLE_MISSING:${patterns.map(x=>x.source).join('|')}:fallback=${fallbackNames.join('|')}:available=${Object.keys(sheets).join('|')}`);
}
function adaptiveValue(sheets,quarter,patterns,header,fallbackNames=[]){
 const sh=findSheetByTitle(sheets,patterns,fallbackNames);return {raw:valueAtQuarter(sh.rows,quarter,header),sheet:sh.name,column:header,title:sh.title,matchedBy:sh.matchedBy};
}
function extractOriginationValueFromSheets(sheets,quarter,kind){
 const isAuto=kind==='AUTO';
 if(!isAuto&&kind!=='MORTGAGE')throw new Error(`ORIGINATION_KIND:${kind}`);
 const sh=findSheetByTitle(
  sheets,
  isAuto?[/auto loan origination volume by riskscore/,/auto loan originations by credit score/]:[/mortgage origination volume by riskscore/,/mortgage originations by credit score/],
  isAuto?['Page 8 Data']:['Page 6 Data']
 );
 const raw=totalAtQuarter(sh.rows,quarter);
 return {value:raw,raw,sheet:sh.name,column:'TOTAL',transform:'IDENTITY',matchedBy:sh.matchedBy};
}
function extractStable9Adaptive(buf,quarter){
 const s=parseXlsx(buf),out={},errors={};
 const safe=(id,fn)=>{try{const z=fn();if(z)out[id]=z}catch(e){errors[id]=String(e?.message||e)}};
 let debt=null;
 try{debt=findSheetByTitle(s,[/total debt balance.*composition/],['Page 3 Data'])}catch(e){errors.C1R2_085=errors.C1R2_086=errors.C1R2_087=errors.C1R2_091=String(e?.message||e)}
 if(debt){
  for(const [id,h] of [['C1R2_085','Credit Card'],['C1R2_086','Auto Loan'],['C1R2_087','HE Revolving'],['C1R2_091','Total']])safe(id,()=>{const raw=valueAtQuarter(debt.rows,quarter,h);return{value:raw,raw,sheet:debt.name,column:h,transform:'IDENTITY'}});
 }
 safe('C1R2_088',()=>{const z=adaptiveValue(s,quarter,[/credit limit.*balance.*credit cards.*he revolving/],'Credit Card Limit',['Page 10 Data','Page 7 Data']);return{value:z.raw,raw:z.raw,sheet:z.sheet,column:z.column,transform:'IDENTITY'}});
 safe('C1R2_089',()=>extractOriginationValueFromSheets(s,quarter,'AUTO'));
 safe('C1R2_090',()=>extractOriginationValueFromSheets(s,quarter,'MORTGAGE'));
 safe('C1R2_101',()=>{const z=adaptiveValue(s,quarter,[/total balance by delinquency status/],'Current',['Page 11 Data','Page 8 Data']),v=100-z.raw;return{value:v,raw:z.raw,sheet:z.sheet,column:'Current',transform:'100-CURRENT'}});
 safe('C1R2_106',()=>{const z=adaptiveValue(s,quarter,[/quarterly transition rates for current mortgage accounts/],'To 30-60 days late',['Page 15 Data','Page 12 Data']);return{value:z.raw,raw:z.raw,sheet:z.sheet,column:z.column,transform:'IDENTITY'}});
 Object.defineProperty(out,'__errors',{value:errors,enumerable:false});
 return out;
}

export { parseXlsx, getSheet, valueAtQuarter, totalAtQuarter, extractStable9, extractStable9Adaptive, extractOriginationValueFromSheets, semanticMeta, semanticBreak, quarterKey, normHeader, headerMatch, STABLE9_SPEC, SEMANTIC4 };
