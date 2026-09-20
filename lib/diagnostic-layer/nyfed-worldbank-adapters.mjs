import {readXlsxWorkbook, XlsxLiteError} from './xlsx-lite.mjs';

export class OfficialWorkbookError extends Error {
  constructor(status) {
    super(status);
    this.name = 'OfficialWorkbookError';
    this.status = status;
  }
}
const fail = status => { throw new OfficialWorkbookError(status); };
const finite = value => typeof value === 'number' && Number.isFinite(value);

export const CMDI_XLSX_URL =
  'https://www.newyorkfed.org/medialibrary/research/interactives/data/cmdi/cmdi_interactive_data.xlsx';
export const GSCPI_XLSX_URL =
  'https://www.newyorkfed.org/medialibrary/research/interactives/gscpi/downloads/gscpi_data.xlsx';
export const WORLD_BANK_COPPER_XLSX_URL =
  'https://thedocs.worldbank.org/en/doc/74e8be41ceb20fa0da750cda2f6b9e4e-0050012026/related/CMO-Historical-Data-Monthly.xlsx';

function cellColumn(ref) {
  return /^([A-Z]+)/.exec(ref ?? '')?.[1] ?? null;
}
function columnNumber(letters) {
  if (!letters) return null;
  let number = 0;
  for (const char of letters) number = number * 26 + (char.charCodeAt(0) - 64);
  return number;
}
function columnLetters(number) {
  let out = '';
  for (let n = number; n > 0; n = Math.floor((n - 1) / 26)) {
    out = String.fromCharCode(((n - 1) % 26) + 65) + out;
  }
  return out;
}
function numeric(cell) {
  const value = Number(cell?.value);
  return Number.isFinite(value) ? value : null;
}
function excelSerialDate(value) {
  const serial = Number(value);
  if (!Number.isFinite(serial) || serial <= 0) return null;
  const millis = Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000;
  const date = new Date(millis);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null;
}
function parseMonthText(value) {
  const text = String(value ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  if (/^\d{4}-\d{2}$/.test(text)) return `${text}-01`;
  if (/^\d{4}M\d{2}$/.test(text)) return `${text.slice(0, 4)}-${text.slice(5)}-01`;
  const match = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(text);
  if (match) {
    const months = {Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};
    const month = months[match[2][0].toUpperCase() + match[2].slice(1).toLowerCase()];
    if (!month) return null;
    return `${match[3]}-${String(month).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`;
  }
  return excelSerialDate(text);
}
function findHeader(rows, requiredValues) {
  for (const row of rows) {
    const index = new Map();
    for (const [ref, cell] of Object.entries(row.cells)) {
      index.set(String(cell.value).trim(), cellColumn(ref));
    }
    if (requiredValues.every(value => index.has(value))) return {row, index};
  }
  return null;
}
function valueAt(row, column) {
  if (!row || !column) return undefined;
  return row.cells?.[`${column}${row.rowNum}`]?.value;
}
function standardRow(observationDate, value, extra = {}) {
  return {
    observationDate,
    value,
    releaseDate: null,
    availableAt: null,
    vintageId: null,
    vintageMethod: 'CURRENT_VINTAGE_ONLY',
    ...extra,
  };
}

export async function parseCmdiWorkbook(bytes) {
  const workbook = await readXlsxWorkbook(bytes);
  let match = null;
  for (const [sheetName, rows] of workbook.sheets) {
    const header = findHeader(rows, ['eow_friday', 'Market CMDI', 'IG CMDI', 'HY CMDI']);
    if (header) { match = {sheetName, rows, ...header}; break; }
  }
  if (!match) fail('CMDI_SCHEMA_NOT_FOUND');

  const dateCol = match.index.get('eow_friday');
  const marketCol = match.index.get('Market CMDI');
  const igCol = match.index.get('IG CMDI');
  const hyCol = match.index.get('HY CMDI');
  const percentileNames = ['p5','p10','p25','p50','p75','p90','p95','p99'];
  const percentileCols = Object.fromEntries(
    percentileNames.filter(name => match.index.has(name)).map(name => [name, match.index.get(name)])
  );

  const out = [];
  for (const row of match.rows) {
    if (row.rowNum <= match.row.rowNum) continue;
    const observationDate = parseMonthText(valueAt(row, dateCol));
    if (!observationDate) continue;
    const market = Number(valueAt(row, marketCol));
    const ig = Number(valueAt(row, igCol));
    const hy = Number(valueAt(row, hyCol));
    if (![market, ig, hy].every(Number.isFinite)) fail(`CMDI_INVALID_NUMERIC:${row.rowNum}`);
    const percentiles = {};
    for (const [name, col] of Object.entries(percentileCols)) {
      const value = Number(valueAt(row, col));
      percentiles[name] = Number.isFinite(value) ? value : null;
    }
    out.push({
      observationDate,
      market,
      ig,
      hy,
      percentiles,
      releaseDate: null,
      availableAt: null,
      vintageId: null,
      vintageMethod: 'CURRENT_VINTAGE_ONLY',
    });
  }
  if (!out.length) fail('CMDI_NO_ROWS');
  out.sort((a,b) => a.observationDate.localeCompare(b.observationDate));
  return {
    source: 'NY_FED_CMDI',
    sheet: match.sheetName,
    status: 'READY_CURRENT_VINTAGE_RAW',
    rows: out,
  };
}

async function parseGscpiWorkbookViaXlsxLite(bytes) {
  const workbook = await readXlsxWorkbook(bytes);
  const candidates = [
    {sheet:'GSCPI Monthly Data', valueHeader:'GSCPI'},
    {sheet:'SCPI', valueHeader:'Global'},
  ];

  let match = null;
  for (const candidate of candidates) {
    const rows = workbook.sheets.get(candidate.sheet);
    if (!rows) continue;
    const header = findHeader(rows, ['Date', candidate.valueHeader]);
    if (header) {
      match = {rows, header, ...candidate};
      break;
    }
  }
  if (!match) fail('GSCPI_SCHEMA_NOT_FOUND');

  const dateCol = match.header.index.get('Date');
  const globalCol = match.header.index.get(match.valueHeader);
  const out = [];
  for (const row of match.rows) {
    if (row.rowNum <= match.header.row.rowNum) continue;
    const observationDate = parseMonthText(valueAt(row, dateCol));
    const value = Number(valueAt(row, globalCol));
    if (!observationDate) continue;
    if (!Number.isFinite(value)) fail(`GSCPI_INVALID_NUMERIC:${row.rowNum}`);
    out.push(standardRow(observationDate.slice(0,7) + '-01', value));
  }
  if (!out.length) fail('GSCPI_NO_ROWS');
  return {
    source: 'NY_FED_GSCPI',
    sheet: match.sheet,
    status: 'READY_CURRENT_VINTAGE_RAW',
    rows: out.sort((a,b) => a.observationDate.localeCompare(b.observationDate)),
  };
}

export async function parseWorldBankCopperWorkbook(bytes) {
  const workbook = await readXlsxWorkbook(bytes);
  const rows = workbook.sheets.get('Monthly Prices');
  if (!rows) fail('WORLD_BANK_MONTHLY_SHEET_NOT_FOUND');

  const header = findHeader(rows, ['Copper']);
  if (!header) fail('COPPER_HEADER_NOT_FOUND');
  const copperCol = header.index.get('Copper');
  if (copperCol !== 'BM') fail(`COPPER_COLUMN_CHANGED:${copperCol}`);

  const unitRow = rows.find(row => row.rowNum === header.row.rowNum + 1);
  const unit = valueAt(unitRow, copperCol);
  if (unit !== '($/mt)') fail(`COPPER_UNIT_CHANGED:${unit}`);

  const out = [];
  for (const row of rows) {
    if (row.rowNum <= header.row.rowNum + 1) continue;
    const observationDate = parseMonthText(valueAt(row, 'A'));
    const value = Number(valueAt(row, copperCol));
    if (!observationDate || !Number.isFinite(value)) continue;
    out.push(standardRow(observationDate.slice(0,7) + '-01', value, {unit: '$/mt'}));
  }
  if (out.length < 12) fail('COPPER_INSUFFICIENT_ROWS');
  return {
    source: 'WORLD_BANK_PINK_SHEET',
    sheet: 'Monthly Prices',
    column: copperCol,
    unit,
    status: 'READY_CURRENT_VINTAGE_RAW',
    rows: out.sort((a,b) => a.observationDate.localeCompare(b.observationDate)),
  };
}

async function fetchBytesBounded(url, {
  fetchImpl = globalThis.fetch,
  allowedHosts,
  timeoutMs = 12000,
  maxBytes = 15_000_000,
  maxRequests = 4,
} = {}) {
  let current = new URL(url);
  let requests = 0;
  while (true) {
    if (!allowedHosts.has(current.hostname)) fail('HOST_NOT_ALLOWED');
    if (requests >= maxRequests) fail('REQUEST_CAP_EXCEEDED');
    requests += 1;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(timeoutMs, 12000));
    try {
      const response = await Reflect.apply(fetchImpl, globalThis, [
        current,
        {redirect:'manual', signal:controller.signal, headers:{accept:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*'}},
      ]);
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) fail('REDIRECT_WITHOUT_LOCATION');
        current = new URL(location, current);
        continue;
      }
      if (!response.ok) fail(response.status === 429 ? 'QUOTA_EXCEEDED' : 'HTTP_ERROR');
      const reader = response.body?.getReader();
      if (!reader) fail('INVALID_RESPONSE');
      const chunks = [];
      let size = 0;
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) fail('BODY_LIMIT');
        chunks.push(value);
      }
      return {bytes:new Uint8Array(await new Blob(chunks).arrayBuffer()), requestCount:requests};
    } catch (error) {
      if (controller.signal.aborted) throw new OfficialWorkbookError('TIMEOUT');
      if (error instanceof OfficialWorkbookError || error instanceof XlsxLiteError) throw error;
      throw new OfficialWorkbookError('REQUEST_FAILED');
    } finally {
      clearTimeout(timer);
    }
  }
}

export async function fetchCmdiWorkbook(options = {}) {
  const started = Date.now();
  try {
    const fetched = await fetchBytesBounded(CMDI_XLSX_URL, {
      ...options,
      allowedHosts:new Set(['www.newyorkfed.org']),
    });
    const parsed = await parseCmdiWorkbook(fetched.bytes);
    return {...parsed, requestCount:fetched.requestCount, durationMs:Date.now()-started};
  } catch (error) {
    return {
      source:'NY_FED_CMDI',
      status:error?.status ?? 'REQUEST_FAILED',
      requestCount:0,
      durationMs:Date.now()-started,
      rows:[],
    };
  }
}

// R50.2 GSCPI-only legacy OLE/BIFF compatibility parser.
// The current NY Fed download is served as application/vnd.ms-excel and begins with the CFBF magic D0CF11E0A1B11AE1.
// Shared xlsx-lite remains unchanged; this path is used only for that OLE container.
function r502Fail(status){const e=new Error(status);e.status=status;throw e;}
function r502U16(b,o){if(o<0||o+2>b.length)r502Fail('GSCPI_OLE_TRUNCATED');return b.readUInt16LE(o)}
function r502U32(b,o){if(o<0||o+4>b.length)r502Fail('GSCPI_OLE_TRUNCATED');return b.readUInt32LE(o)}
function r502U64(b,o){if(o<0||o+8>b.length)r502Fail('GSCPI_OLE_TRUNCATED');const v=b.readBigUInt64LE(o);if(v>BigInt(Number.MAX_SAFE_INTEGER))r502Fail('GSCPI_OLE_SIZE_TOO_LARGE');return Number(v)}
const R502_FREE=0xffffffff, R502_END=0xfffffffe, R502_FATSECT=0xfffffffd, R502_DIFSECT=0xfffffffc;
function r502SectorOffset(sid,sectorSize){if(!Number.isInteger(sid)||sid<0)r502Fail('GSCPI_OLE_BAD_SECTOR');return (sid+1)*sectorSize}
function r502ReadSector(b,sid,sectorSize){const o=r502SectorOffset(sid,sectorSize);if(o+sectorSize>b.length)r502Fail('GSCPI_OLE_SECTOR_RANGE');return b.subarray(o,o+sectorSize)}
function r502ParseOle(bytes){
  const b=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes);
  if(b.length<512||b.subarray(0,8).toString('hex')!=='d0cf11e0a1b11ae1')r502Fail('GSCPI_OLE_MAGIC_INVALID');
  const major=r502U16(b,26),byteOrder=r502U16(b,28),sectorShift=r502U16(b,30),miniShift=r502U16(b,32);
  if(byteOrder!==0xfffe)r502Fail('GSCPI_OLE_BYTE_ORDER');
  const sectorSize=2**sectorShift,miniSectorSize=2**miniShift;
  if(![512,4096].includes(sectorSize)||miniSectorSize!==64)r502Fail('GSCPI_OLE_SECTOR_SIZE');
  const numFat=r502U32(b,44),firstDir=r502U32(b,48),miniCutoff=r502U32(b,56),firstMiniFat=r502U32(b,60),numMiniFat=r502U32(b,64),firstDifat=r502U32(b,68),numDifat=r502U32(b,72);
  const difat=[];
  for(let i=0;i<109;i++){const sid=r502U32(b,76+i*4);if(sid!==R502_FREE)difat.push(sid)}
  let dsid=firstDifat;
  for(let n=0;n<numDifat;n++){
    if(dsid===R502_END||dsid===R502_FREE)break;
    const sec=r502ReadSector(b,dsid,sectorSize),slots=sectorSize/4-1;
    for(let i=0;i<slots;i++){const sid=sec.readUInt32LE(i*4);if(sid!==R502_FREE)difat.push(sid)}
    dsid=sec.readUInt32LE(sectorSize-4);
  }
  if(difat.length<numFat)r502Fail('GSCPI_OLE_FAT_MISSING');
  const fat=[];
  for(const sid of difat.slice(0,numFat)){const sec=r502ReadSector(b,sid,sectorSize);for(let i=0;i<sectorSize/4;i++)fat.push(sec.readUInt32LE(i*4))}
  function chain(start,maxBytes=Infinity){
    if(start===R502_END||start===R502_FREE)return Buffer.alloc(0);
    const chunks=[];let sid=start,seen=new Set(),total=0;
    while(sid!==R502_END){
      if(sid===R502_FREE||sid===R502_FATSECT||sid===R502_DIFSECT||sid>=fat.length||seen.has(sid))r502Fail('GSCPI_OLE_CHAIN_INVALID');
      seen.add(sid);const sec=r502ReadSector(b,sid,sectorSize);chunks.push(sec);total+=sec.length;if(total>=maxBytes)break;sid=fat[sid];
    }
    return Buffer.concat(chunks).subarray(0,Math.min(total,maxBytes));
  }
  const dirBytes=chain(firstDir);
  const entries=[];
  for(let p=0;p+128<=dirBytes.length;p+=128){
    const nameLen=dirBytes.readUInt16LE(p+64);if(nameLen<2||nameLen>64)continue;
    const name=dirBytes.subarray(p,p+nameLen-2).toString('utf16le');const type=dirBytes[p+66];
    const start=dirBytes.readUInt32LE(p+116);const size=major===3?dirBytes.readUInt32LE(p+120):r502U64(dirBytes,p+120);
    entries.push({name,type,start,size});
  }
  const root=entries.find(x=>x.type===5);
  const miniFatBytes=(numMiniFat&&firstMiniFat!==R502_END&&firstMiniFat!==R502_FREE)?chain(firstMiniFat,numMiniFat*sectorSize):Buffer.alloc(0);
  const miniFat=[];for(let p=0;p+4<=miniFatBytes.length;p+=4)miniFat.push(miniFatBytes.readUInt32LE(p));
  const miniStream=root&&root.size?chain(root.start,root.size):Buffer.alloc(0);
  function readMini(start,size){
    const chunks=[];let sid=start,seen=new Set(),remaining=size;
    while(sid!==R502_END&&remaining>0){
      if(sid===R502_FREE||sid>=miniFat.length||seen.has(sid))r502Fail('GSCPI_OLE_MINICHAIN_INVALID');
      seen.add(sid);const o=sid*miniSectorSize;if(o>=miniStream.length)r502Fail('GSCPI_OLE_MINISECTOR_RANGE');
      const take=Math.min(miniSectorSize,remaining);chunks.push(miniStream.subarray(o,o+take));remaining-=take;sid=miniFat[sid];
    }
    if(remaining>0)r502Fail('GSCPI_OLE_MINICHAIN_SHORT');return Buffer.concat(chunks);
  }
  function readEntry(e){if(!e)return null;if(e.size<miniCutoff&&e.type===2)return readMini(e.start,e.size);return chain(e.start,e.size).subarray(0,e.size)}
  return {entries,readEntry};
}
function r502BiffRecords(buf,start=0){const out=[];let p=start;while(p+4<=buf.length){const id=buf.readUInt16LE(p),len=buf.readUInt16LE(p+2),end=p+4+len;if(end>buf.length)break;out.push({id,payload:buf.subarray(p+4,end),offset:p,next:end});p=end;if(id===0x000a)break;}return out}
function r502DecodeBoundSheetName(payload){if(payload.length<8)return null;const cch=payload[6],flags=payload[7],high=!!(flags&1),need=cch*(high?2:1);if(8+need>payload.length)return null;return high?payload.subarray(8,8+need).toString('utf16le'):payload.subarray(8,8+need).toString('latin1')}
class R502SegReader{constructor(segs){this.segs=segs;this.si=0;this.p=0;} avail(){return this.si<this.segs.length} cur(){return this.segs[this.si]} nextSeg(){this.si++;this.p=0;if(!this.avail())r502Fail('GSCPI_BIFF_SST_TRUNCATED')} raw(n){const chunks=[];let rem=n;while(rem>0){if(!this.avail())r502Fail('GSCPI_BIFF_SST_TRUNCATED');const s=this.cur();if(this.p>=s.length){this.nextSeg();continue;}const take=Math.min(rem,s.length-this.p);chunks.push(s.subarray(this.p,this.p+take));this.p+=take;rem-=take;}return Buffer.concat(chunks)} u8(){return this.raw(1)[0]} r502U16(){return this.raw(2).readUInt16LE(0)} r502U32(){return this.raw(4).readUInt32LE(0)} chars(cch,high){let out='';let rem=cch;while(rem>0){if(!this.avail())r502Fail('GSCPI_BIFF_SST_TRUNCATED');let s=this.cur();if(this.p>=s.length){this.nextSeg();s=this.cur();high=!!(this.u8()&1);}
 const unit=high?2:1;let max=Math.floor((s.length-this.p)/unit);if(max<=0){this.nextSeg();high=!!(this.u8()&1);continue;}const take=Math.min(rem,max),buf=s.subarray(this.p,this.p+take*unit);out+=high?buf.toString('utf16le'):buf.toString('latin1');this.p+=take*unit;rem-=take;}return out}}
function r502ParseSst(records){const idx=records.findIndex(r=>r.id===0x00fc);if(idx<0)return[];const first=records[idx].payload;if(first.length<8)r502Fail('GSCPI_BIFF_SST_INVALID');const segs=[first.subarray(8)];for(let i=idx+1;i<records.length&&records[i].id===0x003c;i++)segs.push(records[i].payload);const unique=first.readUInt32LE(4),rd=new R502SegReader(segs),out=[];for(let i=0;i<unique;i++){const cch=rd.r502U16(),flags=rd.u8(),high=!!(flags&1),rich=!!(flags&8),ext=!!(flags&4),runs=rich?rd.r502U16():0,extLen=ext?rd.r502U32():0;out.push(rd.chars(cch,high));if(rich)rd.raw(runs*4);if(ext)rd.raw(extLen);}return out}
function r502RkValue(rk){const div100=!!(rk&1);let v;if(rk&2){v=(rk|0)>>2;}else{const tmp=Buffer.alloc(8);tmp.writeUInt32LE(0,0);tmp.writeUInt32LE(rk&0xfffffffc,4);v=tmp.readDoubleLE(0);}return div100?v/100:v}
function r502ExcelMonth(n,date1904){if(!Number.isFinite(n))return null;const epoch=date1904?Date.UTC(1904,0,1):Date.UTC(1899,11,30);const d=new Date(epoch+Math.floor(n)*86400000);if(!Number.isFinite(d.getTime()))return null;return d.toISOString().slice(0,7)+'-01'}
function parseGscpiWorkbookOleBiff(bytes){const ole=r502ParseOle(bytes),e=ole.entries.find(x=>x.type===2&&(x.name==='Workbook'||x.name==='Book'));if(!e)r502Fail('GSCPI_BIFF_WORKBOOK_STREAM_MISSING');const wb=ole.readEntry(e);const globals=r502BiffRecords(wb,0);let date1904=false;for(const r of globals)if(r.id===0x0022&&r.payload.length>=2)date1904=!!r.payload.readUInt16LE(0);const sst=r502ParseSst(globals);let sheetOffset=null;for(const r of globals){if(r.id!==0x0085||r.payload.length<8)continue;const name=r502DecodeBoundSheetName(r.payload);if(name==='GSCPI Monthly Data'||name==='SCPI'){sheetOffset=r.payload.readUInt32LE(0);break;}}if(sheetOffset===null)r502Fail('GSCPI_BIFF_SHEET_NOT_FOUND');const recs=r502BiffRecords(wb,sheetOffset),rows=new Map();const set=(row,col,val)=>{if(!rows.has(row))rows.set(row,new Map());rows.get(row).set(col,val)};for(const r of recs){const p=r.payload;if(r.id===0x00fd&&p.length>=10)set(p.readUInt16LE(0),p.readUInt16LE(2),sst[p.readUInt32LE(6)]??'');else if(r.id===0x0203&&p.length>=14)set(p.readUInt16LE(0),p.readUInt16LE(2),p.readDoubleLE(6));else if(r.id===0x0006&&p.length>=14){const special=p.readUInt16LE(12)===0xffff;if(!special)set(p.readUInt16LE(0),p.readUInt16LE(2),p.readDoubleLE(6));}else if(r.id===0x027e&&p.length>=10)set(p.readUInt16LE(0),p.readUInt16LE(2),r502RkValue(p.readUInt32LE(6)));else if(r.id===0x00bd&&p.length>=12){const row=p.readUInt16LE(0),first=p.readUInt16LE(2),last=p.readUInt16LE(p.length-2);let q=4;for(let c=first;c<=last&&q+6<=p.length-2;c++,q+=6)set(row,c,r502RkValue(p.readUInt32LE(q+2)));}else if(r.id===0x0204&&p.length>=9){const row=p.readUInt16LE(0),col=p.readUInt16LE(2),cch=p.readUInt16LE(6),flags=p[8],high=!!(flags&1),need=cch*(high?2:1);if(9+need<=p.length)set(row,col,high?p.subarray(9,9+need).toString('utf16le'):p.subarray(9,9+need).toString('latin1'));}}
 let header=-1,dateCol=null,valCol=null;for(const [rn,cols] of [...rows].sort((a,b)=>a[0]-b[0])){for(const [c,v] of cols){const s=String(v??'').trim();if(s==='Date')dateCol=c;if(s==='GSCPI'||s==='Global')valCol=c;}if(dateCol!==null&&valCol!==null){header=rn;break;}}if(header<0)r502Fail('GSCPI_BIFF_SCHEMA_NOT_FOUND');const out=[];for(const [rn,cols] of [...rows].sort((a,b)=>a[0]-b[0])){if(rn<=header)continue;const d=cols.get(dateCol),v=Number(cols.get(valCol));let observationDate=null;if(typeof d==='number')observationDate=r502ExcelMonth(d,date1904);else{const t=Date.parse(String(d??''));if(Number.isFinite(t))observationDate=new Date(t).toISOString().slice(0,7)+'-01';}if(observationDate&&Number.isFinite(v))out.push({observationDate,value:v});}if(!out.length)r502Fail('GSCPI_BIFF_NO_ROWS');return {source:'NY_FED_GSCPI',sheet:'GSCPI Monthly Data',status:'READY_CURRENT_VINTAGE_RAW',rows:out};}

export async function parseGscpiWorkbook(bytes) {
  const b=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes);
  if(b.length>=8&&b.subarray(0,8).toString('hex')==='d0cf11e0a1b11ae1')return parseGscpiWorkbookOleBiff(b);
  return parseGscpiWorkbookViaXlsxLite(b);
}

export async function fetchGscpiWorkbook(options = {}) {
  const started = Date.now();
  try {
    const fetched = await fetchBytesBounded(GSCPI_XLSX_URL, {
      ...options,
      allowedHosts:new Set(['www.newyorkfed.org']),
    });
    const parsed = await parseGscpiWorkbook(fetched.bytes);
    return {...parsed, requestCount:fetched.requestCount, durationMs:Date.now()-started};
  } catch (error) {
    return {
      source:'NY_FED_GSCPI',
      status:error?.status ?? 'REQUEST_FAILED',
      requestCount:0,
      durationMs:Date.now()-started,
      rows:[],
    };
  }
}

export async function fetchWorldBankCopper(options = {}) {
  const started = Date.now();
  try {
    const fetched = await fetchBytesBounded(WORLD_BANK_COPPER_XLSX_URL, {
      ...options,
      allowedHosts:new Set(['thedocs.worldbank.org']),
    });
    const parsed = await parseWorldBankCopperWorkbook(fetched.bytes);
    return {...parsed, requestCount:fetched.requestCount, durationMs:Date.now()-started};
  } catch (error) {
    return {
      source:'WORLD_BANK_PINK_SHEET',
      status:error?.status ?? 'REQUEST_FAILED',
      requestCount:0,
      durationMs:Date.now()-started,
      rows:[],
    };
  }
}
