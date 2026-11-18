import test from 'node:test';
import assert from 'node:assert/strict';
import {CREDIT_R2_DIRECT_ORIGIN,treasuryParYearUrl,parseTreasuryParXml,
 parseChicagoNfciCsv,compareCreditOriginRows,fetchTreasuryParYear} from '../lib/diagnostic-layer/credit-r2-direct-origin.mjs';

const day='2026-11-18';
const entry=(date,[a,b,c,d])=>'<entry><m:properties>'+
 '<d:NEW_DATE m:type="Edm.DateTime">'+date+'T00:00:00</d:NEW_DATE>'+
 '<d:BC_2YEAR>'+a+'</d:BC_2YEAR><d:BC_5YEAR>'+b+'</d:BC_5YEAR>'+
 '<d:BC_10YEAR>'+c+'</d:BC_10YEAR><d:BC_30YEAR>'+d+'</d:BC_30YEAR>'+
 '</m:properties></entry>';
const feed=rows=>'<feed>'+rows.join('')+'</feed>';

test('documented Treasury API exact URL and NY Fed direct CMDI are preserved',()=>{
 const url=treasuryParYearUrl(2026);
 assert.equal(url.hostname,'home.treasury.gov');
 assert.equal(url.searchParams.get('field_tdr_date_value'),'2026');
 assert.equal(url.searchParams.get('data'),'daily_treasury_yield_curve');
 assert.equal(CREDIT_R2_DIRECT_ORIGIN.cmdi,'https://www.newyorkfed.org/research/policy/cmdi');
 assert.throws(()=>treasuryParYearUrl(2099+5),/YEAR/);
});
test('four direct Treasury tenors carry only dated, genuine values',()=>{
 const result=parseTreasuryParXml(feed([
  entry('2026-11-16',['4.1','4.2','4.3','4.4']),
  entry('2026-11-17',['4.0','4.1','4.2','4.3']),
  entry('2026-11-19',['9','9','9','9'])]),{year:2026,asOfDate:day});
 assert.equal(result.status,'READY_CANDIDATE_ONLY');
 assert.deepEqual(Object.keys(result.series),['DGS2','DGS5','DGS10','DGS30']);
 assert.deepEqual(result.series.DGS10.map(x=>[x.observationDate,x.value]),
  [['2026-11-16',4.3],['2026-11-17',4.2]]);
 assert.equal(result.series.DGS5[0].releaseDate,null);
 assert.equal(result.series.DGS5[0].vintageMethod,'CURRENT_VINTAGE_ONLY');
 assert.ok(!result.series.DGS5.some(x=>x.observationDate==='2026-11-18'));
});
test('Treasury XML fails closed on missing data, bad dates and conflicts',()=>{
 assert.throws(()=>parseTreasuryParXml('<feed/>',{year:2026,asOfDate:day}),/NO_ENTRIES/);
 assert.throws(()=>parseTreasuryParXml(feed([entry('2026-02-30',[1,2,3,4])]),{year:2026,asOfDate:day}),/DATE/);
 assert.throws(()=>parseTreasuryParXml(feed([entry('2026-11-16',[1,2,3,4]),entry('2026-11-16',[1,3,3,4])]),{year:2026,asOfDate:day}),/DUPLICATE/);
});
test('Chicago NFCI Credit is not ANFCI, Risk or a contribution table',()=>{
 const csv='Date,NFCI,Credit,Risk,Leverage,ANFCI\n11/06/2026,0.1,-0.005,0.3,0.2,0.4\n11/13/2026,0.2,0,0.5,0.6,0.7\n11/20/2026,9,9,9,9,9\n';
 const result=parseChicagoNfciCsv(csv,{asOfDate:day});
 assert.deepEqual(result.rows.map(x=>[x.observationDate,x.value]),[['2026-11-06',-0.005],['2026-11-13',0]]);
 assert.throws(()=>parseChicagoNfciCsv('Date,ANFCI,Credit Contribution\n2026-11-06,1,2',{asOfDate:day}),/SCHEMA/);
 assert.throws(()=>parseChicagoNfciCsv('Date,NFCI,Credit\n2026-11-06,1,\n',{asOfDate:day}),/NUMERIC/);
});
test('parity detects drift and insufficient overlap before switch',()=>{
 const prior=Array.from({length:300},(_,i)=>({observationDate:
  new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10),value:i/100}));
 assert.equal(compareCreditOriginRows(prior,prior).status,'PARITY_PASS');
 const changed=prior.map(x=>({...x}));changed[260].value+=.01;
 assert.equal(compareCreditOriginRows(prior,changed).status,'NOT_PROVEN');
 assert.equal(compareCreditOriginRows(prior.slice(0,10),prior).status,'NOT_PROVEN');
});
test('Treasury official read makes one bounded request with no FRED key',async()=>{
 let calls=0;const body=feed([entry('2026-11-17',[3,3.1,3.2,3.3])]);
 const result=await fetchTreasuryParYear(2026,{asOfDate:day,fetchImpl:async function(url,opts){
  calls++;assert.equal(this,globalThis);
  assert.equal(url.hostname,'home.treasury.gov');
  assert.equal(opts.redirect,'manual');
  return new Response(body,{status:200});
 }});
 assert.equal(calls,1);assert.equal(result.series.DGS2[0].value,3);
});
