import test from 'node:test';
import assert from 'node:assert/strict';
import {buildR82ThemeRawInputs,summarizeR82NoRawRows} from '../lib/market-score/theme-r82-pit-axes-bridge.mjs';
const identities=[{isin:'US0378331005',ticker:'AAA',symbolIsinBindingVerified:true},{isin:'US5949181045',ticker:'BBB',symbolIsinBindingVerified:true}];
function inputs(n=260){
 const sessions=[];for(let i=0,d=new Date('2025-01-01T00:00:00Z');sessions.length<n;d.setUTCDate(d.getUTCDate()+1)){if(d.getUTCDay()!==0&&d.getUTCDay()!==6)sessions.push(d.toISOString().slice(0,10));if(i++>500)throw Error('runaway');}
 const memberships=sessions.map(date=>({date,firstPublicDate:date,issuerDailyHoldingsVerified:true,sourceType:'ISSUER_DAILY_HOLDINGS',members:identities}));
 const bars=sessions.flatMap((date,i)=>identities.map((id,j)=>({date,...id,close:j?300-i*.3:100+i*.5,volume:j?30:100,sourceVerified:true,splitAdjustmentVerified:true,volumeRevisionResolved:true})));
 return {sessions,memberships,bars,cutoffDate:sessions.at(-1),verifiedMarketSessions:true};
}
test('260 fully verified daily PIT rows produce R3-compatible breadth and demand raw inputs',()=>{
 const a=buildR82ThemeRawInputs(inputs());assert.equal(a.breadthReadyDates,9);assert.equal(a.demandReadyDates,259);
 assert.equal(a.latest.breadthReady,true);assert.equal(a.latest.demandReady,true);assert.equal(a.latest.memberCount,2);
 const last=a.privateRawInputs.breadthRows.at(-1);assert.equal(last.b50,.5);assert.equal(last.b200,.5);assert.equal(last.highLowNet,0);
 assert.ok(Math.abs(a.privateRawInputs.demandRows.at(-1).volumeBreadth-70/130)<1e-10);
 assert.equal(a.publicationAuthorized,false);
});
test('quarterly SEC NPORT or future-publicated snapshot is explicitly rejected',()=>{
 const x=inputs();x.memberships[0]={...x.memberships[0],sourceType:'SEC_NPORT_QUARTERLY'};
 assert.throws(()=>buildR82ThemeRawInputs(x),/UNVERIFIED_KNOWN_AT_MEMBERSHIP/);
 const y=inputs();y.memberships[0]={...y.memberships[0],firstPublicDate:'2026-08-21'};
 assert.throws(()=>buildR82ThemeRawInputs(y),/UNVERIFIED_KNOWN_AT_MEMBERSHIP/);
});
test('one missing daily issuer membership blocks only that date and latest if latest missing',()=>{
 const x=inputs();x.memberships.pop();const v=buildR82ThemeRawInputs(x);
 assert.equal(v.pitDaysVerified,259);assert.equal(v.latest.reason,'DAILY_ISSUER_MEMBERSHIP_MISSING');assert.equal(v.status,'RAW_INPUTS_INCOMPLETE_NO_SCORE');
});
test('missing constituent price does not turn into zero or false denominator',()=>{
 const x=inputs();x.bars.pop();const v=buildR82ThemeRawInputs(x);
 assert.equal(v.latest.memberCount,2);assert.equal(v.latest.matched,1);assert.equal(v.latest.breadthReady,true);assert.equal(v.latest.demandReady,true);assert.equal(v.latest.fullConstituentCoverage,false);
});
test('unapproved Alpaca volume revision cannot be used',()=>{
 const x=inputs();x.bars[1]={...x.bars[1],volumeRevisionResolved:false};assert.throws(()=>buildR82ThemeRawInputs(x),/BAR_PROVENANCE_NOT_VERIFIED/);
});
test('same-day volume-only disagreement fails without choosing a winner',()=>{
 const x=inputs();x.bars.push({...x.bars[0],volume:111});assert.throws(()=>buildR82ThemeRawInputs(x),/BAR_DUPLICATE_CONFLICT/);
});
test('older price close conflict also fails',()=>{
 const x=inputs();x.bars.push({...x.bars[0],close:101});assert.throws(()=>buildR82ThemeRawInputs(x),/BAR_DUPLICATE_CONFLICT/);
});
test('ticker ticker identity collision fails, even with different ISIN',()=>{
 const x=inputs();x.bars[1]={...x.bars[1],ticker:'AAA'};assert.throws(()=>buildR82ThemeRawInputs(x),/TICKER_IDENTITY_COLLISION/);
});
test('short listing 71 sessions cannot fake 200- or 252-session moving history',()=>{
 const x=inputs();const early=new Set(x.sessions.slice(0,189));x.bars=x.bars.filter(r=>r.ticker!=='BBB'||!early.has(r.date));const v=buildR82ThemeRawInputs(x);
 assert.equal(v.latest.breadthReady,true);assert.equal(v.latest.matched,2);assert.equal(v.latest.fullConstituentCoverage,false);
 assert.equal(v.latest.ready252,1);
});
test('private raw series never leaks through public summary',()=>{
 const x=summarizeR82NoRawRows(buildR82ThemeRawInputs(inputs()));assert.equal(x.privateRawInputs,undefined);assert.equal(x.publicationAuthorized,false);
});
test('invalid calendars and source date drift are rejected',()=>{
 const x=inputs();x.sessions[1]=x.sessions[0];assert.throws(()=>buildR82ThemeRawInputs(x),/SESSIONS_INVALID/);
 const y=inputs();y.verifiedMarketSessions=false;assert.throws(()=>buildR82ThemeRawInputs(y),/UNVERIFIED_SESSION_CALENDAR/);
});
test('no formula or sector weights are present in R82 outputs',()=>{
 const x=buildR82ThemeRawInputs(inputs());assert.equal(x.status,'RAW_INPUTS_RESEARCH_READY_NOT_A_FIVE_AXIS_SCORE');assert.equal(x.priceScore,undefined);assert.equal(x.fiveAxisScore,undefined);
});
test('eligible denominators match sector R3 with short-listed constituents, without synthetic zero',()=>{
 const x=inputs();const early=new Set(x.sessions.slice(0,189));x.bars=x.bars.filter(r=>r.ticker!=='BBB'||!early.has(r.date));const v=buildR82ThemeRawInputs(x);
 const row=v.privateRawInputs.breadthRows.at(-1);
 assert.deepEqual([v.latest.ready50,v.latest.ready200,v.latest.ready252],[2,1,1]);
 assert.equal(row.b50,.5);assert.equal(row.b200,1);assert.equal(row.highLowNet,1);
 assert.equal(v.latest.reason,'PARTIAL_ELIGIBLE_CONSTITUENTS');
 assert.equal(v.status,'RAW_INPUTS_PARTIAL_ELIGIBLE_RESEARCH_NO_SCORE');
 assert.equal(v.publicationAuthorized,false);
});
test('if all stocks have fewer than 252 bars then breadth is null, never fake 0',()=>{
 const x=inputs(240);const v=buildR82ThemeRawInputs(x);
 assert.equal(v.breadthReadyDates,0);assert.equal(v.latest.breadthReady,false);assert.equal(v.privateRawInputs.breadthRows.length,0);
});
