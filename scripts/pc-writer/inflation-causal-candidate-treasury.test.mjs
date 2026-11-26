import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  TREASURY_MTS_CUSTOMS_FILE,
  collectTreasuryCustoms,
  normalizeTreasuryCustoms,
} from './inflation-causal-candidate-treasury.mjs';

const sample=(date='2026-09-30',net='5910402249.78')=>({
  record_date:date,line_code_nbr:'405',classification_desc:'Customs Duties',
  current_month_gross_rcpt_amt:'25271564478.23',
  current_month_refund_amt:net==='5910402249.78'?'19361162228.45':'25271564478.23',
  current_month_net_rcpt_amt:net,
});
const payload=(...rows)=>({data:rows,meta:{'total-count':rows.length,count:rows.length}});
const response=x=>new Response(JSON.stringify(x),{status:200});
const base=()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-mts-candidate-'));
  const writer=path.join(temp,'pc-writer');fs.mkdirSync(writer);
  return {temp,writer,clear:()=>fs.rmSync(temp,{recursive:true,force:true})};
};
const now=new Date('2026-11-08T05:00:00.000Z');

test('Treasury MTS Customs Duties 405 exact monthly signed USD decimal',()=>{
  const rows=normalizeTreasuryCustoms(payload(sample()));
  assert.deepEqual(rows[0],{
    date:'2026-09-30',period:'2026-09',netUsdDecimal:'5910402249.78',
    grossUsdDecimal:'25271564478.23',refundUsdDecimal:'19361162228.45',
    unit:'USD',valueKind:'MONTHLY_NET_CASH_RECEIPTS',
  });
  const negative={...sample('2026-06-30'),current_month_gross_rcpt_amt:'100.00',
    current_month_refund_amt:'200.05',current_month_net_rcpt_amt:'-100.05'};
  assert.equal(normalizeTreasuryCustoms(payload(negative))[0].netUsdDecimal,'-100.05');
});

test('rejects incorrect tariff line, duplicate date, non-last calendar day and total receipts',()=>{
  assert.throws(()=>normalizeTreasuryCustoms(payload({...sample(),line_code_nbr:'830'})),/ROW_ID_OR_DATE_INVALID/);
  assert.throws(()=>normalizeTreasuryCustoms(payload(sample(),sample())),/ROW_ID_OR_DATE_INVALID/);
  assert.throws(()=>normalizeTreasuryCustoms(payload(sample('2026-09-01'))),/ROW_ID_OR_DATE_INVALID/);
  assert.throws(()=>normalizeTreasuryCustoms(payload({...sample(),classification_desc:'Customs'})),/ROW_ID_OR_DATE_INVALID/);
  assert.throws(()=>normalizeTreasuryCustoms({...payload(sample()),meta:{'total-count':201}}),/PAGINATION_INCOMPLETE/);
  assert.throws(()=>normalizeTreasuryCustoms(payload({...sample(),current_month_net_rcpt_amt:'0.00'})),/ARITHMETIC_MISMATCH/);
});

test('provider request is scoped to Customs Duties 405 and stored with readback',async t=>{
  const fixture=base();t.after(fixture.clear);
  let calls=0;
  const quotaFetch=async (link,options)=>{
    calls++;
    const url=new URL(link);
    assert.equal(url.hostname,'api.fiscaldata.treasury.gov');
    assert.equal(url.searchParams.get('filter'),'line_code_nbr:eq:405');
    assert.equal(url.searchParams.get('page[size]'),'200');
    assert.equal(options.redirect,'manual');
    return response(payload(sample()));
  };
  const first=await collectTreasuryCustoms({base:fixture.writer,quotaFetch,now});
  assert.equal(first.status,'SAVED_READBACK');
  const file=path.join(fixture.writer,TREASURY_MTS_CUSTOMS_FILE);
  const stored=JSON.parse(fs.readFileSync(file,'utf8'));
  assert.equal(stored.observations.length,1);
  assert.equal(stored.observations[0].netUsdDecimal,'5910402249.78');
  assert.equal(stored.lineCode,'405');
  assert.equal(fs.existsSync(path.join(fixture.writer,'inflation-causal-candidates-r1',first.archive)),true);
  const second=await collectTreasuryCustoms({base:fixture.writer,quotaFetch,now});
  assert.equal(second.status,'UNCHANGED');
  assert.equal(calls,2);
});

test('bad next response preserves previously stored snapshot',async t=>{
  const fixture=base();t.after(fixture.clear);
  let invalid=false;
  const quotaFetch=async()=>response(payload(invalid?{...sample(),line_code_nbr:'830'}:sample()));
  await collectTreasuryCustoms({base:fixture.writer,quotaFetch,now});
  const file=path.join(fixture.writer,TREASURY_MTS_CUSTOMS_FILE),before=fs.readFileSync(file);
  invalid=true;
  await assert.rejects(()=>collectTreasuryCustoms({base:fixture.writer,quotaFetch,now}),/ROW_ID_OR_DATE_INVALID/);
  assert.deepEqual(before,fs.readFileSync(file));
});

test('unauthorized scope and missing quota never call provider',async t=>{
  const fixture=base();t.after(fixture.clear);
  let calls=0;const quotaFetch=()=>{calls++;throw Error('unexpected fetch');};
  await assert.rejects(()=>collectTreasuryCustoms({base:fixture.temp,quotaFetch,now}),/PC_BASE_DENIED/);
  await assert.rejects(()=>collectTreasuryCustoms({base:fixture.writer,quotaFetch:null,now}),/QUOTA_FETCH_REQUIRED/);
  assert.equal(calls,0);
});
