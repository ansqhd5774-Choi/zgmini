import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {isMarketSession} from '../lib/market-score/breadth-b1-r3-calendar.mjs';
import {preflightStoredR10PitQuarantine,reportR10PcPreflightArgs} from '../scripts/pc-writer/asset-r10-pit-quarantine-pc-preflight-r1.mjs';

const symbols=Array.from({length:489},(_,i)=>`T${String(i).padStart(4,'0')}`);
const hash=value=>createHash('sha256').update(JSON.stringify([...value].sort())).digest('hex');
const dates=[];
for(let day=new Date('2024-01-01T00:00:00Z');day.toISOString().slice(0,10)<='2026-10-30';day.setUTCDate(day.getUTCDate()+1)){
 const date=day.toISOString().slice(0,10);
 if(isMarketSession(date))dates.push(date);
}
const sessions=dates.slice(-520);
const pricedSessions=sessions.slice(-205);
assert.equal(sessions.at(-1),'2026-10-30');
assert.equal(sessions.length,520);

function fixture(t,{withSqlite=true}={}){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'r10-pit-pc-readonly-'));
 t.after(()=>fs.rmSync(base,{force:true,recursive:true}));
 const alpaca=path.join(base,'asset-r10-alpaca');
 fs.mkdirSync(path.join(alpaca,'incremental'),{recursive:true});
 const approvedMembers=[...symbols,'PSKY'],officialMembers=[...symbols,'SKYD'];
 const approvedPit={verifiedThrough:'2026-09-30',eligibleUniverses:[
  {tradeDate:'2026-09-30',members:approvedMembers,memberCount:490}]};
 const officialPit={status:'READY',membershipLookAheadSafe:true,
  currentUniverseSurvivorshipBiasRemoved:true,publicMutation:false,eventDigest:'a'.repeat(64),
  currentDate:'2026-10-30',first:sessions[0],last:sessions.at(-1),
  targetSessions:sessions.length,
  currentMemberHash:hash(officialMembers),
  universes:sessions.map(tradeDate=>({tradeDate,members:officialMembers,memberCount:490}))};
 const write=(name,body)=>fs.writeFileSync(path.join(base,name),JSON.stringify(body));
 write('local-asset-bubble-r10-pit-compatible-universe.json',approvedPit);
 write('local-breadth-r7-pit-universe.json',officialPit);
 write('local-breadth-r7-prospective-last-run.json',{
  status:'READY',at:'2026-11-02T04:30:00.000Z',pitRefreshed:true,secret:'DO_NOT_PRINT'});
 const rows=pricedSessions.flatMap(tradeDate=>symbols.map(ticker=>({ticker,tradeDate,currentClose:100})));
 fs.writeFileSync(path.join(alpaca,'group-0001.json'),JSON.stringify(rows.filter(r=>r.tradeDate<='2026-09-30')));
 fs.writeFileSync(path.join(alpaca,'incremental','2026-09-30-2026-10-30-group-0001.json'),
  JSON.stringify(rows.filter(r=>r.tradeDate>'2026-09-30').map(row=>({...row,
   source:'ALPACA',feed:'iex',adjustmentStatus:'split'}))));
 if(withSqlite){
  fs.mkdirSync(path.join(base,'storage'));
  const db=new DatabaseSync(path.join(base,'storage','core.sqlite'));
  db.exec('CREATE TABLE market_score_breadth_b1_r3_universe_v1(trade_date TEXT)');
  db.prepare('INSERT INTO market_score_breadth_b1_r3_universe_v1(trade_date) VALUES (?)').run('2026-10-30');
  db.close();
 }
 return {base,approvedPit,officialPit};
}
function zeroMutations(result){
 assert.equal(result.readOnly,true);assert.equal(result.canPromote,false);
 assert.equal(result.productionEligible,false);
 for(const name of ['providerCalls','pcInputWrites','sqliteWrites','d1Reads','d1Writes','coreTaskChanges','lockPidActions'])
  assert.equal(result[name],0);
}

test('stored 1-slot audit reads SQLite/PIT/price artifacts and returns only bounded evidence',t=>{
 const x=fixture(t);
 const before=fs.readFileSync(path.join(x.base,'local-breadth-r7-pit-universe.json'));
 const result=preflightStoredR10PitQuarantine({base:x.base,asOfDate:'2026-11-02'});
 zeroMutations(result);
 assert.equal(result.status,'CANDIDATE_WITH_ONE_UNRESOLVED_SECURITY_RESEARCH_ONLY');
 assert.equal(result.pitRefreshEvidence.sqliteUniverseDate,'2026-10-30');
 assert.equal(result.pitRefreshEvidence.officialPitCurrentDate,'2026-10-30');
 assert.equal(result.pitRefreshEvidence.latestProspectiveStatus,'READY');
 assert.equal(result.pitRefreshEvidence.latestRunPitRefreshed,true);
 assert.equal(result.evidence.baseGroupCount,1);
 assert.equal(result.evidence.incrementalGroupCount,1);
 assert.match(result.evidence.approvedPitSha256,/^[a-f0-9]{64}$/);
 assert.deepEqual(result.unresolvedSymbols,['SKYD']);
 assert.deepEqual(result.candidateRows,[{observationDate:'2026-10-30',memberCount:490,
  valid200:489,coverage:489/490,unresolvedIdentityCount:1}]);
 assert.ok(!JSON.stringify(result).includes('DO_NOT_PRINT'));
 assert.deepEqual(fs.readFileSync(path.join(x.base,'local-breadth-r7-pit-universe.json')),before);
});

test('stale R7 PIT stops before price publication despite last-run refreshed flag',t=>{
 const x=fixture(t),file=path.join(x.base,'local-breadth-r7-pit-universe.json');
 fs.writeFileSync(file,JSON.stringify({...x.officialPit,currentDate:'2026-10-29'}));
 const result=preflightStoredR10PitQuarantine({base:x.base,asOfDate:'2026-11-02'});
 zeroMutations(result);
 assert.equal(result.status,'STOP_PIT_NOT_CURRENT_WITH_SQLITE');
 assert.equal(result.pitRefreshEvidence.sqliteUniverseDate,'2026-10-30');
 assert.equal(result.pitRefreshEvidence.officialPitCurrentDate,'2026-10-29');
 assert.equal(result.candidateRows,undefined);
});

test('missing SQLite is not mistaken for current PIT',t=>{
 const x=fixture(t,{withSqlite:false});
 const result=preflightStoredR10PitQuarantine({base:x.base,asOfDate:'2026-11-02'});
 zeroMutations(result);
 assert.equal(result.status,'STOP_SQLITE_UNIVERSE_DATE_UNVERIFIED');
 assert.equal(result.pitRefreshEvidence.sqliteStatus,'STOP_SQLITE_UNIVERSE_UNAVAILABLE');
});

test('a PIT file with only 500 sessions cannot claim a verified 501-day lineage',t=>{
 const x=fixture(t),file=path.join(x.base,'local-breadth-r7-pit-universe.json');
 const shortened=x.officialPit.universes.slice(-500);
 fs.writeFileSync(file,JSON.stringify({...x.officialPit,first:shortened[0].tradeDate,
  targetSessions:shortened.length,universes:shortened}));
 const result=preflightStoredR10PitQuarantine({base:x.base,asOfDate:'2026-11-02'});
 zeroMutations(result);
 assert.equal(result.status,'STOP_PIT_501_SESSION_LINEAGE_UNVERIFIED');
 assert.equal(result.pitWindowCount,500);
 assert.equal(result.candidateRows,undefined);
});

test('an internal missing market session invalidates an otherwise complete PIT window',t=>{
 const x=fixture(t),file=path.join(x.base,'local-breadth-r7-pit-universe.json');
 const withGap=x.officialPit.universes.filter((row,i)=>i!==200);
 fs.writeFileSync(file,JSON.stringify({...x.officialPit,first:withGap[0].tradeDate,
  targetSessions:withGap.length,universes:withGap}));
 const result=preflightStoredR10PitQuarantine({base:x.base,asOfDate:'2026-11-02'});
 zeroMutations(result);
 assert.equal(result.status,'STOP_PIT_501_SESSION_LINEAGE_UNVERIFIED');
 assert.equal(result.pitWindowCount,519);
 assert.equal(result.candidateRows,undefined);
});

test('explicit absolute PC root and canonical as-of date are required',t=>{
 const x=fixture(t);
 for(const input of [{base:'relative',asOfDate:'2026-11-02'},
  {base:x.base,asOfDate:'2026-13-01'},
  {base:x.base,asOfDate:null}]){
  const result=preflightStoredR10PitQuarantine(input);
  zeroMutations(result);
  assert.equal(result.status,'STOP_EXPLICIT_PC_DATA_ROOT_OR_DATE_MISSING');
 }
});

test('CLI argument parser rejects unsafe or unknown arguments without reading data',()=>{
 for(const args of [['--execute-writer','1'],['--base','/tmp','--base','/other'],['--as-of']]){
  const report=reportR10PcPreflightArgs(args);
  zeroMutations(report);
  assert.equal(report.status,'STOP_UNRECOGNIZED_ARGS');
 }
});
