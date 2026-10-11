import test from "node:test";
import assert from "node:assert/strict";
import {
  E1_R5_OFFICIAL_SOURCE_MANIFEST,
  inspectBeaSection1Workbook,
} from "../lib/market-score/earnings-e1-r5-official-sources.mjs";

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

function beaFixture({quarterly=true,label=true,code=true}={}){
  const workbook=`<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${quarterly?"T11200-Q":"T11200-A"}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const relationships='<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml" Type="worksheet"/></Relationships>';
  const sharedValues=["Line","Series",...(code?["A051RC"]:[]),...(label?["Corporate profits with IVA and CCAdj"]:[])];
  const shared=`<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${sharedValues.map(value=>`<si><t>${value}</t></si>`).join("")}</sst>`;
  const codeIndex=code?2:null,labelIndex=label?(code?3:2):null;
  const row2=[codeIndex!=null?`<c r="A2" t="s"><v>${codeIndex}</v></c>`:"",labelIndex!=null?`<c r="B2" t="s"><v>${labelIndex}</v></c>`:"",'<c r="C2"><v>4709.5</v></c>'].join("");
  const sheet=`<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row><row r="2">${row2}</row></sheetData></worksheet>`;
  return storedZip({
    "[Content_Types].xml":"<Types/>",
    "xl/workbook.xml":workbook,
    "xl/_rels/workbook.xml.rels":relationships,
    "xl/sharedStrings.xml":shared,
    "xl/worksheets/sheet1.xml":sheet,
  });
}

test("E1-R5 official source manifest locks current no-key government downloads",()=>{
  const manifest=E1_R5_OFFICIAL_SOURCE_MANIFEST;
  assert.equal(manifest.secCompanyFacts.url,"https://www.sec.gov/Archives/edgar/daily-index/xbrl/companyfacts.zip");
  assert.equal(manifest.secCompanyFacts.userAgent,"ZGMINI/1.0 (+https://zgmini.kr)");
  assert.equal(manifest.blsUnitLaborCost.url,"https://download.bls.gov/pub/time.series/pr/pr.data.0.Current");
  assert.equal(manifest.blsUnitLaborCost.seriesId,"PRS85006111");
  assert.equal(manifest.blsProducerInput.url,"https://www.bls.gov/ppi/input-indexes/bls-satellite-input-to-industry-indexes.xlsx");
  assert.equal(manifest.beaCorporateProfits.url,"https://apps.bea.gov/national/Release/XLS/Survey/Section1All_xls.xlsx");
  assert.equal(manifest.beaCorporateProfits.seriesCode,"A051RC");
  assert.ok(Object.values(manifest).every(source=>source.required===true));
});

test("BEA Section 1 preflight accepts A051RC corporate-profit marker only on a quarterly sheet",()=>{
  const pass=inspectBeaSection1Workbook(beaFixture());
  assert.equal(pass.status,"PASS");
  assert.equal(pass.seriesCode,"A051RC");
  assert.equal(pass.quarterlyMatchCount,1);
  assert.equal(pass.matches[0].sheet,"T11200-Q");
  assert.equal(pass.matches[0].codeMatch,true);
  assert.equal(pass.matches[0].labelMatch,true);

  const annualOnly=inspectBeaSection1Workbook(beaFixture({quarterly:false}));
  assert.equal(annualOnly.status,"PARTIAL");
  assert.equal(annualOnly.reason,"BEA_MARKER_NOT_ON_QUARTERLY_SHEET");

  const missing=inspectBeaSection1Workbook(beaFixture({label:false,code:false}));
  assert.equal(missing.status,"PARTIAL");
  assert.equal(missing.reason,"BEA_SERIES_MARKER_NOT_FOUND");
});
