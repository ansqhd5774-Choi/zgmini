import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";
import {
  dolArchivedWeeklyClaimsPdfUrl,
  extractDolAdvanceFirstPageText,
  inspectDolAdvancePdf,
  fetchDolAdvancePdfCandidate,
} from "../lib/market-score/employment-r6-dol-advance-pdf-candidate.mjs";

const opts={releaseDate:"2026-11-19",expectedInitialWeekEnd:"2026-11-14"};
function makePdf({continuedDate="November 7",heading="Thursday, November 19, 2026",
  includeClaim=true,garbled=false}={}){
  const text=[
    "UNEMPLOYMENT INSURANCE WEEKLY CLAIMS",
    "SEASONALLY ADJUSTED DATA",
    heading,
    ...(includeClaim?[
      "In the week ending November 14, the advance figure for seasonally adjusted ",
      "initial claims",
      "was 203,000, an increase of 1,000.",
      "The 4", "-", "week moving average was 197,750, an increase of 2,000.",
      "The advance seasonally adjusted insured unemployment rate was 1.1 percent for the week ending November 7.",
      "The advance number for seasonally adjusted insured unemployment during the week ending "+continuedDate+" was 1,763,000.",
    ]:[]),
  ].map(s=> (garbled?"\u0001":s).replace(/[()\\]/g,c=>"\\"+c));
  const stream="BT\n"+text.map(s=>"[( "+s+" )] TJ").join("\n")+"\nET\n";
  const packed=deflateSync(Buffer.from(stream,"latin1"));
  return Buffer.concat([Buffer.from("%PDF-1.7\n1 0 obj\n<</Filter/FlateDecode>>\nstream\n","latin1"),
    packed,Buffer.from("\nendstream\nendobj\n%%EOF\n","latin1")]);
}
test("W04 PDF archive URLs use exact historical release date, not mutable latest endpoint",()=>{
  assert.equal(dolArchivedWeeklyClaimsPdfUrl("2026-11-19"),"https://oui.doleta.gov/press/2026/111926.pdf");
  assert.equal(dolArchivedWeeklyClaimsPdfUrl("2026-11-25"),"https://oui.doleta.gov/press/2026/112526.pdf");
  for(const bad of ["2026-02-30","2026-2-3","2026-00-12","2026-12-99",null])
    assert.equal(dolArchivedWeeklyClaimsPdfUrl(bad),null);
});
test("W04 PDF exact bytes hash and four distinct reference weeks are candidate-only",()=>{
  const pdf=makePdf();
  const text=extractDolAdvanceFirstPageText(pdf);
  assert.match(text,/UNEMPLOYMENT INSURANCE WEEKLY CLAIMS/);
  assert.match(text,/The 4-week moving average was 197,750/);
  const out=inspectDolAdvancePdf(pdf,{...opts,checkedAt:"2026-11-24T14:06:51.000Z"});
  assert.equal(out.status,"CANDIDATE_ONLY",JSON.stringify(out));
  assert.equal(out.source.sha256,createHash("sha256").update(pdf).digest("hex"));
  assert.equal(out.source.byteLength,pdf.byteLength);
  assert.equal(out.source.kind,"ETA538_ADVANCE_RELEASE_PDF");
  assert.deepEqual(out.rows.map(x=>x.value),[203000,197750,1763000,1.1]);
  assert.deepEqual(out.rows.map(x=>x.observationDate),
    ["2026-11-14","2026-11-14","2026-11-07","2026-11-07"]);
  assert.ok(out.rows.every(x=>!Object.hasOwn(x,"availableAt")&&!Object.hasOwn(x,"sourceHash")));
  assert.ok(!Object.hasOwn(out.source,"availableAt"));
});
test("W04 cross-release mix, absent series, invalid PDF and inconsistent references HOLD",()=>{
  for(const input of [
    [makePdf({heading:"Thursday, November 12, 2026"}),opts,"PDF_RELEASE_DATE_MISMATCH"],
    [makePdf({includeClaim:false}),opts,"SERIES_MISSING"],
    [makePdf({continuedDate:"October 31"}),opts,"WEEK_DATE_INCONSISTENT"],
    [Buffer.from("not a PDF"),opts,"PDF_LAYOUT_UNSUPPORTED"],
    [makePdf({garbled:true}),opts,"PDF_LAYOUT_UNSUPPORTED"],
    [makePdf(),{...opts,expectedInitialWeekEnd:"2026-11-07"},"WEEK_DATE_INCONSISTENT"],
  ]) {
    const out=inspectDolAdvancePdf(input[0],input[1]);
    assert.equal(out.status,"HOLD");
    assert.equal(out.reason,input[2],JSON.stringify(out));
    assert.deepEqual(out.rows,[]);
  }
});
test("W04 bounded official GET keeps precise candidate and never writes or fetches twice",async()=>{
  let calls=0;
  const pdf=makePdf();
  const result=await fetchDolAdvancePdfCandidate({...opts,
    now:()=>new Date("2026-11-24T14:06:51Z"),
    fetchImpl:async(url,request)=>{
      calls++;
      assert.equal(url,"https://oui.doleta.gov/press/2026/111926.pdf");
      assert.equal(request.method,"GET");
      return {ok:true,url,status:200,headers:{get:k=>k==="content-type"?"application/pdf":null},
        arrayBuffer:async()=>pdf};
    }});
  assert.equal(calls,1);
  assert.equal(result.status,"CANDIDATE_ONLY",JSON.stringify(result));
  assert.equal(result.source.checkedAt,"2026-11-24T14:06:51.000Z");
  assert.equal(Object.hasOwn(result,"rawBytes"),false);
});
test("W04 non-PDF, non-200, redirects and oversized body cannot enter candidates",async()=>{
  const pdf=makePdf();
  for(const scenario of [
    {response:{ok:false,status:503},reason:"PDF_HTTP_FAILED"},
    {response:{ok:true,status:200,headers:{get:()=>"text/html"}},reason:"PDF_CONTENT_TYPE_INVALID"},
    {response:{ok:true,url:"https://untrusted.example/other",status:200,headers:{get:()=>"application/pdf"}},reason:"PDF_REDIRECT_UNEXPECTED"},
    {response:{ok:true,status:200,headers:{get:k=>k==="content-type"?"application/pdf":"8000001"}},reason:"PDF_BYTES_TOO_LARGE"},
    {response:{ok:true,status:200,headers:{get:k=>k==="content-type"?"application/pdf":null},
      arrayBuffer:async()=>Buffer.concat([pdf,pdf])},reason:"PDF_BYTES_TOO_LARGE",maxBytes:pdf.length+1},
  ]){
    const out=await fetchDolAdvancePdfCandidate({...opts,
      ...(scenario.maxBytes?{maxBytes:scenario.maxBytes}:{}),
      fetchImpl:async()=>scenario.response});
    assert.equal(out.status,"HOLD");
    assert.equal(out.reason,scenario.reason);
    assert.deepEqual(out.rows,[]);
  }
});
