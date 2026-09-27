import { parseXlsx } from './consumption-r3-nyfed-lib.mjs';

const FREE=0xffffffff, END=0xfffffffe;
function u16(b,o){return b.readUInt16LE(o)}
function u32(b,o){return b.readUInt32LE(o)}
function u64n(b,o){const v=b.readBigUInt64LE(o);if(v>BigInt(Number.MAX_SAFE_INTEGER))throw Error('OLE_U64');return Number(v)}
function chain(start,fat,max=100000){const out=[];let s=start;const seen=new Set();while(s!==END&&s!==FREE){if(!Number.isInteger(s)||s<0||s>=fat.length)throw Error('OLE_CHAIN');if(seen.has(s))throw Error('OLE_LOOP');seen.add(s);out.push(s);s=fat[s];if(out.length>max)throw Error('OLE_CHAIN_LONG')}return out}
function parseOle(buf){
 if(buf.length<512||buf.subarray(0,8).toString('hex')!=='d0cf11e0a1b11ae1')throw Error('OLE_SIG');
 const major=u16(buf,26),bo=u16(buf,28);if(bo!==0xfffe)throw Error('OLE_BO');const ss=2**u16(buf,30),ms=2**u16(buf,32);
 const numFat=u32(buf,44),firstDir=u32(buf,48),cutoff=u32(buf,56),firstMiniFat=u32(buf,60),numMiniFat=u32(buf,64),firstDif=u32(buf,68),numDif=u32(buf,72);
 const sec=id=>{const o=(id+1)*ss;if(o<0||o+ss>buf.length)throw Error('OLE_SEC');return buf.subarray(o,o+ss)};
 const difat=[];for(let i=0;i<109;i++){const x=u32(buf,76+4*i);if(x!==FREE)difat.push(x)}let d=firstDif;
 for(let k=0;k<numDif&&d!==END&&d!==FREE;k++){const s=sec(d),n=ss/4-1;for(let i=0;i<n;i++){const x=u32(s,i*4);if(x!==FREE)difat.push(x)}d=u32(s,ss-4)}
 const fat=[];for(const sid of difat.slice(0,numFat)){const s=sec(sid);for(let i=0;i<ss;i+=4)fat.push(u32(s,i))}
 const readNormal=(start,size)=>Buffer.concat(chain(start,fat).map(sec)).subarray(0,size);
 const dirData=Buffer.concat(chain(firstDir,fat).map(sec)),dirs=[];
 for(let o=0;o+128<=dirData.length;o+=128){const nl=u16(dirData,o+64);if(nl<2||nl>64)continue;const name=dirData.subarray(o,o+nl-2).toString('utf16le'),type=dirData[o+66],start=u32(dirData,o+116),size=major>=4?u64n(dirData,o+120):u32(dirData,o+120);dirs.push({name,type,start,size})}
 const root=dirs.find(x=>x.type===5);if(!root)throw Error('OLE_ROOT');const miniStream=root.size?readNormal(root.start,root.size):Buffer.alloc(0);let miniFat=[];
 if(numMiniFat&&firstMiniFat!==END){const data=Buffer.concat(chain(firstMiniFat,fat).slice(0,numMiniFat).map(sec));for(let i=0;i+4<=data.length;i+=4)miniFat.push(u32(data,i))}
 const readMini=(start,size)=>Buffer.concat(chain(start,miniFat).map(id=>miniStream.subarray(id*ms,id*ms+ms))).subarray(0,size);
 return {dirs,readEntry:e=>e.size<cutoff&&e.type===2?readMini(e.start,e.size):readNormal(e.start,e.size)};
}
function records(buf,start=0,end=buf.length){const out=[];let p=start;while(p+4<=end){const id=u16(buf,p),len=u16(buf,p+2),ds=p+4,de=ds+len;if(de>end)break;out.push({id,len,p,data:buf.subarray(ds,de)});p=de}return out}
function decodeBoundSheet(d){const pos=u32(d,0),cch=d[6],flags=d[7],high=flags&1,bytes=high?cch*2:cch,name=high?d.subarray(8,8+bytes).toString('utf16le'):d.subarray(8,8+bytes).toString('latin1');return {pos,name}}
function parseSST(main,conts){
 const segs=[main,...conts];let si=0,off=8;const total=u32(main,0),unique=u32(main,4);const avail=()=>segs[si].length-off;const next=()=>{si++;off=0;if(si>=segs.length)throw Error('SST_EOF')};
 function raw(n){const ps=[];let left=n;while(left>0){if(avail()<=0)next();const t=Math.min(left,avail());ps.push(segs[si].subarray(off,off+t));off+=t;left-=t}return Buffer.concat(ps)}
 const r8=()=>raw(1)[0],r16=()=>raw(2).readUInt16LE(0),r32=()=>raw(4).readUInt32LE(0);
 function chars(cch,high){let left=cch,cur=high;const ps=[];while(left>0){if(avail()<=0){next();cur=!!(r8()&1)}const bpc=cur?2:1,n=Math.min(left,Math.floor(avail()/bpc));if(n<=0){next();cur=!!(r8()&1);continue}const b=segs[si].subarray(off,off+n*bpc);off+=n*bpc;left-=n;ps.push(cur?b.toString('utf16le'):b.toString('latin1'))}return ps.join('')}
 const strs=[];for(let n=0;n<unique;n++){if(avail()<=0)next();const cch=r16(),gr=r8(),high=!!(gr&1),ext=!!(gr&4),rich=!!(gr&8),crun=rich?r16():0,cb=ext?r32():0,s=chars(cch,high);if(crun)raw(crun*4);if(cb)raw(cb);strs.push(s)}return {total,unique,strs};
}
function rkValue(v){const mult=v&1,isInt=v&2;let n;if(isInt)n=(v>>2);else{const b=Buffer.alloc(8);b.writeUInt32LE((v&0xfffffffc)>>>0,4);n=b.readDoubleLE(0)}return mult?n/100:n}
function parseSheetCells(wb,sheetPos,sst){const recs=records(wb,sheetPos),cells=[];for(const r of recs){const d=r.data;if(r.id===0x000a)break;if(r.id===0x0203&&d.length>=14)cells.push({row:u16(d,0),col:u16(d,2),v:d.readDoubleLE(6)});else if(r.id===0x027e&&d.length>=10)cells.push({row:u16(d,0),col:u16(d,2),v:rkValue(u32(d,6))});else if(r.id===0x00bd&&d.length>=6){const row=u16(d,0),first=u16(d,2),last=u16(d,d.length-2);let p=4;for(let c=first;c<=last;c++){cells.push({row,col:c,v:rkValue(u32(d,p+2))});p+=6}}else if(r.id===0x00fd&&d.length>=10){cells.push({row:u16(d,0),col:u16(d,2),v:sst?.strs[u32(d,6)]??null})}else if(r.id===0x0204&&d.length>=8){const len=u16(d,6);cells.push({row:u16(d,0),col:u16(d,2),v:d.subarray(8,8+len).toString('latin1')})}else if(r.id===0x0006&&d.length>=14){const val=d.readDoubleLE(6);if(Number.isFinite(val))cells.push({row:u16(d,0),col:u16(d,2),v:val})}}return cells}
export function parseXls(buf){const ole=parseOle(buf),e=ole.dirs.find(x=>/^(Workbook|Book)$/i.test(x.name));if(!e)throw Error('XLS_WORKBOOK_MISSING');const wb=ole.readEntry(e),recs=records(wb),sheets=recs.filter(r=>r.id===0x0085).map(r=>decodeBoundSheet(r.data));let sst=null;for(let i=0;i<recs.length;i++)if(recs[i].id===0x00fc){const cont=[];let j=i+1;while(j<recs.length&&recs[j].id===0x003c){cont.push(recs[j].data);j++}sst=parseSST(recs[i].data,cont);break}const out={};for(const sh of sheets){const cells=parseSheetCells(wb,sh.pos,sst),rows=[];for(const c of cells){rows[c.row]??=[];rows[c.row][c.col]=c.v}out[sh.name]=rows.filter(r=>Array.isArray(r)&&r.some(v=>v!==undefined&&v!==null&&v!==''))}return out}
export function parseWorkbook(buf){if(buf.length>=8&&buf.subarray(0,8).toString('hex')==='d0cf11e0a1b11ae1')return {format:'XLS',sheets:parseXls(buf)};if(buf.length>=4&&buf.readUInt32LE(0)===0x04034b50)return {format:'XLSX',sheets:parseXlsx(buf)};throw Error('RETAIL_WORKBOOK_FORMAT')}
function norm(s){return String(s??'').normalize('NFKC').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()}
function nval(v){if(typeof v==='number'&&Number.isFinite(v))return v;const s=String(v??'').replace(/,/g,'').trim();if(!s||/^\((?:na|s)\)$/i.test(s)||s==='(*)')return null;const x=Number(s);return Number.isFinite(x)?x:null}
function ymShift(ym,delta){const [y,m]=ym.split('-').map(Number),d=new Date(Date.UTC(y,m-1+delta,1));return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-01`}
function table1(sheets){const k=Object.keys(sheets).find(x=>/table\s*1/i.test(x));if(!k)throw Error('CENSUS_TABLE1_MISSING');return sheets[k]}
function adjustedStart(rows){for(let r=0;r<Math.min(rows.length,15);r++)for(let c=0;c<(rows[r]||[]).length;c++)if(/adjusted/i.test(String(rows[r][c]??''))&&!/not adjusted/i.test(String(rows[r][c]??'')))return c;throw Error('CENSUS_ADJUSTED_HEADER_MISSING')}
const TOKENS={
 C1R2_015:['retail','food','services','total'], C1R2_017:['total','excl','motor','vehicle','parts'],
 C1R2_021:['motor','vehicle','parts','dealers'], C1R2_022:['furniture','home','furn'], C1R2_023:['electronics','appliance'],
 C1R2_024:['building','material','garden'], C1R2_025:['food','beverage','stores'], C1R2_026:['gasoline','stations'],
 C1R2_027:['clothing','accessories'], C1R2_028:['sporting','goods','hobby','book'], C1R2_029:['general','merchandise'],
 C1R2_030:['department','stores'], C1R2_031:['nonstore'], C1R2_032:['elect','shopping'], C1R2_033:['food','services','drinking'],
 C1R2_034:['health','personal','care'], C1R2_035:['miscellaneous','store']
};
function rowText(rows,r){const cur=norm((rows[r]||[]).slice(0,3).filter(x=>typeof x==='string').join(' '));const prev=r>0?norm((rows[r-1]||[]).slice(0,3).filter(x=>typeof x==='string').join(' ')):'';return `${prev} ${cur}`.trim()}
function scoreTokens(text,toks){let n=0;for(const t of toks)if(text.includes(t))n++;return n/toks.length}
function findRow(rows,cid,ac){const toks=TOKENS[cid];if(!toks)throw Error(`CENSUS_ALIAS_MISSING:${cid}`);let best=null;for(let r=0;r<rows.length;r++){const t=rowText(rows,r),sc=scoreTokens(t,toks),hasNumeric=(rows[r]||[]).slice(ac,ac+5).some(v=>Number.isFinite(nval(v)));if(!hasNumeric)continue;if(!best||sc>best.s)best={r,s:sc,t}}if(!best||best.s<0.7)throw Error(`CENSUS_ROW_MISSING:${cid}:${best?.s}:${best?.t}`);return best.r}
function rawAt(rows,r,ac,obsYm){for(let k=0;k<=1;k++){const x=nval((rows[r]||[])[ac+k]),py=nval((rows[r]||[])[ac+3+k]);if(Number.isFinite(x)&&Number.isFinite(py))return {raw:x,priorYearRaw:py,observationDate:ymShift(obsYm,-k),priorYearDate:ymShift(obsYm,-12-k),adjustedColumn:ac+k,row:r}}return null}
export function extractRetail(buf,obsYm){const {format,sheets}=parseWorkbook(buf),rows=table1(sheets),ac=adjustedStart(rows),out={};for(const cid of Object.keys(TOKENS)){const r=findRow(rows,cid,ac),x=rawAt(rows,r,ac,obsYm);if(x)out[cid]={...x,format,rowLabel:rowText(rows,r)}}
 function same(cid){const x=out[cid];if(!x)throw Error(`CENSUS_COMPONENT_MISSING:${cid}`);return x}
 const total=same('C1R2_015'),motor=same('C1R2_021'),gas=same('C1R2_026'),build=same('C1R2_024'),foodsvc=same('C1R2_033');
 const allSame=[motor,gas,build,foodsvc].every(x=>x.observationDate===total.observationDate&&x.priorYearDate===total.priorYearDate);if(!allSame)throw Error('CENSUS_DERIVED_DATE_MISMATCH');
 out.C1R2_018={raw:total.raw-gas.raw,priorYearRaw:total.priorYearRaw-gas.priorYearRaw,observationDate:total.observationDate,priorYearDate:total.priorYearDate,format,rowLabel:'DERIVED_TOTAL_EX_GAS'};
 out.C1R2_019={raw:total.raw-motor.raw-gas.raw,priorYearRaw:total.priorYearRaw-motor.priorYearRaw-gas.priorYearRaw,observationDate:total.observationDate,priorYearDate:total.priorYearDate,format,rowLabel:'DERIVED_TOTAL_EX_MOTOR_GAS'};
 out.C1R2_020={raw:total.raw-motor.raw-gas.raw-build.raw-foodsvc.raw,priorYearRaw:total.priorYearRaw-motor.priorYearRaw-gas.priorYearRaw-build.priorYearRaw-foodsvc.priorYearRaw,observationDate:total.observationDate,priorYearDate:total.priorYearDate,format,rowLabel:'DERIVED_CONTROL_GROUP'};
 return {format,adjustedStart:ac,metrics:out};
}
export function debugRetail(buf,obsYm){const {sheets}=parseWorkbook(buf),rows=table1(sheets),ac=adjustedStart(rows);const dbg={ac,rows:{}};for(const cid of Object.keys(TOKENS)){const r=findRow(rows,cid,ac);dbg.rows[cid]={r,text:rowText(rows,r),cells:(rows[r]||[]).slice(0,15),raw:rawAt(rows,r,ac,obsYm)}}return dbg}

function textTable1A(txt){
 const s=String(txt??'').replace(/\r/g,'');
 const start=s.search(/TABLE\s+1A\./i);
 if(start<0)throw Error('CENSUS_TXT_TABLE1A_MISSING');
 const tail=s.slice(start);
 const m=/TABLE\s+1B\./i.exec(tail);
 return m?tail.slice(0,m.index):tail;
}
function textRows(txt){
 const section=textTable1A(txt),out=[];
 for(const line of section.split('\n')){
  const ms=[...line.matchAll(/\(\*\)|\(NA\)|\(S\)|[-+]?\d[\d,]*(?:\.\d+)?/gi)];
  if(ms.length<5)continue;
  const tail=ms.slice(-5);
  const first=tail[0].index??0;
  const rawLabel=line.slice(0,first).trim();
  const label=norm(rawLabel);
  const values=tail.map(x=>x[0]);
  out.push({rawLabel,label,values,line});
 }
 return out;
}
function findTextRow(rows,cid){
 const toks=TOKENS[cid];
 if(!toks)throw Error(`CENSUS_ALIAS_MISSING:${cid}`);
 let best=null;
 for(let i=0;i<rows.length;i++){
  const r=rows[i],sc=scoreTokens(r.label,toks);
  if(!best||sc>best.s)best={i,s:sc,row:r};
 }
 if(!best||best.s<0.7)throw Error(`CENSUS_TXT_ROW_MISSING:${cid}:${best?.s}:${best?.row?.label}`);
 return best.row;
}
function rawAtText(row,obsYm){
 for(let k=0;k<=1;k++){
  const x=nval(row.values[k]),py=nval(row.values[3+k]);
  if(Number.isFinite(x)&&Number.isFinite(py)){
   return {
    raw:x,priorYearRaw:py,
    observationDate:ymShift(obsYm,-k),
    priorYearDate:ymShift(obsYm,-12-k),
    adjustedColumn:k,rowLabel:row.label
   };
  }
 }
 return null;
}
export function extractRetailText(txt,obsYm){
 const rows=textRows(txt),out={},format='TXT';
 for(const cid of Object.keys(TOKENS)){
  const row=findTextRow(rows,cid),x=rawAtText(row,obsYm);
  if(x)out[cid]={...x,format,rowLabel:row.label};
 }
 function same(cid){const x=out[cid];if(!x)throw Error(`CENSUS_COMPONENT_MISSING:${cid}`);return x}
 const total=same('C1R2_015'),motor=same('C1R2_021'),gas=same('C1R2_026'),build=same('C1R2_024'),foodsvc=same('C1R2_033');
 const allSame=[motor,gas,build,foodsvc].every(x=>x.observationDate===total.observationDate&&x.priorYearDate===total.priorYearDate);
 if(!allSame)throw Error('CENSUS_DERIVED_DATE_MISMATCH');
 out.C1R2_018={raw:total.raw-gas.raw,priorYearRaw:total.priorYearRaw-gas.priorYearRaw,observationDate:total.observationDate,priorYearDate:total.priorYearDate,format,rowLabel:'DERIVED_TOTAL_EX_GAS'};
 out.C1R2_019={raw:total.raw-motor.raw-gas.raw,priorYearRaw:total.priorYearRaw-motor.priorYearRaw-gas.priorYearRaw,observationDate:total.observationDate,priorYearDate:total.priorYearDate,format,rowLabel:'DERIVED_TOTAL_EX_MOTOR_GAS'};
 out.C1R2_020={raw:total.raw-motor.raw-gas.raw-build.raw-foodsvc.raw,priorYearRaw:total.priorYearRaw-motor.priorYearRaw-gas.priorYearRaw-build.priorYearRaw-foodsvc.priorYearRaw,observationDate:total.observationDate,priorYearDate:total.priorYearDate,format,rowLabel:'DERIVED_CONTROL_GROUP'};
 return {format,adjustedStart:0,metrics:out};
}

