import test from 'node:test';
import assert from 'node:assert/strict';
import {reportUnmappedHighStarIssuers} from '../lib/market-calendar-issuer-alias-coverage.mjs';
import {koreanCompanyAliasStatus,koreanCompanyName} from '../lib/market-calendar-company-ko.mjs';

const day=(date,rows)=>({day:date,body:{date,pre:rows.map(([symbol,name])=>
 ({symbol,name})),after:[],notSupplied:[]}});
const score=(issuerId,tickers,value)=>({issuerId,tickers,score:value});
const output=scores=>({status:'READY_ER1_PUBLIC',asOf:'2026-11-08',scores});

test('saved ★★★ and ★★ issuers yield only unverified Korean-name review entries',()=>{
 const saved=[day('2026-11-10',[
  ['AAPL','Apple Inc.'],['BA','The Boeing Company'],
  ['ZZZZ','New Company Inc.'],['MSFT','Microsoft Corporation']]),
 day('2026-11-12',[
  ['AAPL','Different Holdings Inc.'],['ZZZZ','New Company Inc.']])];
 const before=JSON.stringify(saved);
 const result=reportUnmappedHighStarIssuers(saved,output([
  score('AAPL',['AAPL'],98),score('BA',['BA'],85),
  score('ZZZZ',['ZZZZ'],90),score('MSFT',['MSFT'],84.99)]));
 assert.equal(result.status,'READY_PRIVATE_REVIEW');
 assert.equal(result.highStarIssuerCount,3);
 assert.equal(result.unmappedIssuerCount,2);
 assert.equal(result.unmappedNameCount,2);
 assert.equal(result.providerRequests,0);
 assert.equal(result.truncated,false);
 assert.deepEqual(result.candidates,[
  {ticker:'AAPL',englishIssuer:'Different Holdings Inc.',stars:3,score:98,
   firstEventDate:'2026-11-12',reason:'ISSUER_NAME_MISMATCH'},
  {ticker:'ZZZZ',englishIssuer:'New Company Inc.',stars:2,score:90,
   firstEventDate:'2026-11-10',reason:'UNREGISTERED_TICKER'},
 ]);
 assert.equal(JSON.stringify(saved),before);
});

test('repeated days and share classes do not create duplicate issuer reviews',()=>{
 const saved=[day('2026-11-10',[
  ['GOOG','Alphabet Inc.'],['GOOGL','Alphabet Inc.'],['ZZZZ','Future Labs'],
 ]),day('2026-11-12',[['ZZZZ','Future Labs']])];
 const result=reportUnmappedHighStarIssuers(saved,output([
  score('ALPHABET',['GOOG','GOOGL'],98),score('ZZZZ',['ZZZZ'],85),
 ]));
 assert.equal(result.highStarIssuerCount,2);
 assert.equal(result.unmappedIssuerCount,1);
 assert.equal(result.unmappedNameCount,1);
 assert.equal(result.candidates[0].firstEventDate,'2026-11-10');
});

test('a past ticker name cannot raise a false alert for the current forecast cohort',()=>{
 const saved=[day('2026-11-10',[['AAPL','Different Historical Issuer']]),
  day('2026-11-12',[['AAPL','Apple Inc.']])];
 const result=reportUnmappedHighStarIssuers(saved,{
  ...output([score('AAPL',['AAPL'],99)]),asOf:'2026-11-11',
 });
 assert.equal(result.highStarIssuerCount,1);
 assert.equal(result.unmappedIssuerCount,0);
 assert.deepEqual(result.candidates,[]);
});

test('missing source name is flagged and malformed private input cannot be called ready',()=>{
 const result=reportUnmappedHighStarIssuers([day('2026-11-10',[])],
  output([score('MISSING',['MISSING'],99)]));
 assert.equal(result.candidates[0].reason,'SOURCE_NAME_NOT_FOUND');
 assert.equal(result.candidates[0].englishIssuer,null);
 assert.throws(()=>reportUnmappedHighStarIssuers([{}],output([])),
  /ER1_ALIAS_COVERAGE_SAVED_DAY_INVALID/);
});

test('public Korean display resolution is unchanged and independently reports mismatch',()=>{
 assert.equal(koreanCompanyName(['AAPL'],'Apple Inc.'),'애플');
 assert.equal(koreanCompanyAliasStatus(['AAPL'],'Apple Inc.'),'MAPPED');
 assert.equal(koreanCompanyName(['AAPL'],'Different Holdings'),null);
 assert.equal(koreanCompanyAliasStatus(['AAPL'],'Different Holdings'),
  'ISSUER_NAME_MISMATCH');
 assert.equal(koreanCompanyAliasStatus(['ZZZZ'],'New Company Inc.'),
  'UNREGISTERED_TICKER');
 assert.equal(koreanCompanyName(['KKR'],'KKR &amp; Co. Inc.'),'케이케이알');
});
