import test from "node:test";
import assert from "node:assert/strict";
import {
  inspectBeaText,
  inspectBlsPrText,
  inspectSecFsdsTexts,
  inspectXlsxArchive,
  listZipEntries,
  readZipEntry,
  sha256,
} from "../lib/market-score/earnings-e1-r5-offline-preflight.mjs";

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

test("SEC FSDS fixture identifies accepted R5 facts without treating rejected facts as data",()=>{
  const sub=[
    "adsh\tcik\tform\tperiod\tfiled\tfy\tfp\tsic",
    "0001\t1001\t10-Q\t20260630\t20260801\t2026\tQ2\t3571",
    "0002\t1002\t8-K\t20260630\t20260802\t2026\tQ2\t3571",
  ].join("\n");
  const num=[
    "adsh\ttag\tversion\tddate\tqtrs\tuom\tvalue\tcoreg",
    "0001\tEarningsPerShareDiluted\tus-gaap/2026\t20260630\t1\tUSD-per-shares\t2.5\t",
    "0001\tRevenues\tus-gaap/2026\t20260630\t1\tUSD\t100\t",
    "0001\tNetCashProvidedByUsedInOperatingActivities\tus-gaap/2026\t20260630\t2\tUSD\t25\t",
    "0001\tPaymentsToAcquirePropertyPlantAndEquipment\tus-gaap/2026\t20260630\t2\tUSD\t5\t",
    "0001\tCustomRegistrantMetric\t0001\t20260630\t1\tUSD\t8\t",
    "0001\tRevenues\tus-gaap/2026\t20260630\t2\tUSD\t200\t",
    "0002\tRevenues\tus-gaap/2026\t20260630\t1\tUSD\t999\t",
  ].join("\n");
  const result=inspectSecFsdsTexts({subText:sub,numText:num});
  assert.equal(result.status,"PASS");
  assert.equal(result.submissionCount,1);
  assert.equal(result.acceptedFacts.eps,1);
  assert.equal(result.acceptedFacts.revenue,1);
  assert.equal(result.acceptedFacts.operatingCashFlow,1);
  assert.equal(result.acceptedFacts.capex,1);
  assert.equal(result.rejected.UNMAPPED_TAG,1);
  assert.equal(result.rejected.INVALID_DURATION,1);
  assert.equal(result.uniqueCiks.revenue,1);
});

test("BLS PR flat-file parser keeps quarterly PRS85006111 and skips Q05 annual average",()=>{
  const source=[
    "series_id\tyear\tperiod\tvalue\tfootnote_codes",
    "PRS85006111\t2025\tQ04\t1.8\t",
    "PRS85006111\t2025\tQ05\t2.2\t",
    "PRS85006111\t2026\tQ01\t0.4\t",
    "PRS85006111\t2026\tQ02\t1.4\tR",
    "OTHER\t2026\tQ02\t9.9\t",
  ].join("\n");
  const result=inspectBlsPrText(source);
  assert.equal(result.status,"PASS");
  assert.equal(result.observationCount,3);
  assert.equal(result.annualAverageRowsSkipped,1);
  assert.deepEqual(result.latest,{year:2026,quarter:2,period:"Q02",value:1.4,revised:true});
});

test("BEA preflight requires the approved A051RC or corporate-profits marker",()=>{
  assert.equal(inspectBeaText("SeriesCode,Line\nA051RC,4709.5").status,"PASS");
  assert.equal(inspectBeaText("Corporate profits with inventory valuation and capital consumption adjustments").status,"PASS");
  assert.equal(inspectBeaText("other series").status,"PARTIAL");
});

test("minimal XLSX archive is recognized and cell schema is sampled using only Node built-ins",()=>{
  const workbook='<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Satellite Input" sheetId="1" r:id="rId1"/></sheets></workbook>';
  const relationships='<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml" Type="worksheet"/></Relationships>';
  const shared='<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>Code</t></si><si><t>IN327</t></si></sst>';
  const sheet='<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="inlineStr"><is><t>2026-08</t></is></c></row><row r="2"><c r="A2" t="s"><v>1</v></c><c r="B2"><v>123.456</v></c></row></sheetData></worksheet>';
  const archive=storedZip({
    "[Content_Types].xml":"<Types/>",
    "xl/workbook.xml":workbook,
    "xl/_rels/workbook.xml.rels":relationships,
    "xl/sharedStrings.xml":shared,
    "xl/worksheets/sheet1.xml":sheet,
  });
  const entries=listZipEntries(archive);
  assert.equal(entries.length,5);
  assert.equal(readZipEntry(archive,entries.find(x=>x.name==="xl/workbook.xml")).toString("utf8"),workbook);
  const report=inspectXlsxArchive(archive);
  assert.equal(report.status,"PASS");
  assert.deepEqual(report.sheets,["Satellite Input"]);
  assert.equal(report.worksheetEntryCount,1);
  assert.deepEqual(report.samples[0].inputCodeCandidates,["IN327"]);
  assert.deepEqual(report.samples[0].sampledRows[1].cells,["IN327",123.456]);
  assert.match(sha256(archive),/^[a-f0-9]{64}$/);
});
