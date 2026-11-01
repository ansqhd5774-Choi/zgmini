import test from'node:test';import assert from'node:assert/strict';
import{themeHistoryReference}from'../worker/theme-history-reference.mjs';import{themeEtfDashboardSeries}from'../lib/theme-etf-dashboard.mjs';
import{recoverySources}from'../scripts/pc-writer/theme-publication-recovery.mjs';
const dates=Array.from({length:255},(_,i)=>new Date(Date.UTC(2025,9,1)+i*86400000).toISOString().slice(0,10));
const history=(from,to,value)=>dates.slice(from,to).map(date=>({date,score:value}));
test('an optional delayed theme is validated against real stored history, with no invented boundary points',()=>{
 const seed={themes:[{theme:'main',history:history(0,252,50)}]};const base={status:'READY',observationDate:dates[254],themes:[{theme:'main',history:history(3,255,50)}]};
 const old=themeHistoryReference(base,seed,dates[252]);assert.equal(old.observationDate,dates[252]);assert.equal(old.themes[0].history.length,252);assert.deepEqual(old.themes[0].history,history(1,253,50));
 assert.equal(themeHistoryReference(base,null,dates[252]),null);
 const conflict=structuredClone(seed);conflict.themes[0].history[10].score=40;assert.equal(themeHistoryReference(base,conflict,dates[252]),null);
});
test('new provisional points remain visible while a delayed theme stops at its own last real observation',()=>{
 const p={status:'READY',observationDate:dates[253],phase:'PROVISIONAL',themes:[{theme:'main',score:50,history:history(2,254,50)},{theme:'late',score:0,history:history(0,252,0),observationDate:dates[251],delayed:true}],provisional:{points:[{date:dates[254],scores:{main:60}}]}};
 const out=themeEtfDashboardSeries(p);assert.equal(out.series.length,2);assert.deepEqual(out.data.at(-1),{date:dates[254],provisional:true,main:60,late:null});assert.equal(out.data.find(r=>r.date===dates[251]).late,0);assert.equal(out.data.find(r=>r.date===dates[252]).late,null);
});
test('publisher recovery claims only its own writer slot and preserves source/lease/CAS guards',()=>{
 const files={'r179-publish-core.mjs':"got.length!==7; if(!['NO_LOCK','STALE_LOCK'].includes(localCore)) return; CHECK_SOURCE(); CHECK_LEASE(); COMPARE_AND_SET();",'r171-publish.mjs':"const expected='"+'a'.repeat(64)+"'; let ownLock=false; const previousMeta=fs.existsSync(last)?fs.statSync(last).mtimeMs:null; const attemptEnd=Date.now(); if(ownLock)try{fs.unlinkSync(lockFile)}catch{}",'r183-guard.mjs':'export const R183_MAX_TOTAL_MS=106000;','r167-cycle.mjs':'spawn({timeout:120000,maxBuffer:1024*1024})'};
 const out=recoverySources(files);assert.match(out['r179-publish-core.mjs'],/publisherClaim\?\.pid===process\.ppid/);assert.match(out['r179-publish-core.mjs'],/read\(path.join\(home,'r182-publish.lock'\)\)\?\.pid===process\.ppid/);assert.match(out['r179-publish-core.mjs'],/CHECK_SOURCE\(\); CHECK_LEASE\(\); COMPARE_AND_SET\(\)/);
 assert.match(out['r171-publish.mjs'],/flag:'wx'/);assert.match(out['r171-publish.mjs'],/pid!==process.pid/);assert.match(out['r171-publish.mjs'],/releaseCore\(\);\n  const attemptEnd/);assert.match(out['r183-guard.mjs'],/600000/);assert.throws(()=>recoverySources(out),/SIDECAR_SOURCE_DRIFT/);
});
