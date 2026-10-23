import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {createHash} from 'node:crypto';
import {auditOptionalPrices} from '../scripts/pc-writer/theme-optional-audit.mjs';import {regularHour15Rows} from '../scripts/pc-writer/theme-optional-score-r188.mjs';
test('missing new date is reported without relabeling an older price, and score drift cannot become verified',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'theme-audit-')),home=path.join(root,'themes/biotech');fs.mkdirSync(path.join(home,'raw'),{recursive:true});
 try{const format=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',hourCycle:'h23'}),files=[],all={};
  for(const symbol of ['IBB','XBI','SPY']){const rows=Array.from({length:1000},(_,i)=>{const time=new Date(Date.UTC(2023,0,1+i,20));if(format.format(time)==='16')time.setUTCHours(19);return {symbol,timestamp:time.toISOString(),close:100+i*.03+Math.sin(i*.12),is_gap:false};});all[symbol]=rows;
   const body=rows.map(JSON.stringify).join('\n'),sha=createHash('sha256').update(body).digest('hex'),relative='raw/'+symbol+'_'+sha+'.jsonl';fs.writeFileSync(path.join(home,relative),body);files.push({path:relative,sha256:sha,source:'https://example.test',collectedAt:'2026-10-23T00:00:00Z',observationFrom:'2023-01-01',observationThrough:'2025-09-26',priceMode:'TEST',schemaVersion:'TEST'});
  }
  fs.writeFileSync(path.join(home,'raw-manifest.json'),JSON.stringify({version:1,themeId:'biotech',files}));
  const dates=regularHour15Rows(all.SPY).map(p=>p.date),last=dates.at(-1),missing=new Date(Date.parse(last+'T00:00:00Z')+86400000).toISOString().slice(0,10);
  const prior={observationDate:last,methodologyVersion:'ETF_ONLY_T40_R20_V40_PAIR50',history:dates.slice(-252).map(date=>({date,score:0}))};
  const reference={status:'READY',observationDate:last,provisional:{points:[{date:missing}]}};
  const result=auditOptionalPrices({themeId:'biotech',dataRoot:root,reference,priorRecord:prior});assert.equal(result.status,'CONFIRMED_SCORE_REVISION_REVIEW');assert.deepEqual(result.provisional.points,[]);assert.deepEqual(result.audit.missingProvisionalDates,[missing]);assert.equal(result.publicWrites,0);
  assert.throws(()=>auditOptionalPrices({themeId:'biotech',dataRoot:root,reference:{...reference,observationDate:missing},priorRecord:prior}),/REAL_PRICE_DATE_OR_HISTORY_MISSING/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
