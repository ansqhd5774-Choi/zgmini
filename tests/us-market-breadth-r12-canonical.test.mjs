import test from 'node:test';
import assert from 'node:assert/strict';
import {selectCanonicalR5History} from '../tools/us-market-breadth-r1/history-recover-r12-core.mjs';
import {auditDay} from '../scripts/pc-writer/breadth-r10-v9-shadow/audit.mjs';

const r4='ZGMINI_B1_PRICE_SOURCE_CONTRACT_R4';
const r5='ZGMINI_B1_PRICE_SOURCE_CONTRACT_R5';
function price(date,ticker,version){return {trade_date:date,ticker,previous_date:'2026-03-25',
  previous_close:100,current_close:101,current_volume:1234,
  source:'MarketParquet Free Sample',feed:'stock_daily',provenance_json:JSON.stringify({
    provider:'MARKETPARQUET_FREE_SAMPLE',sourceContractRevision:version,
    splitAdjusted:true,dividendAdjusted:false,currentResolvedSymbol:ticker,previousResolvedSymbol:ticker,
  })};}
function fixture(date,nArchived){
  const members=Array.from({length:503},(_,i)=>`T${String(i).padStart(3,'0')}`);
  const currentRows=members.slice(0,498).map(t=>price(date,t,r5));
  const archivedCurrent=currentRows.slice(0,nArchived-4).map(x=>({...x,provenance_json:JSON.stringify({
    ...JSON.parse(x.provenance_json),sourceContractRevision:r4}),current_volume:1000}));
  const archivedOrphan=members.slice(498,502).map(t=>price(date,t,r4));
  const historyRows=[...currentRows.map(x=>({...x})),...archivedCurrent,...archivedOrphan];
  return {date,members,currentRows,historyRows};
}
for(const [day,nArchived,originalEligible] of [
  ['2026-03-26',474,28],['2026-03-27',472,30],
]){
  test(`${day}: frozen original audit rejects R4/R5 collision; canonical R5 passes`,()=>{
    const src=fixture(day,nArchived);
    const universe={trade_date:day,member_count:503,members:src.members};
    const original=auditDay({date:day,universe,priceRows:src.currentRows,historyRows:src.historyRows});
    assert.equal(original.pass,false);
    assert.equal(original.eligible,originalEligible);
    const before=JSON.stringify(src);
    const selected=selectCanonicalR5History(src);
    assert.deepEqual(selected.meta,{date:day,sourcePrices:498,canonicalR5:498,
      archivedR4:nArchived,archivedPreserved:true,missingPrice:5});
    assert.equal(selected.rows.length,498);
    const audit=auditDay({date:day,universe,priceRows:src.currentRows,historyRows:selected.rows});
    assert.equal(audit.pass,true);
    assert.equal(audit.eligible,498);
    assert.equal(audit.required,493);
    assert.deepEqual(audit.reject,{MISSING_PRICE:5});
    assert.equal(JSON.stringify(src),before);
  });
}
test('refuses any altered R5 close even when R4 is present',()=>{
  const src=fixture('2026-03-26',474);
  src.historyRows[0].current_close=101.1;
  assert.throws(()=>selectCanonicalR5History(src),/R12_CURRENT_R5_HISTORY_MISMATCH/);
});
test('refuses unexpected history provider, revision and count drift',()=>{
  const src=fixture('2026-03-27',472);
  src.historyRows[0].source='IEX HIST';
  assert.throws(()=>selectCanonicalR5History(src),/R12_UNQUALIFIED_HISTORY_SOURCE/);
  src.historyRows[0].source='MarketParquet Free Sample';
  src.historyRows[0].provenance_json=src.historyRows[0].provenance_json.replace(r5,'UNAPPROVED');
  assert.throws(()=>selectCanonicalR5History(src),/R12_UNEXPECTED_HISTORY_REVISION/);
  src.historyRows.pop();
  assert.throws(()=>selectCanonicalR5History(src),/R12_SOURCE_COUNTS_DRIFT/);
});
