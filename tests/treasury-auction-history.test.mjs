import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTreasuryAuctionHistoryRows,mergeTreasuryHistoryEvents} from '../lib/treasury-auction-history.mjs';
import {TREASURY_AUCTIONS_PAGE} from '../lib/treasury-calendar.mjs';

const range={fromDate:'2025-11-10',toDate:'2026-11-09'};
const row=(overrides={})=>({
 cusip:'912797AA1',security_type:'Bill',security_term:'4-Week',reopening:'No',
 announcemt_date:'2026-10-19',auction_date:'2026-10-22',...overrides
});

test('produces only the five existing public Treasury event fields',()=>{
 const events=parseTreasuryAuctionHistoryRows([row()],range);
 assert.deepEqual(events,[
  {id:'treasury-announcement-912797aa1',date:'2026-10-19',title:'미국 4주물 단기국채 입찰 공고',
   source:'treasury',sourceUrl:TREASURY_AUCTIONS_PAGE},
  {id:'treasury-auction-912797aa1',date:'2026-10-22',title:'미국 4주물 단기국채 입찰',
   source:'treasury',sourceUrl:TREASURY_AUCTIONS_PAGE}
 ]);
});

test('missing announcement skips only announcement; never copies the auction date',()=>{
 for(const missing of [null,undefined,'','null']){
  const events=parseTreasuryAuctionHistoryRows([row({announcemt_date:missing})],range);
  assert.equal(events.length,1);
  assert.equal(events[0].id,'treasury-auction-912797aa1');
 }
 // A correctly spelled but unofficial field must not override the source field.
 const [onlyAuction]=parseTreasuryAuctionHistoryRows([row({announcemt_date:null,announcement_date:'2026-10-18'})],range);
 assert.equal(onlyAuction.id,'treasury-auction-912797aa1');
});

test('historical TIPS and FRN flags and reopened original terms retain accurate titles',()=>{
 const events=parseTreasuryAuctionHistoryRows([
  row({cusip:'912810AA1',security_type:'Note',security_term:'9-Year 8-Month',
   original_security_term:'10-Year',inflation_index_security:'Yes',reopening:'Yes'}),
  row({cusip:'912810AB2',security_type:'Note',security_term:'1-Year 9-Month',
   original_security_term:'2-Year',floating_rate:'Yes',reopening:'Yes'}),
  row({cusip:'912810AC3',security_type:'Bond',security_term:'29-Year 6-Month',
   original_security_term:'30-Year',reopening:'No'}),
  row({cusip:'912810AD4',security_type:'Bill',security_term:'2-Day',
   original_security_term:'2-Day',reopening:'No'})
 ],range);
 assert.equal(events.length,8);
 assert.ok(events.find(event=>event.id==='treasury-auction-912810aa1')?.title
  .includes('10년물 물가연동국채 입찰 · 재발행'));
 assert.ok(events.find(event=>event.id==='treasury-auction-912810ab2')?.title
  .includes('2년물 변동금리국채 입찰 · 재발행'));
 assert.ok(events.find(event=>event.id==='treasury-auction-912810ac3')?.title
  .includes('30년물 국채 입찰'));
 assert.ok(events.find(event=>event.id==='treasury-auction-912810ad4')?.title
  .includes('2일물 단기국채 입찰'));
});

test('inclusive range, 365-day maximum, and chronology are strictly validated',()=>{
 const dates=parseTreasuryAuctionHistoryRows([
  row({cusip:'912797AB2',announcemt_date:'2025-11-10',auction_date:'2025-11-10'}),
  row({cusip:'912797AC3',announcemt_date:'2026-11-09',auction_date:'2026-11-09'}),
  row({cusip:'912797AD4',announcemt_date:'2025-11-09',auction_date:'2025-11-09'}),
  row({cusip:'912797AE5',announcemt_date:'2026-11-10',auction_date:'2026-11-10'})
 ],range);
 assert.equal(dates.length,4);
 assert.ok(dates.every(e=>e.date==='2025-11-10'||e.date==='2026-11-09'));
 assert.throws(()=>parseTreasuryAuctionHistoryRows([],{fromDate:'2025-11-09',toDate:'2026-11-09'}),/WINDOW_INVALID/);
 assert.throws(()=>parseTreasuryAuctionHistoryRows([],{fromDate:'2026-11-09',toDate:'2025-11-10'}),/WINDOW_INVALID/);
 assert.throws(()=>parseTreasuryAuctionHistoryRows([row({announcemt_date:'2026-10-23'})],range),/ANNOUNCEMENT_DATE_INVALID/);
});

test('reopenings on distinct dates survive, but duplicate id+date from pages collapses',()=>{
 const first=row({cusip:'912797ZZ9',security_type:'Note',security_term:'2-Year',reopening:'Yes',
  announcemt_date:'2026-05-13',auction_date:'2026-05-17'});
 const second={...first,announcemt_date:'2026-06-13',auction_date:'2026-06-17'};
 const events=parseTreasuryAuctionHistoryRows([first,first,second],range);
 assert.equal(events.length,4);
 assert.deepEqual(events.filter(e=>e.id==='treasury-auction-912797zz9').map(e=>e.date),
  ['2026-05-17','2026-06-17']);
 assert.ok(events.every(e=>e.title.includes('재발행')));
 assert.throws(()=>parseTreasuryAuctionHistoryRows([first,{...first,reopening:'No'}],range),/EVENT_CONFLICT/);
});

test('rejects malformed rows rather than fabricating CUSIPs, dates, or types',()=>{
 for(const changed of [
  {cusip:'INVALID'}, {auction_date:null},{auction_date:'2026-02-30'},
  {announcemt_date:'2026-01-99'}, {reopening:'unknown'}
 ])assert.throws(()=>parseTreasuryAuctionHistoryRows([row(changed)],range),/TREASURY_HISTORY_/);
 assert.throws(()=>parseTreasuryAuctionHistoryRows({},range),/ROWS_INVALID/);
 assert.throws(()=>parseTreasuryAuctionHistoryRows([null],range),/ROW_INVALID/);
 const [missingReopen]=parseTreasuryAuctionHistoryRows([
  row({reopening:'null',announcemt_date:null})],range);
 assert.equal(missingReopen.title,'미국 4주물 단기국채 입찰');
});

test('simulated 415 rows across three pages retain every unique auction',()=>{
 const fakeRows=Array.from({length:415},(_,index)=>row({
  cusip:`912797${index.toString(36).toUpperCase().padStart(3,'0')}`,
  announcemt_date:'2026-09-01',auction_date:'2026-09-03'
 }));
 const pages=[fakeRows.slice(0,200),fakeRows.slice(200,400),fakeRows.slice(400)];
 assert.deepEqual(pages.map(p=>p.length),[200,200,15]);
 const events=parseTreasuryAuctionHistoryRows(pages.flat(),range);
 assert.equal(events.filter(e=>e.id.startsWith('treasury-auction-')).length,415);
 assert.equal(events.length,830);
});

test('historical collisions never replace weekly feed events or change statuses',()=>{
 const history=parseTreasuryAuctionHistoryRows([row()],range);
 const weekly={...history[1],title:'기존 주간 피드 공인 제목',status:'READY'};
 const other={id:'macro-test',date:'2026-10-22',title:'기존 다른 일정',source:'other',status:'PENDING'};
 const merged=mergeTreasuryHistoryEvents([other,weekly],history);
 assert.equal(merged.length,3);
 assert.equal(merged.find(e=>e.id===weekly.id),weekly);
 assert.equal(merged.find(e=>e.id===other.id),other);
 assert.equal(merged.find(e=>e.id===history[0].id).status,undefined);
});
