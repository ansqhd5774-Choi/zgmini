import test from "node:test";
import assert from "node:assert/strict";
import {
  parseBeaA051rcQuarterlyWorkbook,
  parseBlsSatelliteInputWorkbook,
} from "../lib/market-score/earnings-e1-r5-source-parsers.mjs";

function storedZip(files){
  const local=[];const central=[];let offset=0;
  for(const [name,value] of Object.entries(files)){
    const nameBytes=Buffer.from(name),data=Buffer.from(value);
    const header=Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50,0);header.writeUInt16LE(20,4);header.writeUInt16LE(0,6);header.writeUInt16LE(0,8);
    header.writeUInt32LE(0,14);header.writeUInt32LE(data.length,18);header.writeUInt32LE(data.length,22);header.writeUInt16LE(nameBytes.length,26);header.writeUInt16LE(0,28);
    local.push(header,nameBytes,data);
    const c=Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50,0);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0,8);c.writeUInt16LE(0,10);
    c.writeUInt32LE(0,16);c.writeUInt32LE(data.length,20);c.writeUInt32LE(data.length,24);c.writeUInt16LE(nameBytes.length,28);c.writeUInt16LE(0,30);c.writeUInt16LE(0,32);
    c.writeUInt16LE(0,34);c.writeUInt16LE(0,36);c.writeUInt32LE(0,38);c.writeUInt32LE(offset,42);
    central.push(c,nameBytes);
    offset+=header.length+nameBytes.length+data.length;
  }
  const centralBuffer=Buffer.concat(central),localBuffer=Buffer.concat(local),end=Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(0,4);end.writeUInt16LE(0,6);end.writeUInt16LE(Object.keys(files).length,8);end.writeUInt16LE(Object.keys(files).length,10);
  end.writeUInt32LE(centralBuffer.length,12);end.writeUInt32LE(localBuffer.length,16);end.writeUInt16LE(0,20);
  return Buffer.concat([localBuffer,centralBuffer,end]);
}
function xlsxFixture({sheetName="Data",sharedValues=[],rows=[]}={}){
  const workbook=`<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${sheetName}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const relationships='<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml" Type="worksheet"/></Relationships>';
  const shared=`<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${sharedValues.map(value=>`<si><t>${value}</t></si>`).join("")}</sst>`;
  const sheet=`<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.join("")}</sheetData></worksheet>`;
  return storedZip({"[Content_Types].xml":"<Types/>","xl/workbook.xml":workbook,"xl/_rels/workbook.xml.rels":relationships,"xl/sharedStrings.xml":shared,"xl/worksheets/sheet1.xml":sheet});
}
function s(ref,index){return `<c r="${ref}" t="s"><v>${index}</v></c>`;}
function n(ref,value){return `<c r="${ref}"><v>${value}</v></c>`;}

test("R9 BEA parser resolves multi-row quarterly headers and exact YoY pair",()=>{
  const shared=["Q2","Q3","Q1","A051RC","Corporate profits with IVA and CCAdj","B999RC"];
  const buffer=xlsxFixture({sheetName:"T11200-Q",sharedValues:shared,rows:[
    `<row r="1">${n("C1",2025)}${n("E1",2026)}</row>`,
    `<row r="2">${s("C2",0)}${s("D2",1)}${s("E2",2)}${s("F2",0)}</row>`,
    `<row r="3">${s("A3",3)}${s("B3",4)}${n("C3",100)}${n("D3",105)}${n("E3",110)}${n("F3",120)}</row>`,
    `<row r="4">${s("A4",5)}${s("B4",4)}${n("C4",900)}${n("D4",905)}${n("E4",910)}${n("F4",920)}</row>`,
  ]});
  const report=parseBeaA051rcQuarterlyWorkbook(buffer,{asOf:"2026-10-11"});
  assert.equal(report.status,"PASS");
  assert.equal(report.tableName,"T11200-Q");
  assert.equal(report.matchedRows.length,1);
  assert.equal(report.latest.period,"2026Q2");
  assert.equal(report.latest.value,120);
  assert.equal(report.priorYear.period,"2025Q2");
  assert.equal(report.priorYear.value,100);
  assert.equal(report.symmetricYoY,2*(120-100)/(120+100));
  assert.equal(report.conventionalYoYPercent,20);
  assert.equal(report.currentVintageOnly,true);
  assert.equal(report.lookAheadSafeHistorical,false);
});

test("R9 BLS satellite parser keeps only root IN### series and computes exact 3M annualized change",()=>{
  const shared=["Series","Title","2026-04","2026-05","2026-06","2026-07","IN327","Inputs to 327, excluding capital investment and labor","IN3271"];
  const buffer=xlsxFixture({sheetName:"Satellite",sharedValues:shared,rows:[
    `<row r="1">${s("A1",0)}${s("B1",1)}${s("C1",2)}${s("D1",3)}${s("E1",4)}${s("F1",5)}</row>`,
    `<row r="2">${s("A2",6)}${s("B2",7)}${n("C2",100)}${n("D2",101)}${n("E2",102)}${n("F2",104)}</row>`,
    `<row r="3">${s("A3",8)}${s("B3",7)}${n("C3",100)}${n("D3",101)}${n("E3",102)}${n("F3",104)}</row>`,
  ]});
  const report=parseBlsSatelliteInputWorkbook(buffer,{asOf:"2026-10-11"});
  assert.equal(report.status,"PASS");
  assert.equal(report.rootSeriesCount,1);
  assert.equal(report.annualized3mReadyCount,1);
  assert.equal(report.series[0].code,"IN327");
  assert.equal(report.series[0].naics,"327");
  assert.equal(report.series[0].latest.month,"2026-07-01");
  assert.equal(report.series[0].lag3m.month,"2026-04-01");
  assert.ok(Math.abs(report.series[0].annualized3m-400*Math.log(104/100))<1e-12);
  assert.equal(report.experimental,true);
  assert.equal(report.lookAheadSafeHistorical,false);
});

test("R10 BLS satellite parser resolves merged-year style month headers",()=>{
  const shared=["Series","Title","Oct","Nov","Dec","Jan","IN327","Inputs to 327, excluding capital investment and labor"];
  const buffer=xlsxFixture({sheetName:"Satellite",sharedValues:shared,rows:[
    `<row r="1">${n("C1",2025)}${n("F1",2026)}</row>`,
    `<row r="2">${s("A2",0)}${s("B2",1)}${s("C2",2)}${s("D2",3)}${s("E2",4)}${s("F2",5)}</row>`,
    `<row r="3">${s("A3",6)}${s("B3",7)}${n("C3",100)}${n("D3",101)}${n("E3",102)}${n("F3",104)}</row>`,
  ]});
  const report=parseBlsSatelliteInputWorkbook(buffer,{asOf:"2026-10-11"});
  assert.equal(report.status,"PASS");
  assert.equal(report.rootSeriesCount,1);
  assert.equal(report.annualized3mReadyCount,1);
  assert.equal(report.series[0].latest.month,"2026-01-01");
  assert.equal(report.series[0].lag3m.month,"2025-10-01");
  assert.ok(Math.abs(report.series[0].annualized3m-400*Math.log(104/100))<1e-12);
});

test("R9 parsers fail closed when required semantic rows are absent",()=>{
  const empty=xlsxFixture({sharedValues:["Header"],rows:[`<row r="1">${s("A1",0)}</row>`]});
  const bea=parseBeaA051rcQuarterlyWorkbook(empty,{asOf:"2026-10-11"});
  assert.equal(bea.status,"FAIL");
  assert.equal(bea.symmetricYoY??null,null);
  const bls=parseBlsSatelliteInputWorkbook(empty,{asOf:"2026-10-11"});
  assert.equal(bls.status,"PARTIAL");
  assert.equal(bls.rootSeriesCount,0);
});
