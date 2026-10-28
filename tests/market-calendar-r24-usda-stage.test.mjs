import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {parseUsdaWasdeHtml,USDA_WASDE_URL} from '../staging/market-calendar/r24-usda/lib/usda-calendar.mjs';
import {R24_USDA_URL,runR24UsdaSourceExport} from '../scripts/pc-writer/market-calendar-r24-usda-source-export.mjs';

const years={
 2026:'Jan. 12, Feb. 10, Mar. 10, Apr. 9, May 12, Jun. 11, Jul. 10, Aug. 12, Sep. 11, Oct. 9, Nov. 10, and Dec. 10.',
 2027:'Jan. 12, Feb. 10, Mar.  10, Apr.  9, May  12, Jun. 11, Jul.  9, Aug. 12, Sep.  10, Oct.  8, Nov. 10, and Dec. 10.',
};
const page=(text)=>`<!DOCTYPE html><html><title>WASDE Report | USDA</title><body><h1>WASDE Report</h1><main>${text}</main><footer>USDA</footer></body></html>`;
const content=page(Object.entries(years).map(([year,dates])=>
 `<h5>${year} WASDE Release Dates (12:00pm ET)</h5><p>In ${year} the WASDE report will be released on ${dates}</p>`).join(''));

test('R24 official page includes distinct explicit 2026 and 2027 release years',()=>{
 const found=parseUsdaWasdeHtml(content,{fromDate:'2026-10-28'});
 assert.equal(found.length,14);
 assert.deepEqual(found.slice(0,3).map(e=>e.date),['2026-11-10','2026-12-10','2027-01-12']);
 assert.equal(found.at(-1).date,'2027-12-10');
 assert.ok(found.every(e=>e.id==='usda-wasde'&&e.source==='usda'&&e.sourceUrl===USDA_WASDE_URL));
});

test('R24 fails closed on absent, incomplete, or invented dates',()=>{
 assert.throws(()=>parseUsdaWasdeHtml(page('<p>monthly report</p>')),/USDA_WASDE_OFFICIAL_DATES_MISSING/);
 assert.throws(()=>parseUsdaWasdeHtml(page(`<h5>2027 WASDE Release Dates (12:00pm ET)</h5><p>In 2027 the WASDE report will be released on Jan. 12.</p>`)),/USDA_WASDE_YEAR_INCOMPLETE/);
 assert.throws(()=>parseUsdaWasdeHtml(content,{fromDate:'invalid'}),/USDA_FROM_DATE_INVALID/);
});

test('R24 captures one exact public USDA page and cannot change PC Core',async()=>{
 const urls=[];
 const result=await runR24UsdaSourceExport({now:Date.parse('2026-10-28T06:00:00Z'),
  fetchImpl:async url=>{urls.push(url);return new Response(content);}});
 assert.deepEqual(urls,[R24_USDA_URL]);
 assert.equal(result.decision,'USDA_HTML_CAPTURED_READONLY');
 assert.equal(result.phase,'READ_ONLY');
 const raw=Buffer.from(result.officialHtmlBase64,'base64');
 assert.equal(raw.toString('utf8'),content);
 assert.equal(result.sha256,createHash('sha256').update(raw).digest('hex'));
 for(const key of ['coreSourceChanged','configChanged','schedulerChanged','dbChanged','publisherExecuted','collectionExecuted','gitPushed','forcedCollection'])assert.equal(result[key],false,key);
});

test('R24 handles HTTP errors and blocks redirects, fake pages, and changed URLs',async()=>{
 const unavailable=await runR24UsdaSourceExport({fetchImpl:async()=>new Response('rate limited',{status:429})});
 assert.equal(unavailable.errorCode,'HTTP_NOT_OK');
 assert.equal(unavailable.officialHtmlBase64,undefined);
 let called=false;
 const unexpected=await runR24UsdaSourceExport({url:'https://example.com/private',fetchImpl:async()=>{called=true;}});
 assert.equal(called,false);
 assert.equal(unexpected.errorCode,'URL_NOT_ALLOWED');
 const invalid=await runR24UsdaSourceExport({fetchImpl:async()=>new Response('<html><title>USDA login</title></html>')});
 assert.equal(invalid.errorCode,'NOT_RECOGNIZED_USDA_HTML');
 const redirected=await runR24UsdaSourceExport({fetchImpl:async()=>({ok:true,status:200,url:'https://fake.usda.gov/',headers:new Headers(),arrayBuffer:async()=>Buffer.from(content)})});
 assert.equal(redirected.errorCode,'REDIRECT_NOT_ALLOWED');
});
