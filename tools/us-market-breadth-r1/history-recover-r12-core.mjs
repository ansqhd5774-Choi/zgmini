/**
 * Select an existing, exact R5 history version for the two audited collision days.
 * This does not change the source audit function, calculate prices, or mutate SQLite.
 * Unexpected rows/contract revisions or a differing R5 version are hard stops.
 */
const expected={
  '2026-03-26':{members:503,current:498,r4:474,r5:498},
  '2026-03-27':{members:503,current:498,r4:472,r5:498},
};
const r4='ZGMINI_B1_PRICE_SOURCE_CONTRACT_R4';
const r5='ZGMINI_B1_PRICE_SOURCE_CONTRACT_R5';
const source='MarketParquet Free Sample';
const feed='stock_daily';
const provider='MARKETPARQUET_FREE_SAMPLE';
function fail(code){throw Error(`R12_${code}`);}
function revision(row){
  let p;
  try{p=JSON.parse(row.provenance_json);}catch{fail('INVALID_PROVENANCE');}
  if(!p||typeof p!=='object'||p.provider!==provider||row.source!==source||row.feed!==feed)
    fail('UNQUALIFIED_HISTORY_SOURCE');
  if(p.sourceContractRevision!==r4&&p.sourceContractRevision!==r5)
    fail('UNEXPECTED_HISTORY_REVISION');
  return p.sourceContractRevision;
}
function identical(a,b){
  for(const key of ['trade_date','ticker','previous_date','source','feed','provenance_json'])
    if(String(a[key]??'')!==String(b[key]??''))return false;
  for(const key of ['previous_close','current_close','current_volume']){
    if(a[key]===null||b[key]===null||a[key]===''||b[key]===''
      ||!Number.isFinite(Number(a[key]))||!Number.isFinite(Number(b[key]))
      ||Number(a[key])!==Number(b[key]))return false;
  }
  return true;
}
export function selectCanonicalR5History({date,members,currentRows,historyRows}){
  const e=expected[date];
  if(!e||!Array.isArray(members)||members.length!==e.members
    ||new Set(members).size!==e.members||currentRows.length!==e.current
    ||historyRows.length!==e.r4+e.r5)fail('SOURCE_COUNTS_DRIFT');
  const allowed=new Set(members),current=new Map(),canonical=new Map(),archived=new Set();
  let r4Count=0,r5Count=0;
  for(const row of currentRows){
    if(row.trade_date!==date||!allowed.has(row.ticker)||current.has(row.ticker)
      ||revision(row)!==r5)fail('CURRENT_R5_DRIFT');
    current.set(row.ticker,row);
  }
  for(const row of historyRows){
    if(row.trade_date!==date||!allowed.has(row.ticker))fail('HISTORY_MEMBERSHIP_DRIFT');
    const version=revision(row);
    if(version===r4){
      r4Count++;
      if(archived.has(row.ticker))fail('R4_DUPLICATE');
      archived.add(row.ticker);
    }else{
      r5Count++;
      if(canonical.has(row.ticker))fail('R5_DUPLICATE');
      canonical.set(row.ticker,row);
    }
  }
  if(r4Count!==e.r4||r5Count!==e.r5||canonical.size!==current.size)
    fail('HISTORY_REVISION_COUNTS_DRIFT');
  for(const [ticker,row] of current){
    const h=canonical.get(ticker);
    if(!h||!identical(row,h))fail('CURRENT_R5_HISTORY_MISMATCH');
  }
  if([...canonical.keys()].some(ticker=>!current.has(ticker)))fail('ORPHAN_CANONICAL_HISTORY');
  return {rows:[...canonical.values()],meta:{date,sourcePrices:current.size,
    canonicalR5:r5Count,archivedR4:r4Count,archivedPreserved:true,
    missingPrice:members.length-current.size}};
}
