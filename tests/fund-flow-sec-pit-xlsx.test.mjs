import test from "node:test";
import assert from "node:assert/strict";
import {deflateRawSync} from "node:zlib";
import {parseSecFundFlowSupportingXlsx,parseSecFundFlowTableMatrix} from "../lib/market-score/sec-fund-flow-xlsx-r1.mjs";
import {buildSecFundFlowPitSignals} from "../scripts/pc-writer/backtest-sec-fund-flow-pit-r1.mjs";

function crcIgnoredZip(entries){
  const locals=[],centrals=[];let offset=0;
  for(const [name,text] of Object.entries(entries)){
    const n=Buffer.from(name),raw=Buffer.from(text),compressed=deflateRawSync(raw);
    const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt16LE(8,8);local.writeUInt32LE(compressed.length,18);local.writeUInt32LE(raw.length,22);local.writeUInt16LE(n.length,26);
    locals.push(local,n,compressed);
    const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(8,10);central.writeUInt32LE(compressed.length,20);central.writeUInt32LE(raw.length,24);central.writeUInt16LE(n.length,28);central.writeUInt32LE(offset,42);
    centrals.push(central,n);offset+=local.length+n.length+compressed.length;
  }
  const centralBuf=Buffer.concat(centrals),localBuf=Buffer.concat(locals),eocd=Buffer.alloc(22);eocd.writeUInt32LE(0x06054b50,0);eocd.writeUInt16LE(Object.keys(entries).length,8);eocd.writeUInt16LE(Object.keys(entries).length,10);eocd.writeUInt32LE(centralBuf.length,12);eocd.writeUInt32LE(localBuf.length,16);
  return Buffer.concat([localBuf,centralBuf,eocd]);
}
function cell(ref,type,value){
  return type==="s"?'<c r="'+ref+'" t="s"><v>'+value+'</v></c>':'<c r="'+ref+'"><v>'+value+'</v></c>';
}
function workbookFixture(){
  const strings=[
    "Table 3.2: Aggregate Inflows, Outflows, and Net Flows of Index and Non-Index Funds (Percent of Net Assets)",
    "All","Net","Index","Non-Index","Outflow"
  ];
  const ss='<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+strings.map(x=>'<si><t>'+x+'</t></si>').join('')+'</sst>';
  const vals=Array.from({length:12},(_,i)=>0.1+i/100);
  const row=(r,fundIdx,flowIdx,series)=>'<row r="'+r+'">'+cell('A'+r,'s',fundIdx)+cell('B'+r,'s',flowIdx)+series.map((v,i)=>cell(String.fromCharCode(67+i)+r,'n',v)).join('')+'</row>';
  const sheet='<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+
    '<row r="1">'+cell('A1','s',0)+'</row>'+
    row(2,1,2,vals)+row(3,3,2,vals.map(x=>x+.2))+row(4,4,2,vals.map(x=>x-.2))+row(5,1,5,vals.map(x=>-2-x))+
    '</sheetData></worksheet>';
  return crcIgnoredZip({
    "xl/workbook.xml":'<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="3.2" sheetId="1" r:id="rId1"/></sheets></workbook>',
    "xl/_rels/workbook.xml.rels":'<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
    "xl/sharedStrings.xml":ss,
    "xl/worksheets/sheet1.xml":sheet,
  });
}

test("SEC supporting XLSX parser reconstructs Table 3.2 percentage rows",()=>{
  const out=parseSecFundFlowSupportingXlsx(workbookFixture(),{periodEnd:"2025-12-31"});
  assert.equal(out.status,"READY");
  assert.equal(out.rows.length,12);
  assert.equal(out.rows[0].observationDate,"2025-01-01");
  assert.equal(out.rows.at(-1).observationDate,"2025-12-01");
  assert.equal(out.rows[0].allNetRatio,.1);
  assert.ok(Math.abs(out.rows[0].indexNetRatio-.3)<1e-12);
  assert.equal(out.rows[0].nonIndexNetRatio,-.1);
  assert.equal(out.rows[0].allOutflowRatio,-2.1);
});

test("matrix parser accepts the combined series labels used by SEC supporting data",()=>{
  const vals=Array.from({length:18},(_,i)=>0.1+i/100);
  const matrix=[
    ["Historical supporting data"],
    ["All - Net",...vals],
    ["Index - Net",...vals.map(x=>x+.2)],
    ["Non-Index - Net",...vals.map(x=>x-.2)],
    ["All - Outflow",...vals.map(x=>-2-x)],
  ];
  const out=parseSecFundFlowTableMatrix(matrix,{periodEnd:"2025-12-31",sheetName:"Supporting Data"});
  assert.equal(out.length,12);
  assert.equal(out[0].observationDate,"2025-01-01");
  assert.equal(out.at(-1).observationDate,"2025-12-01");
  assert.ok(Math.abs(out[0].allNetRatio-.16)<1e-12);
  assert.ok(Math.abs(out[0].indexNetRatio-.36)<1e-12);
  assert.ok(Math.abs(out[0].nonIndexNetRatio-(-.04))<1e-12);
  assert.ok(Math.abs(out[0].allOutflowRatio-(-2.16))<1e-12);
});

test("matrix parser requires all four Table 3.2 series",()=>{
  const matrix=[["Table 3.2: Aggregate Inflows, Outflows, and Net Flows of Index and Non-Index Funds (Percent of Net Assets)"],["All","Net",...Array(12).fill(.1)]];
  assert.equal(parseSecFundFlowTableMatrix(matrix,{periodEnd:"2025-12-31",sheetName:"3.2"}),null);
});

test("PIT signal builder applies later SEC vintages only after their release",()=>{
  const months=(start,count,offset=0)=>Array.from({length:count},(_,i)=>{
    const d=new Date(Date.UTC(2023,start-1+i,1)).toISOString().slice(0,10),x=.1+offset+i*.01;
    return {observationDate:d,value:x,allNetRatio:x,indexNetRatio:x+.2,nonIndexNetRatio:x-.1,allOutflowRatio:-2-x};
  });
  const a={periodEnd:"2023-12-31",availableAt:"2024-05-17",rows:months(1,12)};
  const b={periodEnd:"2024-03-31",availableAt:"2024-08-06",rows:months(4,12,.05)};
  const signals=buildSecFundFlowPitSignals([a,b]);
  assert.equal(signals.length,1);
  assert.equal(signals[0].availableAt,"2024-08-06");
  assert.equal(signals[0].periodEnd,"2024-03-31");
});

test("SEC PIT collector and backtest remain shadow-only",async()=>{
  const fs=await import("node:fs");
  const collect=fs.readFileSync(new URL("../scripts/pc-writer/collect-sec-fund-flow-pit.mjs",import.meta.url),"utf8");
  const backtest=fs.readFileSync(new URL("../scripts/pc-writer/backtest-sec-fund-flow-pit-r1.mjs",import.meta.url),"utf8");
  assert.match(collect,/shadowSecFundFlowPit/);
  assert.match(collect,/storedForShadowOnly:true/);
  assert.match(backtest,/SEC_FUND_FLOW_RELEASE_VINTAGE_PIT_BACKTEST_ONLY/);
  assert.match(backtest,/lookAheadSafe:true/);
  assert.match(backtest,/formulaSelected:false/);
  assert.match(backtest,/weightSelected:false/);
  assert.doesNotMatch(collect,/publishMarket|remote\.|--publish/);
  assert.doesNotMatch(backtest,/publishMarket|remote\.|--publish|INSERT INTO|UPDATE |DELETE FROM/);
});
