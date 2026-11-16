import test from 'node:test';
import assert from 'node:assert/strict';

test('W02 public taxonomy is published and calendar shell is deployed',async()=>{
 const base='https://zgmini.kr';
 const [tax,html]=await Promise.all([
  fetch(base+'/api/earnings-calendar-taxonomy',{headers:{'cache-control':'no-cache'}}),
  fetch(base+'/market-calendar/',{headers:{'cache-control':'no-cache'}})
 ]);
 let output;
 try{output=await tax.json()}catch{output=null}
 const text=await html.text();
 const report={
  status:tax.status===200&&output?.status==='READY_TAXONOMY_OPTIONS'&&
   Object.keys(output.sectors??{}).length>0&&html.status===200?'READY':'NOT_READY',
  taxonomyStatus:tax.status,
  sectorCount:Object.keys(output?.sectors??{}).length,
  industryOptions:Object.values(output?.sectors??{}).reduce((a,b)=>a+(Array.isArray(b)?b.length:0),0),
  sourceAsOf:output?.sourceAsOf??null,
  calendarStatus:html.status,
  hasTitle:text.includes('시장 캘린더'),
  rawHtmlLength:text.length
 };
 console.log('ZGMINI_W02_LIVE_TAXONOMY '+JSON.stringify(report));
 assert.equal(report.status,'READY');
});
