import test from 'node:test';import assert from 'node:assert/strict';
import {validateFhsAnnualSnapshot,publishableFhsAnnualFromPrivate,getFhsAnnualGrade} from './market-calendar-fhs-r3-public.mjs';
const row=(ticker,stars,score)=>({ticker,version:'ZGMINI-FHS-R3',asOf:'2026-10-31',status:'PROVISIONAL_UNVERIFIED',publishReady:false,sectorVerified:false,cashUnrestrictedVerified:false,filingContextVerified:false,score,stars});
const input=()=>({version:'ZGMINI-FHS-R3',status:'PRIVATE_PROVISIONAL_ONLY',publishReady:false,asOf:'2026-10-31',sourceStoredAt:1793332803791,recordCount:3,items:[row('AAPL',3,80),row('GOOG',2,51),row('NNE',1,10)]});
test('derives only score and grade from private stored candidate, no raw SEC financials',()=>{const result=publishableFhsAnnualFromPrivate(input());assert.equal(result.recordCount,3);assert.deepEqual(result.grades.AAPL,[3,80]);assert.equal(JSON.stringify(result).includes('risk'),false)});
test('unrated ticker is null, including names with invalid characters',()=>{const result=publishableFhsAnnualFromPrivate(input());assert.equal(getFhsAnnualGrade(result,'N/A'),null);assert.equal(getFhsAnnualGrade(result,'TSLA'),null)});
test('rejects all-empty input rather than wiping prior published data',()=>{const v=input();v.items=[];v.recordCount=0;assert.throws(()=>publishableFhsAnnualFromPrivate(v))});
test('rejects duplicate, missing fields, mutated item grade, future stars, unclear source',()=>{for(const mutate of [v=>v.items.push({...v.items[0]}),v=>v.items[0].score=null,v=>v.items[2].stars=3,v=>v.items[0].ticker='abc',v=>v.items[0].sectorVerified=true]){const v=input();mutate(v);v.recordCount=v.items.length;assert.throws(()=>publishableFhsAnnualFromPrivate(v))}});
test('preserves allowed risk-cap below raw score band',()=>{const v=input();v.items[0].stars=1;assert.equal(publishableFhsAnnualFromPrivate(v).grades.AAPL[0],1)});
test('rejects tampered output or empty public grade',()=>{const p=publishableFhsAnnualFromPrivate(input());assert.equal(validateFhsAnnualSnapshot(p),p);assert.throws(()=>validateFhsAnnualSnapshot({...p,grades:{AAPL:[3,10]}}))});
test('R58 distribution 451/610/554 preserved on annual export',()=>{
 const gradeItems=[];for(let n=0;n<1615;n++){
  const star=n<451?3:n<1061?2:1;
  gradeItems.push(row('T'+String(n).padStart(5,'0'),star,star===3?85:star===2?60:22));
 }
 const p=publishableFhsAnnualFromPrivate({...input(),recordCount:1615,items:gradeItems});
 const dist={1:0,2:0,3:0};for(const [grade]of Object.values(p.grades))dist[grade]++;
 assert.deepEqual(dist,{1:554,2:610,3:451});assert.equal(p.recordCount,1615);
});
