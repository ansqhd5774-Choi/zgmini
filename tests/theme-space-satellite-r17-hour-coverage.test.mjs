import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {inspectSpaceHourCoverage} from
 '../scripts/pc-writer/theme-space-satellite-r17-hour-coverage.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const symbols=['UFO','NASA','WARP','ORBX','MARS','ARKX','ROKT','DIPR','WSPC'];
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'space-r17-test-'));
 t.after(()=>fs.rmSync(root,{force:true,recursive:true}));
 const home=path.join(root,'themes','space-satellite');
 fs.mkdirSync(path.join(home,'raw'),{recursive:true});
 const dates=[];
 for(let day=new Date('2026-03-30T00:00:00Z');dates.length<85;
  day=new Date(day.getTime()+86400000)){
  if(day.getUTCDay()!==0&&day.getUTCDay()!==6)dates.push(day.toISOString().slice(0,10));
 }
 const bar=(symbol,date,index,nyHour)=>({symbol,
  timestamp:`${date}T${String(nyHour+4).padStart(2,'0')}:00:00Z`,
  close:100+index*.5+(nyHour===15?1.3:0),is_gap:false});
 const spy=dates.flatMap((date,i)=>[bar('SPY',date,i,14),bar('SPY',date,i,15)]);
 const spyReader=()=>({sourceTheme:'data-center-power',manifestSha256:'R17_FIX_SPY',bars:spy});
 const files=[];
 const add=(ticker,generate)=>{
  const bars=dates.flatMap((d,i)=>generate(d,i)).sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
  const content=bars.map(x=>JSON.stringify(x)).join('\n')+'\n',hash=sha(content);
  const relative=`raw/${ticker}_${hash}.jsonl`;
  fs.writeFileSync(path.join(home,relative),content);
  files.push({path:relative,sha256:hash,source:'https://getmarkethistory.com',
   priceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE'});
 };
 const finish=()=>{
  const content=JSON.stringify({version:1,themeId:'space-satellite',files});
  fs.writeFileSync(path.join(home,'raw-manifest.json'),content);
  return sha(content);
 };
 const audit=(digest,chosen=symbols)=>inspectSpaceHourCoverage({dataRoot:root,
  symbols:chosen,spyReader,expectedManifestSha:digest,expectedSpySha:'R17_FIX_SPY'});
 return {root,home,dates,bar,add,finish,audit};
}

test('R17 quantifies missing NY15 with real matched 14h bars, without substituting',t=>{
 const f=fixture(t);
 f.add('UFO',(d,i)=>[f.bar('UFO',d,i,14),f.bar('UFO',d,i,15)]);
 f.add('ORBX',(d,i)=>i%10===0?[f.bar('ORBX',d,i,14)]:
  [f.bar('ORBX',d,i,14),f.bar('ORBX',d,i,15)]);
 f.add('DIPR',(d,i)=>i>=40&&i%2===0?[f.bar('DIPR',d,i,14)]:
  i>=40&&i%2===1?[f.bar('DIPR',d,i,15)]:[]);
 const manifest=f.finish(),prior=fs.readFileSync(path.join(f.home,'raw-manifest.json'));
 const result=f.audit(manifest),orbx=result.records.find(x=>x.ticker==='ORBX');
 assert.equal(result.candidateCount,9);
 assert.equal(orbx.actualCanonicalSessions,76);
 assert.equal(orbx.actualSameHourAlternateDays,9);
 assert.equal(orbx.onlyDiagnosticPotentialSessions,85);
 assert.equal(orbx.stillUnresolvedDays,0);
 assert.equal(orbx.alternateHourBreakdown['14'],9);
 assert.equal(orbx.observedPaired14Vs15EtfCloseDriftPercent.pairs,76);
 assert.equal(orbx.observedPaired14Vs15EtfSpyRatioDriftPercent.pairs,76);
 assert.equal(orbx.recentLookbackFeasibility['21'].unresolved,0);
 assert.equal(orbx.scoreRecomputed,false);
 const dipr=result.records.find(x=>x.ticker==='DIPR');
 assert.ok(dipr.actualCanonicalSessions<40);
 assert.ok(dipr.onlyDiagnosticPotentialSessions>=40);
 assert.equal(dipr.potentialMeets40,true);
 assert.equal(result.sameHourFallbackApproved,false);
 assert.equal(result.providerCalls,0);assert.equal(result.rawFilesWritten,0);
 assert.equal(result.publicWrites,0);
 assert.ok(fs.readFileSync(path.join(f.home,'raw-manifest.json')).equals(prior));
 assert.doesNotMatch(JSON.stringify(result),/"close"\s*:/);
});

test('R17 does not create alternative evidence when SPY same-hour data is missing',t=>{
 const f=fixture(t);
 f.add('UFO',(d,i)=>i%3===0?[f.bar('UFO',d,i,11)]:[f.bar('UFO',d,i,15)]);
 // Shared SPY has 14/15 only, so UFO NY11 alone cannot validate a same-hour pair.
 const result=f.audit(f.finish()),ufo=result.records.find(x=>x.ticker==='UFO');
 assert.ok(ufo.stillUnresolvedDays>0);
 assert.equal(ufo.actualSameHourAlternateDays,0);
 assert.equal(ufo.potentialMeets40,true);
 assert.equal(ufo.latest45RecoverableSameHour,0);
});

test('R17 rejects changed SHA, and supports any count of candidate ETFs',t=>{
 const f=fixture(t);const digest=f.finish();
 assert.throws(()=>f.audit('f'.repeat(64)),/R17_SOURCE_SNAPSHOT_CHANGED/);
 const many=[...symbols,...Array.from({length:16},(_,i)=>`ETF${i}`)];
 const result=f.audit(digest,many);
 assert.equal(result.candidateCount,25);
 assert.equal(result.records.at(-1).actualCanonicalSessions,0);
 assert.equal(result.finalBasketSelected,false);
});
